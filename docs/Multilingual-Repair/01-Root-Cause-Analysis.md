# Root Cause Analysis: Multilingual Search Deficiencies in LifeLens AI

## 1. Executive Summary
Prior to this repair phase, LifeLens AI functioned predominantly as an English search engine with severe multilingual degradation. Non-Latin scripts (Devanagari for Marathi/Hindi, Bengali, Tamil, Arabic, CJK) suffered complete token erasure in keyword search, while European languages suffered from diacritic truncation.

## 2. Root Causes Identified

### 2.1 Destructive Tokenization Regex
- **Location:** `services/search_service.py` and `services/indexing.py`
- **Pattern:** `WORD_PATTERN = re.compile(r"[a-z0-9]+")`
- **Impact:** Any non-ASCII character was discarded during tokenization. A query like `ऑक्टोबर` yielded an empty token list `[]`, completely disabling exact, keyword, and occurrence highlighting for Indic, Arabic, Cyrillic, and CJK languages.

### 2.2 Lack of Canonical Unicode Normalization
- Different platforms and input methods encode characters using composite glyphs vs. combining character sequences (e.g. `é` as `\u00e9` vs `e\u0301`). Without canonical NFC normalization at ingestion and query time, exact matches failed unpredictably.

### 2.3 Search Mode Conflation
- The search pipeline lacked an independent `KEYWORD` search mode.
- In `EXACT` mode, partial subword matches were allowed to score, while semantic candidates leaked when thresholds were lowered.

### 2.4 Multilingual Cross-Lingual Vector Disconnection
- The active model `all-MiniLM-L6-v2` produces disjoint vector spaces between English and non-Latin languages. Monolingual matching within Marathi or Hindi functions with moderate similarity, but cross-language query retrieval (e.g. English query retrieving Marathi text) produces near-zero cosine similarity (~0.06).
