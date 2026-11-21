import asyncio
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable

import regex

from models.search import SearchMode, SearchRequest, SearchResponse, SearchResult
from services.image_embedding import CLIPImageEmbeddingService
from services.multilingual import (
    UNICODE_WORD_PATTERN,
    normalize_unicode,
    strip_accents,
    tokenize_unicode_keywords,
)
from services.text_embedding import SentenceBERTTextEmbeddingService
from services.vector_db import FAISSVectorDB


TEXT_FILE_TYPES = {"text", "pdf", "docx", "document", "image"}
IMAGE_FILE_TYPES = {"image"}
WORD_PATTERN = UNICODE_WORD_PATTERN
HYBRID_KEYWORD_WEIGHT = 0.70
HYBRID_SEMANTIC_WEIGHT = 0.30
SEMANTIC_KEYWORD_WEIGHT = 0.35
SEMANTIC_SIMILARITY_WEIGHT = 0.65
SEMANTIC_ONLY_PENALTY = 0.35


@dataclass(frozen=True)
class SearchBackendResult:
    kind: str
    matches: list[dict]


@dataclass
class RankedCandidate:
    path: str
    file_name: str
    file_type: str
    metadata: dict
    keyword_score: float = 0.0
    semantic_similarity: float = 0.0
    final_score: float = 0.0
    occurrence_count: int = 0
    snippet: str | None = None
    matched_keywords: set[str] = field(default_factory=set)
    filename_match: bool = False
    content_match: bool = False
    match_sources: set[str] = field(default_factory=set)
    vector_ids: list[int] = field(default_factory=list)


@dataclass(frozen=True)
class KeywordEvidence:
    score: float
    occurrence_count: int
    matched_keywords: set[str]
    filename_match: bool
    content_match: bool
    snippet: str | None


