# LifeLens AI — System Analysis

**Document Version:** 1.0  
**Phase:** Phase 1 — SDLC Audit  
**Date:** 2026-09-04  
**Status:** Baseline (Pre-upgrade)

---

## 1. Existing Architecture Summary

LifeLens AI is a **local-first** personal search engine consisting of:

| Layer | Technology | Status |
|-------|-----------|--------|
| Frontend | React 19 + TypeScript + Vite 7 + Tailwind CSS 3 + Framer Motion 12 | Working |
| State Management | Zustand 5 (searchStore.js) + React hooks (useSearch.ts) | Working |
| 3D Scene | Three.js + React Three Fiber (MemoryCoreScene.tsx) | Working |
| Backend | FastAPI + Pydantic Settings + uvicorn | Working |
| Embedding (Text) | Sentence-BERT (all-MiniLM-L6-v2) | Working |
| Embedding (Image) | CLIP (ViT-B-32, laion2b_s34b_b79k) via open_clip | Working |
| Vector DB | FAISS (IndexFlatIP, L2-normalized cosine) | Working |
| OCR | Tesseract (pytesseract) + PyMuPDF (fitz) | Working (eng only) |
| PDF extraction | pypdf | Working |
| DOCX extraction | Custom XML parsing (zipfile + ElementTree) | Working |
| File watching | watchdog library | Working |
| Storage | Filesystem (FAISS .faiss + .json metadata) | Working |
| Database | None (no SQL/NoSQL DB) | N/A |

---

## 2. Current Workflows

### 2.1 Indexing Workflow
```
User runs index_files.py / File watcher detects new file / API POST /api/v1/index/path
  |
  v
FileIndexingService.index_file(path)
  |
  v
detect_file_type() -- extension-based detection
  |
  +-- IMAGE --> CLIPImageEmbeddingService.embed_image()
  |             -> FAISSVectorDB(images/).add_vector()
  |             -> [if OCR enabled] OCRService.extract_text_from_image()
  |                -> SentenceBERTTextEmbeddingService.embed_text()
  |                -> FAISSVectorDB(text/).add_vector()
  |
  +-- PDF   --> extract_pdf_text() (pypdf)
  |             [if OCR enabled] + OCRService.extract_text_from_pdf() (pytesseract)
  |             -> normalize_extracted_text()
  |             -> SentenceBERTTextEmbeddingService.embed_text()
  |             -> FAISSVectorDB(text/).add_vector()
  |
  +-- DOCX  --> extract_docx_text() (zipfile + XML)
  |             -> normalize_extracted_text()
  |             -> SentenceBERTTextEmbeddingService.embed_text()
  |             -> FAISSVectorDB(text/).add_vector()
  |
  +-- TEXT  --> extract_plain_text() (utf-8, utf-8-sig, cp1252, latin-1)
                -> normalize_extracted_text()
                -> SentenceBERTTextEmbeddingService.embed_text()
                -> FAISSVectorDB(text/).add_vector()

All paths: FAISSVectorDB.save() -- writes vectors.faiss + vectors_metadata.json
```

### 2.2 Search Workflow
```
User types query -> Frontend debounce (320ms) -> POST /api/v1/search
  {query, threshold, mode, limit, file_types}
  |
  v
SearchService.search(request)
  |
  +-- tokenize_keywords(query) -> ASCII-only tokens [a-z0-9]+
  |
  +-- _keyword_candidates():
  |     For each record in text_vector_db + image_vector_db metadata:
  |       keyword_evidence():
  |         - count_substring_occurrences(filename, token)  [SUBSTRING -- not word boundary]
  |         - count_substring_occurrences(content, token)   [SUBSTRING -- not word boundary]
  |         - legacy content_terms fallback
  |         - phrase_match_bonus()
  |         - occurrence_bonus (capped at 0.25)
  |         -> keyword_score [0,1]
  |
  +-- [if mode != EXACT]:
  |     _search_text(): SentenceBERT embed(query) -> FAISS.search_vector() -> top-K
  |     _search_images(): CLIP embed(query) -> FAISS.search_vector() -> top-K
  |
  +-- _rank_results():
  |     combined_score() depending on mode:
  |       EXACT:    keyword_score only
  |       HYBRID:   0.70 * keyword + 0.30 * semantic
  |       SEMANTIC: 0.35 * keyword + 0.65 * semantic  (if keyword > 0)
  |                 semantic * 0.35 penalty           (if keyword == 0)
  |     Filter: if mode != EXACT and score < threshold -> skip
  |     Filter: if mode EXACT/HYBRID and keyword_score <= 0 -> skip
  |
  v
SearchResponse {query, results[], count}
  |
  v
Frontend normalizes result -> SearchResult{id, fileName, fileType, score, snippet, matchExplanation}
  -> ResultCard, PreviewPanel
```

