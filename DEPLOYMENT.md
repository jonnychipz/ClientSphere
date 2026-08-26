# Deployment

ClientSphere uses GitHub Actions OIDC and Bicep. No publish profile or Azure client secret is stored in GitHub.

Live URL: <https://clientsphere-95bc.victoriousflower-3dcb522a.uksouth.azurecontainerapps.io>

## One-time identity bootstrap

Run:

```powershell
.\scripts\bootstrap-github-oidc.ps1
```

This creates `id-github-clientsphere-95bc` in `rg-clientsphere-identity-95bc`, adds a GitHub environment federated credential, grants deployment permissions, and writes the required GitHub variables. This is the only local Azure bootstrap; the managed identity is the trust anchor that lets the first workflow run.

## Provisioned resources

The `infra/main.bicep` deployment creates:

| Resource | Name |
|---|---|
| Resource group | `rg-clientsphere-95bc` |
| Azure AI Services / Foundry | `clientsphere-ai-95bc` |
| Foundry project | `clientsphere-project` |
| General/Sol model | `gpt-5.6-sol` (`2026-07-09`) |
| Multimodal/Luna model | `gpt-5.6-luna` (`2026-07-09`) |
| Reasoning/Terra model | `gpt-5.6-terra` (`2026-07-09`) |
| Container App | `clientsphere-95bc` |
| Container Apps environment | `cae-clientsphere-95bc` |
| Azure Container Registry | `acrclientsphere95bc` |
| Key Vault | `kv-clientsphere-95bc` |
| Application Insights | `appi-clientsphere-95bc` |
| Log Analytics | `log-clientsphere-95bc` |

The Container App uses managed identity for Foundry, Speech, and private image pulls.

## Deployment workflow

Every push to `main`:

1. Installs dependencies and runs syntax checks and tests.
2. Compiles Bicep.
3. Signs into Azure with GitHub OIDC.
4. Creates or updates the Azure resources.
5. Refreshes public customer research and Foundry agents when their definitions changed or metadata is absent.
6. Compresses agent state into the Container App management-plane configuration and embeds full metadata in the image.
7. Builds the image in Azure Container Registry and deploys it to Azure Container Apps Consumption.
8. Verifies `/healthz` reports all 42 customer agents.

The weekly refresh workflow re-crawls official public sources, updates each vector store and agent, then builds and deploys a refreshed image.

## GitHub OAuth

GitHub does not expose an API for creating OAuth Apps. Complete the one manual registration in [AUTH-SETUP.md](AUTH-SETUP.md), then run:

```powershell
.\scripts\configure-github-oauth.ps1 -ClientId "<id>" -ClientSecret "<secret>"
```

The script stores the credentials as repository secrets and triggers the deployment workflow. The workflow applies them as Container App secrets. Until that is complete, production shows a setup-pending sign-in page; simulated login is never exposed.
