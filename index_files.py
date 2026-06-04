import argparse
import sys
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Index local files into FAISS using CLIP and Sentence-BERT."
    )
    parser.add_argument(
        "folder",
        nargs="?",
        default="test_data",
        help="Folder to scan. Defaults to test_data/.",
    )
    parser.add_argument(
        "--index-dir",
        default="database/faiss",
        help="Directory where FAISS indexes and metadata are stored.",
    )
    parser.add_argument(
        "--no-recursive",
        action="store_true",
        help="Scan only the top level of the folder.",
    )
    parser.add_argument(
        "--ocr",
        action="store_true",
        help="Also OCR images and scanned PDFs into the text index.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    folder = Path(args.folder).expanduser()
    index_dir = Path(args.index_dir).expanduser()

    if not folder.exists() or not folder.is_dir():
        print(f"Folder not found: {folder}", file=sys.stderr)
        return 1

    try:
        from services.image_embedding import CLIPImageEmbeddingService
        from services.indexing import FileIndexingConfig, FileIndexingService
        from services.text_embedding import SentenceBERTTextEmbeddingService
        from services.vector_db import FAISSVectorDB
    except ImportError as exc:
        print(
            "Missing indexing dependency. Run `pip install -r requirements.txt` first.",
            file=sys.stderr,
        )
        print(f"Import error: {exc}", file=sys.stderr)
        return 1

    indexer = FileIndexingService(
        config=FileIndexingConfig(
            index_dir=index_dir,
            scan_directories=(folder,),
            recursive=not args.no_recursive,
            enable_ocr=args.ocr,
        ),
        image_embedding_service=CLIPImageEmbeddingService(),
        text_embedding_service=SentenceBERTTextEmbeddingService(),
        image_vector_db=FAISSVectorDB(index_dir=index_dir / "images"),
        text_vector_db=FAISSVectorDB(index_dir=index_dir / "text"),
    )

    print(f"Scanning: {folder}")
    print(f"FAISS index output: {index_dir}")

    summary = indexer.index_directories(
        [folder],
        recursive=not args.no_recursive,
    )

    print()
    print("Indexing complete")
    print(f"Scanned files: {summary.scanned_files}")
    print(f"Indexed files: {summary.indexed_files}")
    print(f"Skipped files: {summary.skipped_files}")
    print(f"Failed files: {summary.failed_files}")

    if summary.results:
        print()
        print("Files")
        for result in summary.results:
            status = "indexed" if result.indexed else "skipped"
            file_type = result.file_type.value if result.file_type else "unsupported"
            print(f"- {status}: {result.path} ({file_type})")
            if result.error:
                print(f"  reason: {result.error}")

    return 0 if summary.failed_files == 0 else 2


if __name__ == "__main__":
    raise SystemExit(main())
