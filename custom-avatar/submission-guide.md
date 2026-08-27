# Custom asset training and ClientSphere setup

> **Documentation:** [Custom avatar and voice](README.md) · [Application checklist](access-application.md) · [Consent](consent-statements.md) · [Home](../README.md)

This is the end-to-end handoff after Limited Access approval. Azure portal labels and supported regions/models change; follow the current portal when it differs from this guide.

## 1. Confirm the target resource

Derive the standard ClientSphere AI account:

```powershell
$suffix = gh variable get CLIENTSPHERE_SUFFIX
$resourceGroup = gh variable get AZURE_RESOURCE_GROUP
$aiRegion = gh variable get AZURE_AI_LOCATION
$foundryName = "clientsphere-ai-$suffix"

az cognitiveservices account show `
  --resource-group $resourceGroup `
  --name $foundryName `
  --query "{name:name,location:location,sku:sku.name,customDomain:properties.customSubDomainName}" `
  --output table
```

Confirm that the approval covers this subscription/resource and that the region currently supports the selected training and real-time features. If a separate approved Speech resource is required, ClientSphere's Speech region/STS endpoint and managed-identity role assignments must be updated through reviewed infrastructure code.

## 2. Train the selected asset

### Custom photo avatar

1. Open the current custom avatar workflow in Microsoft Foundry/Azure Speech.
2. Register the avatar talent and upload the required consent video.
3. Upload an eligible image prepared with [photo-spec.md](photo-spec.md).
4. Train the model.
5. Record the exact avatar character/model name and required photo base model.

### Custom video avatar

1. Register the avatar talent and upload the required consent.
2. Record and upload video matching current capture requirements.
3. Select voice sync only when it is approved and currently supported.
4. Train and record the exact avatar character/model, style, and any generated voice identifier.

### Professional/custom voice

1. Register the voice talent with the current official consent recording.
2. Upload the reviewed dataset from [voice-recording-guide.md](voice-recording-guide.md).
3. Train the model and review quality results.
4. Deploy it to a compatible endpoint.
5. Record the exact voice name and endpoint/deployment ID.

## 3. Configure locally

Add only real deployed values to ignored `.env`:

```ini
CUSTOM_AVATAR_ENABLED=true
CUSTOM_AVATAR_LABEL=Custom presenter
CUSTOM_AVATAR_GENDER=male
CUSTOM_BODY_CHARACTER=harry
CUSTOM_BODY_STYLE=business
CUSTOM_AVATAR_CHARACTER=<avatar-model-or-blank>
CUSTOM_AVATAR_STYLE=<video-style-or-blank>
CUSTOM_AVATAR_PHOTO_MODEL=<photo-base-model-or-blank>
CUSTOM_VOICE_NAME=<voice-name-or-blank>
CUSTOM_VOICE_ENDPOINT_ID=<voice-endpoint-id-or-blank>
CUSTOM_VOICE_PROFILE_ID=<personal-voice-profile-or-blank>
CUSTOM_VOICE_BASE_MODEL=DragonLatestNeural
```

Run:

```powershell
npm start
```

Do not commit `.env`, training media, consent evidence, or generated assets.

## 4. Configure production

Use the repository helper so configuration is stored as GitHub variables and reapplied by each deployment:

```powershell
.\scripts\configure-custom-avatar.ps1 `
  -Label "Custom presenter" `
  -Gender "male" `
  -AvatarCharacter "<avatar-model-or-blank>" `
  -AvatarStyle "<video-style-or-blank>" `
  -PhotoModel "<photo-base-model-or-blank>" `
  -VoiceName "<voice-name-or-blank>" `
  -VoiceEndpointId "<voice-endpoint-id-or-blank>" `
  -VoiceProfileId "<personal-voice-profile-or-blank>" `
  -VoiceBaseModel "DragonLatestNeural"
```

The helper dispatches the normal deployment workflow. These identifiers are configuration, not API keys, but they should still be limited to repository administrators.

For a Personal Voice profile without a custom face:

```powershell
.\scripts\configure-custom-avatar.ps1 `
  -Label "Custom presenter" `
  -Gender "male" `
  -VoiceProfileId "<approved-personal-voice-profile-id>" `
  -VoiceBaseModel "DragonLatestNeural"
```

To disable custom choices:

```powershell
.\scripts\configure-custom-avatar.ps1 -Disable
```

## 5. Validate

1. Wait for the GitHub Actions deployment to succeed.
2. Sign in as an approved user.
3. Confirm the custom choice appears under the expected gender/category.
4. Start the avatar and verify voice, lip sync, disclosure, and fallback behavior.
5. Ask an administrator to hide/show the choice and verify the setting.
6. Check browser/server logs for asset, region, or endpoint errors.
7. Test at least one standard voice/avatar after enabling the custom option.

## 6. Operate responsibly

- Keep synthetic-media disclosure visible.
- Restrict access to the approved audience.
- Review the deployment when the use case, audience, model, talent, or region changes.
- Disable the feature immediately on consent withdrawal or suspected misuse.
- Remove unused paid endpoints and follow approved retention/deletion procedures.
