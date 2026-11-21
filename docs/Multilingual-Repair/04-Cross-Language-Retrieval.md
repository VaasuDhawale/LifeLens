# Cross-Language Retrieval and Search Strategy

## 1. Overview
Cross-language retrieval allows users to query documents written in another language. 

## 2. Multi-tier Strategy
1. **Semantic Cross-Lingual Matching:** Enabled through multimodal and multilingual embedding vector similarity.
2. **Cognate & Term Overlap:** Latin-based scripts (English <-> Spanish, Portuguese, Italian, French) benefit from shared subwords and cognates.
3. **Script-Specific Exact & Keyword Filters:** Strict lexical constraints are applied only in `EXACT` and `KEYWORD` modes; `HYBRID` and `SEMANTIC` modes preserve relevant cross-lingual matches even when literal character overlap is zero.
4. **Metadata Preservation:** Original documents remain completely in their source scripts without destructive translation.
