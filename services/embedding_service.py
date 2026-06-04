from typing import Protocol


class EmbeddingService(Protocol):
    """Contract for text and multimodal embedding providers."""

    async def embed_text(self, text: str) -> list[float]:
        """Create a Sentence-BERT text embedding."""
        raise NotImplementedError

    async def embed_image(self, image_path: str) -> list[float]:
        """Create a CLIP image embedding."""
        raise NotImplementedError

