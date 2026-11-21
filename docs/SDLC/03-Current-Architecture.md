# LifeLens AI — Current Architecture

**Document Version:** 1.0  
**Phase:** Phase 1 — SDLC Audit  
**Date:** 2026-09-04  
**Status:** Baseline (Pre-upgrade) — Based on actual code inspection

---

## 1. System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER'S LOCAL MACHINE                     │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    FRONTEND (Port 5173)                  │  │
│  │          React 19 + TypeScript + Vite 7                  │  │
│  │         Tailwind CSS 3 + Framer Motion 12                │  │
│  │              Three.js (3D scene)                         │  │
│  └───────────────────────────┬──────────────────────────────┘  │
│                              │  HTTP (localhost:8000)           │
│                              │  POST /api/v1/search            │
│                              │  GET  /api/v1/health            │
│                              │  GET  /api/v1/index/status      │
│                              │  GET  /api/v1/files/preview     │
│                              │  GET  /api/v1/clusters          │
│                              │  POST /api/v1/index/path        │
│  ┌───────────────────────────▼──────────────────────────────┐  │
│  │                  BACKEND (Port 8000)                     │  │
│  │              FastAPI + uvicorn + Pydantic                 │  │
│  │                                                          │  │
│  │  ┌─────────────┐ ┌──────────────┐ ┌───────────────────┐ │  │
│  │  │  Routes     │ │   Services   │ │     Models        │ │  │
│  │  │             │ │              │ │                   │ │  │
│  │  │ search.py   │ │ search_      │ │ search.py         │ │  │
│  │  │ indexing.py │ │ service.py   │ │ indexing.py       │ │  │
│  │  │ files.py    │ │ indexing.py  │ │ clusters.py       │ │  │
│  │  │ clusters.py │ │ clustering.py│ │ health.py         │ │  │
│  │  │ health.py   │ │ vector_db.py │ │                   │ │  │
│  │  └─────────────┘ │ text_        │ └───────────────────┘ │  │
│  │                  │ embedding.py │                        │  │
│  │                  │ image_       │                        │  │
│  │                  │ embedding.py │                        │  │
│  │                  │ ocr.py       │                        │  │
│  │                  │ file_watcher │                        │  │
│  │                  │ _service.py  │                        │  │
│  │                  └──────────────┘                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌────────────────────────────────┐  ┌───────────────────────┐ │
│  │  AI MODELS (Lazy-Loaded)       │  │  FAISS STORAGE        │ │
│  │                                │  │  database/faiss/      │ │
│  │  Sentence-BERT                 │  │  ├── text/            │ │
│  │  (all-MiniLM-L6-v2)            │  │  │   ├── vectors.faiss│ │
│  │  384-dim text embeddings       │  │  │   └── vectors_     │ │
│  │                                │  │      metadata.json    │ │
│  │  CLIP (ViT-B-32)               │  │  └── images/          │ │
│  │  laion2b_s34b_b79k             │  │      ├── vectors.faiss│ │
│  │  512-dim image/text embeddings │  │      └── vectors_     │ │
│  │                                │  │          metadata.json│ │
│  │  Tesseract OCR (English only)  │  └───────────────────────┘ │
│  └────────────────────────────────┘                             │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  LOCAL FILE SYSTEM                                      │   │
│  │  test_data/  (default scan dir)                         │   │
│  │  Downloads/, Desktop/ (file watcher default)            │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Frontend Architecture