---

## 3. Current Strengths

| Strength | Description |
|----------|-------------|
| Well-structured backend | Clean service/route/model separation |
| Dual embedding system | Both CLIP (image) and SBERT (text) are implemented |
| Keyword-first ranking | Exact mode is purely keyword-based (no false semantic hits) |
| FAISS persistence | Indexes survive restarts via .faiss + .json files |
| Real-time file watching | Watchdog integration auto-indexes new files |
| Match explanation metadata | Rich explanation returned with every result |
| Configurable thresholds | All key parameters are configurable via .env |
| Clean API design | RESTful, documented, properly versioned |
| Premium UI | Dark glassmorphism design with Framer Motion animations |
| Clusters feature | Vector-similarity-based file grouping implemented |
| Dual page architecture | Both Home.tsx (simple) and SearchPage.jsx (full-featured) |
| File preview | Backend serves file previews, frontend renders them |
| Local-first privacy | Zero data sent to external services |
| DOCX custom parser | Pure XML/zipfile DOCX parsing (no python-docx dependency) |

---

## 4. Current Weaknesses

### 4.1 Search Accuracy Issues

**Issue: False Positives in Exact/Substring Matching**
- `count_substring_occurrences()` uses `re.findall(re.escape(term), text)` which matches substrings.
- Searching "DAX" will match files containing "paradox", "fax", "syntax" because "dax" appears as a substring.
- `tokenize_keywords()` uses `[a-z0-9]+` — this strips non-ASCII entirely, so Unicode terms tokenize to empty strings.
- There is NO word-boundary check in the keyword matching logic.

**Issue: Semantic Over-retrieval**
- In HYBRID mode, a result with `keyword_score=0` can still appear if it has semantic similarity > threshold.
- The guard `if mode in {EXACT, HYBRID} and keyword_score <= 0: continue` exists but only applies AFTER score computation.
- For SEMANTIC mode with `keyword_score=0`, the penalty is only 0.35 multiplied, so a 0.90 semantic match becomes 0.315 — still above a 0.30 threshold.
- Semantic mode does NOT require any keyword match, making it susceptible to topic drift ("GOA trip" could return unrelated travel-themed files).

### 4.2 Multilingual Issues

**Root cause of Marathi PDF search failure:**
1. **PDF extraction (pypdf):** pypdf relies on font encoding tables. Marathi PDFs using non-standard font encoding (Type1, CFF with custom encoding) produce garbled or empty text. Unicode-encoded PDFs (with proper ToUnicode map) may work, but many scanned or locally created Marathi PDFs do not.
2. **OCR:** `OCRConfig.language = "eng"` by default. Tesseract uses English-only language model. Running OCR on Marathi text with English model produces garbage output.
3. **Tokenization:** `WORD_PATTERN = re.compile(r"[a-z0-9]+")` in both `search_service.py` and `indexing.py` is ASCII-only. Devanagari/Unicode characters are completely dropped.
4. **Embedding model:** `all-MiniLM-L6-v2` is English-optimized. Marathi text fed to this model produces poor embeddings — the semantic space does not align between Marathi query and Marathi document.
5. **Keyword matching:** `keyword_evidence()` calls `content_lower = content_text.lower()` — Python's `.lower()` works on Unicode, but the tokenizer drops non-ASCII, so Marathi tokens never match.
6. **Frontend:** No specific Unicode rendering issues, but snippet extraction from garbled text produces meaningless snippets.

**Summary of Marathi failure chain:**
```
Marathi PDF -> pypdf fails to extract text (garbled/empty)
           -> OCR uses eng model -> garbled text
           -> SBERT all-MiniLM-L6-v2 -> poor embedding
           -> tokenize_keywords([a-z0-9]+) -> drops Devanagari -> no keyword score
           -> Result: not indexed or indexed with garbage text
           -> Search: no keyword match, poor semantic match
           -> Final result: Marathi PDF not found
```

### 4.3 Architecture Issues