class SearchService:
    """Coordinates keyword-first natural-language search across indexed files."""

    def __init__(
        self,
        text_embedding_service: SentenceBERTTextEmbeddingService,
        image_embedding_service: CLIPImageEmbeddingService,
        text_vector_db: FAISSVectorDB,
        image_vector_db: FAISSVectorDB,
    ) -> None:
        self.text_embedding_service = text_embedding_service
        self.image_embedding_service = image_embedding_service
        self.text_vector_db = text_vector_db
        self.image_vector_db = image_vector_db

    async def search(self, request: SearchRequest) -> SearchResponse:
        query = normalize_unicode(request.query.strip())
        if not query:
            return SearchResponse(query=query, results=[], count=0)
        requested_types = {file_type.lower() for file_type in request.file_types}
        query_terms = tokenize_keywords(query)

        keyword_candidates = self._keyword_candidates(
            query=query,
            query_terms=query_terms,
            requested_types=requested_types,
            mode=request.mode,
        )

        backend_results: list[SearchBackendResult] = []
        if request.mode not in {SearchMode.EXACT, SearchMode.KEYWORD}:
            semantic_limit = min(max(request.limit * 8, 50), 200)
            tasks = []
            if self._should_search_text(requested_types):
                tasks.append(self._search_text(query, semantic_limit, requested_types))
            if self._should_search_images(requested_types):
                tasks.append(self._search_images(query, semantic_limit))
            if tasks:
                backend_results = list(await asyncio.gather(*tasks))

        ranked_results = self._rank_results(
            keyword_candidates=keyword_candidates,
            backend_results=backend_results,
            query_terms=query_terms,
            mode=request.mode,
            threshold=request.threshold,
            limit=request.limit,
        )

        return SearchResponse(
            query=query,
            results=ranked_results,
            count=len(ranked_results),
        )

    async def _search_text(
        self,
        query: str,
        limit: int,
        requested_types: set[str],
    ) -> SearchBackendResult:
        try:
            self.text_vector_db.reload()
        except Exception:
            return SearchBackendResult(kind="text", matches=[])
        if self.text_vector_db.total_vectors == 0:
            return SearchBackendResult(kind="text", matches=[])

        normalized_types = self._normalize_text_filters(requested_types)
        file_type_filter = next(iter(normalized_types)) if len(normalized_types) == 1 else None
        query_vector = await self.text_embedding_service.embed_text_async(query)
        text_matches = await asyncio.to_thread(
            self.text_vector_db.search_vector,
            query_vector,
            limit,
            file_type_filter,
        )

        if normalized_types and file_type_filter is None:
            text_matches = [
                match
                for match in text_matches
                if match["file_type"] in normalized_types
            ]

        return SearchBackendResult(kind="text", matches=text_matches)

    async def _search_images(self, query: str, limit: int) -> SearchBackendResult:
        try:
            self.image_vector_db.reload()
        except Exception:
            return SearchBackendResult(kind="image", matches=[])
        if self.image_vector_db.total_vectors == 0:
            return SearchBackendResult(kind="image", matches=[])

        query_vector = await self.image_embedding_service.embed_text_async(query)
        image_matches = await asyncio.to_thread(
            self.image_vector_db.search_vector,
            query_vector,
            limit,
            "image",
        )
        return SearchBackendResult(kind="image", matches=image_matches)

    def _keyword_candidates(
        self,
        query: str,
        query_terms: list[str],
        requested_types: set[str],
        mode: SearchMode = SearchMode.HYBRID,
    ) -> dict[str, RankedCandidate]:
        candidates: dict[str, RankedCandidate] = {}
        if not query_terms:
            return candidates

        for record in self._iter_metadata_records(requested_types):
            path = str(record["file_path"])
            metadata = dict(record.get("metadata", {}))
            evidence = keyword_evidence(
                query=query,
                query_terms=query_terms,
                file_name=str(record["file_name"]),
                file_path=path,
                metadata=metadata,
                mode=mode,
            )
            if evidence.score <= 0:
                continue

            candidate = candidates.get(path)
            if candidate is None:
                candidate = RankedCandidate(
                    path=path,
                    file_name=str(record["file_name"]),
                    file_type=str(record["file_type"]),
                    metadata={
                        **metadata,
                        "file_type": record["file_type"],
                    },
                    snippet=evidence.snippet,
                )
                candidates[path] = candidate

            candidate.keyword_score = max(candidate.keyword_score, evidence.score)
            candidate.occurrence_count += evidence.occurrence_count
            candidate.matched_keywords.update(evidence.matched_keywords)
            candidate.filename_match = candidate.filename_match or evidence.filename_match
            candidate.content_match = candidate.content_match or evidence.content_match
            candidate.snippet = candidate.snippet or evidence.snippet

        return candidates

    def _iter_metadata_records(self, requested_types: set[str]) -> Iterable[dict]:
        try:
            self.text_vector_db.reload()
        except Exception:
            pass
        try:
            self.image_vector_db.reload()
        except Exception:
            pass

        seen_records: set[tuple[str, str, int]] = set()
        for record in [
            *self.text_vector_db.list_metadata(),
            *self.image_vector_db.list_metadata(),
        ]:
            file_type = str(record["file_type"])
            if not self._is_requested_type(file_type, requested_types):
                continue

            record_key = (str(record["file_path"]), file_type, int(record["id"]))
            if record_key in seen_records:
                continue
            seen_records.add(record_key)
            yield record

    def _rank_results(
        self,
        keyword_candidates: dict[str, RankedCandidate],
        backend_results: Iterable[SearchBackendResult],
        query_terms: list[str],
        mode: SearchMode,
        threshold: float,
        limit: int,
    ) -> list[SearchResult]:
        candidates = dict(keyword_candidates)

        for backend_result in backend_results:
            for match in backend_result.matches:
                path = str(match["file_path"])
                # BUG FIX: passing empty set always returns True, making
                # this check a no-op.  Removed the dead filter so all
                # semantic results are merged into ranking as intended.


                metadata = {
                    **match.get("metadata", {}),
                    "file_type": match["file_type"],
                }
                candidate = candidates.get(path)
                if candidate is None:
                    candidate = RankedCandidate(
                        path=path,
                        file_name=str(match["file_name"]),
                        file_type=str(match["file_type"]),
                        metadata=metadata,
                    )
                    candidates[path] = candidate

                semantic_score = clamp_score(float(match["score"]))
                candidate.semantic_similarity = max(
                    candidate.semantic_similarity,
                    semantic_score,
                )
                candidate.match_sources.add(backend_result.kind)
                if int(match["id"]) not in candidate.vector_ids:
                    candidate.vector_ids.append(int(match["id"]))
                candidate.metadata = {
                    **candidate.metadata,
                    **metadata,
                    "file_type": candidate.file_type,
                }

        ranked: list[SearchResult] = []
        for candidate in candidates.values():
            final_score = combined_score(candidate, mode)
            if mode == SearchMode.EXACT and candidate.keyword_score <= 0:
                continue
            if mode == SearchMode.KEYWORD and candidate.keyword_score <= 0:
                continue
            if mode == SearchMode.HYBRID:
                # In HYBRID, candidates can come from exact/keyword match OR strong semantic match
                if candidate.keyword_score <= 0 and candidate.semantic_similarity < threshold:
                    continue
            if mode not in {SearchMode.EXACT, SearchMode.KEYWORD} and final_score < threshold:
                continue
            if not query_terms and candidate.keyword_score <= 0:
                continue

            candidate.final_score = final_score
            explanation = {
                "matched_keywords": sorted(candidate.matched_keywords),
                "filename_match": candidate.filename_match,
                "content_match": candidate.content_match,
                "keyword_score": round(candidate.keyword_score, 4),
                "semantic_similarity": round(candidate.semantic_similarity, 4),
                "final_score": round(candidate.final_score, 4),
                "occurrence_count": candidate.occurrence_count,
                "search_mode": mode.value,
            }
            metadata = sanitize_response_metadata({
                **candidate.metadata,
                **explanation,
                "search_backend": "keyword" if not candidate.match_sources else "hybrid",
                "match_sources": sorted(candidate.match_sources | {"keyword"})
                if candidate.keyword_score > 0
                else sorted(candidate.match_sources),
                "vector_ids": candidate.vector_ids,
                "match_explanation": explanation,
            })

            ranked.append(
                SearchResult(
                    path=Path(candidate.path),
                    score=final_score,
                    title=candidate.file_name,
                    snippet=candidate.snippet,
                    metadata=metadata,
                )
            )

        return sorted(
            ranked,
            key=lambda result: sort_key(result, mode),
            reverse=True,
        )[:limit]

    @staticmethod
    def _should_search_text(requested_types: set[str]) -> bool:
        return not requested_types or bool(requested_types & TEXT_FILE_TYPES)

    @staticmethod
    def _should_search_images(requested_types: set[str]) -> bool:
        return not requested_types or bool(requested_types & IMAGE_FILE_TYPES)

    @staticmethod
    def _normalize_text_filters(requested_types: set[str]) -> set[str]:
        if not requested_types:
            return set()

        normalized = set()
        if "text" in requested_types:
            normalized.add("text")
        if "pdf" in requested_types or "document" in requested_types:
            normalized.add("pdf")
        if "docx" in requested_types or "document" in requested_types:
            normalized.add("docx")
        if "image" in requested_types:
            normalized.add("image")
        return normalized

    @staticmethod
    def _is_requested_type(file_type: str, requested_types: set[str]) -> bool:
        if not requested_types:
            return True
        if file_type in requested_types:
            return True
        if file_type == "pdf" and "document" in requested_types:
            return True
        if file_type == "docx" and "document" in requested_types:
            return True
        if file_type == "text" and "document" in requested_types:
            return True
        return False


