# ClientSphere - Custom Avatar and Voice

This folder is the kit for adding an approved Jonnychipz photo avatar and voice to ClientSphere through Azure AI Speech. The application is already wired for it, but the feature is disabled until those assets are available.

> ⚠️ **Both features are Limited Access (Responsible AI gated).** You must apply and be approved, and prove consent. This is not instant self-serve. Plan for **days** (photo avatar) to **weeks** (professional voice).

---

## TL;DR — the path

| Step | What | Where | Effort |
|------|------|-------|--------|
| 1 | Apply for Limited Access (avatar **and** voice) | https://aka.ms/customneural | 1 form, then wait for approval |
| 2 | Record your **consent videos/audio** | see `consent-statements.md` | 15 min |
| 3 | Provide your **photo** (avatar) | see `photo-spec.md` | 5 min |
| 4 | Record **voice training data** (for a true clone) | see `voice-recording-guide.md` | 1–3 hrs studio |
| 5 | **Train** in Microsoft Foundry (Fine-tune → Azure Speech) | https://ai.azure.com | mostly waiting |
| 6 | **Deploy** the custom voice to an endpoint | Foundry / Speech | minutes |
| 7 | **Flip the flag** in `.env`, restart the app | this repo | 2 min |

---

## Which avatar type fits you

- **Custom Photo Avatar** — built from a **single photo**. Head-and-shoulders, 512×512, works in real-time. Best match for "use my photo". Set `CUSTOM_AVATAR_PHOTO_MODEL=vasa-1`.
- **Custom Video Avatar** — built from **≥10 minutes of video** of you. Half/full body, more lifelike movement, and supports **voice sync** (an auto-cloned voice trained from the same video — no separate voice project needed). Leave `CUSTOM_AVATAR_PHOTO_MODEL` blank and set `CUSTOM_AVATAR_STYLE`.

> 💡 **Shortcut to "sounds like me":** a **video avatar with voice sync** clones your voice *for free alongside the avatar* from the training video — far less effort than a standalone Professional Voice. If you only have a photo, you'll pair it with either a standard voice or a separately-trained Professional Voice.

## Which voice type

- **Voice sync for avatar** — only with a **video** avatar; auto-cloned from the training video. Easiest.
- **Professional Voice (Custom Neural Voice)** — a standalone high-quality clone from **300+ recorded utterances**; works with any avatar (incl. photo). Highest quality, most effort. See `voice-recording-guide.md`.
- **Standard voice** — pick the closest Azure neural voice today (no gating). Good interim.

---

## Azure resources to use

| Need | Use |
|------|-----|
| Foundry/Speech resource | **`clientsphere-ai-95bc`** - S0, Sweden Central |
| Region | **Sweden Central** (confirm it's in the custom-avatar *training* region list when you start; if not, create an S0 resource in a supported region and point `.env` at its STS endpoint) |
| ❌ Not this one | `speech-avatar-jl` is **F0 (free)** — custom features need **S0** |

> The app authenticates to Speech keylessly through `clientsphere-ai-95bc`. Train and deploy custom assets on that same resource.

---

## Turning it on (after training)

Edit `.env` in the repo root:

```ini
CUSTOM_AVATAR_ENABLED=true
CUSTOM_AVATAR_LABEL=You (custom)
CUSTOM_AVATAR_GENDER=male            # controls fallback voice & which gender list it sits with
CUSTOM_AVATAR_CHARACTER=<your avatar model name from Foundry>
CUSTOM_AVATAR_STYLE=                 # video avatar only; blank for photo avatar
CUSTOM_AVATAR_PHOTO_MODEL=vasa-1     # photo avatar only; blank for video avatar
CUSTOM_VOICE_NAME=<your CNV deployment name, e.g. en-GB-JohnNeural>
```

Then:

```powershell
npm start
```

A **⭐ You (custom)** entry appears at the top of the **Voice & body** dropdown. Selecting it uses your avatar (`avatarConfig.customized = true`, plus `photoAvatarBaseModel` for a photo avatar) and your voice. If you set only the voice (no avatar yet), it pairs your voice with a standard body; if you set only the avatar, it uses a standard voice — so you can light up each half as it becomes ready.

---

## How the integration works (already built)

- `server.mjs` reads the `CUSTOM_*` env vars into a `custom` object and returns it from `GET /api/config` (or `null` when disabled).
- `public/app.js` adds the **"⭐ You (custom)"** option, and in `startAvatar()` sets:
  - `avatarConfig.customized = true`
  - `avatarConfig.photoAvatarBaseModel = "<photoModel>"` (photo avatar only)
  - `speechConfig.speechSynthesisVoiceName = "<your voice>"`
- Everything else (chroma-key scenes, barge-in, coaching, etc.) works unchanged.

---

## Files in this kit
- `consent-statements.md` — exact Microsoft consent wording (avatar + voice) to read on camera/mic.
- `photo-spec.md` — photo requirements for a custom photo avatar.
- `voice-recording-guide.md` — how to record professional-voice training data.
- `submission-guide.md` — step-by-step Foundry fine-tuning + deployment.

## Official references
- Limited Access & intake form: https://aka.ms/customneural
- Custom avatar overview: https://learn.microsoft.com/azure/ai-services/speech-service/text-to-speech-avatar/what-is-custom-text-to-speech-avatar
- Create custom avatar: https://learn.microsoft.com/azure/ai-services/speech-service/text-to-speech-avatar/custom-avatar-create
- Custom Neural Voice: https://learn.microsoft.com/azure/ai-services/speech-service/custom-neural-voice
- Real-time avatar (API used by this app): https://learn.microsoft.com/azure/ai-services/speech-service/text-to-speech-avatar/real-time-synthesis-avatar
- Responsible AI / disclosure: https://learn.microsoft.com/azure/ai-foundry/responsible-ai/speech-service/text-to-speech/disclosure-voice-talent
