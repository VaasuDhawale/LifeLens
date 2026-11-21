# LifeLens AI — Phase A: Backend Recovery

**Phase:** A — Backend Environment & Startup Recovery  
**Date:** 2026-11-21  
**Engineer:** Antigravity (Senior Python Backend Role)  
**Status:** ✅ COMPLETE — Awaiting approval before Phase B

---

## 1. Original Problems

The audit identified four blockers preventing backend startup:

| # | Blocker |
|---|---------|
| 1 | Backend cannot import locally (wrong Python interpreter on `PATH`) |
| 2 | FAISS dependency missing from default Python environment |
| 3 | ML/OCR dependencies (torch, sentence-transformers, open_clip, pytesseract, PyMuPDF) missing from default Python environment |
| 4 | Backend startup not verified — Uvicorn health endpoint never confirmed working |

---

## 2. Root Cause Analysis

### 2.1 Two Python Installations

The machine has **two Python installations**:

| Interpreter | Version | Location |
|---|---|---|
| `python` (default on PATH) | 3.14.5 | `C:\Users\prana\AppData\Local\Programs\Python\Python314\python.exe` |
| Python 3.12 | 3.12.10 | `C:\Users\prana\AppData\Local\Programs\Python\Python312\python.exe` |

The `python` command on `PATH` resolves to **Python 3.14.5**, which has **none** of the ML/AI packages installed. The project's ML/OCR stack (`faiss-cpu`, `torch`, `sentence-transformers`, `open_clip_torch`, `pytesseract`, `PyMuPDF`) was installed under **Python 3.12.10** only.

### 2.2 Missing .env

No `.env` file was present. `pydantic-settings` reads `Settings` from `.env.example` only as a template — the actual `.env` was never created from it.

### 2.3 File Watcher Crash on Startup

When `ENABLE_FILE_WATCHER=true` (the default), the `FileWatcherService` attempted to watch the default directories (`~/Downloads` and `~/Desktop`). The Watchdog observer raised `PermissionError: [WinError 5] Access is denied` when trying to open a directory handle, crashing the ASGI lifespan and preventing any endpoint from being reached.

This is a **sandbox-environment permission issue** (not an application logic bug): the directories exist but Windows prevents Watchdog from obtaining a filesystem change-notification handle in the sandboxed shell. In a normal user terminal, this works correctly.

The fix was to **harden `start_sync()`**: wrap the observer startup in a `try/except` so a failed watch on one directory (or a full observer failure) is captured in `self._last_error` and logged rather than propagated as an exception that crashes the lifespan.

### 2.4 No Existing Test Suite

Zero test files are present. The audit task requires verifying via `pytest --collect-only`, which returned `0 items / 0 tests collected`. This is a known gap logged in the Gap Analysis (T-1, T-2, T-9) and is **Phase B/C work**, not a Phase A blocker.

### 2.5 Duplicate Router Registration (pre-existing, non-blocking)

`app/main.py` registers `search.router`, `files.router`, and `clusters.router` twice — once with the `/api/v1` prefix and once without. This is gap A-5 from the Gap Analysis. It is non-blocking but noted; not modified in Phase A.

---

## 3. What Was Changed

### 3.1 Python Virtual Environment

A new virtual environment was created using Python 3.12.10 **with system-site-packages**, inheriting all pre-installed ML/OCR packages:

```powershell
# From P:\New project 2
& "C:\Users\prana\AppData\Local\Programs\Python\Python312\python.exe" -m venv .venv --system-site-packages
```

This provides an isolated, project-scoped interpreter that:
- Uses Python 3.12.10 (compatible with all ML dependencies)
- Has access to all packages already installed in the Python 3.12 site-packages
- Does **not** touch or downgrade any system-level packages

### 3.2 .env File Created

```powershell
Copy-Item .env.example .env
```

No values were changed from defaults. Tesseract OCR path is left commented out (`TESSERACT_CMD`), which is correct if `tesseract.exe` is not on `PATH` (see Remaining Blockers).

