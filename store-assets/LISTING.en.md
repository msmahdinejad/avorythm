# Avorythm — Chrome Web Store listing (English)

## Name

Avorythm — AI Live Dubbing & Subtitles

## Short description

Translate tab audio with AI: live dubbing, bilingual captions, independent audio mixing, and synchronized playback.

## Detailed description

Watch courses, videos, films, and podcasts in your language. Avorythm translates audio from the browser tab you explicitly select using AI. Hear live dubbed speech, see source and translated captions, or keep the original audio while reading the translation.

The extension offers 79 destination-language entries, including English, Persian, Arabic, Simplified and Traditional Chinese, German, French, Italian, Spanish, Russian, Japanese, Korean, Turkish, Portuguese, Hindi, Urdu, and many more.

Choose how you watch:

- On this page: a low-latency route for live audio and captions.
- Synchronized recorder & player: capture ahead, then pause, seek, or fullscreen the independent buffered player. Recording continues separately and can be finished manually.

Original audio, dubbed audio, source subtitles, and translated subtitles are four independent channels. Mix the audio, move and resize the subtitle overlay, or export a customized recorded WebM with separate SRT captions. Optional regular recording also exports both audio tracks as WAV and both subtitle tracks as SRT.

The extension is standalone. It does not require the desktop app, Python, FFmpeg, localhost, or a virtual audio device. The current interface is available in English, Persian, and Simplified Chinese; the translation language is selected independently.

Getting started: add your Google AI Studio Gemini API key in Settings, explicitly consent to sending selected-tab audio to Gemini, choose a language, and press Start. The optional precise synchronized route uses Groq Whisper transcription, Gemini text translation, and Gemini 3.1 Flash Live speech. It requires its own Groq key, optional host permission, and separate consent.

Privacy: capture starts only after your consent and Start. Selected-tab audio and transcripts go directly to the AI providers needed for the requested processing, never to the Avorythm maintainer. There are no ads, analytics, or developer-operated relay servers. Keys are session-only by default. You can independently remember each provider key on this device; those copies are not synced or encrypted by the extension. Disabling this option deletes the device copy; clearing a key deletes both device and session copies.

Ordinary four-output recording is off by default. Synchronized mode records locally for playback and export, keeping only the latest capture in Chrome’s private local storage. Downloaded files go to Downloads/Avorythm.

The extension is free and open source. AI provider quotas and supported models can change; real-time processing has network delay and cannot guarantee perfect translations or zero latency. DRM-protected media and internal browser pages may not be capturable.

Source: https://github.com/msmahdinejad/avorythm

Guide: https://github.com/msmahdinejad/avorythm/blob/main/docs/HELP.md

Privacy: https://github.com/msmahdinejad/avorythm/blob/main/PRIVACY.md

## What’s new in 1.1.16

- Easier language selection, with popular languages first and clear Simplified/Traditional Chinese and Portuguese variants.
- New German, French, Italian, Russian, and Arabic project resources and user guides.
- Refreshed store artwork based on the real interface.
