# Deployment reference

ClientSphere uses Bicep and GitHub Actions OIDC. It does not use an Azure publish profile, service-principal client secret, Azure AI key, Speech key, or registry password.

For the complete first-time procedure, use [SELF-HOSTING.md](SELF-HOSTING.md).

## Bootstrap

From a clone of the target GitHub repository:

```powershell
az login
gh auth login
.\scripts\bootstrap-github-oidc.ps1 -SubscriptionId "<azure-subscription-id>"
```

The script discovers the repository and GitHub login, enforces GitHub's immutable repository-ID-bound OIDC subject, derives a stable unique suffix, creates the Azure deployment identity and federated credential, restricts production deployment to `main`, grants deployment roles, creates repository variables, and generates `SESSION_SECRET`.

Use `Get-Help .\scripts\bootstrap-github-oidc.ps1 -Detailed` or inspect the parameter block to override repository, tenant, admin login, suffix, or regions.

## Provisioned resources

With suffix `<suffix>`, `infra/main.bicep` creates:

| Resource | Default name |
|---|---|
| Resource group | `rg-clientsphere-<suffix>` |
| Azure AI Services / Foundry | `clientsphere-ai-<suffix>` |
| Foundry project | `clientsphere-project` |
| General/Sol model | `gpt-5.6-sol` |
| Multimodal/Luna model | `gpt-5.6-luna` |
| Reasoning/Terra model | `gpt-5.6-terra` |
| Container App | `clientsphere-<suffix>` |
| Container Apps environment | `cae-clientsphere-<suffix>` |
| Azure Container Registry | `acrclientsphere<suffix>` |
| Key Vault | `kv-clientsphere-<suffix>` |
| Application Insights | `appi-clientsphere-<suffix>` |
| Log Analytics | `log-clientsphere-<suffix>` |

The Container App uses its system-assigned managed identity for Foundry, Speech, private image pulls, and access-state persistence through the Azure management plane.

## Workflow

Every push or manual dispatch of `.github/workflows/deploy.yml`:

1. validates JavaScript, tests, and Bicep;
2. signs in through OIDC;
3. creates or updates infrastructure;
4. preserves encrypted access state and previous agent metadata;
5. refreshes public research and agents when required;
6. builds in Azure Container Registry;
7. deploys to Azure Container Apps;
8. applies OAuth and optional email configuration;
9. verifies dynamic customer and agent-mode counts;
10. deletes obsolete managed agents and vector stores.

Pull requests run validation only. Deployment concurrency is serialized so two runs cannot mutate agent or access state simultaneously.

Force a refresh:

```powershell
gh workflow run deploy.yml --ref main -f refresh_customer_agents=true
```

The scheduled workflow dispatches the same production path every Monday at 05:00 UTC.

## Deployment inputs

Required repository variables:

```text
AZURE_CLIENT_ID
AZURE_CLIENT_OBJECT_ID
AZURE_TENANT_ID
AZURE_SUBSCRIPTION_ID
AZURE_RESOURCE_GROUP
AZURE_CONTAINER_APP_NAME
AZURE_LOCATION
AZURE_AI_LOCATION
CLIENTSPHERE_SUFFIX
ADMIN_LOGINS
```

Required secret:

```text
SESSION_SECRET
```

OAuth secrets:

```text
GH_OAUTH_CLIENT_ID
GH_OAUTH_CLIENT_SECRET
```

Optional email values are documented in [EMAIL-WORKFLOW.md](EMAIL-WORKFLOW.md).
