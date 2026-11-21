"""Multilingual text processing and language detection for LifeLens AI."""
import unicodedata
from typing import Any
import regex

# Unicode regex matching words with letters, combining marks (matras, diacritics), and digits
UNICODE_WORD_PATTERN = regex.compile(r"[\p{L}\p{M}\p{N}]+", regex.UNICODE)

# Common Unicode script ranges
SCRIPT_RANGES = {
    "Devanagari": (0x0900, 0x097F),
    "Bengali": (0x0980, 0x09FF),
    "Gurmukhi": (0x0A00, 0x0A7F),
    "Gujarati": (0x0A80, 0x0AFF),
    "Odia": (0x0B00, 0x0B7F),
    "Tamil": (0x0B80, 0x0BFF),
    "Telugu": (0x0C00, 0x0C7F),
    "Kannada": (0x0C80, 0x0CFF),
    "Malayalam": (0x0D00, 0x0D7F),
    "Arabic": (0x0600, 0x06FF),
    "Hebrew": (0x0590, 0x05FF),
    "Thai": (0x0E00, 0x0E7F),
    "Cyrillic": (0x0400, 0x04FF),
    "Han": (0x4E00, 0x9FFF),
    "Hiragana": (0x3040, 0x309F),
    "Katakana": (0x30A0, 0x30FF),
    "Hangul": (0xAC00, 0xD7AF),
}


def normalize_unicode(text: str, form: str = "NFC") -> str:
    """Normalize text into canonical Unicode form (default NFC) preserving diacritics."""
    if not text:
        return ""
    return unicodedata.normalize(form, text)


def tokenize_unicode_keywords(text: str) -> list[str]:
    """Extract Unicode-aware keywords preserving Indic vowel marks, diacritics, and script characters."""
    if not text:
        return []
    normalized = normalize_unicode(text)
    tokens: list[str] = []
    for match in UNICODE_WORD_PATTERN.finditer(normalized):
        token = match.group(0).lower()
        if token:
            tokens.append(token)
    return tokens


def strip_accents(text: str) -> str:
    """Secondary matching utility: returns an accent-stripped version for fuzzy matching while retaining NFC."""
    normalized = unicodedata.normalize("NFD", text)
    stripped = "".join(c for c in normalized if unicodedata.category(c) != "Mn")
    return unicodedata.normalize("NFC", stripped)


def detect_script(text: str) -> str:
    """Identify the predominant non-Latin script in text, or Latin/Common."""
    script_counts: dict[str, int] = {}
    for char in text:
        cp = ord(char)
        for script, (start, end) in SCRIPT_RANGES.items():
            if start <= cp <= end:
                script_counts[script] = script_counts.get(script, 0) + 1
                break

    if not script_counts:
        return "Latin"
    return max(script_counts.items(), key=lambda item: item[1])[0]


def get_language_metadata(text: str) -> dict[str, Any]:
    """Generate script and language detection metadata for indexed content."""
    script = detect_script(text)
    return {
        "primary_script": script,
        "is_multilingual": script != "Latin",
    }