def combined_score(candidate: RankedCandidate, mode: SearchMode) -> float:
    keyword_score = clamp_score(candidate.keyword_score)
    semantic_score = clamp_score(candidate.semantic_similarity)

    if mode in {SearchMode.EXACT, SearchMode.KEYWORD}:
        return keyword_score
    if mode == SearchMode.SEMANTIC:
        if keyword_score <= 0:
            return semantic_score * SEMANTIC_ONLY_PENALTY
        return (
            SEMANTIC_KEYWORD_WEIGHT * keyword_score
            + SEMANTIC_SIMILARITY_WEIGHT * semantic_score
        )
    return HYBRID_KEYWORD_WEIGHT * keyword_score + HYBRID_SEMANTIC_WEIGHT * semantic_score


def keyword_evidence(
    query: str,
    query_terms: list[str],
    file_name: str,
    file_path: str,
    metadata: dict,
    mode: SearchMode = SearchMode.HYBRID,
) -> KeywordEvidence:
    filename_text = f"{file_name} {Path(file_path).stem}"
    content_text = extract_searchable_text(metadata)
    query_term_set = set(query_terms)
    filename_lower = filename_text.lower()
    content_lower = content_text.lower()
    legacy_content_terms = [str(term).lower() for term in metadata.get("content_terms") or []]

    filename_matches: set[str] = set()
    content_matches: set[str] = set()
    filename_occurrences = 0
    content_occurrences = 0
    for term in query_term_set:
        filename_count = count_substring_occurrences(filename_lower, term)
        content_count = count_substring_occurrences(content_lower, term)
        if content_count == 0 and legacy_content_terms:
            content_count = sum(
                1
                for legacy_term in legacy_content_terms
                if term in legacy_term or legacy_term in term
            )
        if filename_count:
            filename_matches.add(term)
            filename_occurrences += filename_count
        if content_count:
            content_matches.add(term)
            content_occurrences += content_count

    matched_keywords = filename_matches | content_matches

    # In EXACT mode, strict match requires ALL query terms or full phrase match
    if mode == SearchMode.EXACT and len(matched_keywords) < len(query_term_set):
        norm_q = " ".join(query_terms)
        if norm_q not in filename_lower and norm_q not in content_lower:
            return KeywordEvidence(
                score=0.0,
                occurrence_count=0,
                matched_keywords=set(),
                filename_match=False,
                content_match=False,
                snippet=None,
            )

    if not matched_keywords:
        return KeywordEvidence(
            score=0.0,
            occurrence_count=0,
            matched_keywords=set(),
            filename_match=False,
            content_match=False,
            snippet=None,
        )

    filename_coverage = len(filename_matches) / len(query_term_set)
    content_coverage = len(content_matches) / len(query_term_set)
    total_coverage = len(matched_keywords) / len(query_term_set)
    phrase_bonus = phrase_match_bonus(query, filename_text, content_text)
    occurrence_count = filename_occurrences + content_occurrences
    occurrence_bonus = min(0.25, occurrence_count / 20)
    keyword_score = min(
        1.0,
        total_coverage
        + (0.15 * filename_coverage)
        + (0.08 * content_coverage)
        + phrase_bonus
        + occurrence_bonus,
    )

    return KeywordEvidence(
        score=keyword_score,
        occurrence_count=occurrence_count,
        matched_keywords=matched_keywords,
        filename_match=bool(filename_matches),
        content_match=bool(content_matches),
        snippet=build_snippet(content_text, matched_keywords),
    )


