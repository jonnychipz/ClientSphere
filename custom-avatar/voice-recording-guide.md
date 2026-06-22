# Voice recording guide — Professional Voice (your voice clone)

A standalone **Professional Voice (Custom Neural Voice)** is the way to make a **photo** avatar truly sound like you. It needs a meaningful amount of clean, consistent recordings.

> 💡 If you go the **video-avatar** route instead, **voice sync** clones your voice automatically from the training video — you can skip this whole file. This guide is for the photo-avatar + your-voice combination, or anyone wanting top-quality voice.

## How much to record
- **Minimum** to train: ~**300 utterances** (sentences). More is better.
- **Recommended** for a high-quality, natural voice: **500–2,000** utterances.
- Expect **1–3 hours** of recording for a few hundred lines, plus breaks.

## The script
Use Microsoft's general recording scripts (statements, questions, exclamations across varied content), or supply your own domain text. For a GitHub sales coach, include:
- product/pricing phrases ("Copilot Business is nineteen dollars per seat per month"),
- coaching lines ("What's the customer's biggest pain right now?"),
- numbers, currencies, and acronyms (USD, GBP, SSO, SCIM, CI/CD).
Mix statements, questions and exclamations. Microsoft provides starter scripts in Speech Studio / Foundry when you create the project.

## Recording quality (this matters most)
- 🎙️ **Quiet room**, minimal echo. A treated room or a wardrobe of clothes works as a damped space.
- 🎙️ **Good mic**, fixed distance (a hand-span from your mouth), pop filter if possible.
- 🎚️ **Consistent**: same mic, same room, same time of day, same energy/pace across **all** sessions **and** the consent recording.
- 🔇 Signal-to-noise high; no background hum, typing, traffic, HVAC.
- 🗣️ Natural, warm, "coaching" delivery — how you want Hubble to sound. Smile slightly; it carries in the voice.
- ⏸️ Leave a short silence at the start/end of each clip; re-record fluffed lines.

## Format / data requirements
- One clip per script line, or use Foundry's guided recorder.
- Common spec: **WAV, mono, 16-bit, 24 kHz+** (follow the exact requirements shown in the Foundry training-data step).
- Each audio file paired with its exact transcript (the tool guides this).
- Details: https://learn.microsoft.com/azure/ai-services/speech-service/how-to-custom-voice-training-data

## Consent (don't skip)
Record the **voice** consent statement (see `consent-statements.md` §3) with the **same mic and room** as the training data, as `.mp3`. Microsoft uses it to verify the voice is yours.

## After recording
Proceed to `submission-guide.md` to upload, train, and deploy. Once deployed, set in `.env`:

```ini
CUSTOM_VOICE_NAME=<your CNV deployment/voice name, e.g. en-GB-JohnNeural>
```

## Naming convention
Custom voice names typically look like `<locale>-<Name>Neural` (you choose the name during deployment). Use something recognisable, e.g. `en-GB-JohnNeural`.
