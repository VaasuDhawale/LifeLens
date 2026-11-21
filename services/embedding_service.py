from typing import Protocol


class EmbeddingService(Protocol):
    """Contract for text and multimodal embedding providers."""

    def embed_text(self, text: str) -> list[float]:
        """Create a text embedding."""
        ...

    def embed_image(self, image_path: str) -> list[float]:
        """Create an image embedding."""
        ...

