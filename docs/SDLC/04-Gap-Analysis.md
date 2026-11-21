# LifeLens AI — Gap Analysis

**Document Version:** 1.0  
**Phase:** Phase 1 — SDLC Audit  
**Date:** 2026-09-04  
**Status:** Baseline

---

## 1. Overview

This document compares the current state of LifeLens AI (as-is) against the desired target state (to-be) defined in the Requirements Document. Gaps are classified by severity and area.

---

## 2. Search Engine Gaps

| # | Feature | Current State | Target State | Gap Severity | Notes |
|---|---------|--------------|-------------|-------------|-------|
| S-1 | Exact keyword matching | Substring match (no word boundary) | Whole-word match with `\b` | CRITICAL | "DAX" matches "syntax" |
| S-2 | Unicode keyword tokenizer | ASCII-only `[a-z0-9]+` | Unicode-aware tokenizer (regex `\w+` or langdetect + per-language tokenizer) | CRITICAL | Drops all Indic/CJK characters |
| S-3 | False positive control | None beyond threshold | Word-boundary enforcement + min term length | CRITICAL | Root cause of DAX bug |
| S-4 | Phrase matching | Basic phrase bonus exists | Full phrase match with proximity scoring | MEDIUM | Phrase bonus is minimal |
| S-5 | Semantic threshold calibration | 0.45 default (global) | Per-mode calibrated defaults | MEDIUM | Semantic mode threshold too low |
| S-6 | Query normalization | None | Unicode NFC normalization | HIGH | Affects Indic/Arabic queries |
| S-7 | BM25 ranking | Not implemented | BM25 for keyword component | MEDIUM | Frequency-based ranking missing |
| S-8 | File type filtering | Backend supports; UI in SearchPage.jsx only | Integrated in Home.tsx UI | HIGH | Feature exists but unreachable |
| S-9 | Pagination | None (limit only) | Offset + limit pagination | MEDIUM | No page 2 |
| S-10 | Multilingual search | English only | Language-agnostic search | CRITICAL | Core product requirement |
| S-11 | Cross-language search | Not implemented | Query in Lang A, doc in Lang B | FUTURE | Requires multilingual embedding |
| S-12 | Snippet highlighting | Returns snippet but no highlight | Keyword-highlighted snippet | MEDIUM | Frontend has keyword list but not highlighted in snippet |

---

## 3. Indexing Gaps

| # | Feature | Current State | Target State | Gap Severity | Notes |
|---|---------|--------------|-------------|-------------|-------|
| I-1 | Marathi/Hindi PDF extraction | Fails (pypdf garbles non-Unicode fonts) | Robust multilingual PDF extraction | CRITICAL | Root cause of Marathi bug |
| I-2 | OCR language | English only (lang="eng") | Multilingual Tesseract (auto-detect) | CRITICAL | Root cause of Marathi OCR bug |
| I-3 | OCR language detection | None | langdetect or lingua before OCR | HIGH | Need to know doc language before OCR |
| I-4 | OCR pre-processing | None | Deskew, denoise, contrast (OpenCV/PIL) | MEDIUM | Improves scanned doc accuracy |
| I-5 | Long document chunking | Single embedding per file (8000 chars max) | Sliding window chunking | MEDIUM | Long docs only partially searchable |
| I-6 | Deduplication | No re-index deduplication | Hash-based content deduplication | MEDIUM | Duplicate vectors on re-index |
| I-7 | XLS/XLSX support | Not supported | openpyxl-based extraction | MEDIUM | Spreadsheets not indexed |
| I-8 | PPT/PPTX support | Not supported | python-pptx-based extraction | MEDIUM | Presentations not indexed |
| I-9 | DOC (legacy Word) | Not supported | python-docx or libreoffice bridge | LOW | Old Word format not indexed |
| I-10 | File deletion from index | Not supported | Delete vector by file path | HIGH | Stale entries remain |
| I-11 | Re-index single file | Not supported | Mark file dirty, re-embed, replace | HIGH | Must wipe whole index to update |
| I-12 | Index stats | Basic count only | Per-type counts, error log, last-indexed | MEDIUM | No error reporting per file |
| I-13 | DOCX language detection | None | langdetect on extracted text | HIGH | Affects multilingual DOCX support |
| I-14 | PyMuPDF for PDF | Only used for PDF OCR path | Use as primary extractor (better Unicode) | HIGH | PyMuPDF handles fonts better than pypdf |
| I-15 | Unicode normalization on index | None | NFC/NFKC normalization after extraction | HIGH | Affects Indic script consistency |
| I-16 | File watcher ignore patterns | None | `.git/`, `node_modules/`, `*.tmp` | MEDIUM | Unnecessary files indexed |

---

## 4. Multilingual Gaps

