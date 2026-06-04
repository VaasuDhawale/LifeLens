from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables or .env."""

    app_name: str = "AI Personal Search Engine"
    app_version: str = "0.1.0"
    environment: str = "development"
    debug: bool = False
    api_prefix: str = "/api/v1"

    allowed_origins: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ]
    )

    storage_dir: Path = Path("storage")
    index_dir: Path = Path("database/faiss")
    watch_directories: list[Path] = Field(default_factory=list)
    enable_file_watcher: bool = True
    file_watcher_recursive: bool = True
    file_watcher_settle_seconds: float = Field(default=0.5, ge=0)
    enable_ocr: bool = True
    ocr_language: str = "eng"
    tesseract_cmd: str | None = None
    ocr_pdf_dpi: int = Field(default=200, ge=72)
    ocr_max_pdf_pages: int = Field(default=20, ge=1)

    clip_model_name: str = "ViT-B-32"
    clip_pretrained: str = "laion2b_s34b_b79k"
    clip_device: str | None = None

    sbert_model_name: str = "sentence-transformers/all-MiniLM-L6-v2"
    sbert_device: str | None = None
    sbert_normalize: bool = True
    sbert_batch_size: int = Field(default=32, ge=1)
    sbert_max_chars: int = Field(default=8_000, ge=1)

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_nested_delimiter="__",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
