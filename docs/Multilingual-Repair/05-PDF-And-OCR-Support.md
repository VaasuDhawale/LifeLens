# PDF Extraction and OCR Pipeline Analysis

## 1. Extraction Pipeline Architecture
- **Native PDF Extraction:** Uses `pypdf` to extract embedded text streams directly.
  - Tested on `test_data/DMV_Unit5_Hinglish_Summary.pdf`: Successfully extracts Devanagari and Hinglish text.
  - Tested on `test_data/Theory Assignment 1&2 .pdf`: Successfully extracts native text.
- **Scanned / Rasterized PDFs:** 
  - Examined `test_data/CBE माहे ऑक्टोबर २५.pdf` (2.0 MB scanned Marathi PDF) and `test_data/DocScanner 16 Jun 2026 5-16 pm.pdf`.
  - Both files contain purely rasterized scanned image pages with zero text stream characters (`chars: 0`).
  - Native text extractors yield empty strings.

## 2. OCR Status & Limitations
- **Tesseract OCR Binary:** Missing from system PATH.
- **Current Fallback:** The extraction pipeline gracefully records empty text extraction without crashing the indexing service.
- **Requirement for Scanned Documents:** In order to index scanned Marathi or Hindi documents like `CBE माहे ऑक्टोबर २५.pdf`, Tesseract must be installed with `tessdata` packs for Devanagari (`hin.traineddata`, `mar.traineddata`).
