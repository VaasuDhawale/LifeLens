import re
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

import numpy as np

from models.clusters import ClusterFile, ClusterResponse, FileCluster
from services.vector_db import FAISSVectorDB


@dataclass(frozen=True)
class SimilarityClusteringConfig:
    """Configuration for grouping related files by vector similarity."""

    similarity_threshold: float = 0.72
    min_cluster_size: int = 2
    max_clusters: int = 12


@dataclass(frozen=True)
class ClusterCandidate:
    source: str
    records: list[dict[str, Any]]
    average_similarity: float


class SimilarityClusteringService:
    """Groups related files from compatible FAISS embedding spaces."""

    def __init__(
        self,
        text_vector_db: FAISSVectorDB,
        image_vector_db: FAISSVectorDB,
        config: SimilarityClusteringConfig | None = None,
    ) -> None:
        self.text_vector_db = text_vector_db
        self.image_vector_db = image_vector_db
        self.config = config or SimilarityClusteringConfig()

    def get_clusters(
        self,
        similarity_threshold: float | None = None,
        min_cluster_size: int | None = None,
        max_clusters: int | None = None,
    ) -> ClusterResponse:
        """Build file clusters from text/OCR and image embedding indexes."""
        threshold = similarity_threshold or self.config.similarity_threshold
        min_size = min_cluster_size or self.config.min_cluster_size
        limit = max_clusters or self.config.max_clusters

        if not 0 < threshold <= 1:
            raise ValueError("similarity_threshold must be between 0 and 1.")
        if min_size < 2:
            raise ValueError("min_cluster_size must be at least 2.")
        if limit < 1:
            raise ValueError("max_clusters must be at least 1.")

        candidates = [
            *self._cluster_vector_db(
                source="text",
                vector_db=self.text_vector_db,
                threshold=threshold,
                min_size=min_size,
            ),
            *self._cluster_vector_db(
                source="image",
                vector_db=self.image_vector_db,
                threshold=threshold,
                min_size=min_size,
            ),
        ]
        clusters = self._dedupe_clusters(candidates)
        clusters.sort(
            key=lambda cluster: (cluster.size, cluster.average_similarity),
            reverse=True,
        )

        selected_clusters = clusters[:limit]
        return ClusterResponse(
            clusters=selected_clusters,
            count=len(selected_clusters),
        )

    def _cluster_vector_db(
        self,
        source: str,
        vector_db: FAISSVectorDB,
        threshold: float,
        min_size: int,
    ) -> list[FileCluster]:
        vector_db.reload()
        records = self._collapse_duplicate_file_vectors(vector_db.list_vectors())
        if len(records) < min_size:
            return []

        matrix = np.vstack([record["vector"] for record in records]).astype(np.float32)
        matrix = self._normalize_matrix(matrix)
        similarity_matrix = matrix @ matrix.T

        candidates: list[ClusterCandidate] = []
        for component in self._connected_components(similarity_matrix, threshold):
            if len(component) < min_size:
                continue

            cluster_records = [records[index] for index in component]
            average_similarity = self._average_similarity(similarity_matrix, component)
            candidates.append(
                ClusterCandidate(
                    source=source,
                    records=cluster_records,
                    average_similarity=average_similarity,
                )
            )

        return [self._to_cluster(candidate) for candidate in candidates]

    @staticmethod
    def _collapse_duplicate_file_vectors(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
        records_by_path: dict[str, list[dict[str, Any]]] = {}
        for record in records:
            records_by_path.setdefault(record["file_path"], []).append(record)

        collapsed: list[dict[str, Any]] = []
        for file_records in records_by_path.values():
            base_record = file_records[0]
            vectors = np.vstack([record["vector"] for record in file_records])
            vector = vectors.mean(axis=0)
            collapsed.append(
                {
                    **base_record,
                    "vector": vector.astype(np.float32),
                    "metadata": {
                        **base_record.get("metadata", {}),
                        "vector_count": len(file_records),
                    },
                }
            )

        return collapsed

    @staticmethod
    def _normalize_matrix(matrix: np.ndarray) -> np.ndarray:
        norms = np.linalg.norm(matrix, axis=1, keepdims=True)
        norms = np.clip(norms, 1e-12, None)
        return matrix / norms

    @staticmethod
    def _connected_components(
        similarity_matrix: np.ndarray,
        threshold: float,
    ) -> list[list[int]]:
        visited: set[int] = set()
        components: list[list[int]] = []

        for start_index in range(similarity_matrix.shape[0]):
            if start_index in visited:
                continue

            stack = [start_index]
            component: list[int] = []
            visited.add(start_index)

            while stack:
                index = stack.pop()
                component.append(index)
                neighbor_indexes = np.where(similarity_matrix[index] >= threshold)[0]
                for neighbor_index in neighbor_indexes:
                    neighbor = int(neighbor_index)
                    if neighbor not in visited:
                        visited.add(neighbor)
                        stack.append(neighbor)

            components.append(sorted(component))

        return components

    @staticmethod
    def _average_similarity(
        similarity_matrix: np.ndarray,
        component: list[int],
    ) -> float:
        if len(component) < 2:
            return 1.0

        scores = []
        for left_offset, left_index in enumerate(component):
            for right_index in component[left_offset + 1 :]:
                scores.append(float(similarity_matrix[left_index, right_index]))

        return sum(scores) / len(scores)

    def _to_cluster(self, candidate: ClusterCandidate) -> FileCluster:
        files = [
            ClusterFile(
                path=record["file_path"],
                file_name=record["file_name"],
                file_type=record["file_type"],
                metadata=record.get("metadata", {}),
            )
            for record in candidate.records
        ]

        return FileCluster(
            title=self._generate_cluster_title(candidate.records),
            files=files,
            size=len(files),
            average_similarity=round(candidate.average_similarity, 4),
            source=candidate.source,
        )

    @staticmethod
    def _dedupe_clusters(clusters: Iterable[FileCluster]) -> list[FileCluster]:
        best_by_paths: dict[tuple[str, ...], FileCluster] = {}
        for cluster in clusters:
            key = tuple(sorted(str(file.path) for file in cluster.files))
            existing = best_by_paths.get(key)
            if existing is None or cluster.average_similarity > existing.average_similarity:
                best_by_paths[key] = cluster
        return list(best_by_paths.values())

    @staticmethod
    def _generate_cluster_title(records: list[dict[str, Any]]) -> str:
        token_counter: Counter[str] = Counter()
        ordered_tokens: list[str] = []

        for record in records:
            path = Path(record["file_path"])
            token_sources = [path.stem, *(part for part in path.parts[-3:-1])]
            for source in token_sources:
                for token in _tokenize(source):
                    token_counter[token] += 1
                    if token not in ordered_tokens:
                        ordered_tokens.append(token)

        common_tokens = [
            token
            for token in ordered_tokens
            if token_counter[token] >= 2 and token not in STOP_WORDS
        ]
        if not common_tokens:
            common_tokens = [
                token
                for token, _ in token_counter.most_common(3)
                if token not in STOP_WORDS
            ]

        selected_tokens = common_tokens[:3]
        if selected_tokens:
            return f"{' '.join(token.title() for token in selected_tokens)} Files"

        parent_name = Path(records[0]["file_path"]).parent.name
        if parent_name:
            return f"{parent_name.title()} Files"

        return "Related Files"


STOP_WORDS = {
    "and",
    "copy",
    "data",
    "doc",
    "docs",
    "document",
    "file",
    "files",
    "finalized",
    "image",
    "img",
    "new",
    "old",
    "pdf",
    "photo",
    "pic",
    "scan",
    "screenshot",
    "text",
    "the",
    "untitled",
    "version",
}


def _tokenize(value: str) -> list[str]:
    return [
        token
        for token in re.split(r"[^a-zA-Z0-9]+", value.lower())
        if len(token) > 2 and not token.isdigit()
    ]
