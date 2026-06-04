from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.dependencies import get_search_service
from models.search import SearchMode, SearchRequest, SearchResponse
from services.search_service import SearchService

router = APIRouter(prefix="/search", tags=["search"])


@router.post("", response_model=SearchResponse, response_model_exclude_none=True)
async def search_files(
    request: SearchRequest,
    search_service: SearchService = Depends(get_search_service),
) -> SearchResponse:
    try:
        return await search_service.search(request)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


@router.get("", response_model=SearchResponse, response_model_exclude_none=True)
async def search_files_get(
    q: str,
    limit: int = Query(default=10, ge=1, le=100),
    threshold: float = Query(default=0.45, ge=0, le=1),
    mode: SearchMode = SearchMode.HYBRID,
    search_service: SearchService = Depends(get_search_service),
) -> SearchResponse:
    try:
        return await search_service.search(
            SearchRequest(query=q, limit=limit, threshold=threshold, mode=mode)
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