| # | Layer | Current State | Target State | Gap Severity |
|---|-------|--------------|-------------|-------------|
| ML-1 | PDF text extraction | pypdf (fails on non-Unicode fonts) | PyMuPDF (better Unicode/font handling) | CRITICAL |
| ML-2 | OCR engine | Tesseract eng-only | Tesseract + auto-selected lang pack | CRITICAL |
| ML-3 | Keyword tokenizer | ASCII `[a-z0-9]+` | Unicode `\w+` or scriptaware tokenizer | CRITICAL |
| ML-4 | Embedding model (text) | all-MiniLM-L6-v2 (English) | paraphrase-multilingual-MiniLM-L12-v2 | HIGH |
| ML-5 | Language detection | None | langdetect or lingua | HIGH |
| ML-6 | Unicode normalization | None | unicodedata.normalize(NFC/NFKC) | HIGH |
| ML-7 | Font loading (frontend) | System fonts only | Noto fonts (multilingual coverage) | MEDIUM |
| ML-8 | RTL text (Arabic, Hebrew) | Not tested | CSS direction: rtl for RTL snippets | MEDIUM |
| ML-9 | Stemming/lemmatization | None | Language-aware (Snowball for Indo-European) | LOW |
| ML-10 | Indic script word boundary | Not handled | Unicode Grapheme Cluster segmentation | HIGH |

---

## 5. Architecture / Code Quality Gaps

| # | Item | Current State | Target State | Gap Severity |
|---|------|--------------|-------------|-------------|
| A-1 | Dual API clients | api.ts + api.js (parallel implementations) | Single TypeScript API client | HIGH |
| A-2 | Dead SearchPage.jsx | Unreachable (no routing) | Either integrate or remove | HIGH |
| A-3 | Duplicate components (.jsx + .tsx) | Two versions exist | Single canonical TypeScript component | MEDIUM |
| A-4 | State management split | useSearch.ts (Home.tsx) vs searchStore.js (SearchPage) | Unified state management | HIGH |
| A-5 | Duplicate router registration | Routers registered twice in main.py | Single registration per router | MEDIUM |
| A-6 | No router (frontend) | App.tsx renders only Home.tsx | React Router or equivalent | HIGH |
| A-7 | Empty api/ directory | Dead directory | Remove or populate | LOW |
| A-8 | FAISS reload on every search | Disk read per search | In-memory singleton, reload on index update only | HIGH |
| A-9 | No test suite | Zero automated tests | >= 80% backend coverage | HIGH |
| A-10 | No linting/formatting | No enforced style | ESLint + Prettier (frontend), ruff (backend) | MEDIUM |

---

## 6. Security Gaps

| # | Issue | Current State | Target State | Gap Severity |
|---|-------|--------------|-------------|-------------|
| SEC-1 | Path traversal in /files/preview | No path validation | Allowlist validation (paths must be in indexed dirs) | CRITICAL |
| SEC-2 | Unrestricted index path | Any path can be indexed | Validate path against allowed_directories list | HIGH |
| SEC-3 | No rate limiting | None | slowapi or nginx rate limiting | MEDIUM |
| SEC-4 | Error exposure | Stack traces in responses | Sanitized error messages | MEDIUM |
| SEC-5 | No authentication | None (local-only intended) | At least localhost-bind validation + optional token | LOW |
| SEC-6 | Input validation on path params | Pydantic basic only | Regex validation + path traversal check | HIGH |
| SEC-7 | File type validation | Extension-only | MIME type sniffing (python-magic) | MEDIUM |
| SEC-8 | CORS for production | Local origins only | Document and validate production CORS config | HIGH |

---

## 7. Performance Gaps

| # | Issue | Current State | Target State | Gap Severity |
|---|-------|--------------|-------------|-------------|
| P-1 | FAISS reload on search | Disk read on every search | Load once at startup, reload on index update | HIGH |
| P-2 | No embedding cache | Re-embed every query | LRU cache for recent query embeddings | MEDIUM |
| P-3 | Full FAISS scan for type filter | FAISS returns all, then filter | Pre-filter by type in metadata before FAISS | MEDIUM |
| P-4 | Large metadata JSON | Full JSON loaded into RAM | Split or compress metadata | LOW |
| P-5 | No query deduplication | Parallel requests re-embed | Deduplicate in-flight requests | LOW |
| P-6 | Long doc truncation | 8000 chars max | Sliding window chunking | MEDIUM |
| P-7 | CLIP cold start | ~10s first image search | Pre-warm on startup | LOW |
| P-8 | Synchronous keyword scan | O(n) over all metadata per search | Inverted index for keyword lookup | MEDIUM |

---

## 8. UI/UX Gaps