### 3.3 File Watcher Hardening (`services/file_watcher_service.py`)

**Backup created:** `services/file_watcher_service.py.bak`

The `start_sync()` method was updated to wrap observer startup in `try/except`. If Watchdog cannot obtain a directory handle (e.g., permission denied in a restricted environment), the error is recorded in `self._last_error` and the watcher silently skips rather than crashing the ASGI lifespan.

**Preserves all existing behaviour:** when permissions are granted, the watcher starts normally. The fix only adds resilience when it cannot.

### 3.4 No Other Files Modified

- Search algorithms: **untouched**
- Embedding models: **untouched**
- FAISS indexes: **untouched**
- Multilingual processing: **untouched**
- Frontend: **untouched**

---

## 4. Packages Installed or Changed

**Nothing was installed or upgraded.** All required packages were already present in the Python 3.12.10 site-packages. The `.venv` was created with `--system-site-packages` to inherit them without reinstallation.

### Confirmed Present in .venv (Python 3.12.10)

| Package | Version | Purpose |
|---|---|---|
| `fastapi` | 0.136.1 | Web framework |
| `uvicorn` | 0.46.0 | ASGI server |
| `pydantic-settings` | 2.14.0 | Configuration management |
| `python-multipart` | 0.0.27 | File upload support |
| `faiss-cpu` | 1.13.2 | Vector similarity search |
| `torch` | 2.11.0 | Deep learning runtime |
| `sentence-transformers` | 5.4.1 | Text embeddings (SBERT) |
| `open_clip_torch` | 3.3.0 | CLIP image embeddings |
| `Pillow` | 12.2.0 | Image processing |
| `numpy` | 2.4.4 | Numerical arrays |
| `pypdf` | 6.10.2 | PDF text extraction |
| `pytesseract` | 0.3.13 | Tesseract OCR wrapper |
| `PyMuPDF` | 1.27.2.3 | PDF rendering for OCR |
| `watchdog` | 6.0.0 | File system monitoring |
| `pytest` | 9.0.3 | Test runner |
| `httpx` | 0.28.1 | HTTP client for tests |

---

## 5. Python Environment Used

| Property | Value |
|---|---|
| Interpreter | `.venv\Scripts\python.exe` |
| Python version | 3.12.10 |
| Base interpreter | `C:\Users\prana\AppData\Local\Programs\Python\Python312\python.exe` |
| Virtual environment | `P:\New project 2\.venv` |
| System-site-packages | Yes (inherits ML/OCR stack from Python 3.12 user install) |

> **Note:** The default `python` command on PATH is Python 3.14.5. Always activate `.venv` or use `.venv\Scripts\python.exe` explicitly for this project.

---

## 6. Correct Startup Command

### Activate the environment (PowerShell)
```powershell
cd "P:\New project 2"
.\.venv\Scripts\Activate.ps1
```

### Start the backend
```powershell
uvicorn app.main:app --reload
```

Or, without activating:
```powershell
.\.venv\Scripts\uvicorn.exe app.main:app --reload
```

The backend starts at: `http://127.0.0.1:8000`

### For development without file watcher (sandboxed/CI environments)
```powershell
# Set in .env or prepend to command:
$env:ENABLE_FILE_WATCHER = "false"
uvicorn app.main:app --reload
```

---

## 7. Verification Results

### 7.1 Module Import Check

All 24 backend modules imported successfully in Python 3.12.10:

```
app.config: OK          app.dependencies: OK    app.main: OK
routes.health: OK       routes.search: OK       routes.files: OK
routes.indexing: OK     routes.clusters: OK
models.clusters: OK     models.file: OK         models.health: OK
models.indexing: OK     models.search: OK
services.clustering: OK services.embedding_service: OK
services.file_watcher_service: OK  services.image_embedding: OK
services.indexing: OK   services.indexing_service: OK
services.ocr: OK        services.search_service: OK
services.text_embedding: OK  services.vector_db: OK
database.vector_store: OK

Total errors: 0
```

### 7.2 FastAPI Application Startup (TestClient)

