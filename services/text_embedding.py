import asyncio
from dataclasses import dataclass
from threading import Lock
from typing import Sequence

import numpy as np
from sentence_transformers import SentenceTransformer


class TextEmbeddingError(RuntimeError):
    """Raised when text cannot be converted into an embedding."""


@dataclass(frozen=True)
class SentenceBERTTextEmbeddingConfig:
    """Configuration for Sentence-BERT text embeddings."""

    model_name: str = "sentence-transformers/all-MiniLM-L6-v2"
    device: str | None = None
    normalize: bool = True
    batch_size: int = 32
    max_chars: int = 8_000


class SentenceBERTTextEmbeddingService:
    """Reusable Sentence-BERT text embedding service.

    Embeddings are L2-normalized by default, which makes them ready for
    semantic similarity search with cosine or inner-product vector indexes.
    """

    def __init__(self, config: SentenceBERTTextEmbeddingConfig | None = None) -> None:
        self.config = config or SentenceBERTTextEmbeddingConfig()
        self._model: SentenceTransformer | None = None
        self._load_lock = Lock()

    def embed_text(self, text: str) -> list[float]:
        """Convert a single text query into a semantic embedding vector."""
        validated_text = self._validate_text(text)
        model = self._get_model()

        try:
            embedding = model.encode(
                validated_text,
                convert_to_numpy=True,
                normalize_embeddings=self.config.normalize,
                show_progress_bar=False,
            )
        except Exception as exc:
            raise TextEmbeddingError("Unable to create text embedding.") from exc

        return np.asarray(embedding, dtype=np.float32).tolist()

    def embed_texts(self, texts: Sequence[str]) -> list[list[float]]:
        """Convert multiple text inputs into semantic embedding vectors."""
        validated_texts = [self._validate_text(text) for text in texts]
        if not validated_texts:
            return []

        model = self._get_model()

        try:
            embeddings = model.encode(
                validated_texts,
                batch_size=self.config.batch_size,
                convert_to_numpy=True,
                normalize_embeddings=self.config.normalize,
                show_progress_bar=False,
            )
        except Exception as exc:
            raise TextEmbeddingError("Unable to create text embeddings.") from exc

        return np.asarray(embeddings, dtype=np.float32).tolist()

    async def embed_text_async(self, text: str) -> list[float]:
        """Async-friendly wrapper for API handlers or background jobs."""
        return await asyncio.to_thread(self.embed_text, text)

    async def embed_texts_async(self, texts: Sequence[str]) -> list[list[float]]:
        """Async-friendly batch embedding wrapper."""
        return await asyncio.to_thread(self.embed_texts, texts)

    def _get_model(self) -> SentenceTransformer:
        if self._model is None:
            with self._load_lock:
                if self._model is None:
                    self._model = SentenceTransformer(
                        self.config.model_name,
                        device=self.config.device,
                    )

        assert self._model is not None
        return self._model

    def _validate_text(self, text: str) -> str:
        normalized_text = text.strip()
        if not normalized_text:
            raise ValueError("Text query must not be empty.")
        if len(normalized_text) > self.config.max_chars:
            raise ValueError(
                f"Text query exceeds the {self.config.max_chars} character limit."
            )
        return normalized_text