```
frontend/src/
├── App.tsx                          -- Entry: renders <Home /> ONLY
├── main.tsx                         -- ReactDOM.createRoot
├── styles.css                       -- Global styles + Tailwind base
├── vite-env.d.ts                    -- Vite type definitions
│
├── pages/
│   ├── Home.tsx (649 lines)         -- PRIMARY active page
│   │   Uses: useSearch.ts, useBackendStatus.ts
│   │   Components: SearchBar.tsx, ResultCard.tsx, PreviewPanel.tsx,
│   │               SystemStatus.tsx, MemoryCoreScene.tsx
│   │   State: useSearch hook (local React state, no Zustand)
│   │
│   └── SearchPage.jsx (190 lines)  -- UNREACHABLE (not in routing)
│       Uses: searchStore.js (Zustand), api.js
│       Components: HeroSearch.jsx, FilterBar.jsx, ResultGrid.jsx,
│                   PreviewPanel.jsx, SmartCollections.jsx,
│                   RecentSearchRail.jsx, CommandPalette.jsx,
│                   FloatingNav.jsx, ToastStack.jsx
│
├── components/
│   ├── SearchBar.tsx (655 lines)   -- Used by Home.tsx
│   │   Features: mode selector, threshold slider, smart suggestions,
│   │             thinking steps animation, placeholder rotation
│   │
│   ├── ResultCard.tsx (565 lines)  -- Used by Home.tsx
│   │   Features: image preview, match explanation, keywords,
│   │             score display, expand/collapse, copy path
│   │
│   ├── PreviewPanel.tsx (378 lines) -- Used by Home.tsx
│   │   Features: side panel, file preview, metadata, match info
│   │
│   ├── SystemStatus.tsx (153 lines) -- Used by Home.tsx
│   │   Features: backend status, indexing state, animated counter
│   │
│   ├── MemoryCoreScene.tsx (lazy) -- Used by Home.tsx
│   │   Features: Three.js 3D particle scene
│   │
│   ├── HeroSearch.jsx             -- Used by SearchPage.jsx (unreachable)
│   ├── FilterBar.jsx              -- Used by SearchPage.jsx (unreachable)
│   ├── ResultGrid.jsx             -- Used by SearchPage.jsx (unreachable)
│   ├── PreviewPanel.jsx           -- Used by SearchPage.jsx (unreachable)
│   ├── SmartCollections.jsx       -- Used by SearchPage.jsx (unreachable)
│   ├── RecentSearchRail.jsx       -- Used by SearchPage.jsx (unreachable)
│   ├── CommandPalette.jsx         -- Used by SearchPage.jsx (unreachable)
│   ├── FloatingNav.jsx            -- Used by SearchPage.jsx (unreachable)
│   ├── ToastStack.jsx             -- Used by SearchPage.jsx (unreachable)
│   ├── EmptyState.jsx             -- Standalone (unused?)
│   ├── IndexingStatus.jsx         -- Standalone (unused?)
│   ├── LoadingSkeleton.jsx        -- Standalone (unused?)
│   └── ResultCard.jsx             -- Used by SearchPage.jsx (unreachable)
│
├── hooks/
│   ├── useSearch.ts               -- Used by Home.tsx
│   │   State: query, threshold, mode, results, loading, error
│   │   Logic: debounce, cache (24 entries), abort, search calls
│   │
│   ├── useBackendStatus.ts        -- Used by Home.tsx
│   │   Logic: polls /health + /index/status every 6 seconds
│   │
│   ├── useDebouncedValue.js       -- Used by SearchPage.jsx (unreachable)
│   └── useKeyboardShortcuts.js    -- Used by SearchPage.jsx (unreachable)
│
├── services/
│   ├── api.ts (274 lines)         -- Used by Home.tsx
│   │   Functions: searchFiles(), getHealth(), getIndexingStatus(),
│   │              getPreviewUrl()
│   │   Base URL: VITE_API_BASE_URL || http://127.0.0.1:8000
│   │
│   └── api.js (79 lines)         -- Used by SearchPage.jsx (unreachable)
│       Functions: searchFiles(), getClusters(), getIndexingStatus(),
│                  getPreviewUrl(), clusterToResults()
│       Base URL: VITE_API_BASE_URL || http://127.0.0.1:8000
│
├── store/
│   └── searchStore.js (250 lines) -- Zustand store, used by SearchPage.jsx (unreachable)
│       State: query, results, clusters, filters, toasts,
│              recentSearches, indexingStatus, commandOpen
│
├── utils/
│   └── files.js (112 lines)      -- Used by api.js
│       Functions: normalizeSearchResult(), clusterFileToResult(),
│                  inferFileType(), buildTags()
│
└── animations/
    └── variants.js                -- Framer Motion variants for SearchPage
```

---

## 3. Backend Architecture

