import asyncio
from dataclasses import dataclass
from pathlib import Path
from threading import Lock
from typing import Callable, Protocol

import open_clip
import torch
from PIL import Image, UnidentifiedImageError


class ImageEmbeddingError(RuntimeError):
    """Raised when an image cannot be converted into an embedding."""


class TextTokenizer(Protocol):
    def __call__(self, texts: list[str]) -> torch.Tensor:
        """Tokenize text for CLIP."""


@dataclass(frozen=True)
class CLIPImageEmbeddingConfig:
    """Configuration for CLIP image embeddings."""

    model_name: str = "ViT-B-32"
    pretrained: str = "laion2b_s34b_b79k"
    device: str | None = None
    normalize: bool = True


class CLIPImageEmbeddingService:
    """Reusable CLIP image embedding service.

    The CLIP model is loaded lazily on first use so application startup stays
    light and tests can import the service without requiring model weights.
    """

    def __init__(self, config: CLIPImageEmbeddingConfig | None = None) -> None:
        self.config = config or CLIPImageEmbeddingConfig()
        self.device = torch.device(
            self.config.device or ("cuda" if torch.cuda.is_available() else "cpu")
        )
        self._model: torch.nn.Module | None = None
        self._preprocess: Callable[[Image.Image], torch.Tensor] | None = None
        self._tokenizer: TextTokenizer | None = None
        self._load_lock = Lock()

    def embed_image(self, image_path: str | Path) -> list[float]:
        """Convert an image file into a normalized CLIP embedding vector."""
        path = self._validate_image_path(image_path)
        model, preprocess = self._get_model()

        try:
            with Image.open(path) as image:
                image_tensor = (
                    preprocess(image.convert("RGB"))
                    .unsqueeze(0)
                    .to(self.device)
                )
        except UnidentifiedImageError as exc:
            raise ImageEmbeddingError(f"Unsupported or corrupted image file: {path}") from exc
        except OSError as exc:
            raise ImageEmbeddingError(f"Unable to read image file: {path}") from exc

        with torch.inference_mode():
            embedding = model.encode_image(image_tensor)
            if self.config.normalize:
                embedding = embedding / embedding.norm(
                    dim=-1,
                    keepdim=True,
                ).clamp(min=1e-12)

        return embedding.squeeze(0).detach().cpu().float().tolist()

    async def embed_image_async(self, image_path: str | Path) -> list[float]:
        """Async-friendly wrapper for background indexing or API handlers."""
        return await asyncio.to_thread(self.embed_image, image_path)

    def embed_text(self, text: str) -> list[float]:
        """Convert natural language text into a CLIP query embedding."""
        query = text.strip()
        if not query:
            raise ValueError("Text query must not be empty.")

        model, tokenizer = self._get_text_model()
        tokens = tokenizer([query]).to(self.device)

        with torch.inference_mode():
            embedding = model.encode_text(tokens)
            if self.config.normalize:
                embedding = embedding / embedding.norm(
                    dim=-1,
                    keepdim=True,
                ).clamp(min=1e-12)

        return embedding.squeeze(0).detach().cpu().float().tolist()

    async def embed_text_async(self, text: str) -> list[float]:
        """Async-friendly CLIP text embedding wrapper."""
        return await asyncio.to_thread(self.embed_text, text)

    def _get_model(self) -> tuple[torch.nn.Module, Callable[[Image.Image], torch.Tensor]]:
        if self._model is None or self._preprocess is None:
            with self._load_lock:
                if self._model is None or self._preprocess is None:
                    model, _, preprocess = open_clip.create_model_and_transforms(
                        self.config.model_name,
                        pretrained=self.config.pretrained,
                    )
                    model.to(self.device)
                    model.eval()
                    self._model = model
                    self._preprocess = preprocess

        assert self._model is not None
        assert self._preprocess is not None
        return self._model, self._preprocess

    def _get_text_model(self) -> tuple[torch.nn.Module, TextTokenizer]:
        if self._model is None or self._tokenizer is None:
            with self._load_lock:
                if self._model is None:
                    model, _, preprocess = open_clip.create_model_and_transforms(
                        self.config.model_name,
                        pretrained=self.config.pretrained,
                    )
                    model.to(self.device)
                    model.eval()
                    self._model = model
                    self._preprocess = preprocess
                if self._tokenizer is None:
                    self._tokenizer = open_clip.get_tokenizer(self.config.model_name)

        assert self._model is not None
        assert self._tokenizer is not None
        return self._model, self._tokenizer

    @staticmethod
    def _validate_image_path(image_path: str | Path) -> Path:
        path = Path(image_path).expanduser()
        if not path.exists():
            raise FileNotFoundError(f"Image file does not exist: {path}")
        if not path.is_file():
            raise ValueError(f"Image path must point to a file: {path}")
        return path
