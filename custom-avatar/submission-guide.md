# Submission & training guide (Microsoft Foundry)

End-to-end steps from approval to a working "⭐ You (custom)" in Hubble.

## 0. Apply for Limited Access (do this first)
1. Go to **https://aka.ms/customneural** and complete the intake form for **Custom Neural Voice** and/or **Custom Avatar**.
2. Describe the use case honestly (internal seller enablement coach; your own likeness and voice; with consent).
3. Wait for approval email. You cannot create custom voice/avatar resources until approved.

> Until approved, use the **Interim look-alike**: pick the closest standard voice + avatar in the app today.

## 1. Confirm resource & region
- Use **`hubble-foundry`** (S0, Sweden Central, custom domain).
- Verify Sweden Central is in the custom-avatar **training** region list:
  https://learn.microsoft.com/azure/ai-services/speech-service/text-to-speech-avatar/what-is-custom-text-to-speech-avatar#available-locations
- If not supported there, create a new **S0** AI Services/Speech resource in a supported region, give it a **custom subdomain**, and update `.env`:
  - `SPEECH_REGION=<region>`
  - `SPEECH_STS_ENDPOINT=https://<resource>.cognitiveservices.azure.com/sts/v1.0/issueToken`

## 2A. Custom PHOTO avatar
1. Microsoft Foundry portal → **Build** → **Fine-tune** → **AI Services** → **Fine-tune**.
2. Model: **Azure Speech – Text to Speech Avatar**; Type: **Custom avatar**; choose **photo**.
3. **Set up avatar talent → Upload consent video** (read `consent-statements.md` §1 on camera).
4. **Prepare training data**: upload your **photo** (see `photo-spec.md`).
5. **Train model**, name it (this becomes `CUSTOM_AVATAR_CHARACTER`).
6. After training, the photo avatar is usable in real-time. Note the model name.

## 2B. Custom VIDEO avatar (richer movement + optional voice sync)
1. Same wizard, choose **video**.
2. Consent: read `consent-statements.md` §1 (avatar only) or §2 (avatar **+ voice sync**) on camera.
3. Upload **≥10 min** of video per the data requirements:
   https://learn.microsoft.com/azure/ai-services/speech-service/text-to-speech-avatar/custom-avatar-record-video-samples
4. Train. If you enabled **voice sync**, a matching voice is created with the avatar — set `CUSTOM_VOICE_NAME` to it and you can skip step 3.

## 3. Professional VOICE (if not using voice sync)
1. Foundry → **Fine-tune** → **Azure Speech – Custom Neural Voice** → **Professional voice**.
2. **Register voice talent**: upload the **audio** consent (`consent-statements.md` §3).
3. **Add training data**: upload your recordings + transcripts (see `voice-recording-guide.md`).
4. **Train**, then **Deploy** the model to an endpoint. The deployed voice name → `CUSTOM_VOICE_NAME`.

## 4. Wire it into Hubble
Edit `.env` (root of this repo):
```ini
CUSTOM_AVATAR_ENABLED=true
CUSTOM_AVATAR_LABEL=You (custom)
CUSTOM_AVATAR_GENDER=male
CUSTOM_AVATAR_CHARACTER=<avatar model name>
CUSTOM_AVATAR_STYLE=                 # video avatar style, else blank
CUSTOM_AVATAR_PHOTO_MODEL=vasa-1     # photo avatar, else blank
CUSTOM_VOICE_NAME=<your voice name>  # CNV or voice-sync name, else blank
```
Then restart:
```powershell
npm start
```
Open http://localhost:3000, turn the voice assistant **On**, and pick **⭐ You (custom)** in **Voice & body**. Hubble now speaks and looks like you.

## 5. Validate
- Avatar starts within a few seconds (status → **live**).
- Lip-sync tracks the speech; voice is yours.
- If start fails with "avatar not found / not supported for real-time", confirm the model deployed successfully and is the **real-time**-supported type.
- If voice errors, confirm the CNV endpoint is **deployed** (not just trained) and the name matches `CUSTOM_VOICE_NAME`.

## Cost & housekeeping
- Custom voice/avatar **training** and **hosting/endpoint** incur charges on the S0 resource — delete endpoints you no longer need.
- Keep consent recordings; Microsoft may re-verify.
