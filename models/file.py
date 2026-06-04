from enum import Enum
from pathlib import Path

from pydantic import BaseModel, Field


class FileType(str, Enum):
    IMAGE = "image"
    VIDEO = "video"
    DOCUMENT = "document"
    OTHER = "other"


class IndexedFile(BaseModel):
    path: Path
    file_type: FileType = FileType.OTHER
    size_bytes: int | None = Field(default=None, ge=0)
    content_hash: str | None = None