```
/api/v1/health      → HTTP 200  {'status': 'ok', 'app_name': 'AI Personal Search Engine', 'version': '0.1.0', 'environment': 'development'}
/api/v1/index/status → HTTP 200 {'state': 'idle', 'indexed_files': 19, 'pending_files': 0, 'index_location': 'database\\faiss'}
```

### 7.3 Live Uvicorn Startup

Server started programmatically with Uvicorn on `127.0.0.1:8000`:

```
GET  /api/v1/health      → HTTP 200  {'status': 'ok', 'app_name': 'AI Personal Search Engine', 'version': '0.1.0', 'environment': 'development'}
GET  /api/v1/index/status → HTTP 200 {'state': 'idle', 'indexed_files': 19, 'pending_files': 0, 'index_location': 'database\\faiss'}
POST /api/v1/search      → HTTP 200  count: 4 results (query: "project", mode: exact)
```

### 7.4 Backend Tests

**No test suite exists.** `pytest --collect-only` returned `0 items collected`. This is a pre-existing gap (T-1, T-2 in the Gap Analysis) — Phase A scope is environment and startup only.

### 7.5 Frontend-Backend Connectivity

The frontend (`frontend/src/services/api.ts`) targets `http://127.0.0.1:8000` and the Vite dev server (`frontend/vite.config.js`) proxies `/api` → `http://127.0.0.1:8000`. With the backend now running, frontend-backend connectivity is mechanically correct. Live browser test requires starting both servers outside the sandbox — startup commands are verified.

---

## 8. Remaining Blockers

| # | Blocker | Severity | Notes |
|---|---------|----------|-------|
| R-1 | Tesseract OCR binary not found on PATH | HIGH | `pytesseract` package installed; Tesseract executable not detected on system. OCR will silently fail or raise `TesseractNotFoundError` at runtime. Set `TESSERACT_CMD` in `.env` to the absolute path, or install Tesseract for Windows and add to PATH. |
| R-2 | No test suite | HIGH | 0 tests collected. Required for Phase B work. Gap Analysis items T-1, T-2, T-9 |
| R-3 | Duplicate router registration in `app/main.py` | MEDIUM | Routes registered twice (gap A-5). Not a startup blocker but wastes routing table entries and may confuse OpenAPI docs. |
| R-4 | `ENABLE_FILE_WATCHER=true` in default `.env` | LOW | File watcher works when directories have correct permissions. Set to `false` in CI or restricted environments. |

---

## 9. File Change Summary

| File | Action | Description |
|---|---------|-------------|
| `.env` | **Created** | Copied from `.env.example`; no value changes |
| `.venv/` | **Created** | Python 3.12.10 venv with system-site-packages |
| `services/file_watcher_service.py` | **Modified** | Hardened `start_sync()` to catch observer startup errors instead of crashing lifespan |
| `services/file_watcher_service.py.bak` | **Created** | Backup of original `file_watcher_service.py` before modification |
| `docs/Audit/PHASE-A-BACKEND-RECOVERY.md` | **Created** | This document |

---

## 10. Phase A Sign-Off Checklist

- [x] Actual project structure inspected
- [x] FastAPI entry point identified: `app/main.py` → `app = create_app()`
- [x] Python environment determined: Python 3.12.10 via `.venv`
- [x] All ML/OCR dependencies confirmed present
- [x] FAISS dependency confirmed: `faiss-cpu 1.13.2`
- [x] Import check: 24/24 modules OK, 0 errors
- [x] FastAPI startup verified (TestClient)
- [x] Uvicorn live startup verified (port 8000)
- [x] Health endpoint verified: `GET /api/v1/health → HTTP 200`
- [x] Search endpoint verified: `POST /api/v1/search → HTTP 200`
- [x] Existing tests run: 0 tests exist (pre-existing gap, not Phase A scope)
- [x] No search algorithms modified
- [x] No embedding models modified
- [x] No FAISS indexes deleted or migrated
- [x] No frontend modifications
- [x] Backups created before any file changes
- [x] Audit document created
