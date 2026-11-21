# Embedding Model Verification & Cross-Language Retrieval

## 1. Evaluated Models
- **Current Active Model:** `sentence-transformers/all-MiniLM-L6-v2` (384-dimensional dense vectors)
- **Local Cache Check:** `intfloat/multilingual-e5-base` cache was inspected; weight files (`model.safetensors`) were missing.
- **Reference Candidate:** `BAAI/bge-m3` (1024-dimensional dense vectors + sparse lexical tokens). Not currently present in local offline storage.

## 2. Model Performance Benchmarks
- **Monolingual Semantic Alignment:**
  - English: 0.5252 (Good)
  - Hindi: 0.6726 (High)
  - Marathi: 0.5293 (Moderate)
  - Spanish: 0.6538 (High)
  - French / German: 0.25 - 0.41 (Moderate to Low)
- **Cross-Language Semantic Alignment:**
  - English -> Spanish: 0.6684 (Supported)
  - English -> French: 0.4512 (Supported)
  - English -> Hindi: 0.0656 (Disjoint space)
  - English -> Marathi: 0.0991 (Disjoint space)

## 3. Migration Recommendation
To enable cross-lingual retrieval from English to Indic languages (e.g. English query retrieving Marathi documents), the system should be transitioned to a dense multilingual model (`bge-m3` or `paraphrase-multilingual-MiniLM-L12-v2`) in an environment with connectivity to download model checkpoints.
