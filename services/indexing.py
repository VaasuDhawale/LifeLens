import asyncio
import mimetypes
import os
import re
import zipfile
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from threading import Lock
from typing import Iterable
from xml.etree import ElementTree

from models.indexing import IndexPathRequest, IndexingState, IndexingStatusResponse
from services.image_embedding import CLIPImageEmbeddingService, ImageEmbeddingError
from services.ocr import OCRExtractionError, OCRService
from services.text_embedding import SentenceBERTTextEmbeddingService, TextEmbeddingError
from services.vector_db import FAISSVectorDB, VectorDBError


class FileIndexingError(RuntimeError):
    """Raised when a file cannot be indexed."""


class SupportedFileType(str, Enum):
    DOCX = "docx"
    IMAGE = "image"
    TEXT = "text"
    PDF = "pdf"


@dataclass(frozen=True)
class FileIndexingConfig:
    """Configuration for local file indexing."""

    index_dir: Path = Path("database/faiss")
    scan_directories: tuple[Path, ...] = field(
        default_factory=lambda: (
            Path.home() / "Downloads",
            Path.home() / "Desktop",
        )
    )
    recursive: bool = True
    max_text_chars: int = 8_000
    enable_ocr: bool = True


@dataclass(frozen=True)
class IndexedFileResult:
    path: Path
    file_type: SupportedFileType | None
    indexed: bool
    vector_id: int | None = None
    error: str | None = None


@dataclass(frozen=True)
class IndexingSummary:
    scanned_files: int
    indexed_files: int
    skipped_files: int
    failed_files: int
    results: list[IndexedFileResult]


IMAGE_EXTENSIONS = {
    ".bmp",
    ".gif",
    ".jpeg",
    ".jpg",
    ".png",
    ".tif",
    ".tiff",
    ".webp",
}

TEXT_EXTENSIONS = {
    ".csv",
    ".htm",
    ".html",
    ".json",
    ".log",
    ".md",
    ".py",
    ".rtf",
    ".text",
    ".tsv",
    ".txt",
    ".xml",
    ".yaml",
    ".yml",
}

PDF_EXTENSIONS = {".pdf"}
DOCX_EXTENSIONS = {".docx"}
WORD_PATTERN = re.compile(r"[a-z0-9]+")


