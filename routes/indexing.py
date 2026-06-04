from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies import get_indexing_service
from models.indexing import IndexPathRequest, IndexingStatusResponse
from services.indexing import FileIndexingService

router = APIRouter(prefix="/index", tags=["indexing"])


@router.get("/status", response_model=IndexingStatusResponse)
async def get_indexing_status(
    indexing_service: FileIndexingService = Depends(get_indexing_service),
) -> IndexingStatusResponse:
    return indexing_service.get_status()


@router.post("/path", status_code=status.HTTP_202_ACCEPTED)
async def index_path(
    request: IndexPathRequest,
    indexing_service: FileIndexingService = Depends(get_indexing_service),
) -> dict[str, str]:
    try:
        await indexing_service.queue_path(request)
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc

    return {"status": "accepted"}