| # | Feature | Current State | Target State | Gap Severity |
|---|---------|--------------|-------------|-------------|
| U-1 | File type filters | Only in SearchPage.jsx (unreachable) | Integrated in Home.tsx | HIGH |
| U-2 | Smart Collections / Clusters | Only in SearchPage.jsx (unreachable) | Integrated in Home.tsx | HIGH |
| U-3 | Recent searches | Only in SearchPage.jsx (unreachable) | Integrated in Home.tsx | MEDIUM |
| U-4 | Command palette | Only in SearchPage.jsx (unreachable) | Integrated in Home.tsx | MEDIUM |
| U-5 | Toast notifications | Only in SearchPage.jsx (unreachable) | Integrated in Home.tsx | LOW |
| U-6 | Keyword highlighting in snippets | matchedKeywords returned but not highlighted in snippet text | Yellow highlight on matched words | MEDIUM |
| U-7 | Multilingual snippet rendering | Untested | Verified rendering for Devanagari, Arabic | HIGH |
| U-8 | Mobile responsive | Partial (desktop-optimized) | Full responsive layout | MEDIUM |
| U-9 | Keyboard navigation | Partial | Full arrow key + Enter/Esc navigation | MEDIUM |
| U-10 | Accessibility | Partial ARIA | WCAG 2.1 AA compliance | MEDIUM |
| U-11 | Empty state on no results | Yes (basic) | Enhanced with suggestions | LOW |
| U-12 | Index management UI | None | Basic index status + trigger re-index | LOW |

---

## 9. Testing Gaps

| # | Test Type | Current State | Target State | Gap Severity |
|---|-----------|--------------|-------------|-------------|
| T-1 | Unit tests (backend) | None | pytest with >= 80% coverage | HIGH |
| T-2 | Integration tests | None | TestClient for all endpoints | HIGH |
| T-3 | Search accuracy tests | None | Precision/recall benchmark fixtures | HIGH |
| T-4 | Multilingual test fixtures | None | Marathi/Hindi/English PDF/text fixtures | HIGH |
| T-5 | OCR accuracy tests | None | Ground truth text comparison | MEDIUM |
| T-6 | Security tests | None | Path traversal + injection test cases | HIGH |
| T-7 | Performance/load tests | None | locust or k6 for search endpoint | MEDIUM |
| T-8 | Frontend unit tests | None | vitest + React Testing Library | MEDIUM |
| T-9 | E2E tests | None | Playwright for core search flows | MEDIUM |
| T-10 | False positive tests | None | Specific tests for DAX, GOA trip regressions | CRITICAL |

---

## 10. Deployment Gaps

| # | Item | Current State | Target State | Gap Severity |
|---|------|--------------|-------------|-------------|
| D-1 | Dockerfile | None | Backend + frontend Dockerfiles | HIGH |
| D-2 | docker-compose | None | Single-command startup | HIGH |
| D-3 | Production WSGI | uvicorn only | gunicorn + uvicorn workers | MEDIUM |
| D-4 | Frontend build | Only dev server | npm run build + static serving | MEDIUM |
| D-5 | HTTPS | None | nginx reverse proxy with SSL | MEDIUM |
| D-6 | Environment management | .env.example only | .env.production template | MEDIUM |
| D-7 | Structured logging | uvicorn default | JSON structured logs | MEDIUM |
| D-8 | Health check endpoint | Basic /health | Enhanced with model status + index size | LOW |
| D-9 | CI/CD | None | GitHub Actions | MEDIUM |
| D-10 | Monitoring | None | Basic metrics (Prometheus or similar) | LOW |
| D-11 | Backup of FAISS index | None | Automated backup | LOW |

---

## 11. Priority Matrix

### CRITICAL (Must fix before any phase 2 work)
1. **SEC-1** — Path traversal in `/files/preview`
2. **S-1, S-2, S-3** — Substring matching + ASCII tokenizer = false positives (DAX bug)
3. **ML-1** — PDF extraction fails for Marathi (use PyMuPDF)
4. **ML-2** — OCR is English-only (Marathi OCR fails)
5. **ML-3** — Tokenizer drops all Unicode (no Marathi keywords match)
6. **T-10** — No regression tests for DAX/GOA false positives

### HIGH (Must fix in phase 2)
7. **A-1** — Dual API clients (api.ts / api.js)
8. **A-2** — Dead SearchPage.jsx with unreachable features
9. **A-8** — FAISS reload on every search (performance)
10. **ML-4** — English-only embedding model
11. **ML-5, ML-6** — No language detection, no Unicode normalization
12. **I-14** — Switch primary PDF extractor to PyMuPDF
13. **SEC-2** — Unrestricted index path
14. **T-1, T-2** — No test suite at all
15. **U-1, U-2** — File filters and collections unreachable

### MEDIUM (Phase 3+)
16. Keyword highlighting in snippets
17. Long document chunking
18. Pagination
19. File deletion from index
20. XLS/XLSX, PPT/PPTX support
21. Docker / CI/CD
22. Performance/load testing

### LOW (Future polish)
23. DOC (legacy Word) support
24. Monitoring and alerting
25. Index backup
26. Stemming/lemmatization