class FileIndexingService:
    """Scans local folders, embeds supported files, and stores vectors in FAISS."""

    def __init__(
        self,
        config: FileIndexingConfig | None = None,
        image_embedding_service: CLIPImageEmbeddingService | None = None,
        text_embedding_service: SentenceBERTTextEmbeddingService | None = None,
        ocr_service: OCRService | None = None,
        image_vector_db: FAISSVectorDB | None = None,
        text_vector_db: FAISSVectorDB | None = None,
    ) -> None:
        self.config = config or FileIndexingConfig()
        self.image_embedding_service = image_embedding_service or CLIPImageEmbeddingService()
        self.text_embedding_service = text_embedding_service or SentenceBERTTextEmbeddingService()
        self.ocr_service = ocr_service or OCRService()
        self.image_vector_db = image_vector_db or FAISSVectorDB(
            index_dir=self.config.index_dir / "images"
        )
        self.text_vector_db = text_vector_db or FAISSVectorDB(
            index_dir=self.config.index_dir / "text"
        )

        self._state = IndexingState.IDLE
        self._indexed_files = self._count_persisted_indexed_files()
        self._pending_files = 0
        self._lock = Lock()

    def get_status(self) -> IndexingStatusResponse:
        """Return current indexing status for API routes or diagnostics."""
        with self._lock:
            return IndexingStatusResponse(
                state=self._state,
                indexed_files=self._indexed_files,
                pending_files=self._pending_files,
                index_location=self.config.index_dir,
            )

    def index_default_folders(self) -> IndexingSummary:
        """Scan and index the configured default folders, usually Downloads/Desktop."""
        return self.index_directories(
            self.config.scan_directories,
            recursive=self.config.recursive,
        )

    async def index_default_folders_async(self) -> IndexingSummary:
        """Async-friendly default folder indexing wrapper."""
        return await asyncio.to_thread(self.index_default_folders)

    def index_path(self, path: str | Path, recursive: bool | None = None) -> IndexingSummary:
        """Index one file or one folder."""
        target = Path(path).expanduser()
        if target.is_file():
            return self._index_files([target])
        if target.is_dir():
            return self.index_directories(
                [target],
                recursive=self.config.recursive if recursive is None else recursive,
            )
        raise FileNotFoundError(f"Path does not exist: {target}")

    async def index_path_async(
        self,
        path: str | Path,
        recursive: bool | None = None,
    ) -> IndexingSummary:
        """Async-friendly path indexing wrapper."""
        return await asyncio.to_thread(self.index_path, path, recursive)

    async def queue_path(self, request: IndexPathRequest) -> None:
        """Compatibility method for the existing indexing route."""
        await self.index_path_async(request.path, recursive=request.recursive)

    def index_directories(
        self,
        directories: Iterable[str | Path],
        recursive: bool = True,
    ) -> IndexingSummary:
        """Scan folders and index every supported file discovered."""
        files: list[Path] = []
        for directory in directories:
            folder = Path(directory).expanduser()
            if not folder.exists() or not folder.is_dir():
                continue
            files.extend(self._scan_directory(folder, recursive=recursive))

        return self._index_files(files)

    def index_file(self, path: str | Path) -> IndexedFileResult:
        """Embed and store a single supported file."""
        file_path = Path(path).expanduser()
        file_type = detect_file_type(file_path)
        if file_type is None:
            return IndexedFileResult(
                path=file_path,
                file_type=None,
                indexed=False,
                error="Unsupported file type.",
            )

        try:
            if file_type == SupportedFileType.IMAGE:
                vector_id = self._index_image(file_path)
            else:
                text = self._extract_text(file_path, file_type)
                vector_id = self._index_text_content(
                    file_path=file_path,
                    file_type=file_type,
                    text=text,
                    content_source="text_extraction",
                )
            return IndexedFileResult(
                path=file_path,
                file_type=file_type,
                indexed=True,
                vector_id=vector_id,
            )
        except (
            FileIndexingError,
            ImageEmbeddingError,
            OCRExtractionError,
            TextEmbeddingError,
            VectorDBError,
            OSError,
            ValueError,
        ) as exc:
            return IndexedFileResult(
                path=file_path,
                file_type=file_type,
                indexed=False,
                error=str(exc),
            )

    def _index_files(self, files: list[Path]) -> IndexingSummary:
        with self._lock:
            self._state = IndexingState.RUNNING
            self._pending_files = len(files)

        results: list[IndexedFileResult] = []
        try:
            for file_path in files:
                results.append(self.index_file(file_path))
                with self._lock:
                    self._pending_files = max(self._pending_files - 1, 0)

            indexed_count = sum(1 for result in results if result.indexed)
            with self._lock:
                self._state = IndexingState.IDLE
                self._indexed_files += indexed_count
                self._pending_files = 0

            return IndexingSummary(
                scanned_files=len(files),
                indexed_files=indexed_count,
                skipped_files=sum(
                    1
                    for result in results
                    if not result.indexed and result.file_type is None
                ),
                failed_files=sum(
                    1
                    for result in results
                    if not result.indexed and result.file_type is not None
                ),
                results=results,
            )
        except Exception:
            with self._lock:
                self._state = IndexingState.ERROR
            raise

    def _index_image(self, file_path: Path) -> int:
        image_embedding = self.image_embedding_service.embed_image(file_path)
        vector_id = self.image_vector_db.add_vector(
            embedding=image_embedding,
            file_path=file_path,
            file_type=SupportedFileType.IMAGE.value,
            file_name=file_path.name,
            metadata={
                "suffix": file_path.suffix.lower(),
                "source": "local_file_indexer",
                "content_source": "clip_image",
            },
        )

        if self.config.enable_ocr:
            self._index_image_ocr_text(file_path)

        return vector_id

    def _index_image_ocr_text(self, file_path: Path) -> int | None:
        try:
            ocr_text = self.ocr_service.extract_text_from_image(file_path)
        except OCRExtractionError:
            return None

        if not ocr_text:
            return None

        return self._index_text_content(
            file_path=file_path,
            file_type=SupportedFileType.IMAGE,
            text=ocr_text,
            content_source="ocr",
        )

    def _index_text_content(
        self,
        file_path: Path,
        file_type: SupportedFileType,
        text: str,
        content_source: str,
    ) -> int:
        full_text = normalize_extracted_text(text)
        embedding = self.text_embedding_service.embed_text(self._truncate_text(full_text))
        return self.text_vector_db.add_vector(
            embedding=embedding,
            file_path=file_path,
            file_type=file_type.value,
            file_name=file_path.name,
            metadata={
                "suffix": file_path.suffix.lower(),
                "source": "local_file_indexer",
                "content_source": content_source,
                "searchable_text": full_text,
                "text_preview": full_text[:500],
                "content_char_count": len(full_text),
                "embedding_char_count": len(self._truncate_text(full_text)),
            },
        )

    @staticmethod
    def _scan_directory(directory: Path, recursive: bool) -> list[Path]:
        if not recursive:
            try:
                return sorted(path for path in directory.iterdir() if path.is_file())
            except OSError:
                return []

        files: list[Path] = []
        for root, _, filenames in os.walk(directory, followlinks=False):
            for filename in filenames:
                files.append(Path(root) / filename)
        return sorted(files)

    def _extract_text(self, path: Path, file_type: SupportedFileType) -> str:
        if file_type == SupportedFileType.PDF:
            text_parts = [extract_pdf_text(path)]
            if self.config.enable_ocr:
                try:
                    text_parts.append(self.ocr_service.extract_text_from_pdf(path))
                except OCRExtractionError:
                    if not any(part.strip() for part in text_parts):
                        raise
            text = "\n".join(part for part in text_parts if part.strip())
        elif file_type == SupportedFileType.DOCX:
            text = extract_docx_text(path)
        else:
            text = extract_plain_text(path)

        text = normalize_extracted_text(text)
        if not text:
            raise FileIndexingError(f"No extractable text found in file: {path}")
        return text

    def _truncate_text(self, text: str) -> str:
        max_chars = min(
            self.config.max_text_chars,
            self.text_embedding_service.config.max_chars,
        )
        return text[:max_chars]

    def _count_persisted_indexed_files(self) -> int:
        paths: set[str] = set()
        for vector_db in (self.image_vector_db, self.text_vector_db):
            try:
                paths.update(str(record["file_path"]) for record in vector_db.list_metadata())
            except (KeyError, VectorDBError):
                continue
        return len(paths)


