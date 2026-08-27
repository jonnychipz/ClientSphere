# Custom voice deployment handoff

> **Documentation:** [Custom avatar and voice](README.md) · [Recording guide](voice-recording-guide.md) · [Training and setup](submission-guide.md) · [Home](../README.md)

Use this checklist after an approved custom voice has completed training.

## 1. Review the trained model

- Confirm the talent, locale, organisation, and approved scenario.
- Review quality results and test representative ClientSphere phrases.
- Confirm the target endpoint type supports the required real-time avatar/voice experience.
- Check current hosting and synthesis pricing.

## 2. Deploy

In the current Microsoft Foundry/Azure Speech experience:

1. Open the trained voice model.
2. Choose **Deploy**.
3. Use a meaningful non-personal deployment name.
4. Select an endpoint type compatible with the intended real-time use.
5. Accept applicable terms and cost.
6. Wait until deployment status is successful.

## 3. Record the handoff values

```text
Voice name:
Endpoint/deployment ID:
Azure AI Services/Speech resource:
Region:
Deployment status:
Approved owner:
Review/expiry date:
```

Store the completed operational record in your approved system, not this repository.

## 4. Configure ClientSphere

Local ignored `.env`:

```ini
CUSTOM_AVATAR_ENABLED=true
CUSTOM_VOICE_NAME=<approved-voice-name>
CUSTOM_VOICE_ENDPOINT_ID=<approved-endpoint-id>
```

Production:

```powershell
.\scripts\configure-custom-avatar.ps1 `
  -Label "Custom presenter" `
  -Gender "male" `
  -VoiceName "<approved-voice-name>" `
  -VoiceEndpointId "<approved-endpoint-id>"
```

The app can pair the voice with a standard avatar body until an approved custom avatar is available.

## 5. Verify and monitor

- The custom choice appears only when enabled.
- The selected voice uses the expected endpoint.
- Speech starts reliably in the configured region.
- Users see synthetic-media disclosure.
- Standard voices remain available.
- Administrators can hide the custom choice.
- The endpoint is disabled or removed when no longer authorised or needed.
