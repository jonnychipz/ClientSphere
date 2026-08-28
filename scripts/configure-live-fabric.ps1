[CmdletBinding()]
param(
  [string]$ClientId,

  [Security.SecureString]$ClientSecret,

  [string]$WorkspaceId,
  [string]$FactoryPulseAgentId,
  [string]$ReliabilityAgentId,
  [string]$QualityAgentId,
  [string]$DeliveryImpactAgentId,

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

function Get-RepositoryVariable([string]$Name) {
  $value = [string](gh variable list `
    --repo $Repository `
    --json name,value `
    --jq ".[] | select(.name == `"$Name`") | .value")
  return $value.Trim()
}

$subscriptionId = Get-RepositoryVariable "AZURE_SUBSCRIPTION_ID"
$tenantId = Get-RepositoryVariable "AZURE_TENANT_ID"
$resourceGroup = Get-RepositoryVariable "AZURE_RESOURCE_GROUP"
$containerAppName = Get-RepositoryVariable "AZURE_CONTAINER_APP_NAME"
$suffix = Get-RepositoryVariable "CLIENTSPHERE_SUFFIX"
if (-not $subscriptionId -or -not $tenantId -or -not $resourceGroup -or -not $containerAppName -or -not $suffix) {
  throw "Run scripts/bootstrap-github-oidc.ps1 before configuring live Fabric access."
}

$account = az account show --subscription $subscriptionId --output json | ConvertFrom-Json
if ($account.tenantId -ne $tenantId) {
  throw "Azure CLI is signed in to tenant $($account.tenantId), but ClientSphere uses tenant $tenantId."
}

$fqdn = [string](az containerapp show `
  --subscription $subscriptionId `
  --resource-group $resourceGroup `
  --name $containerAppName `
  --query properties.configuration.ingress.fqdn `
  --output tsv)
if (-not $fqdn) {
  throw "Deploy the base ClientSphere application before configuring its live Fabric identity."
}
$redirectUri = "https://$fqdn/auth/fabric/callback"

function Resolve-GuidSetting([string]$Value, [string]$VariableName, [string]$Prompt) {
  if (-not $Value) {
    $Value = Get-RepositoryVariable $VariableName
  }
  if (-not $Value) {
    $Value = (Read-Host $Prompt).Trim()
  }
  if ($Value -notmatch "^[0-9a-fA-F]{8}(?:-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$") {
    throw "$VariableName must be a valid GUID."
  }
  return $Value
}

$WorkspaceId = Resolve-GuidSetting $WorkspaceId "FABRIC_WORKSPACE_ID" "Fabric workspace ID"
$FactoryPulseAgentId = Resolve-GuidSetting $FactoryPulseAgentId "FABRIC_FACTORY_PULSE_AGENT_ID" "Factory Pulse Data Agent ID"
$ReliabilityAgentId = Resolve-GuidSetting $ReliabilityAgentId "FABRIC_RELIABILITY_AGENT_ID" "Reliability Data Agent ID"
$QualityAgentId = Resolve-GuidSetting $QualityAgentId "FABRIC_QUALITY_AGENT_ID" "Quality Data Agent ID"
$DeliveryImpactAgentId = Resolve-GuidSetting $DeliveryImpactAgentId "FABRIC_DELIVERY_IMPACT_AGENT_ID" "Delivery Impact Data Agent ID"

gh variable set FABRIC_WORKSPACE_ID --repo $Repository --body $WorkspaceId
gh variable set FABRIC_FACTORY_PULSE_AGENT_ID --repo $Repository --body $FactoryPulseAgentId
gh variable set FABRIC_RELIABILITY_AGENT_ID --repo $Repository --body $ReliabilityAgentId
gh variable set FABRIC_QUALITY_AGENT_ID --repo $Repository --body $QualityAgentId
gh variable set FABRIC_DELIVERY_IMPACT_AGENT_ID --repo $Repository --body $DeliveryImpactAgentId

Write-Output "Microsoft Entra redirect URI: $redirectUri"
if (-not $ClientId) {
  $ClientId = (Read-Host "Microsoft Entra application (client) ID").Trim()
}
if ($ClientId -notmatch "^[0-9a-fA-F]{8}(?:-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$") {
  throw "A valid Microsoft Entra application client ID is required."
}
if (-not $ClientSecret) {
  $ClientSecret = Read-Host "Microsoft Entra application client secret" -AsSecureString
}

gh variable set ENTRA_CLIENT_ID --repo $Repository --body $ClientId
$secretPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($ClientSecret)
try {
  $plainClientSecret = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($secretPointer)
  if (-not $plainClientSecret) {
    throw "Microsoft Entra application client secret is required."
  }
  $plainClientSecret | gh secret set ENTRA_CLIENT_SECRET --repo $Repository
} finally {
  if ($secretPointer -ne [IntPtr]::Zero) {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($secretPointer)
  }
  $plainClientSecret = $null
}

gh workflow run deploy.yml --repo $Repository --ref main -f refresh_customer_agents=true

Write-Output "Live Fabric identity and direct Data Agent bindings saved; a full agent refresh started."