**Bug: Duplicate Router Registration (CRITICAL)**
In `app/main.py` lines 42-49:
```python
application.include_router(health.router, prefix=settings.api_prefix)
application.include_router(search.router, prefix=settings.api_prefix)
application.include_router(indexing.router, prefix=settings.api_prefix)
application.include_router(files.router, prefix=settings.api_prefix)
application.include_router(clusters.router, prefix=settings.api_prefix)
application.include_router(search.router)   # DUPLICATE -- no prefix
application.include_router(files.router)    # DUPLICATE -- no prefix
application.include_router(clusters.router) # DUPLICATE -- no prefix
```
Routes are registered twice: once with `/api/v1` prefix and once without. This creates duplicate routes like `/search` (no prefix) alongside `/api/v1/search`. This is wasteful and potentially confusing but does not cause incorrect behavior since `health.router` is NOT duplicated.

**Bug: Two API Service Files (CONFUSION)**
Frontend has both `services/api.ts` (TypeScript, used by Home.tsx) and `services/api.js` (JavaScript, used by SearchPage.jsx/searchStore.js). They implement the same functions differently. The `searchStore.js` calls `searchFiles({query, limit, fileTypes})` while `api.ts`'s `searchFiles()` takes positional args. This is architectural inconsistency — two parallel implementations.

**Bug: Two Pages Not Properly Routed**
`App.tsx` only renders `<Home />`. `SearchPage.jsx` exists but is NEVER shown in the default routing. There is no React Router or similar routing library. `SearchPage.jsx` with its richer feature set (FilterBar, SmartCollections, CommandPalette, etc.) is essentially unreachable code from the default app entry point.

**Bug: `api/` Directory is Empty**
`frontend/src/api/` directory exists but contains no files. This is a dead directory.

**Bug: Component Duplication**
Both `.jsx` and `.tsx` versions exist for several components:
- `PreviewPanel.jsx` and `PreviewPanel.tsx`
- `ResultCard.jsx` and `ResultCard.tsx`
The `.jsx` versions are imported by `SearchPage.jsx` and the `.tsx` versions by `Home.tsx`. They are different implementations with different props.

### 4.4 Security Issues

