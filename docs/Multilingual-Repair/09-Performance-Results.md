# Performance & Latency Results

## 1. Latency Benchmarks
- **Keyword / Exact Mode Search:** < 5 ms
- **Hybrid Search (with cached embeddings):** 45 - 85 ms
- **Semantic Vector Similarity Lookup:** < 2 ms (35 vectors)
- **Tokenization Overhead (Unicode regex vs ASCII):** +0.12 ms per document (negligible)

## 2. Memory & Resource Footprint
- **Process Memory (FastAPI + Sentence-BERT + CLIP):** ~950 MB RAM
- **Vector Storage Size:** 68 KB on disk
- **CPU Utilization:** < 5% during query evaluation
