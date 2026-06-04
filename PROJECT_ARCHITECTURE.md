# LifeLens AI Project Architecture

LifeLens AI is organized as a local-first search system with a FastAPI backend, a persistent FAISS vector store, reusable embedding and indexing services, and a React/Vite frontend.

## Frontend

The frontend lives in `frontend/` and is built with React, TypeScript, Vite, Tailwind CSS, Framer Motion, Three.js, and React Three Fiber.

Important paths:

```text
frontend/
|-- src/
|   |-- components/
|   |   |-- MemoryCoreScene.tsx
|   |   |-- PreviewPanel.tsx
|   |   |-- ResultCard.tsx
|   |   |-- SearchBar.tsx
|   |   `-- SystemStatus.tsx
|   |-- hooks/
|   |   |-- useBackendStatus.ts
|   |   `-- useSearch.ts
|   |-- pages/
|   |   `-- Home.tsx
|   |-- services/
|   |   `-- api.ts
|   |-- App.tsx
|   |-- main.tsx
|   `-- styles.css
|-- package.json
|-- tailwind.config.js
`-- vite.config.js
```

Frontend responsibilities:

- Render the premium LifeLens AI search interface.
- Manage query, threshold, search mode, loading state, and results through `useSearch`.
- Call the backend search endpoint through `frontend/src/services/api.ts`.
- Display result cards with match explanations, highlighted keywords, file previews, and scores.
- Show a right-side preview panel with document/image preview, metadata, file path, and open-file action.
- Render the lazy-loaded AI Memory Core scene as a visual layer without blocking the core search UI.

## Backend

The backend is a FastAPI application rooted at `app/main.py`.

Important paths:

```text
app/
|-- config.py
|-- dependencies.py
`-- main.py
models/
|-- clusters.py
|-- file.py
|-- health.py
|-- indexing.py
`-- search.py
routes/
|-- clusters.py
|-- files.py
|-- health.py
|-- indexing.py
`-- search.py
services/
|-- clustering.py
|-- embedding_service.py
|-- file_watcher_service.py
|-- image_embedding.py
|-- indexing.py
|-- indexing_service.py
|-- ocr.py
|-- search_service.py
|-- text_embedding.py
`-- vector_db.py
```

Backend responsibilities:

- Expose REST APIs for search, health, file preview, indexing status, and clusters.
- Load configuration through Pydantic Settings.
- Coordinate embedding generation, OCR, file extraction, indexing, and FAISS search.
- Run optional file watching for real-time indexing.
- Serve file previews for supported image, text, and PDF formats.

Primary API endpoints:

```text
GET  /api/v1/health
POST /api/v1/search
GET  /api/v1/index/status
GET  /api/v1/files/preview
GET  /api/v1/clusters
```

Compatibility routes also exist for selected endpoints without the `/api/v1` prefix.

## FAISS

FAISS is used as the local vector database. Generated indexes are stored under:

```text
database/faiss/
|-- text/
|   |-- vectors.faiss
|   `-- vectors_metadata.json
`-- images/
    |-- vectors.faiss
    `-- vectors_metadata.json
```

These files are runtime artifacts and are ignored by Git.

Metadata stored with each vector includes:

- File path
- File name
- File type
- Extracted text where available
- OCR text where available
- Match/ranking metadata used by the search API

Text and image vectors are stored separately because they are produced by different embedding models and can have different vector dimensions.

## Search Pipeline

The search pipeline is designed to prioritize accurate results over broad semantic guesses.

1. User submits a query from the frontend.
2. Frontend sends `query`, `threshold`, `mode`, and `limit` to `POST /api/v1/search`.
3. Backend normalizes the query and routes it through the configured search mode.
4. Exact keyword evidence is checked against:
   - File name
   - Extracted file content
   - OCR text included in metadata
5. Semantic similarity is computed with Sentence-BERT for text search.
6. FAISS returns nearest vector candidates.
7. Ranking combines keyword evidence and semantic similarity depending on mode:
   - Exact Mode: keyword matching only.
   - Hybrid Mode: keyword-first ranking with semantic support.
   - Semantic Mode: embedding similarity for broader discovery.
8. Threshold filtering removes weak matches in Hybrid and Semantic modes.
9. Response metadata includes match explanations, matched keywords, scores, and file metadata.
10. Frontend renders result cards and preview panel details.

## Indexing Workflow

Indexing can be run manually through `index_files.py` or continuously through the Watchdog-based file watcher.

Manual indexing:

```bash
python index_files.py
python index_files.py "path/to/folder"
```

Indexing steps:

1. Scan the target folder recursively.
2. Detect file type from extension and metadata.
3. For image files:
   - Load image.
   - Generate CLIP embedding.
   - Extract OCR text when enabled.
   - Store image vector and metadata in FAISS.
4. For text-like files:
   - Extract full text from TXT, Markdown, PDF, or DOCX.
   - Generate Sentence-BERT embedding.
   - Store text vector and metadata in FAISS.
5. Persist FAISS index files and metadata JSON under `database/faiss/`.
6. Search API loads the same persisted FAISS files so indexed results are available after restart.

Real-time indexing:

1. Watch configured directories from application settings.
2. Detect newly created or changed files.
3. Wait briefly for file writes to settle.
4. Run the same indexing pipeline for the affected file.
5. Persist updated FAISS indexes and metadata.

## Local-First Privacy Model

LifeLens AI is designed to run locally:

- Source files remain on the user's machine.
- FAISS indexes are written locally.
- Extracted metadata is stored locally.
- Backend and frontend communicate over localhost by default.

If the project is deployed beyond local development, review CORS, authentication, file serving, and metadata storage policies before exposing it publicly.
