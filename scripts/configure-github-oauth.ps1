[CmdletBinding()]
param(
  [string]$ClientId,

  [Security.SecureString]$ClientSecret,

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
if (-not $ClientId) {
  $ClientId = (Read-Host "GitHub OAuth client ID").Trim()
}
if (-not $ClientId) {
  throw "GitHub OAuth client ID is required."
}
if (-not $ClientSecret) {
  $ClientSecret = Read-Host "GitHub OAuth client secret" -AsSecureString
}

$secretPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($ClientSecret)
try {
  $plainClientSecret = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($secretPointer)
  if (-not $plainClientSecret) {
    throw "GitHub OAuth client secret is required."
  }
  $ClientId | gh secret set GH_OAUTH_CLIENT_ID --repo $Repository
  $plainClientSecret | gh secret set GH_OAUTH_CLIENT_SECRET --repo $Repository
} finally {
  if ($secretPointer -ne [IntPtr]::Zero) {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($secretPointer)
  }
  $plainClientSecret = $null
}
gh workflow run deploy.yml --repo $Repository --ref main -f refresh_customer_agents=false

Write-Output "GitHub OAuth secrets saved and the ClientSphere deployment workflow started."
