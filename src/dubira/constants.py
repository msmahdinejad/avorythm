from __future__ import annotations

LIVE_MODEL = "gemini-3.5-live-translate-preview"
FILE_VOICE_MODEL = "gemini-3.1-flash-live-preview"
GROQ_PRECISE_MODEL = "whisper-large-v3"
GROQ_FAST_MODEL = "whisper-large-v3-turbo"
INPUT_RATE = 16_000
OUTPUT_RATE = 24_000
CHUNK_MS = 100
INPUT_FRAMES = INPUT_RATE * CHUNK_MS // 1000
OUTPUT_FRAMES = OUTPUT_RATE * CHUNK_MS // 1000

SUPPORTED_LANGUAGES = {
    "af",
    "ak",
    "sq",
    "am",
    "ar",
    "hy",
    "az",
    "eu",
    "be",
    "bn",
    "bg",
    "my",
    "ca",
    "zh-Hans",
    "zh-Hant",
    "hr",
    "cs",
    "da",
    "nl",
    "en",
    "et",
    "fil",
    "fi",
    "fr",
    "gl",
    "ka",
    "de",
    "el",
    "gu",
    "ha",
    "he",
    "hi",
    "hu",
    "is",
    "id",
    "it",
    "ja",
    "jv",
    "kn",
    "kk",
    "km",
    "rw",
    "ko",
    "lo",
    "lv",
    "lt",
    "mk",
    "ms",
    "ml",
    "mr",
    "mn",
    "ne",
    "no",
    "nb",
    "fa",
    "pl",
    "pt-BR",
    "pt-PT",
    "pa",
    "ro",
    "ru",
    "sr",
    "sd",
    "si",
    "sk",
    "sl",
    "es",
    "su",
    "sw",
    "sv",
    "ta",
    "te",
    "th",
    "tr",
    "uk",
    "ur",
    "uz",
    "vi",
    "zu",
}

RTL_LANGUAGES = {"ar", "fa", "he", "ur", "sd"}

VOICE_NAMES = {
    "Aoede",
    "Charon",
    "Fenrir",
    "Kore",
    "Leda",
    "Orus",
    "Puck",
    "Zephyr",
}

# Strongest-first free-tier text-output pool. Limits mirror the user's active
# Google AI Studio project and remain local guardrails; Google is authoritative.
TRANSLATION_MODELS = (
    ("gemini-3.6-flash", 5, 20, True),
    ("gemini-3.5-flash", 5, 20, True),
    ("gemini-3-flash-preview", 5, 20, True),
    ("gemini-2.5-flash", 5, 20, True),
    ("gemini-3.5-flash-lite", 15, 500, True),
    ("gemini-3.1-flash-lite", 15, 500, True),
    ("gemini-2.5-flash-lite", 10, 20, True),
    ("gemma-4-31b-it", 30, 14_400, False),
    ("gemma-4-26b-a4b-it", 30, 14_400, False),
)
