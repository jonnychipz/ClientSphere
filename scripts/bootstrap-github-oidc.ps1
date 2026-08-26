[CmdletBinding()]
param(
  [string]$SubscriptionId = "c540854a-5c6f-4049-95bc-dce4eff11340",
  [string]$TenantId = "3081f76f-4086-4566-8b14-b57af1297762",
  [string]$Repository = "jonnychipz/ClientSphere",
  [string]$IdentityResourceGroup = "rg-clientsphere-identity-95bc",
  [string]$IdentityName = "id-github-clientsphere-95bc"
)

$ErrorActionPreference = "Stop"
$PSNativeCommandUseErrorActionPreference = $true

$account = az account show --subscription $SubscriptionId --output json | ConvertFrom-Json
if ($account.tenantId -ne $TenantId) {
  throw "Subscription $SubscriptionId is not in tenant $TenantId."
}

az group create `
  --subscription $SubscriptionId `
  --name $IdentityResourceGroup `
  --location uksouth `
  --tags application=ClientSphere purpose=GitHubOIDC `
  --output none

$identity = $null
try {
  $identity = az identity show `
    --subscription $SubscriptionId `
    --resource-group $IdentityResourceGroup `
    --name $IdentityName `
    --output json 2>$null | ConvertFrom-Json
} catch {
  $identity = $null
}
if (-not $identity) {
  $identity = az identity create `
    --subscription $SubscriptionId `
    --resource-group $IdentityResourceGroup `
    --name $IdentityName `
    --location uksouth `
    --output json | ConvertFrom-Json
}

$credentialName = "clientsphere-github-production"
$credential = az identity federated-credential list `
  --subscription $SubscriptionId `
  --resource-group $IdentityResourceGroup `
  --identity-name $IdentityName `
  --query "[?name=='$credentialName'] | [0]" `
  --output json | ConvertFrom-Json
if (-not $credential) {
  az identity federated-credential create `
    --subscription $SubscriptionId `
    --resource-group $IdentityResourceGroup `
    --identity-name $IdentityName `
    --name $credentialName `
    --issuer "https://token.actions.githubusercontent.com" `
    --subject "repo:${Repository}:environment:production" `
    --audiences "api://AzureADTokenExchange" `
    --output none
}

$scope = "/subscriptions/$SubscriptionId"
$contributorAssignments = az role assignment list `
  --subscription $SubscriptionId `
  --assignee-object-id $identity.principalId `
  --scope $scope `
  --role Contributor `
  --output json | ConvertFrom-Json
if (-not $contributorAssignments -or $contributorAssignments.Count -eq 0) {
  az role assignment create `
    --subscription $SubscriptionId `
    --assignee-object-id $identity.principalId `
    --assignee-principal-type ServicePrincipal `
    --role Contributor `
    --scope $scope `
    --output none
}

$accessAdminAssignments = az role assignment list `
  --subscription $SubscriptionId `
  --assignee-object-id $identity.principalId `
  --scope $scope `
  --role "User Access Administrator" `
  --output json | ConvertFrom-Json
if (-not $accessAdminAssignments -or $accessAdminAssignments.Count -eq 0) {
  az role assignment create `
    --subscription $SubscriptionId `
    --assignee-object-id $identity.principalId `
    --assignee-principal-type ServicePrincipal `
    --role "User Access Administrator" `
    --scope $scope `
    --output none
}

gh variable set AZURE_CLIENT_ID --repo $Repository --body $identity.clientId
gh variable set AZURE_CLIENT_OBJECT_ID --repo $Repository --body $identity.principalId
gh variable set AZURE_TENANT_ID --repo $Repository --body $TenantId
gh variable set AZURE_SUBSCRIPTION_ID --repo $Repository --body $SubscriptionId
gh variable set AZURE_RESOURCE_GROUP --repo $Repository --body "rg-clientsphere-95bc"
gh variable set AZURE_WEBAPP_NAME --repo $Repository --body "clientsphere-95bc"

$sessionSecretExists = gh secret list --repo $Repository --json name --jq "any(.name == ""SESSION_SECRET"")"
if ($sessionSecretExists -ne "true") {
  $sessionSecret = [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
  gh secret set SESSION_SECRET --repo $Repository --body $sessionSecret
}

Write-Output "GitHub OIDC configured for $Repository."
Write-Output "Managed identity client ID: $($identity.clientId)"
Write-Output "Managed identity principal ID: $($identity.principalId)"
