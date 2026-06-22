# Photo spec — custom PHOTO avatar (single image)

A custom photo avatar (VASA-1 base model) is generated from **one** image. Quality of the result depends heavily on the source photo. Aim for a clean, neutral, well-lit head-and-shoulders shot.

## Quick checklist
- ✅ **One person**, you, facing the camera (look straight at the lens).
- ✅ **Head and shoulders** framed and centred; leave a little headroom.
- ✅ **Neutral expression** or a gentle closed-mouth smile (mouth relaxed/closed gives the cleanest lip-sync base).
- ✅ **Even, soft, frontal lighting**; avoid harsh shadows across the face.
- ✅ **Plain, uncluttered background** (the app replaces it anyway via chroma-key, so a simple wall is ideal).
- ✅ **In focus, high resolution** (≥ 1080×1080; square or portrait crop works well).
- ✅ **Eyes open, looking forward**; nothing covering the face.

## Avoid
- ❌ Sunglasses, hats, or hair across the eyes.
- ❌ Strong side-lighting, backlight, or colour casts.
- ❌ Extreme head tilt or profile angle.
- ❌ Heavy motion blur or low-res / compressed images.
- ❌ Group photos or anything where your face is small.

## Practical tips
- A phone portrait-mode selfie in daylight near a window, or a quick DSLR headshot, both work well.
- Keep the framing similar to a passport/LinkedIn headshot but with shoulders visible.
- If you want the avatar to read as "business", dress as you would for a customer call.

## Where it goes
Upload this image during **Step 3: Add training data** of the photo-avatar fine-tune in Microsoft Foundry (see `submission-guide.md`). Then set in `.env`:

```ini
CUSTOM_AVATAR_PHOTO_MODEL=vasa-1
CUSTOM_AVATAR_CHARACTER=<the model name you create in Foundry>
```

> Photo avatars are **head-only at 512×512** in real-time. If you want a half/full-body avatar with richer movement, use a **video avatar** instead (see README — needs ≥10 min of video).
