# set-oauth.ps1 — wire a real GitHub OAuth App into the deployed Hubble.
# Run AFTER creating the OAuth App (see DEPLOYMENT.md), e.g.:
#   ./set-oauth.ps1 -ClientId "Iv1.abc123" -ClientSecret "xxxxx"
param(
  [Parameter(Mandatory = $true)][string]$ClientId,
  [Parameter(Mandatory = $true)][string]$ClientSecret,
  [string]$ResourceGroup = "hubble-rg",
  [string]$WebApp = "hubble-coach-kehfuc",
  [string]$Repo = "jonnychipz/Hubble"
)

Write-Host "→ Setting OAuth app settings on $WebApp ..."
az webapp config appsettings set -n $WebApp -g $ResourceGroup --settings `
  GITHUB_CLIENT_ID="$ClientId" `
  GITHUB_CLIENT_SECRET="$ClientSecret" `
  AUTH_DEV_MODE="false" | Out-Null
Write-Host "  ✓ app settings updated (app will restart)"

Write-Host "→ Mirroring to GitHub secrets on $Repo ..."
gh secret set GH_OAUTH_CLIENT_ID --repo $Repo --body "$ClientId" | Out-Null
gh secret set GH_OAUTH_CLIENT_SECRET --repo $Repo --body "$ClientSecret" | Out-Null
Write-Host "  ✓ GitHub secrets set"

Write-Host "`n✅ Real GitHub OAuth is now live. Visit https://$WebApp.azurewebsites.net and sign in with GitHub."
