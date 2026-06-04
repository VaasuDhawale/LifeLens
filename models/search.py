from enum import Enum
from pathlib import Path
from typing import Any

from pydantic import BaseModel, Field


class SearchMode(str, Enum):
    EXACT = "exact"
    HYBRID = "hybrid"
    SEMANTIC = "semantic"


class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=500)
    limit: int = Field(default=10, ge=1, le=100)
    threshold: float = Field(default=0.45, ge=0, le=1)
    mode: SearchMode = SearchMode.HYBRID
    file_types: list[str] = Field(default_factory=list)


class SearchResult(BaseModel):
    path: Path
    score: float = Field(..., ge=0)
    title: str | None = None
    snippet: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class SearchResponse(BaseModel):
    query: str
    results: list[SearchResult]
    count: int = Field(..., ge=0)
