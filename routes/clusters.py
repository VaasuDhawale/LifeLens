from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.dependencies import get_clustering_service
from models.clusters import ClusterResponse
from services.clustering import SimilarityClusteringService

router = APIRouter(prefix="/clusters", tags=["clusters"])


@router.get("", response_model=ClusterResponse)
async def get_file_clusters(
    threshold: float = Query(default=0.72, gt=0, le=1),
    min_size: int = Query(default=2, ge=2, le=50),
    limit: int = Query(default=12, ge=1, le=100),
    clustering_service: SimilarityClusteringService = Depends(get_clustering_service),
) -> ClusterResponse:
    try:
        return clustering_service.get_clusters(
            similarity_threshold=threshold,
            min_cluster_size=min_size,
            max_clusters=limit,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

