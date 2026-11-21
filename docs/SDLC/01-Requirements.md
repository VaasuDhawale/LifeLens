  # LifeLens AI — Requirements Document

**Document Version:** 1.0  
**Phase:** Phase 1 — SDLC Audit  
**Date:** 2026-09-04  
**Status:** Baseline (Pre-upgrade)

---

## 1. Project Overview

**LifeLens AI** is a local-first, AI-powered personal search engine designed to let users find documents, notes, PDFs, images, and screenshots using natural language queries. The system runs entirely on the user's machine, keeps all data private, and uses a combination of keyword matching and semantic vector search to deliver relevant results.

The project is built on a React/Vite/TypeScript frontend and a FastAPI/Python backend, with FAISS as the vector store and Sentence-BERT + CLIP for embedding generation.

---

## 2. Problem Statement

Personal devices accumulate thousands of files that become impossible to retrieve by memory alone. Standard OS search (filename-only) fails when content is embedded in scanned images, non-English PDFs, or poorly named files. Users need natural language queries, content-level search, multilingual support, and high-accuracy results — all without sending data to any cloud provider.

---

## 3. Objectives

### Primary Objectives (Audit Phase)
1. Fully audit the existing codebase before any modification.
2. Establish SDLC documentation baseline.
3. Identify all bugs, gaps, and risks.
4. Produce an accurate architecture map.

### Target Objectives (Future Phases)
1. Achieve >= 95% precision in exact keyword searches — zero false positives for acronym queries like "DAX".
2. Support multilingual documents in at least 15 languages including Marathi, Hindi, Bengali, Tamil, and others.
3. Support OCR for scanned PDFs and image-based documents.
4. Achieve sub-500ms search response time for typical queries.
5. Provide a premium, production-quality UI/UX.
6. Ensure full deployment-readiness with security, monitoring, and CI/CD.

---

## 4. Target Users

| User Type | Description |
|-----------|-------------|
| Students | Store notes, assignments, PDFs, screenshots |
| Knowledge workers | Store reports, invoices, presentations |
| Researchers | Store papers, references, datasets |
| Developers | Store code snippets, documentation |
| General users | Store photos, receipts, scanned documents |

---

## 5. Functional Requirements

### 5.1 Search
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-S1 | Exact keyword search with zero false positives | CRITICAL |
| FR-S2 | Semantic search using vector similarity | HIGH |
| FR-S3 | Hybrid search (keyword + semantic) | HIGH |
| FR-S4 | User-configurable similarity threshold (0-1) | HIGH |
| FR-S5 | Return snippet with matched keyword context | HIGH |
| FR-S6 | Return match explanation (keywords, score, source) | MEDIUM |
| FR-S7 | File-type filtering (image, PDF, text, docx) | MEDIUM |
| FR-S8 | Rank exact matches above semantic-only matches | HIGH |
| FR-S9 | Cross-language semantic search | FUTURE |
| FR-S10 | Phrase matching with higher bonus score | HIGH |

### 5.2 Indexing
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-I1 | Index PDF files with text extraction | CRITICAL |
| FR-I2 | Index DOCX files | HIGH |
| FR-I3 | Index plain text files (TXT, MD, CSV, JSON, etc.) | HIGH |
| FR-I4 | Index image files with CLIP embeddings | HIGH |
| FR-I5 | OCR scanned images and PDFs | HIGH |
| FR-I6 | Watch directories for new files and auto-index | MEDIUM |
| FR-I7 | Index via CLI script (index_files.py) | HIGH |
| FR-I8 | Index via API endpoint | HIGH |
| FR-I9 | Report indexing status | MEDIUM |
| FR-I10 | Support DOCX, XLS, XLSX, PPT, PPTX (future) | FUTURE |

