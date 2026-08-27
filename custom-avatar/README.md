# Optional custom avatar and voice

> **Documentation:** [Home](../README.md) · [AI-assisted setup](../AI-SETUP-PROMPT.md) · [Manual setup](../SELF-HOSTING.md) · [Product tour](../docs/SCREENSHOTS.md)

This optional kit explains how an approved owner can add their own likeness and/or synthetic voice to ClientSphere through Azure Speech. Standard Azure voices and avatars work without this customisation.

![Redacted standard avatar experience](../docs/images/clientsphere-avatar-live-redacted.png)

> Custom avatar and professional/custom voice capabilities are Limited Access features. Approval, explicit voice-talent consent, responsible use, disclosure, regional availability, and additional charges may apply. Check current Microsoft documentation before recording or purchasing services.

## Choose the smallest suitable option

| Experience | Inputs | Limited Access | ClientSphere configuration |
|---|---|---:|---|
| Standard avatar and voice | None | No | No custom variables |
| Standard avatar with approved custom voice | Voice consent, recordings, trained/deployed voice | Yes | Voice name and endpoint ID |
| Approved custom photo avatar with standard voice | Eligible photo and avatar consent | Yes | Avatar character and photo base model |
| Approved custom avatar and approved custom voice | Avatar media plus voice data/consent | Yes | Avatar and voice values |

Use only a likeness or voice for which you have documented authority and consent. Never create an impersonation or use a custom voice/avatar deceptively.

## End-to-end path

1. Review current availability and policy:
   - <https://aka.ms/customneural>
   - <https://learn.microsoft.com/azure/ai-services/speech-service/text-to-speech-avatar/what-is-custom-text-to-speech-avatar>
   - <https://learn.microsoft.com/azure/ai-services/speech-service/custom-neural-voice>
2. Complete any organisational Responsible AI, legal, privacy, and accessibility reviews.
3. Apply for the required Limited Access capability with [access-application.md](access-application.md) as a drafting checklist.
4. Obtain the current official consent script; see [consent-statements.md](consent-statements.md).
5. Prepare photo/video or voice data:
   - [photo-spec.md](photo-spec.md)
   - [voice-recording-guide.md](voice-recording-guide.md)
6. Train and deploy the approved asset using [submission-guide.md](submission-guide.md).
7. Record the exact avatar/voice identifiers and configure ClientSphere.
8. Add visible disclosure in the experience and test with intended users.

## Local configuration

Set only the values for assets that exist:

```ini
CUSTOM_AVATAR_ENABLED=true
CUSTOM_AVATAR_LABEL=Custom presenter
CUSTOM_AVATAR_GENDER=male
CUSTOM_BODY_CHARACTER=harry
CUSTOM_BODY_STYLE=business
CUSTOM_AVATAR_CHARACTER=<approved-avatar-model-name>
CUSTOM_AVATAR_STYLE=
CUSTOM_AVATAR_PHOTO_MODEL=vasa-1
CUSTOM_VOICE_NAME=<approved-voice-name>
CUSTOM_VOICE_ENDPOINT_ID=<approved-endpoint-id>
CUSTOM_VOICE_PROFILE_ID=
CUSTOM_VOICE_BASE_MODEL=DragonLatestNeural
```

Then restart:

```powershell
npm start
```

For production, use the deployment-safe configuration method documented in [submission-guide.md](submission-guide.md); do not place these values directly in source files.

## How the integration works

- `server.mjs` reads the `CUSTOM_*` settings and returns enabled choices from `GET /api/config`.
- `public/app.js` applies the custom avatar and/or custom voice to Azure Speech.
- The admin dashboard can show or hide enabled voice/avatar choices.
- The feature remains off when `CUSTOM_AVATAR_ENABLED` is not `true`.

## Files in this kit

| File | Purpose |
|---|---|
| [access-application.md](access-application.md) | Reusable Limited Access application checklist |
| [consent-statements.md](consent-statements.md) | How to obtain and record current official consent wording |
| [photo-spec.md](photo-spec.md) | Photo preparation checklist |
| [voice-recording-guide.md](voice-recording-guide.md) | Professional voice data guidance |
| [submission-guide.md](submission-guide.md) | Training, deployment, configuration, and validation |
| [voice-deployment.md](voice-deployment.md) | Detailed custom voice deployment handoff |

## Completion criteria

- Limited Access approval is confirmed for the target subscription/resource.
- The talent and deploying organisation match the consent record.
- The asset is deployed in a region compatible with the app.
- ClientSphere starts the custom choice successfully.
- Users can tell that the voice/avatar is synthetic.
- A standard voice/avatar remains available as a fallback.
