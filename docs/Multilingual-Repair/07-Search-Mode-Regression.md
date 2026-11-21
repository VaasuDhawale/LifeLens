# Search Mode Regression Analysis

## 1. Validated Search Modes

### EXACT Mode
- Performs literal or canonical normalized matching.
- Multi-term queries require complete term presence or full phrase match.
- Zero semantic candidate leakage: completely ignores vector similarity scores to eliminate false positives.

### KEYWORD Mode
- Tokenized Unicode word search.
- Preserves accents, Devanagari vowel signs, and script boundaries.
- Scores candidates strictly by keyword coverage, occurrence count, and phrase bonus.

### HYBRID Mode
- Default search mode.
- Combines keyword evidence (weight 0.70) with semantic vector similarity (weight 0.30).
- Retains strong semantic candidates even when literal lexical overlap is zero.

### SEMANTIC Mode
- Relies primarily on vector cosine similarity (weight 0.65) with keyword bonus (weight 0.35).
- Penalizes purely semantic matches only when no query term appears, while still returning relevant concepts.
