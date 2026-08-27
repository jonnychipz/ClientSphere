# Custom photo preparation

> **Documentation:** [Custom avatar and voice](README.md) · [Consent](consent-statements.md) · [Training](submission-guide.md) · [Home](../README.md)

Use this checklist only after confirming that custom photo avatar creation is available and approved for the target subscription, resource, region, and use case. Current portal requirements override this guide.

## Recommended source image

- One authorised, consenting person.
- Face looking directly at the camera.
- Head-and-shoulders framing with comfortable headroom.
- Neutral expression or gentle closed-mouth smile.
- Eyes open and unobstructed.
- Even frontal lighting without harsh shadows or backlight.
- Plain background and accurate skin colour.
- Sharp, high-resolution original with minimal compression.
- Clothing suitable for the intended audience.

## Avoid

- Group photos or a small face in a wide image.
- Sunglasses, masks, hats, or hair obscuring facial features.
- Profile angles, strong head tilt, or extreme expression.
- Motion blur, beauty filters, heavy retouching, or generated face edits.
- Strong colour casts, patterned backgrounds, or dramatic directional light.
- Media for which the applicant lacks usage rights or consent.

## Handling the image

1. Keep the original in an approved, access-controlled location.
2. Do not commit the image to this repository.
3. Upload it only through the approved Azure Speech/Foundry training workflow.
4. Follow the current pixel, aspect-ratio, format, and file-size requirements shown in the portal.
5. Delete local working copies when organisational retention policy requires it.

## ClientSphere configuration

After the approved model exists, record its model/character name and the required photo base model:

```ini
CUSTOM_AVATAR_CHARACTER=<approved-avatar-model-name>
CUSTOM_AVATAR_PHOTO_MODEL=<current-supported-photo-base-model>
```

Continue with [submission-guide.md](submission-guide.md) for local and production configuration.
