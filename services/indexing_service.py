from pathlib import Path

from models.indexing import IndexPathRequest, IndexingState, IndexingStatusResponse


class IndexingService:
    """Coordinates local file indexing jobs."""

    def __init__(self, index_dir: Path) -> None:
        self.index_dir = index_dir

    def get_status(self) -> IndexingStatusResponse:
        return IndexingStatusResponse(
            state=IndexingState.IDLE,
            indexed_files=0,
            pending_files=0,
            index_location=self.index_dir,
        )

    async def queue_path(self, request: IndexPathRequest) -> None:
        raise NotImplementedError("File indexing pipeline will be implemented in a later step.")

