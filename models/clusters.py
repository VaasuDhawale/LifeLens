from pathlib import Path
from typing import Any

from pydantic import BaseModel, Field


class ClusterFile(BaseModel):
    path: Path
    file_name: str
    file_type: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class FileCluster(BaseModel):
    title: str
    files: list[ClusterFile]
    size: int = Field(..., ge=0)
    average_similarity: float = Field(..., ge=0)
    source: str


class ClusterResponse(BaseModel):
    clusters: list[FileCluster]
    count: int = Field(..., ge=0)

