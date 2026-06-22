# Consent statements (read these exactly)

Microsoft **verifies** your recorded consent before training: it checks the spoken words match the script, and matches your face/voice in the consent recording against your training data. Use the **exact wording** below, in the **same language** as your training data. Fill the bracketed parts aloud.

- For **John Lunn**, "first and last name" = **John Lunn**.
- "the name of the company" = the company you record under, e.g. **Microsoft** (use whatever your approved application specifies).

Record clearly, in a quiet room, face well-lit and centred (for avatar) / same mic & environment as your training data (for voice).

---

## 1. Custom AVATAR consent — record as VIDEO (you, on camera)

Use this when training a custom **photo** or **video** avatar **without** voice sync.

> **English (United Kingdom) — en-GB**
>
> "I, **[state your first and last name]**, acknowledge and agree that my image or video recordings of my image and movements will be used by **[state the name of the company]** to create and use a photorealistic, synthetic avatar version of me."

Spoken example:
> "I, John Lunn, acknowledge and agree that my image or video recordings of my image and movements will be used by Microsoft to create and use a photorealistic, synthetic avatar version of me."

---

## 2. Custom avatar WITH voice sync — record as VIDEO

Use this **only** when training a **video** avatar and you want the auto-cloned "voice sync" voice at the same time. (Photo avatars don't support voice sync.) The consent must cover **both** image and voice. Get the exact dual-scope wording here and read it verbatim on camera:

- `verbal-statement-voice-sync-for-avatar-all-locales.txt` →
  https://github.com/Azure-Samples/cognitive-services-speech-sdk/blob/master/sampledata/customavatar/verbal-statement-voice-sync-for-avatar-all-locales.txt

---

## 3. Professional VOICE (Custom Neural Voice) consent — record as AUDIO

Use this when training a standalone Professional Voice from your recordings. Record with the **same mic, environment and speaking style** as your voice training data, and save as `.mp3`.

> **English (United Kingdom) — en-GB**
>
> "I, **[state your first and last name]**, am aware that recordings of my voice will be used by **[state the name of the company]** to create and use a synthetic version of my voice."

Spoken example:
> "I, John Lunn, am aware that recordings of my voice will be used by Microsoft to create and use a synthetic version of my voice."

Full multi-language list:
https://github.com/Azure-Samples/Cognitive-Speech-TTS/blob/master/CustomVoice/script/verbal-statement-all-locales.txt

---

## Notes
- The **voice talent name** and **company name** you enter in Foundry must match exactly what you say in the recording, in the same language.
- Keep the consent recording in the **same language** as the training data.
- Consent recordings are retained by Microsoft for verification/compliance.
