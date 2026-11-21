from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.dependencies import get_file_watcher_service
from routes import clusters, files, health, indexing, search


@asynccontextmanager
async def lifespan(application: FastAPI):
    settings = get_settings()
    if settings.enable_file_watcher:
        await get_file_watcher_service().start()

    yield

    if settings.enable_file_watcher:
        await get_file_watcher_service().stop()


def create_app() -> FastAPI:
    settings = get_settings()

    application = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        debug=settings.debug,
        description="Local-first backend for natural language search across personal files.",
        lifespan=lifespan,
    )

    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    application.include_router(health.router, prefix=settings.api_prefix)
    application.include_router(search.router, prefix=settings.api_prefix)
    application.include_router(indexing.router, prefix=settings.api_prefix)
    application.include_router(files.router, prefix=settings.api_prefix)
    application.include_router(clusters.router, prefix=settings.api_prefix)

    return application


app = create_app()
