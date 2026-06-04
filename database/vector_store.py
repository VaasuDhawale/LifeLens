from pathlib import Path


class VectorStore:
    """FAISS-backed vector store boundary.

    The concrete FAISS index implementation is intentionally deferred so the
    storage API can be designed around the indexing and search pipelines.
    """

    def __init__(self, index_dir: Path) -> None:
        self.index_dir = index_dir

    async def connect(self) -> None:
        self.index_dir.mkdir(parents=True, exist_ok=True)

    async def close(self) -> None:
        return None