```
app/
├── __init__.py
├── main.py                       -- FastAPI app factory + CORS + router registration
│                                    BUG: search, files, clusters routers registered TWICE
├── config.py                     -- Pydantic BaseSettings (all settings from .env)
└── dependencies.py               -- lru_cache singletons for all services

routes/
├── __init__.py
├── health.py    --> GET /api/v1/health          -> HealthResponse
├── search.py    --> POST /api/v1/search         -> SearchResponse
│                    GET  /api/v1/search?q=...   -> SearchResponse
├── indexing.py  --> GET  /api/v1/index/status   -> IndexingStatusResponse
│                    POST /api/v1/index/path     -> {status: accepted}
├── files.py     --> GET  /api/v1/files/preview  -> FileResponse (SECURITY RISK)
└── clusters.py  --> GET  /api/v1/clusters       -> ClusterResponse

models/
├── __init__.py
├── health.py    -- HealthResponse
├── search.py    -- SearchRequest, SearchResponse, SearchResult, SearchMode
├── indexing.py  -- IndexPathRequest, IndexingStatusResponse, IndexingState
├── clusters.py  -- ClusterFile, FileCluster, ClusterResponse
└── file.py      -- (empty/unused)

services/
├── __init__.py
├── search_service.py (506 lines) -- Core search logic
│   Classes: SearchService, RankedCandidate, KeywordEvidence, SearchBackendResult
│   Functions: combined_score(), keyword_evidence(), tokenize_keywords(),
│              count_substring_occurrences(), extract_searchable_text(),
│              phrase_match_bonus(), build_snippet(), clamp_score(), sort_key()
│
├── indexing.py (519 lines)       -- File indexing + text extraction
│   Classes: FileIndexingService, FileIndexingConfig, SupportedFileType
│   Functions: detect_file_type(), extract_plain_text(), extract_pdf_text(),
│              extract_docx_text(), extract_docx_xml_text(),
│              normalize_extracted_text(), tokenize_keywords()
│
├── vector_db.py (319 lines)      -- FAISS wrapper
│   Classes: FAISSVectorDB, VectorMetadata
│   Functions: add_vector(), search_vector(), reload(), list_metadata(),
│              list_vectors(), save(), _load(), _prepare_vector()
│
├── text_embedding.py (105 lines) -- Sentence-BERT wrapper
│   Classes: SentenceBERTTextEmbeddingService, SentenceBERTTextEmbeddingConfig
│   Model: all-MiniLM-L6-v2 (384-dim, English-optimized)
│
├── image_embedding.py (146 lines) -- CLIP wrapper
│   Classes: CLIPImageEmbeddingService, CLIPImageEmbeddingConfig
│   Model: ViT-B-32 (512-dim, multilingual via CLIP training)
│
├── ocr.py (89 lines)             -- Tesseract OCR wrapper
│   Classes: OCRService, OCRConfig
│   Language: "eng" by default
│   PDF OCR: PyMuPDF (fitz) render + pytesseract
│
├── clustering.py (292 lines)     -- Vector similarity clustering
│   Classes: SimilarityClusteringService, SimilarityClusteringConfig
│   Algorithm: Connected components on cosine similarity matrix
│
├── file_watcher_service.py (197 lines) -- Watchdog integration
│   Classes: FileWatcherService, FileWatcherConfig
│   Events: FileCreated, FileMoved -> queue -> index
│
├── embedding_service.py          -- (stub/minimal, 7 lines)
├── indexing_service.py           -- (stub/minimal, 4 lines)
└── ocr.py                       -- (see above)

database/
├── __init__.py
├── vector_store.py               -- (stub referencing FAISSVectorDB)
└── faiss/                        -- FAISS runtime artifacts (gitignored)
    ├── text/
    │   ├── vectors.faiss          -- FAISS index (IndexFlatIP, 384-dim)
    │   └── vectors_metadata.json -- List of {file_path, file_type, file_name, extra}
    └── images/
        ├── vectors.faiss          -- FAISS index (IndexFlatIP, 512-dim)
        └── vectors_metadata.json -- List of {file_path, file_type, file_name, extra}
```

---

## 4. Data Flow — Actual Indexing

