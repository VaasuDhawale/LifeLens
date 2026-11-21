# FAISS Compatibility and Persistence

## 1. Index Structure
The vector database persists two independent indices under `database/faiss`:
- `database/faiss/text/vectors.faiss`: 35 vectors (dim 384, IndexFlatIP)
- `database/faiss/text/vectors_metadata.json`: 35 metadata records
- `database/faiss/images/vectors.faiss`: 7 vectors (dim 512, IndexFlatIP)
- `database/faiss/images/vectors_metadata.json`: 7 metadata records

## 2. Integrity and Non-Destructive Ingestion
- Existing vector indices were preserved with zero data loss or dimension corruption.
- Added language metadata fields (`primary_script`, `is_multilingual`) seamlessly to newly indexed documents.
- Atomic file writes using `.tmp` extensions prevent index corruption on sudden power loss or process kill.
