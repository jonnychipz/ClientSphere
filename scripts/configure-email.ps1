[CmdletBinding()]
param(
  [string]$EmailSender,
  [string]$AdminEmail,
  [string]$AdminName,
  [Security.SecureString]$ConnectionString,
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
if (-not $EmailSender) {
  $EmailSender = (Read-Host "Verified Azure Communication Services sender address").Trim()
}
if (-not $AdminEmail) {
  $AdminEmail = (Read-Host "Administrator email address").Trim()
}
if (-not $AdminName) {
  $AdminName = (Read-Host "Administrator display name").Trim()
}
if (-not $ConnectionString) {
  $ConnectionString = Read-Host "Azure Communication Services connection string" -AsSecureString
}
if (-not $EmailSender -or -not $AdminEmail -or -not $AdminName) {
  throw "Email sender, administrator email, and administrator name are required."
}

$secretPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($ConnectionString)
try {
  $plainConnectionString = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($secretPointer)
  if (-not $plainConnectionString) {
    throw "Azure Communication Services connection string is required."
  }
  $plainConnectionString | gh secret set ACS_CONNECTION_STRING --repo $Repository
} finally {
  if ($secretPointer -ne [IntPtr]::Zero) {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($secretPointer)
  }
  $plainConnectionString = $null
}

gh variable set EMAIL_SENDER --repo $Repository --body $EmailSender
gh variable set ADMIN_EMAIL --repo $Repository --body $AdminEmail
gh variable set ADMIN_NAME --repo $Repository --body $AdminName
gh workflow run deploy.yml --repo $Repository --ref main -f refresh_customer_agents=false

Write-Output "Approval email settings saved and the ClientSphere deployment workflow started."