```
FILE ON DISK
    │
    ▼
detect_file_type(path)
    │ extension → SupportedFileType enum
    │ IMAGE: .bmp .gif .jpeg .jpg .png .tif .tiff .webp
    │ PDF:   .pdf
    │ DOCX:  .docx
    │ TEXT:  .csv .htm .html .json .log .md .py .rtf .text .tsv .txt .xml .yaml .yml
    │
    ▼ (IMAGE path)
CLIPImageEmbeddingService.embed_image(path)
    │ open_clip.create_model_and_transforms(ViT-B-32, laion2b_s34b_b79k)
    │ preprocess → encode_image → normalize → 512-dim float list
    ▼
FAISSVectorDB(database/faiss/images/).add_vector()
    │ _prepare_vector() → L2-normalize → reshape(1,-1)
    │ IndexFlatIP.add()
    │ metadata: {file_path, file_type:"image", file_name, extra:{suffix, source, content_source}}
    ▼
save() → atomic write to vectors.faiss + vectors_metadata.json

    │ (if OCR enabled)
    ▼
OCRService.extract_text_from_image(path)
    │ PIL.Image.open() → .convert("RGB") → pytesseract.image_to_string(lang="eng")
    ▼
    │ (if OCR text non-empty)
SentenceBERTTextEmbeddingService.embed_text(ocr_text[:8000])
    │ SentenceTransformer("all-MiniLM-L6-v2").encode() → normalize → 384-dim
    ▼
FAISSVectorDB(database/faiss/text/).add_vector()
    │ metadata: {searchable_text, text_preview, content_source:"ocr"}

    ▼ (PDF path)
extract_pdf_text(path) -- pypdf.PdfReader
    │ [+ OCR if enable_ocr]
normalize_extracted_text(text)
    │ collapse whitespace, de-duplicate blank lines
truncate(text, max_chars=8000)
SentenceBERTTextEmbeddingService.embed_text()
FAISSVectorDB(database/faiss/text/).add_vector()
    │ metadata: {searchable_text: full_text, text_preview: first 500 chars}

    ▼ (DOCX path)
extract_docx_text(path) -- zipfile + ElementTree XML
    │ reads word/document.xml + footnotes + endnotes + headers/footers
    │ extracts <w:t> text elements
normalize → truncate → embed → add_vector

    ▼ (TEXT path)
extract_plain_text(path) -- tries utf-8, utf-8-sig, cp1252, latin-1
normalize → truncate → embed → add_vector
```

---

## 5. Data Flow — Actual Search

```
Frontend Query Input (useSearch.ts)
    │ debounce 320ms
    │ min 2 chars
    │ cache check (24-entry LRU map)
    ▼
POST /api/v1/search
{
  "query": "user query",
  "threshold": 0.45,
  "mode": "hybrid",
  "limit": 24,
  "file_types": []
}
    ▼
SearchService.search(request)
    │
    ├─ tokenize_keywords(query) → [a-z0-9]+ tokens (ASCII ONLY)
    │
    ├─ _keyword_candidates(query, query_terms, requested_types)
    │   │ reload text + image vector DBs (reads files from disk)
    │   │ for each metadata record:
    │   │   keyword_evidence():
    │   │     filename_text = file_name + path.stem
    │   │     content_text = searchable_text + text_preview + ocr_text
    │   │     for each term:
    │   │       filename_count = re.findall(term, filename_lower)  ← SUBSTRING
    │   │       content_count = re.findall(term, content_lower)    ← SUBSTRING
    │   │     keyword_score = total_coverage + filename_coverage*0.15
    │   │                   + content_coverage*0.08 + phrase_bonus + occurrence_bonus
    │   │   → RankedCandidate if keyword_score > 0
    │
    ├─ [if mode != EXACT]:
    │   ├─ _search_text(query, limit=192):
    │   │   embed_text_async(query) → FAISS.search_vector(query_vec, 192)
    │   │   → top-K semantic matches
    │   └─ _search_images(query, limit=192):
    │       embed_text_async(query) via CLIP → FAISS.search_vector()
    │       → top-K image semantic matches
    │
    └─ _rank_results():
        merge keyword_candidates + semantic backend_results
        for each candidate:
          combined_score(candidate, mode):
            EXACT:    keyword_score
            HYBRID:   0.70*keyword + 0.30*semantic
            SEMANTIC: 0.35*keyword + 0.65*semantic (kw>0)
                      0.35*semantic (kw=0, penalty)
          filters:
            mode != EXACT: score < threshold → skip
            mode in {EXACT, HYBRID}: keyword_score <= 0 → skip
        sort by (score, occurrence_count) desc
        return top limit results
    ▼
SearchResponse
    ▼
Frontend normalizeSearchResult():
    filePath, fileName (from title/metadata), fileType (from metadata or extension),
    previewUrl (images only), score, snippet, matchExplanation
    ▼
ResultCard[] + PreviewPanel
```

---

## 6. Storage Architecture

