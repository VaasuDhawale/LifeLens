"""Multilingual comprehensive test suite for LifeLens AI."""
import pytest
from fastapi.testclient import TestClient

from app.main import app
from services.multilingual import (
    detect_script,
    normalize_unicode,
    strip_accents,
    tokenize_unicode_keywords,
)

client = TestClient(app)


def test_unicode_normalization_and_accents():
    # Canonical NFC preservation
    assert normalize_unicode("é") == "é"
    assert normalize_unicode("München") == "München"
    assert normalize_unicode("महाराष्ट्र") == "महाराष्ट्र"
    # Accent stripping secondary matching
    assert strip_accents("école") == "ecole"
    assert strip_accents("München") == "Munchen"
    assert strip_accents("niño") == "nino"


def test_multilingual_tokenization():
    # Marathi and Hindi combining characters (matras and conjuncts)
    tokens_mr = tokenize_unicode_keywords("माझी गोव्याची सहल जून महिन्यात आहे.")
    assert "गोव्याची" in tokens_mr
    assert "महिन्यात" in tokens_mr

    tokens_hi = tokenize_unicode_keywords("चिकित्सा निदान में कृत्रिम बुद्धिमत्ता")
    assert "चिकित्सा" in tokens_hi
    assert "बुद्धिमत्ता" in tokens_hi

    # Indic scripts (Bengali, Tamil, Telugu, Gujarati)
    tokens_bn = tokenize_unicode_keywords("চিকিৎসা নির্ণয়ে কৃত্রিম বুদ্ধিমত্তা")
    assert "চিকিৎসা" in tokens_bn

    tokens_ta = tokenize_unicode_keywords("மருத்துவ நோயறிதலில் செயற்கை நுண்ணறிவு")
    assert "மருத்துவ" in tokens_ta

    # European diacritics
    tokens_fr = tokenize_unicode_keywords("L'école de München et le niño")
    assert "école" in tokens_fr
    assert "münchen" in tokens_fr
    assert "niño" in tokens_fr

    # Arabic & Cyrillic
    tokens_ar = tokenize_unicode_keywords("مرحبا بكم في الذكاء الاصطناعي")
    assert "مرحبا" in tokens_ar

    tokens_ru = tokenize_unicode_keywords("искусственный интеллект в медицине")
    assert "интеллект" in tokens_ru

    # CJK characters
    tokens_cjk = tokenize_unicode_keywords("日本語テキストと한국어문서")
    assert "日本語テキストと한국어문서" in tokens_cjk or len(tokens_cjk) > 0


def test_script_detection():
    assert detect_script("English query with numbers 123") == "Latin"
    assert detect_script("माझी गोव्याची सहल") == "Devanagari"
    assert detect_script("चिकित्सा निदान") == "Devanagari"
    assert detect_script("চিকিৎসা নির্ণয়ে") == "Bengali"
    assert detect_script("மருத்துவ நோயறிதலில்") == "Tamil"
    assert detect_script("مرحبا بكم") == "Arabic"
    assert detect_script("искусственный интеллект") == "Cyrillic"
    assert detect_script("한국어 문서") == "Hangul"


def test_search_modes_api():
    # Test EXACT mode
    res_exact = client.post(
        "/api/v1/search",
        json={"query": "Power BI", "mode": "exact", "limit": 5, "threshold": 0.4},
    )
    assert res_exact.status_code == 200

    # Test KEYWORD mode
    res_keyword = client.post(
        "/api/v1/search",
        json={"query": "ऑक्टोबर", "mode": "keyword", "limit": 5, "threshold": 0.4},
    )
    assert res_keyword.status_code == 200

    # Test HYBRID mode
    res_hybrid = client.post(
        "/api/v1/search",
        json={"query": "data visualization", "mode": "hybrid", "limit": 5, "threshold": 0.4},
    )
    assert res_hybrid.status_code == 200

    # Test SEMANTIC mode
    res_semantic = client.post(
        "/api/v1/search",
        json={"query": "machine learning healthcare", "mode": "semantic", "limit": 5, "threshold": 0.4},
    )
    assert res_semantic.status_code == 200


def test_cross_language_semantic_search():
    # Cross-lingual Spanish -> English search query
    res = client.post(
        "/api/v1/search",
        json={"query": "aprendizaje automático e inteligencia artificial", "mode": "semantic", "limit": 5, "threshold": 0.3},
    )
    assert res.status_code == 200
    assert "results" in res.json()


def test_exact_search_no_semantic_leakage():
    # An obscure non-matching token in exact mode should yield zero results
    res = client.post(
        "/api/v1/search",
        json={"query": "xyz_nonexistent_token_12345", "mode": "exact", "limit": 5, "threshold": 0.1},
    )
    assert res.status_code == 200
    assert len(res.json()["results"]) == 0
