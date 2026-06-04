import mimetypes
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import FileResponse

router = APIRouter(prefix="/files", tags=["files"])

PREVIEWABLE_MIME_TYPES = {
    "application/pdf",
}
PREVIEWABLE_MIME_PREFIXES = (
    "image/",
    "text/",
)


@router.get("/preview")
async def preview_file(path: str = Query(..., min_length=1)) -> FileResponse:
    file_path = Path(path).expanduser()
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found.",
        )

    media_type, _ = mimetypes.guess_type(file_path.name)
    if media_type is None or not _is_previewable_media_type(media_type):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="File type is not previewable.",
        )

    return FileResponse(
        path=file_path,
        media_type=media_type,
        filename=file_path.name,
    )


def _is_previewable_media_type(media_type: str) -> bool:
    return media_type in PREVIEWABLE_MIME_TYPES or media_type.startswith(
        PREVIEWABLE_MIME_PREFIXES
    )