### 5.3 Multilingual (Future)
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-M1 | Support Marathi text in PDFs and DOCX | HIGH |
| FR-M2 | Support Hindi, Bengali, Tamil, Telugu, Gujarati | HIGH |
| FR-M3 | Detect document language automatically | HIGH |
| FR-M4 | Use multilingual embedding model for cross-language search | HIGH |
| FR-M5 | Unicode normalization (NFC/NFKC) for Indic scripts | HIGH |
| FR-M6 | OCR with multilingual Tesseract language packs | HIGH |
| FR-M7 | Support Japanese, Chinese, Korean, Arabic, European languages | MEDIUM |
| FR-M8 | Handle mixed-language documents | MEDIUM |

### 5.4 File Management
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-F1 | Preview image files in the UI | HIGH |
| FR-F2 | Preview PDF files in the UI | HIGH |
| FR-F3 | Preview text/markdown files in the UI | MEDIUM |
| FR-F4 | Open file in native OS application | MEDIUM |
| FR-F5 | Copy file path | MEDIUM |
| FR-F6 | Delete/remove files from index | FUTURE |
| FR-F7 | Re-index specific files | FUTURE |
| FR-F8 | Show file metadata (size, date, path) | MEDIUM |

### 5.5 Security
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-SEC1 | Prevent path traversal in file preview endpoint | CRITICAL |
| FR-SEC2 | Validate and sanitize indexed file paths | HIGH |
| FR-SEC3 | Restrict file serving to local filesystem only | HIGH |
| FR-SEC4 | Proper CORS for production deployment | HIGH |
| FR-SEC5 | No hardcoded secrets or API keys | HIGH |

---

## 6. Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-P1 | Search response time | < 500ms for typical queries |
| NFR-P2 | Indexing throughput | >= 5 files/second for text files |
| NFR-P3 | Memory usage | < 4 GB RAM under normal load |
| NFR-P4 | Frontend startup time | < 3 seconds |
| NFR-P5 | Backend startup time | < 10 seconds (model load) |
| NFR-A1 | Search precision (exact mode) | >= 95%, zero false positives for acronyms |
| NFR-A2 | Search recall (hybrid mode) | >= 80% of relevant documents returned |
| NFR-U1 | UI responsiveness | Works on 1280px+ screen width |
| NFR-U2 | Dark mode | Required by design |
| NFR-U3 | Accessibility | WCAG 2.1 AA minimum |
| NFR-S1 | Privacy | No data leaves local machine |
| NFR-D1 | Persistence | FAISS indexes survive restart |
| NFR-D2 | Configuration | All settings via .env |

---

## 7. Supported File Types

| Format | Current Support | Target Support |
|--------|-----------------|----------------|
| PDF | Yes (pypdf + OCR) | Enhanced (multilingual OCR) |
| TXT | Yes | Yes |
| MD | Yes | Yes |
| DOCX | Yes | Yes |
| CSV | Yes (as text) | Yes |
| JSON | Yes (as text) | Yes |
| JPG/JPEG | Yes (CLIP) | Yes + multilingual OCR |
| PNG | Yes (CLIP) | Yes + multilingual OCR |
| WEBP | Yes (CLIP) | Yes |
| GIF | Yes (CLIP) | Yes |
| BMP/TIF | Yes (CLIP) | Yes |
| XLS/XLSX | No | Future |
| PPT/PPTX | No | Future |
| DOC (legacy) | No | Future |
| MP4/Video | No | Future |
| HTML/HTM | Yes (as text) | Yes |
| YAML/YML | Yes (as text) | Yes |
| LOG | Yes (as text) | Yes |
| RTF | Yes (as text) | Yes |
| Scanned PDFs | Via OCR (eng only) | Multilingual OCR |

---

## 8. Multilingual Requirements

### Languages to Support (Target)
- **Indic:** Marathi, Hindi, Bengali, Tamil, Telugu, Gujarati, Kannada, Malayalam, Punjabi, Urdu
- **East Asian:** Japanese, Chinese (Simplified/Traditional), Korean
- **RTL:** Arabic, Hebrew, Persian
- **European:** French, German, Spanish, Portuguese, Italian, Russian
- **Mixed-language:** Documents containing multiple languages

