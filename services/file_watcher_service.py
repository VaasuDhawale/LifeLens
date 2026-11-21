import asyncio
import time
from dataclasses import dataclass, field
from pathlib import Path
from queue import Empty, Queue
from threading import Event, Lock, Thread
from typing import Iterable

from watchdog.events import FileCreatedEvent, FileMovedEvent, FileSystemEventHandler
from watchdog.observers import Observer

from services.indexing import FileIndexingService


@dataclass(frozen=True)
class FileWatcherConfig:
    """Configuration for real-time local file monitoring."""

    watch_directories: tuple[Path, ...] = field(
        default_factory=lambda: (
            Path.home() / "Downloads",
            Path.home() / "Desktop",
        )
    )
    recursive: bool = True
    settle_seconds: float = 0.5
    stable_checks: int = 2
    stable_check_interval_seconds: float = 0.25
    stop_timeout_seconds: float = 5.0


class _NewFileEventHandler(FileSystemEventHandler):
    """Queues newly created or moved-in files for indexing."""

    def __init__(self, watcher: "FileWatcherService") -> None:
        self.watcher = watcher

    def on_created(self, event: FileCreatedEvent) -> None:
        if not event.is_directory:
            self.watcher.queue_file(event.src_path)

    def on_moved(self, event: FileMovedEvent) -> None:
        if not event.is_directory:
            self.watcher.queue_file(event.dest_path)


class FileWatcherService:
    """Watches local folders and indexes new files as they appear."""

    def __init__(
        self,
        indexing_service: FileIndexingService,
        config: FileWatcherConfig | None = None,
        watch_directories: Iterable[str | Path] | None = None,
    ) -> None:
        self.indexing_service = indexing_service
        self.config = config or FileWatcherConfig()
        self.watch_directories = tuple(
            Path(path).expanduser()
            for path in (watch_directories or self.config.watch_directories)
        )

        self._observer: Observer | None = None
        self._worker_thread: Thread | None = None
        self._queue: Queue[Path] = Queue()
        self._queued_paths: set[Path] = set()
        self._queued_paths_lock = Lock()
        self._last_error: str | None = None
        self._stop_event = Event()
        self._running_lock = Lock()
        self._running = False

    @property
    def is_running(self) -> bool:
        return self._running

    @property
    def last_error(self) -> str | None:
        return self._last_error

    async def start(self) -> None:
        """Start watching configured folders."""
        await asyncio.to_thread(self.start_sync)

    async def stop(self) -> None:
        """Stop watching folders and finish the worker thread cleanly."""
        await asyncio.to_thread(self.stop_sync)

    def start_sync(self) -> None:
        """Synchronous start method for scripts and tests."""
        with self._running_lock:
            if self._running:
                return

            directories = self._existing_watch_directories()
            if not directories:
                return

            self._stop_event.clear()
            self._observer = Observer()
            event_handler = _NewFileEventHandler(self)

            try:
                for directory in directories:
                    try:
                        self._observer.schedule(
                            event_handler,
                            str(directory),
                            recursive=self.config.recursive,
                        )
                    except Exception as exc:
                        self._last_error = f"Cannot watch directory {directory}: {exc}"

                self._worker_thread = Thread(
                    target=self._process_queue,
                    name="file-indexing-worker",
                    daemon=True,
                )
                self._worker_thread.start()
                self._observer.start()
                self._running = True
            except Exception as exc:
                self._last_error = f"Observer failed to start: {exc}"
                self._running = False
                self._stop_event.set()
                if self._observer is not None:
                    try:
                        self._observer.stop()
                    except Exception:
                        pass
                    self._observer = None
                if self._worker_thread is not None:
                    self._worker_thread.join(timeout=self.config.stop_timeout_seconds)
                    self._worker_thread = None

    def stop_sync(self) -> None:
        """Synchronous stop method for scripts and tests."""
        with self._running_lock:
            if not self._running:
                return

            self._stop_event.set()
            if self._observer is not None:
                self._observer.stop()
                self._observer.join(timeout=self.config.stop_timeout_seconds)
                self._observer = None

            if self._worker_thread is not None:
                self._worker_thread.join(timeout=self.config.stop_timeout_seconds)
                self._worker_thread = None

            self._running = False

    def queue_file(self, path: str | Path) -> None:
        """Queue a file path for indexing, de-duplicating rapid events."""
        file_path = Path(path).expanduser()
        with self._queued_paths_lock:
            if file_path in self._queued_paths:
                return
            self._queued_paths.add(file_path)
            self._queue.put(file_path)

    def _process_queue(self) -> None:
        while not self._stop_event.is_set():
            try:
                file_path = self._queue.get(timeout=0.5)
            except Empty:
                continue

            try:
                if self._wait_until_file_is_ready(file_path):
                    self.indexing_service.index_file(file_path)
            except Exception as exc:
                self._last_error = str(exc)
            finally:
                with self._queued_paths_lock:
                    self._queued_paths.discard(file_path)
                self._queue.task_done()

    def _wait_until_file_is_ready(self, path: Path) -> bool:
        if self.config.settle_seconds > 0:
            time.sleep(self.config.settle_seconds)

        previous_size: int | None = None
        stable_count = 0

        while not self._stop_event.is_set():
            try:
                if not path.exists() or not path.is_file():
                    return False

                current_size = path.stat().st_size
                if current_size == previous_size:
                    stable_count += 1
                else:
                    stable_count = 0
                    previous_size = current_size

                if stable_count >= self.config.stable_checks:
                    return True
            except OSError:
                stable_count = 0

            time.sleep(self.config.stable_check_interval_seconds)

        return False

    def _existing_watch_directories(self) -> list[Path]:
        return [
            directory
            for directory in self.watch_directories
            if directory.exists() and directory.is_dir()
        ]
