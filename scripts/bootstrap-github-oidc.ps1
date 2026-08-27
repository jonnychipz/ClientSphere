[CmdletBinding()]
param(
  [Parameter(Mandatory)]
  [string]$SubscriptionId,

  [string]$TenantId,
  [string]$Repository,
  [string]$AdminLogins,
  [string]$Suffix,
  [switch]$AllowSuffixChange,
  [string]$Location = "uksouth",
  [string]$AiLocation = "swedencentral",
  [string]$IdentityResourceGroup,
  [string]$IdentityName
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
if ($Repository -notmatch "^[^/]+/[^/]+$") {
  throw "Repository must use the GitHub owner/name format."
}

$repositoryId = (gh api "repos/$Repository" --jq ".id").Trim()
gh api `
  --method PUT `
  "repos/$Repository/actions/oidc/customization/sub" `
  -F use_default=true `
  -F use_immutable_subject=true `
  --silent
$oidcSettings = gh api "repos/$Repository/actions/oidc/customization/sub" | ConvertFrom-Json
if (-not $oidcSettings.use_default -or -not $oidcSettings.use_immutable_subject) {
  throw "GitHub did not enable the default immutable OIDC subject for $Repository."
}
$oidcSubjectPrefix = [string]$oidcSettings.sub_claim_prefix
if (-not $oidcSubjectPrefix.EndsWith("@$repositoryId")) {
  throw "GitHub OIDC subject '$oidcSubjectPrefix' is not bound to repository ID $repositoryId."
}
if (-not $AdminLogins) {
  $AdminLogins = (gh api user --jq ".login").Trim()
}
foreach ($login in $AdminLogins.Split(",")) {
  if ($login.Trim() -notmatch "^[a-zA-Z0-9-]{1,39}$") {
    throw "ADMIN_LOGINS contains an invalid GitHub login: '$($login.Trim())'."
  }
}

$existingSuffix = [string](gh variable list `
  --repo $Repository `
  --json name,value `
  --jq '.[] | select(.name == "CLIENTSPHERE_SUFFIX") | .value')
$existingSuffix = $existingSuffix.Trim()
if ($existingSuffix -and $existingSuffix -notmatch "^[a-z0-9]{4,8}$") {
  throw "Existing CLIENTSPHERE_SUFFIX '$existingSuffix' is invalid. Correct or delete the repository variable."
}
if (-not $Suffix -and $existingSuffix) {
  $Suffix = $existingSuffix
} elseif (-not $Suffix) {
  $bytes = [Text.Encoding]::UTF8.GetBytes("$Repository/$repositoryId")
  $hash = [Security.Cryptography.SHA256]::HashData($bytes)
  $Suffix = [Convert]::ToHexString($hash).Substring(0, 8).ToLowerInvariant()
}
if ($Suffix -notmatch "^[a-z0-9]{4,8}$") {
  throw "Suffix must contain 4-8 lowercase letters or numbers."
}
if ($existingSuffix -and $Suffix -ne $existingSuffix -and -not $AllowSuffixChange) {
  throw "Refusing to change CLIENTSPHERE_SUFFIX from '$existingSuffix' to '$Suffix'. Pass -AllowSuffixChange only when you intend to create a new resource set."
}

$resourceGroup = "rg-clientsphere-$Suffix"
$containerAppName = "clientsphere-$Suffix"
if (-not $IdentityResourceGroup) {
  $IdentityResourceGroup = "rg-clientsphere-identity-$Suffix"
}
if (-not $IdentityName) {
  $IdentityName = "id-github-clientsphere-$Suffix"
}

$account = az account show --subscription $SubscriptionId --output json | ConvertFrom-Json
if (-not $TenantId) {
  $TenantId = $account.tenantId
} elseif ($account.tenantId -ne $TenantId) {
  throw "Subscription $SubscriptionId is not in tenant $TenantId."
}

az group create `
  --subscription $SubscriptionId `
  --name $IdentityResourceGroup `
  --location $Location `
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
    --location $Location `
    --output json | ConvertFrom-Json
}

$credentialName = "clientsphere-github-production"
$federatedSubject = "${oidcSubjectPrefix}:environment:production"

gh api `
  --method PUT `
  "repos/$Repository/environments/production" `
  -F "deployment_branch_policy[protected_branches]=false" `
  -F "deployment_branch_policy[custom_branch_policies]=true" `
  --silent
$deploymentPolicies = gh api `
  "repos/$Repository/environments/production/deployment-branch-policies" `
  --paginate `
  --slurp | ConvertFrom-Json
$deploymentPolicies = @($deploymentPolicies | ForEach-Object { $_.branch_policies })
$mainPolicy = $deploymentPolicies | Where-Object { $_.name -eq "main" -and $_.type -eq "branch" } | Select-Object -First 1
foreach ($policy in $deploymentPolicies) {
  if ($mainPolicy -and $policy.id -eq $mainPolicy.id) {
    continue
  }
  gh api `
    --method DELETE `
    "repos/$Repository/environments/production/deployment-branch-policies/$($policy.id)" `
    --silent
}
if (-not $mainPolicy) {
  gh api `
    --method POST `
    "repos/$Repository/environments/production/deployment-branch-policies" `
    -f name=main `
    -f type=branch `
    --silent
}

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
    --subject $federatedSubject `
    --audiences "api://AzureADTokenExchange" `
    --output none
} elseif ($credential.subject -ne $federatedSubject) {
  az identity federated-credential update `
    --subscription $SubscriptionId `
    --resource-group $IdentityResourceGroup `
    --identity-name $IdentityName `
    --name $credentialName `
    --subject $federatedSubject `
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
gh variable set AZURE_RESOURCE_GROUP --repo $Repository --body $resourceGroup
gh variable set AZURE_CONTAINER_APP_NAME --repo $Repository --body $containerAppName
gh variable set AZURE_LOCATION --repo $Repository --body $Location
gh variable set AZURE_AI_LOCATION --repo $Repository --body $AiLocation
gh variable set CLIENTSPHERE_SUFFIX --repo $Repository --body $Suffix
gh variable set ADMIN_LOGINS --repo $Repository --body $AdminLogins

$sessionSecretExists = gh secret list --repo $Repository --json name --jq "any(.name == ""SESSION_SECRET"")"
if ($sessionSecretExists -ne "true") {
  $sessionSecret = [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
  $sessionSecret | gh secret set SESSION_SECRET --repo $Repository
}

Write-Output "GitHub OIDC configured for $Repository."
Write-Output "Resource suffix: $Suffix"
Write-Output "Bootstrap administrator login(s): $AdminLogins"
Write-Output "Managed identity client ID: $($identity.clientId)"
Write-Output "Managed identity principal ID: $($identity.principalId)"
