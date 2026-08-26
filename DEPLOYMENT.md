# Deployment

ClientSphere uses GitHub Actions OIDC and Bicep. No publish profile or Azure client secret is stored in GitHub.

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
| GPT deployment | `gpt-5.4` |
| App Service | `clientsphere-95bc` |
| Linux App Service plan | `asp-clientsphere-95bc` |
| Storage | `stclientsphere95bc` |
| Key Vault | `kv-clientsphere-95bc` |
| Application Insights | `appi-clientsphere-95bc` |
| Log Analytics | `log-clientsphere-95bc` |

The web app uses managed identity for Foundry, Speech, Blob, Table Storage, and Key Vault.

## Deployment workflow

Every push to `main`:

1. Installs dependencies and runs syntax checks and tests.
2. Compiles Bicep.
3. Signs into Azure with GitHub OIDC.
4. Creates or updates the Azure resources.
5. Refreshes public customer research and Foundry agents when their definitions changed or metadata is absent.
6. Uploads customer-agent metadata to private Blob Storage.
7. Deploys the Node application to App Service.
8. Verifies `/healthz` reports all 42 customer agents.

The weekly refresh workflow re-crawls official public sources, updates each vector store and agent, uploads metadata, and restarts the app.

## GitHub OAuth

GitHub does not expose an API for creating OAuth Apps. Complete the one manual registration in [AUTH-SETUP.md](AUTH-SETUP.md), then run:

```powershell
.\scripts\configure-github-oauth.ps1 -ClientId "<id>" -ClientSecret "<secret>"
```

The script stores the credentials as repository secrets and triggers the deployment workflow. The workflow applies them to App Service. Until that is complete, production shows a setup-pending sign-in page; simulated login is never exposed.
