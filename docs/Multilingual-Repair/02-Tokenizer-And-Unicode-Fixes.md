# Tokenizer and Unicode Architecture Fixes

## 1. Overview
The tokenization architecture was rebuilt to use Unicode character classes via the Python `regex` library.

## 2. Technical Implementation
In `services/multilingual.py`:
```python
UNICODE_WORD_PATTERN = regex.compile(r"[\p{L}\p{M}\p{N}]+", regex.UNICODE)
```
- `\p{L}`: Unicode letters (Latin, Devanagari, Bengali, Tamil, Cyrillic, Han, Hangul, etc.)
- `\p{M}`: Combining marks (matras, vowel accents, virama, umlauts, cedillas)
- `\p{N}`: Unicode numeric values

## 3. Preserved Script Capabilities
- **Devanagari (Marathi/Hindi):** Preserves vowel signs and conjuncts (e.g. `महाराष्ट्र`, `चिकित्सा`, `निदान`).
- **European Diacritics:** Retains full accents (`école`, `München`, `niño`, `ação`).
- **Indic Scripts:** Preserves Bengali (`চিকিৎসা`), Tamil (`மருத்துவ`), Telugu, Gujarati.
- **Middle Eastern & Asian:** Preserves Arabic (`مرحبا`), Cyrillic (`интеллект`), Hangul (`한국어`), and CJK.
- **Normalization:** Standardized to canonical Unicode NFC format across ingestion and queries.
