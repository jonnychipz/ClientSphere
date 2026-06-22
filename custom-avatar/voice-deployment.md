# Custom Neural Voice → "Jonnychipz" preset — deployment guide

You're approved for Custom Neural Voice + Custom Avatar. This guide takes you from **training your voice** to it appearing live in Hubble as the **Jonnychipz** male avatar (a standard male body speaking in *your* cloned voice). Your custom *face* avatar can be added later — this gets your voice in first.

> 🔑 **The single most important rule:** train and **deploy the voice on the `hubble-foundry` resource** (Sweden Central, S0) — the exact resource the app authenticates to. A custom voice can only be used through the same Speech resource, so it must live there.

---

## Step 1 — Create the Professional Voice project (Microsoft Foundry)
1. Go to **https://ai.azure.com** → ensure you're in the project on **hubble-foundry** (Sweden Central). If prompted for a resource, pick **hubble-foundry**.
2. **Build → Fine-tune → AI Services → Fine-tune** → choose **Azure Speech – Custom Neural Voice** → **Professional voice**.
3. Give the project a name (e.g. `jonnychipz-voice`). Region must be **Sweden Central**.

## Step 2 — Voice talent consent (required)
- Record the **audio** consent statement using the exact en-GB wording in [`consent-statements.md`](consent-statements.md) §3 (substitute *John Lunn* and *Microsoft*).
- Record it with the **same mic, room and speaking style** as your training data, save as `.mp3`.
- Upload under **Register voice talent**. Voice talent name + company must match what you say.

## Step 3 — Record & upload training data
- Follow [`voice-recording-guide.md`](voice-recording-guide.md): **300+ utterances** (500–2,000 for best quality), quiet room, consistent mic, WAV mono 16-bit ≥24 kHz, each clip paired with its transcript.
- Data type: **Individual utterances + matching transcript** (a `.zip` of audio + a script file).
- Upload as a **training set**; the portal validates format automatically.

## Step 4 — Train
- **Train model** → name it. Training takes time (hours+). You'll get quality metrics when done.

## Step 5 — DEPLOY the voice (this is what makes it usable)
1. Open the trained model → **Deploy**.
2. **Deployment name**: e.g. `jonnychipz`.
3. **Endpoint type**: choose **High performance** (best for the real-time avatar; supported in Sweden Central).
4. Accept terms + hosting cost → **Deploy**. Ready in ~5 min.
5. On the **Deployments** tab, open the deployment and copy:
   - the **Voice name** (you set this — e.g. `en-GB-JonnychipzNeural`), and
   - the **Endpoint / Deployment ID** (a GUID).

---

## Step 6 — Send me these 3 things
Once the voice deployment status is **Succeeded**, give me:

| # | Value | Example |
|---|-------|---------|
| 1 | **Custom voice name** | `en-GB-JonnychipzNeural` |
| 2 | **Endpoint / Deployment ID** | `a1b2c3d4-…` (GUID) |
| 3 | **Confirm** it's deployed on **hubble-foundry / Sweden Central** | ✅ |

## Step 7 — I flip it live (already wired)
I set these in the app config and restart:
```ini
CUSTOM_AVATAR_ENABLED=true
CUSTOM_VOICE_NAME=<your voice name>
CUSTOM_VOICE_ENDPOINT_ID=<your endpoint id>
```
A **⭐ Jonnychipz** option appears in the Voice & body picker = a standard male avatar (Harry, business) speaking in **your** voice. The app sets `speechConfig.endpointId` to your deployment so the custom voice routes correctly.

> Later, when your **custom face avatar** is trained, set `CUSTOM_AVATAR_CHARACTER` (+ `CUSTOM_AVATAR_PHOTO_MODEL=vasa-1` for a photo avatar) and the preset swaps the standard body for your actual likeness — same voice.

---

## Notes
- **Region & resource must match** the app (Sweden Central, hubble-foundry). If you accidentally train elsewhere, tell me the resource and I'll point the app's Speech STS at it.
- High-performance endpoints incur an **hourly hosting cost** while deployed — fine for demos; you can delete the deployment when not in use (the app just falls back to standard voices).
- Up to **50 custom-voice endpoints** per S0 resource, so this won't clash with anything else.