### Technical Requirements
- Unicode preservation throughout extraction -> embedding -> search pipeline
- Language detection before embedding model selection
- Multilingual-capable embedding model (e.g., paraphrase-multilingual-MiniLM-L12-v2)
- Tesseract language packs for OCR
- NFC/NFKC normalization for Indic scripts
- No ASCII-only tokenization in keyword matching

---

## 9. OCR Requirements

| Requirement | Current | Target |
|-------------|---------|--------|
| Image OCR | Yes (eng only) | Yes (multilingual) |
| PDF OCR | Yes (eng, max 20 pages) | Yes (multilingual, full document) |
| Scanned document detection | No | Yes |
| OCR confidence scoring | No | Yes |
| Pre-processing (deskew, denoise) | No | Yes |
| GPU acceleration | No | Optional |

---

## 10. Security Requirements

| ID | Requirement | Severity |
|----|-------------|----------|
| SEC-1 | Path traversal prevention in /files/preview | CRITICAL |
| SEC-2 | Safe filename handling | HIGH |
| SEC-3 | CORS restricted to known origins | HIGH |
| SEC-4 | No secrets in source code | HIGH |
| SEC-5 | Rate limiting on search/index endpoints | MEDIUM |
| SEC-6 | Sanitize error messages before client | MEDIUM |
| SEC-7 | File type validation (not just extension) | MEDIUM |
| SEC-8 | Input validation on all API parameters | HIGH |

---

## 11. UI/UX Requirements

| Requirement | Current | Target |
|-------------|---------|--------|
| Dark mode design | Yes | Yes (polished) |
| Search mode selector | Yes | Yes |
| Threshold slider | Yes | Yes |
| Result cards with snippets | Yes | Yes (enhanced) |
| Preview panel | Yes | Yes (enhanced) |
| Loading/empty/error states | Yes | Yes |
| File-type filters | Partial (SearchPage.jsx only) | Full integration |
| Collections/clusters | Partial | Full |
| Recent searches | Partial | Full |
| Keyboard navigation | Partial | Full |
| Mobile responsive | Partial | Full |
| Multilingual text rendering | Untested | Required |
| Accessibility (ARIA) | Partial | WCAG 2.1 AA |

---

## 12. Deployment Requirements

| Requirement | Current | Target |
|-------------|---------|--------|
| Local development | Yes | Yes |
| Production backend | No | Yes (Docker, gunicorn) |
| Production frontend | No | Yes (static build) |
| HTTPS | No | Yes |
| Persistent FAISS index | Yes (file-based) | Yes (with backup) |
| Environment variable config | Yes (.env.example) | Yes |
| Health checks | Yes (/health) | Yes (enhanced) |
| Structured logging | No | Yes |
| Monitoring | None | Basic |
| CI/CD | None | GitHub Actions |
| Docker | None | Docker + docker-compose |

---

## 13. Testing Requirements

| Test Type | Current | Target |
|-----------|---------|--------|
| Unit tests | None | >= 80% coverage |
| Integration tests | None | All API endpoints |
| Search accuracy tests | None | Precision/recall benchmarks |
| Multilingual tests | None | Per-language test fixtures |
| OCR tests | None | Image/PDF fixtures |
| Security tests | None | Path traversal, input validation |
| Performance tests | None | Load testing |
| Frontend tests | None | Component tests |
| E2E tests | None | Critical user flows |

---

## 14. Acceptance Criteria

### Phase 1 (Audit)
- [x] Complete architecture map created
- [x] All bugs documented with root cause
- [x] All security risks identified and classified
- [x] SDLC documents created
- [x] Gap analysis table completed
- [x] Roadmap approved

### Phase 2+ (Future)
- [ ] Searching "DAX" returns ONLY files containing the exact word "DAX"
- [ ] Marathi PDFs are searchable in Marathi queries
- [ ] Hindi PDFs are searchable in Hindi queries
- [ ] "GOA trip" search does not return semantically unrelated documents
- [ ] All 5 API endpoints return correct responses under load
- [ ] Frontend shows results within 500ms
- [ ] Zero HIGH/CRITICAL security vulnerabilities in production
