[CmdletBinding()]
param(
  [string]$Label = "Custom presenter",
  [ValidateSet("male", "female")]
  [string]$Gender = "male",
  [string]$BodyCharacter = "harry",
  [string]$BodyStyle = "business",
  [string]$AvatarCharacter = "",
  [string]$AvatarStyle = "",
  [string]$PhotoModel = "",
  [string]$VoiceName = "",
  [string]$VoiceEndpointId = "",
  [string]$VoiceProfileId = "",
  [string]$VoiceBaseModel = "DragonLatestNeural",
  [switch]$Disable,
  [string]$Repository
)

$ErrorActionPreference = "Stop"
$PSNativeCommandUseErrorActionPreference = $true

if (-not $Repository) {
  $origin = (git remote get-url origin).Trim() -replace "\.git$", ""
  if ($origin -notmatch "github\.com[:/](?<repository>[^/]+/[^/]+)$") {
    throw "Could not resolve a GitHub owner/name from the origin remote. Pass -Repository explicitly."
  }
  $Repository = $Matches.repository
}

if ($Disable) {
  gh variable set CUSTOM_AVATAR_ENABLED --repo $Repository --body "false"
  gh workflow run deploy.yml --repo $Repository --ref main -f refresh_customer_agents=false
  Write-Output "Custom avatar/voice disabled and the ClientSphere deployment workflow started."
  exit 0
}

if (-not $AvatarCharacter -and -not $VoiceName -and -not $VoiceProfileId) {
  throw "Provide at least -AvatarCharacter, -VoiceName, or -VoiceProfileId, or use -Disable."
}
if ($VoiceName -and -not $VoiceEndpointId -and -not $VoiceProfileId) {
  throw "A custom voice requires -VoiceEndpointId or -VoiceProfileId."
}

$variables = [ordered]@{
  CUSTOM_AVATAR_ENABLED = "true"
  CUSTOM_AVATAR_LABEL = $Label
  CUSTOM_AVATAR_GENDER = $Gender
  CUSTOM_BODY_CHARACTER = $BodyCharacter
  CUSTOM_BODY_STYLE = $BodyStyle
  CUSTOM_AVATAR_CHARACTER = $AvatarCharacter
  CUSTOM_AVATAR_STYLE = $AvatarStyle
  CUSTOM_AVATAR_PHOTO_MODEL = $PhotoModel
  CUSTOM_VOICE_NAME = $VoiceName
  CUSTOM_VOICE_ENDPOINT_ID = $VoiceEndpointId
  CUSTOM_VOICE_PROFILE_ID = $VoiceProfileId
  CUSTOM_VOICE_BASE_MODEL = $VoiceBaseModel
}

$existingVariables = @(
  gh variable list --repo $Repository --json name --jq ".[].name"
)
foreach ($entry in $variables.GetEnumerator()) {
  $value = [string]$entry.Value
  if ($value) {
    gh variable set $entry.Key --repo $Repository --body $value
  } elseif ($existingVariables -contains $entry.Key) {
    gh variable delete $entry.Key --repo $Repository
  }
}

gh workflow run deploy.yml --repo $Repository --ref main -f refresh_customer_agents=false
Write-Output "Custom avatar/voice settings saved and the ClientSphere deployment workflow started."
