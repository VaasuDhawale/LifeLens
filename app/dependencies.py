from functools import lru_cache

from app.config import get_settings
from services.clustering import SimilarityClusteringService
from services.file_watcher_service import FileWatcherConfig, FileWatcherService
from services.image_embedding import CLIPImageEmbeddingConfig, CLIPImageEmbeddingService
from services.indexing import FileIndexingConfig, FileIndexingService
from services.ocr import OCRConfig, OCRService
from services.search_service import SearchService
from services.text_embedding import (
    SentenceBERTTextEmbeddingConfig,
    SentenceBERTTextEmbeddingService,
)
from services.vector_db import FAISSVectorDB


@lru_cache
def get_search_service() -> SearchService:
    return SearchService(
        text_embedding_service=get_text_embedding_service(),
        image_embedding_service=get_image_embedding_service(),
        text_vector_db=get_text_vector_db_service(),
        image_vector_db=get_image_vector_db_service(),
    )


@lru_cache
def get_indexing_service() -> FileIndexingService:
    settings = get_settings()
    return FileIndexingService(
        config=FileIndexingConfig(
            index_dir=settings.index_dir,
            scan_directories=tuple(settings.watch_directories)
            if settings.watch_directories
            else FileIndexingConfig().scan_directories,
            enable_ocr=settings.enable_ocr,
        ),
        image_embedding_service=get_image_embedding_service(),
        text_embedding_service=get_text_embedding_service(),
        ocr_service=get_ocr_service(),
        image_vector_db=get_image_vector_db_service(),
        text_vector_db=get_text_vector_db_service(),
    )


@lru_cache
def get_image_embedding_service() -> CLIPImageEmbeddingService:
    settings = get_settings()
    return CLIPImageEmbeddingService(
        CLIPImageEmbeddingConfig(
            model_name=settings.clip_model_name,
            pretrained=settings.clip_pretrained,
            device=settings.clip_device,
        )
    )


@lru_cache
def get_text_embedding_service() -> SentenceBERTTextEmbeddingService:
    settings = get_settings()
    return SentenceBERTTextEmbeddingService(
        SentenceBERTTextEmbeddingConfig(
            model_name=settings.sbert_model_name,
            device=settings.sbert_device,
            normalize=settings.sbert_normalize,
            batch_size=settings.sbert_batch_size,
            max_chars=settings.sbert_max_chars,
        )
    )


@lru_cache
def get_ocr_service() -> OCRService:
    settings = get_settings()
    return OCRService(
        OCRConfig(
            language=settings.ocr_language,
            tesseract_cmd=settings.tesseract_cmd,
            pdf_dpi=settings.ocr_pdf_dpi,
            max_pdf_pages=settings.ocr_max_pdf_pages,
        )
    )


@lru_cache
def get_vector_db_service() -> FAISSVectorDB:
    settings = get_settings()
    return FAISSVectorDB(index_dir=settings.index_dir)


@lru_cache
def get_text_vector_db_service() -> FAISSVectorDB:
    settings = get_settings()
    return FAISSVectorDB(index_dir=settings.index_dir / "text")


@lru_cache
def get_image_vector_db_service() -> FAISSVectorDB:
    settings = get_settings()
    return FAISSVectorDB(index_dir=settings.index_dir / "images")


@lru_cache
def get_clustering_service() -> SimilarityClusteringService:
    return SimilarityClusteringService(
        text_vector_db=get_text_vector_db_service(),
        image_vector_db=get_image_vector_db_service(),
    )


@lru_cache
def get_file_watcher_service() -> FileWatcherService:
    settings = get_settings()
    watch_directories = (
        tuple(settings.watch_directories)
        if settings.watch_directories
        else FileWatcherConfig().watch_directories
    )
    return FileWatcherService(
        indexing_service=get_indexing_service(),
        config=FileWatcherConfig(
            watch_directories=watch_directories,
            recursive=settings.file_watcher_recursive,
            settle_seconds=settings.file_watcher_settle_seconds,
        ),
        watch_directories=watch_directories,
    )