**CRITICAL: Path Traversal in /files/preview**
```python
# routes/files.py
async def preview_file(path: str = Query(..., min_length=1)) -> FileResponse:
    file_path = Path(path).expanduser()
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(404, "File not found.")
    ...
    return FileResponse(path=file_path, ...)
```
The `path` parameter is taken directly from the query string and used to serve ANY file on the filesystem. An attacker can request `/api/v1/files/preview?path=../../etc/passwd` and the server will serve it if the MIME type is previewable (text/*). The only protection is the MIME type check, which allows all `text/` types.

**HIGH: Unrestricted IndexPath**
```python
# routes/indexing.py -> services/indexing.py
async def index_path(request: IndexPathRequest):
    await indexing_service.queue_path(request)
```
`IndexPathRequest.path` is a `Path` field with no validation. A user can POST `{"path": "/"}` and the service will attempt to index the entire filesystem root recursively.

**HIGH: Insecure CORS for Production**
```python
# app/config.py
allowed_origins: list[str] = Field(
    default_factory=lambda: [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]
)
```
Acceptable for local development. If deployed on a server, any web page could make CORS requests if the user misconfigures `ALLOWED_ORIGINS=["*"]`.

**MEDIUM: Internal Error Exposure**
FastAPI debug mode (`debug=False` by default, but configurable) can expose stack traces. Errors from pypdf, faiss, or OCR contain internal path information.

**MEDIUM: No Rate Limiting**
No rate limiting on any endpoint. The search endpoint could be abused to repeatedly trigger expensive embedding operations.

### 4.5 Performance Issues

**Single-vector-per-file limitation:** Each file produces one embedding (or two for images: CLIP + OCR text). For long documents, only the first `max_text_chars` (8000) characters are embedded. Content beyond 8000 chars is stored in metadata but never embedded.

**No duplicate detection:** If the same file is indexed twice (e.g., by watcher + manual index), a second vector is added to FAISS and a second metadata record is created. The metadata deduplication in `_iter_metadata_records` uses `(file_path, file_type, id)` as key, which will prevent duplicates from appearing in search results, but the FAISS index grows with duplicate vectors.

**FAISS search scales with all vectors:** When filtering by `file_type`, FAISS searches ALL vectors first and then filters. For large indexes, this is inefficient.

**No caching of embeddings:** Every search query is re-embedded fresh. High-frequency identical queries re-run the embedding model.

**reload() on every search call:** `self.text_vector_db.reload()` and `self.image_vector_db.reload()` are called in `_search_text()` and `_iter_metadata_records()`. This re-reads FAISS files from disk on every search, which is a significant I/O overhead.

### 4.6 Missing Functionality

| Missing Feature | Impact |
|-----------------|--------|
| No pagination | Results capped at limit (max 100), no page 2 |
| No file deletion from index | Cannot remove stale indexed files |
| No index update (re-index) | Must wipe and re-index to update a file |
| No collections UI in Home.tsx | SmartCollections only in unreachable SearchPage.jsx |
| No filter UI in Home.tsx | FilterBar only in unreachable SearchPage.jsx |
| No XLS/XLSX support | Spreadsheets not indexed |
| No PPT/PPTX support | Presentations not indexed |
| No DOC support | Old Word format not indexed |
| No search result export | No way to export search results |
| No user preferences | No persistent settings |
| No search analytics | No logging of search queries or results |
| No HTTPS | Not production-ready |
| No Docker | Not deployable easily |
| No CI/CD | No automated testing or deployment |
| No monitoring | No health metrics, no alerting |
| No multilingual support | See Section 4.2 |

---

## 5. Technical Debt

| Item | Severity | Description |
|------|----------|-------------|
| Dual API service files (api.ts + api.js) | HIGH | Two parallel API clients with different interfaces |
| Dual component versions (.jsx + .tsx) | HIGH | Two versions of ResultCard, PreviewPanel |
| Dead SearchPage.jsx | HIGH | Full-featured page is unreachable |
| Empty api/ directory | LOW | Dead directory |
| Duplicate router registration | MEDIUM | Routes registered twice in main.py |
| ASCII-only tokenizer | CRITICAL | Breaks all non-ASCII search |
| Substring keyword matching | HIGH | Causes false positives |
| No word boundary check | HIGH | "DAX" matches "syntax", "paradox" |
| English-only OCR | CRITICAL | Breaks Marathi, Hindi, all Indic languages |
| English-only embedding model | HIGH | Poor multilingual semantic search |
| 8000 char text truncation | MEDIUM | Long document content not searchable |
| No test suite | HIGH | Zero automated tests |
| reload() on every search | MEDIUM | Unnecessary disk I/O |
| No pagination | MEDIUM | Results capped at arbitrary limit |
| No file deduplication | MEDIUM | Duplicate vectors in FAISS |
| searchStore.js not integrated with Home.tsx | HIGH | State is duplicated |

---

## 6. Security Risk Summary

| Risk | Severity | Description |
|------|----------|-------------|
| Path traversal in /files/preview | CRITICAL | Arbitrary file read |
| Unrestricted index path | HIGH | Arbitrary filesystem indexing |
| No input path allowlist | HIGH | No restriction on which paths can be served/indexed |
| CORS misconfiguration risk | HIGH | Wildcard origins possible if misconfigured |
| No rate limiting | MEDIUM | DoS via expensive embedding operations |
| Internal error exposure | MEDIUM | Internal paths in error messages |
| No auth on any endpoint | MEDIUM | Any local network user can use the API |
| localStorage search history | LOW | Search history in plaintext localStorage |

---

## 7. Multilingual Limitations Summary

| Layer | Issue | Severity |
|-------|-------|----------|
| PDF extraction (pypdf) | Cannot extract Marathi text from non-Unicode-mapped PDFs | CRITICAL |
| OCR language | Default "eng" produces garbage for Indic scripts | CRITICAL |
| Tokenizer (WORD_PATTERN) | `[a-z0-9]+` drops ALL Unicode characters | CRITICAL |
| Embedding model | all-MiniLM-L6-v2 is English-optimized | HIGH |
| Unicode normalization | No NFC/NFKC normalization applied | HIGH |
| Snippet generation | Garbled text produces meaningless snippets | HIGH |
| Language detection | No language detection exists | HIGH |
| Frontend rendering | No unicode-specific font loading for Indic scripts | MEDIUM |

---

## 8. Performance Risk Summary

| Risk | Severity | Description |
|------|----------|-------------|
| FAISS reload on every search | HIGH | Reads .faiss file from disk per search call |
| No query embedding cache | MEDIUM | Identical queries re-embed |
| Full FAISS scan for type filter | MEDIUM | Inefficient when filtering by file type |
| 8000 char embedding limit | MEDIUM | Long documents partially searchable |
| Single embedding per document | MEDIUM | No chunking for long docs |
| CLIP model lazy load | LOW | First image embedding takes ~10 seconds |
| No connection pooling | LOW | Each request creates embedding calls |