def tokenize_keywords(text: str) -> list[str]:
    return tokenize_unicode_keywords(text)


def count_substring_occurrences(text: str, term: str) -> int:
    """Count partial, case-normalized keyword hits, preserving Unicode."""
    if not text or not term:
        return 0
    return len(regex.findall(regex.escape(term.lower()), text, regex.IGNORECASE))


def extract_searchable_text(metadata: dict) -> str:
    text_values = [
        metadata.get("searchable_text", ""),
        metadata.get("text_preview", ""),
        metadata.get("ocr_text", ""),
    ]
    return "\n".join(str(value) for value in text_values if value)


def phrase_match_bonus(query: str, filename_text: str, content_text: str) -> float:
    normalized_query = " ".join(tokenize_keywords(query))
    if not normalized_query:
        return 0.0

    normalized_filename = " ".join(tokenize_keywords(filename_text))
    normalized_content = " ".join(tokenize_keywords(content_text))
    bonus = 0.0
    if normalized_query in normalized_filename:
        bonus += 0.15
    if normalized_query in normalized_content:
        bonus += 0.10
    return min(bonus, 0.2)


def build_snippet(content_text: str, matched_keywords: set[str]) -> str | None:
    if not content_text or not matched_keywords:
        return None

    lowered_text = content_text.lower()
    match_positions = [
        lowered_text.find(keyword)
        for keyword in matched_keywords
        if lowered_text.find(keyword) >= 0
    ]
    if not match_positions:
        return content_text[:220].strip() or None

    center = min(match_positions)
    start = max(center - 90, 0)
    end = min(center + 160, len(content_text))
    prefix = "..." if start > 0 else ""
    suffix = "..." if end < len(content_text) else ""
    return f"{prefix}{content_text[start:end].strip()}{suffix}"


def clamp_score(score: float) -> float:
    return min(max(score, 0.0), 1.0)


def sort_key(result: SearchResult, mode: SearchMode) -> tuple[float, float]:
    occurrence_count = float(result.metadata.get("occurrence_count", 0))
    if mode in {SearchMode.EXACT, SearchMode.KEYWORD}:
        return occurrence_count, result.score
    return result.score, occurrence_count


def sanitize_response_metadata(metadata: dict) -> dict:
    hidden_keys = {"searchable_text", "content_terms", "ocr_text"}
    return {key: value for key, value in metadata.items() if key not in hidden_keys}
