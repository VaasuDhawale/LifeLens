import json
from dataclasses import asdict, dataclass, field
from pathlib import Path
from threading import Lock
from typing import Any, Sequence

import faiss
import numpy as np


class VectorDBError(RuntimeError):
    """Raised when the FAISS vector database cannot complete an operation."""


@dataclass(frozen=True)
class VectorMetadata:
    """Metadata stored alongside every embedding vector."""

    file_path: str
    file_type: str
    file_name: str
    extra: dict[str, Any] = field(default_factory=dict)


class FAISSVectorDB:
    """Small FAISS-backed vector database for local semantic search.

    Vectors are L2-normalized by default and stored in an inner-product index,
    which makes scores behave like cosine similarity for semantic embeddings.
    """

    def __init__(
        self,
        index_dir: str | Path = "database/faiss",
        index_name: str = "vectors.faiss",
        metadata_name: str = "vectors_metadata.json",
        normalize_vectors: bool = True,
        auto_save: bool = True,
    ) -> None:
        self.index_dir = Path(index_dir)
        self.index_path = self.index_dir / index_name
        self.metadata_path = self.index_dir / metadata_name
        self.normalize_vectors = normalize_vectors
        self.auto_save = auto_save

        self._index: faiss.Index | None = None
        self._metadata: list[dict[str, Any]] = []
        self._lock = Lock()

        self._load()

    @property
    def total_vectors(self) -> int:
        if self._index is None:
            return 0
        return int(self._index.ntotal)

    @property
    def dimension(self) -> int | None:
        if self._index is None:
            return None
        return int(self._index.d)

    def add_vector(
        self,
        embedding: Sequence[float],
        file_path: str | Path,
        file_type: str,
        file_name: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> int:
        """Add one embedding vector and its file metadata to FAISS."""
        vector = self._prepare_vector(embedding)
        vector_metadata = self._build_metadata(
            file_path=file_path,
            file_type=file_type,
            file_name=file_name,
            metadata=metadata,
        )

        with self._lock:
            if self._index is None:
                self._index = faiss.IndexFlatIP(vector.shape[1])

            if vector.shape[1] != self._index.d:
                raise VectorDBError(
                    f"Vector dimension {vector.shape[1]} does not match index "
                    f"dimension {self._index.d}."
                )

            vector_id = len(self._metadata)
            self._index.add(vector)
            self._metadata.append(asdict(vector_metadata))

            if self.auto_save:
                self.save()

        return vector_id

    def search_vector(
        self,
        query_vector: Sequence[float],
        top_k: int = 10,
        file_type: str | None = None,
    ) -> list[dict[str, Any]]:
        """Search FAISS for vectors most similar to the query vector."""
        if top_k < 1:
            raise ValueError("top_k must be at least 1.")

        vector = self._prepare_vector(query_vector)

        with self._lock:
            if self._index is None or self._index.ntotal == 0:
                return []

            if vector.shape[1] != self._index.d:
                raise VectorDBError(
                    f"Query vector dimension {vector.shape[1]} does not match index "
                    f"dimension {self._index.d}."
                )

            search_k = self._index.ntotal if file_type else min(top_k, self._index.ntotal)
            scores, indices = self._index.search(vector, search_k)

            results: list[dict[str, Any]] = []
            for score, index_id in zip(scores[0], indices[0]):
                if index_id < 0:
                    continue

                record = self._metadata[int(index_id)]
                if file_type and record["file_type"] != file_type:
                    continue

                results.append(
                    {
                        "id": int(index_id),
                        "score": float(score),
                        "file_path": record["file_path"],
                        "file_type": record["file_type"],
                        "file_name": record["file_name"],
                        "metadata": record.get("extra", {}),
                    }
                )

                if len(results) >= top_k:
                    break

        return results

    def reload(self) -> None:
        """Reload the FAISS index and metadata from disk."""
        with self._lock:
            self._load()

    def list_vectors(self) -> list[dict[str, Any]]:
        """Return all stored vectors with their metadata."""
        with self._lock:
            if self._index is None or self._index.ntotal == 0:
                return []

            records: list[dict[str, Any]] = []
            for index_id, record in enumerate(self._metadata):
                vector = np.empty(self._index.d, dtype=np.float32)
                self._index.reconstruct(index_id, vector)
                records.append(
                    {
                        "id": index_id,
                        "vector": vector,
                        "file_path": record["file_path"],
                        "file_type": record["file_type"],
                        "file_name": record["file_name"],
                        "metadata": record.get("extra", {}),
                    }
                )

        return records

    def list_metadata(self) -> list[dict[str, Any]]:
        """Return stored file metadata without reconstructing vector values."""
        with self._lock:
            return [
                {
                    "id": index_id,
                    "file_path": record["file_path"],
                    "file_type": record["file_type"],
                    "file_name": record["file_name"],
                    "metadata": record.get("extra", {}),
                }
                for index_id, record in enumerate(self._metadata)
            ]

    def save(self) -> None:
        """Persist the FAISS index and metadata sidecar to disk."""
        if self._index is None:
            return

        self.index_dir.mkdir(parents=True, exist_ok=True)

        temp_index_path = self.index_path.with_suffix(".faiss.tmp")
        faiss.write_index(self._index, str(temp_index_path))
        temp_index_path.replace(self.index_path)

        temp_metadata_path = self.metadata_path.with_suffix(".json.tmp")
        temp_metadata_path.write_text(
            json.dumps(self._metadata, indent=2, default=str),
            encoding="utf-8",
        )
        temp_metadata_path.replace(self.metadata_path)

    def _load(self) -> None:
        if not self.index_path.exists():
            self._index = None
            self._metadata = []
            return
        if not self.metadata_path.exists():
            raise VectorDBError(
                f"FAISS index exists but metadata file is missing: {self.metadata_path}"
            )

        self._index = faiss.read_index(str(self.index_path))
        metadata = json.loads(self.metadata_path.read_text(encoding="utf-8"))
        if not isinstance(metadata, list):
            raise VectorDBError(f"Metadata file must contain a list: {self.metadata_path}")
        self._metadata = metadata

        if self._index.ntotal != len(self._metadata):
            raise VectorDBError(
                "FAISS index count does not match metadata count: "
                f"{self._index.ntotal} vectors vs {len(self._metadata)} records."
            )

    def _prepare_vector(self, embedding: Sequence[float]) -> np.ndarray:
        vector = np.asarray(embedding, dtype=np.float32)
        if vector.ndim != 1:
            raise ValueError("Embedding must be a one-dimensional vector.")
        if vector.size == 0:
            raise ValueError("Embedding vector must not be empty.")
        if not np.isfinite(vector).all():
            raise ValueError("Embedding vector contains NaN or infinite values.")

        if self.normalize_vectors:
            norm = np.linalg.norm(vector)
            if norm <= 0:
                raise ValueError("Embedding vector norm must be greater than zero.")
            vector = vector / norm

        return vector.reshape(1, -1)

    @staticmethod
    def _build_metadata(
        file_path: str | Path,
        file_type: str,
        file_name: str | None,
        metadata: dict[str, Any] | None,
    ) -> VectorMetadata:
        if not str(file_path).strip():
            raise ValueError("file_path must not be empty.")

        path = Path(file_path).expanduser()
        resolved_file_name = file_name or path.name

        if not file_type.strip():
            raise ValueError("file_type must not be empty.")
        if not resolved_file_name.strip():
            raise ValueError("file_name must not be empty.")

        return VectorMetadata(
            file_path=str(path),
            file_type=file_type.strip(),
            file_name=resolved_file_name.strip(),
            extra=metadata or {},
        )


_default_dbs: dict[Path, FAISSVectorDB] = {}
_default_db_lock = Lock()


def get_default_vector_db(index_dir: str | Path = "database/faiss") -> FAISSVectorDB:
    """Return a process-local reusable FAISS vector database instance."""
    resolved_index_dir = Path(index_dir).expanduser().resolve()

    with _default_db_lock:
        if resolved_index_dir not in _default_dbs:
            _default_dbs[resolved_index_dir] = FAISSVectorDB(index_dir=resolved_index_dir)
        return _default_dbs[resolved_index_dir]


def add_vector(
    embedding: Sequence[float],
    file_path: str | Path,
    file_type: str,
    file_name: str | None = None,
    metadata: dict[str, Any] | None = None,
    index_dir: str | Path = "database/faiss",
) -> int:
    """Convenience function for adding a vector to the default FAISS index."""
    return get_default_vector_db(index_dir=index_dir).add_vector(
        embedding=embedding,
        file_path=file_path,
        file_type=file_type,
        file_name=file_name,
        metadata=metadata,
    )


def search_vector(
    query_vector: Sequence[float],
    top_k: int = 10,
    file_type: str | None = None,
    index_dir: str | Path = "database/faiss",
) -> list[dict[str, Any]]:
    """Convenience function for searching the default FAISS index."""
    return get_default_vector_db(index_dir=index_dir).search_vector(
        query_vector=query_vector,
        top_k=top_k,
        file_type=file_type,
    )