```
database/faiss/
├── text/
│   ├── vectors.faiss
│   │   Type: faiss.IndexFlatIP (inner product = cosine on L2-normalized vectors)
│   │   Dimension: 384 (all-MiniLM-L6-v2)
│   │   Stored: one vector per indexed text file (or OCR text from image)
│   │   NOT persistent across dimension changes
│   │
│   └── vectors_metadata.json
│       Format: JSON array of:
│       [
│         {
│           "file_path": "/absolute/path/to/file.pdf",
│           "file_type": "pdf",
│           "file_name": "filename.pdf",
│           "extra": {
│             "suffix": ".pdf",
│             "source": "local_file_indexer",
│             "content_source": "text_extraction",
│             "searchable_text": "<full extracted text>",  ← stored in JSON
│             "text_preview": "<first 500 chars>",
│             "content_char_count": 3420,
│             "embedding_char_count": 3420
│           }
│         }
│       ]
│
└── images/
    ├── vectors.faiss
    │   Type: faiss.IndexFlatIP
    │   Dimension: 512 (CLIP ViT-B-32)
    │   Stored: one vector per indexed image file
    │
    └── vectors_metadata.json
        Format: Same structure, extra: {suffix, source, content_source:"clip_image"}
```

**Important Notes:**
- There is NO SQL database, NoSQL database, or SQLite.
- ALL document text is stored inside `vectors_metadata.json` as plain JSON strings.
- For a large index (10,000 files, avg 3KB text each), the metadata JSON will be ~30MB, loaded fully into RAM on every `reload()`.
- FAISS index is saved atomically (write to .tmp then rename).
- Index survives server restart because it's file-based.
- Index does NOT survive if files are deleted (stale entries remain).

---

## 7. Configuration Architecture

```
.env (or environment variables)
    │
    ▼
app/config.py  Settings(BaseSettings)
    │ model_config = SettingsConfigDict(env_file=".env")
    │
    ├── app_name, app_version, environment, debug, api_prefix
    ├── allowed_origins: list[str]
    ├── storage_dir: Path = "storage"
    ├── index_dir: Path = "database/faiss"
    ├── watch_directories: list[Path] = []
    ├── enable_file_watcher: bool = True
    ├── file_watcher_recursive: bool = True
    ├── file_watcher_settle_seconds: float = 0.5
    ├── enable_ocr: bool = True
    ├── ocr_language: str = "eng"
    ├── tesseract_cmd: str | None = None
    ├── ocr_pdf_dpi: int = 200
    ├── ocr_max_pdf_pages: int = 20
    ├── clip_model_name: str = "ViT-B-32"
    ├── clip_pretrained: str = "laion2b_s34b_b79k"
    ├── clip_device: str | None = None
    ├── sbert_model_name: str = "sentence-transformers/all-MiniLM-L6-v2"
    ├── sbert_device: str | None = None
    ├── sbert_normalize: bool = True
    ├── sbert_batch_size: int = 32
    └── sbert_max_chars: int = 8000
```

---

## 8. Known Architectural Bugs

| Bug | Location | Severity | Description |
|-----|----------|----------|-------------|
| Duplicate router registration | app/main.py:47-49 | MEDIUM | search, files, clusters registered without prefix as well as with /api/v1 |
| Dead page | frontend/src/App.tsx | HIGH | SearchPage.jsx never rendered |
| Dual API clients | frontend/src/services/ | HIGH | api.ts and api.js are parallel implementations |
| Empty directory | frontend/src/api/ | LOW | Contains no files |
| Duplicate components | frontend/src/components/ | MEDIUM | .jsx and .tsx versions of PreviewPanel, ResultCard |
| ASCII tokenizer | services/search_service.py:15 | CRITICAL | WORD_PATTERN drops all Unicode |
| Substring matching | services/search_service.py:440-444 | HIGH | No word boundary → false positives |
| English-only OCR | services/ocr.py:16 | CRITICAL | lang="eng" hardcoded as default |
| Path traversal | routes/files.py:19-20 | CRITICAL | Arbitrary file serve via path query param |
| Unrestricted index | routes/indexing.py | HIGH | Any path can be indexed |
| FAISS reload per search | services/search_service.py:115,199 | MEDIUM | Disk reads on every search |
| No dedup on re-index | services/indexing.py | MEDIUM | Duplicate vectors accumulate |
