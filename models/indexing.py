from enum import Enum
from pathlib import Path

from pydantic import BaseModel, Field


class IndexingState(str, Enum):
    IDLE = "idle"
    RUNNING = "running"
    PAUSED = "paused"
    ERROR = "error"


class IndexPathRequest(BaseModel):
    path: Path = Field(..., description="Local file or directory path to index.")
    recursive: bool = True


class IndexingStatusResponse(BaseModel):
    state: IndexingState
    indexed_files: int = Field(default=0, ge=0)
    pending_files: int = Field(default=0, ge=0)
    index_location: Path