def detect_file_type(path: str | Path) -> SupportedFileType | None:
    """Detect whether a file should be indexed as image, text, or PDF."""
    file_path = Path(path)
    suffix = file_path.suffix.lower()

    if suffix in IMAGE_EXTENSIONS:
        return SupportedFileType.IMAGE
    if suffix in PDF_EXTENSIONS:
        return SupportedFileType.PDF
    if suffix in DOCX_EXTENSIONS:
        return SupportedFileType.DOCX
    if suffix in TEXT_EXTENSIONS:
        return SupportedFileType.TEXT

    mime_type, _ = mimetypes.guess_type(file_path.name)
    if mime_type is None:
        return None
    if mime_type.startswith("image/"):
        return SupportedFileType.IMAGE
    if mime_type == "application/pdf":
        return SupportedFileType.PDF
    if mime_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        return SupportedFileType.DOCX
    if mime_type.startswith("text/"):
        return SupportedFileType.TEXT

    return None


def extract_plain_text(path: str | Path) -> str:
    """Read a plain-text-like file using common local encodings."""
    file_path = Path(path)
    for encoding in ("utf-8", "utf-8-sig", "cp1252", "latin-1"):
        try:
            return file_path.read_text(encoding=encoding)
        except UnicodeDecodeError:
            continue
    raise FileIndexingError(f"Unable to decode text file: {file_path}")


def extract_pdf_text(path: str | Path) -> str:
    """Extract text from a PDF file with pypdf."""
    try:
        from pypdf import PdfReader
    except ImportError as exc:
        raise FileIndexingError(
            "PDF indexing requires the pypdf package. Install requirements.txt first."
        ) from exc

    file_path = Path(path)
    try:
        reader = PdfReader(str(file_path))
        page_text = [page.extract_text() or "" for page in reader.pages]
    except Exception as exc:
        raise FileIndexingError(f"Unable to extract text from PDF: {file_path}") from exc

    return "\n".join(page_text)


def extract_docx_text(path: str | Path) -> str:
    """Extract full text from a DOCX file without external dependencies."""
    file_path = Path(path)
    xml_names = (
        "word/document.xml",
        "word/footnotes.xml",
        "word/endnotes.xml",
        "word/comments.xml",
    )

    try:
        with zipfile.ZipFile(file_path) as archive:
            xml_names_to_read = [
                *xml_names,
                *sorted(
                    name
                    for name in archive.namelist()
                    if name.startswith(("word/header", "word/footer"))
                    and name.endswith(".xml")
                ),
            ]
            text_parts = [
                extract_docx_xml_text(archive.read(xml_name))
                for xml_name in xml_names_to_read
                if xml_name in archive.namelist()
            ]
    except (OSError, zipfile.BadZipFile, ElementTree.ParseError) as exc:
        raise FileIndexingError(f"Unable to extract text from DOCX: {file_path}") from exc

    return "\n".join(part for part in text_parts if part.strip())


def extract_docx_xml_text(xml_bytes: bytes) -> str:
    """Extract text from one WordprocessingML XML part."""
    root = ElementTree.fromstring(xml_bytes)
    namespace = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
    paragraphs: list[str] = []

    for paragraph in root.findall(".//w:p", namespace):
        fragments: list[str] = []
        for element in paragraph.iter():
            if element.tag == f"{{{namespace['w']}}}t" and element.text:
                fragments.append(element.text)
            elif element.tag == f"{{{namespace['w']}}}tab":
                fragments.append("\t")
            elif element.tag == f"{{{namespace['w']}}}br":
                fragments.append("\n")
        paragraph_text = "".join(fragments).strip()
        if paragraph_text:
            paragraphs.append(paragraph_text)

    if paragraphs:
        return "\n".join(paragraphs)

    return "\n".join(
        element.text or ""
        for element in root.iter(f"{{{namespace['w']}}}t")
        if element.text
    )


def normalize_extracted_text(text: str) -> str:
    """Normalize extracted content while preserving full searchable text."""
    lines = [re.sub(r"[ \t]+", " ", line).strip() for line in text.splitlines()]
    compacted_lines: list[str] = []
    previous_blank = False
    for line in lines:
        if not line:
            if not previous_blank:
                compacted_lines.append("")
            previous_blank = True
            continue
        compacted_lines.append(line)
        previous_blank = False
    return "\n".join(compacted_lines).strip()


def tokenize_keywords(text: str) -> list[str]:
    """Extract normalized keyword tokens for exact-match ranking metadata."""
    return [match.group(0) for match in WORD_PATTERN.finditer(text.lower())]
