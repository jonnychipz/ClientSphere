[CmdletBinding()]
param(
  [Parameter(Mandatory)]
  [string]$ClientId,

  [Parameter(Mandatory)]
  [string]$ClientSecret,

  [string]$Repository = "jonnychipz/ClientSphere"
)

$ErrorActionPreference = "Stop"
$PSNativeCommandUseErrorActionPreference = $true

gh secret set GH_OAUTH_CLIENT_ID --repo $Repository --body $ClientId
gh secret set GH_OAUTH_CLIENT_SECRET --repo $Repository --body $ClientSecret
gh workflow run deploy.yml --repo $Repository --ref main -f refresh_customer_agents=false

Write-Output "GitHub OAuth secrets saved and the ClientSphere deployment workflow started."
