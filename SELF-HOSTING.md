# Self-hosting ClientSphere

> **Documentation:** [Home](README.md) · [AI-assisted setup](AI-SETUP-PROMPT.md) · [Product tour](docs/SCREENSHOTS.md) · [Deployment](DEPLOYMENT.md) · [Authentication](AUTH-SETUP.md)

This guide takes a new owner from a clone to a production ClientSphere deployment containing only their customer catalogue, with their GitHub account controlling application access.

> **Prefer an agent to perform these steps?** Open your clone in Microsoft Scout or GitHub Copilot and paste the complete [AI-assisted repurposing prompt](AI-SETUP-PROMPT.md). This file remains the canonical manual reference the agent must follow.

![Redacted ClientSphere workspace](docs/images/clientsphere-overview-redacted.png)

## End state

After completing the guide, you will have:

- your own GitHub repository and deployment workflow;
- a uniquely named Azure resource set;
- your own public customer catalogue and isolated Foundry agents;
- an optional shared live-manufacturing mode using four published Fabric Data Agents;
- GitHub OAuth sign-in;
- your GitHub login as the initial ClientSphere administrator;
- weekly public-intelligence and agent refreshes;
- no committed secrets, generated research, agent IDs, or user records.

## Before you start

ClientSphere deploys billable Azure resources: an Azure AI Services/Foundry account, three model deployments, Container Apps, Container Registry, Key Vault, Log Analytics, and Application Insights. Foundry model availability and quota vary by subscription and region.

The default regions are:

- application resources: `uksouth`;
- Azure AI Foundry and Speech: `swedencentral`;
- models: `gpt-5.6-sol`, `gpt-5.6-luna`, and `gpt-5.6-terra`, version `2026-07-09`;
- deployment SKU/capacity: Global Standard, 50 units per model.

Confirm that your subscription can deploy these models in the chosen AI region. If it cannot, see [Changing regions or models](#changing-regions-or-models) before the first deployment.

## Prerequisites

Install:

- [Git](https://git-scm.com/)
- [PowerShell 7](https://learn.microsoft.com/powershell/scripting/install/installing-powershell)
- [Node.js 22](https://nodejs.org/)
- [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli)
- [GitHub CLI](https://cli.github.com/)

The Azure account running bootstrap must be able to:

- create resource groups and managed identities;
- create role assignments at subscription scope;
- register Azure resource providers.

In practice, use a subscription Owner or an account with equivalent Contributor plus User Access Administrator permissions. The generated GitHub identity receives `Contributor` and `User Access Administrator` at subscription scope because the workflow creates resources and their managed-identity role assignments.

Check the tools:

```powershell
git --version
node --version
npm --version
az version
gh --version
$PSVersionTable.PSVersion
```

Node must report major version 22 or newer.

## 1. Create and clone your repository

Create a fork or an independent copy under a GitHub account or organisation you administer. Enable GitHub Actions if GitHub shows the fork with Actions disabled.

Clone your repository, not the original owner's deployment:

```powershell
git clone https://github.com/<your-owner>/<your-repository>.git
Set-Location <your-repository>
git remote -v
```

The `origin` URLs should point to `<your-owner>/<your-repository>`. The bootstrap script discovers this repository through GitHub CLI, so run it from this directory.

If you copied the source into a new repository rather than forking it, make sure `.github/workflows/` is present on `main`.

## 2. Replace the customer catalogue

Open `config/customers.json`, delete the existing array, and add only the organisations you are authorised to use.

Each entry has this shape:

```json
{
  "id": "example-manufacturing",
  "name": "Example Manufacturing",
  "website": "https://www.example-manufacturing.com/",
  "sector": "Industrial manufacturing",
  "summary": "A short description based on public information.",
  "topics": [
    "Business overview",
    "Products and services",
    "Strategy",
    "Operations",
    "Sustainability",
    "Recent news"
  ]
}
```

Field rules:

| Field | Rule |
|---|---|
| `id` | Stable, unique, lowercase letters/numbers/hyphens only; changing it creates a new agent identity |
| `name` | Display name used throughout the UI and prompts |
| `website` | Official HTTPS website; crawler and live grounding stay on this domain and its subdomains |
| `sector` | Plain-language sector; used to select three tailored synthetic scenarios |
| `summary` | Short public description; do not include private account information |
| `topics` | Non-empty array of suggested public-intelligence discussion areas |

Keep only public information in the catalogue. Do not add customer-confidential notes, private emails, internal opportunity data, credentials, or personal data.

Install dependencies and validate:

```powershell
npm ci
npm run customers:validate
npm run check
npm test
```

The validation output reports `5 x customer count` visible modes: one general adviser, three synthetic use cases, and the shared live Fabric mode.

Generated content is intentionally absent from source control:

- `knowledge/customers/` - crawled official-site text;
- `customer-agents.json` - Foundry agent, version, file, and vector-store IDs;
- `data/` - local users, logs, settings, and usage.

Do not force-add these paths.

### Tailoring the generated use cases

For the standard setup, no further change is required. `use-case-registry.mjs` maps the free-text `sector` to three scenario agents and falls back to a general business set when no specialised sector matches.

To add a new sector family or change the three scenarios:

1. Edit `use-case-registry.mjs`.
2. Keep exactly three distinct use cases per customer unless you also update the UI, tests, and deployment smoke-test mode calculation.
3. Edit `instructions.mjs` if agent behaviour must change.
4. Run `npm run check` and `npm test`.
5. Push the change; the workflow recognises these files and refreshes all affected agent definitions.

## 3. Sign in to Azure and GitHub

```powershell
az login
az account set --subscription "<azure-subscription-id>"
az account show --query "{subscription:id, tenant:tenantId, name:name}" --output table

gh auth login
gh auth status
gh repo set-default "<your-owner>/<your-repository>"
gh repo view --json nameWithOwner,url
```

Confirm the Azure subscription and GitHub repository before continuing.

For a non-default tenant:

```powershell
az login --tenant "<azure-tenant-id>"
az account set --subscription "<azure-subscription-id>"
```

## 4. Bootstrap secretless GitHub deployment

Run:

```powershell
.\scripts\bootstrap-github-oidc.ps1 -SubscriptionId "<azure-subscription-id>"
```

The script automatically:

1. reads the Azure tenant from the subscription;
2. discovers the current `owner/repository`;
3. uses the signed-in GitHub login as the bootstrap administrator;
4. derives a stable eight-character resource suffix from the repository;
5. creates an Azure user-assigned managed identity;
6. forces GitHub's default immutable, repository-ID-bound OIDC subject and creates the `production` federated credential from it;
7. restricts the GitHub `production` environment to deployments from `main`;
8. grants the identity `Contributor` and `User Access Administrator`;
9. creates the required GitHub repository variables;
10. generates `SESSION_SECRET` if it does not already exist.

To override detected values:

```powershell
.\scripts\bootstrap-github-oidc.ps1 `
  -SubscriptionId "<azure-subscription-id>" `
  -TenantId "<azure-tenant-id>" `
  -Repository "<github-owner>/<repository>" `
  -AdminLogins "<your-github-login>" `
  -Suffix "abc12345" `
  -Location "uksouth" `
  -AiLocation "swedencentral"
```

`Suffix` must contain 4-8 lowercase letters or numbers. It is used in globally scoped Azure names, including the AI account, registry, Key Vault, and Container App. Do not change it after deployment unless you intend to create a separate resource set.

On later runs, bootstrap reuses the existing `CLIENTSPHERE_SUFFIX`. If you deliberately need a new resource set, pass both a new `-Suffix` and `-AllowSuffixChange`.

### Values created by bootstrap

| GitHub repository value | Kind | Created automatically |
|---|---|---:|
| `AZURE_CLIENT_ID` | Variable | Yes |
| `AZURE_CLIENT_OBJECT_ID` | Variable | Yes |
| `AZURE_TENANT_ID` | Variable | Yes |
| `AZURE_SUBSCRIPTION_ID` | Variable | Yes |
| `AZURE_RESOURCE_GROUP` | Variable | Yes |
| `AZURE_CONTAINER_APP_NAME` | Variable | Yes |
| `AZURE_LOCATION` | Variable | Yes |
| `AZURE_AI_LOCATION` | Variable | Yes |
| `CLIENTSPHERE_SUFFIX` | Variable | Yes |
| `ADMIN_LOGINS` | Variable | Yes |
| `SESSION_SECRET` | Secret | Yes |

Inspect the non-secret values:

```powershell
gh variable list
gh secret list
```

GitHub displays secret names, not secret values.

## 5. Deploy your customer set

Commit the catalogue and any approved branding changes:

```powershell
git status --short
git add config/customers.json
git add <any-other-files-you-intentionally-changed>
git commit -m "Configure ClientSphere customer portfolio"
git push origin main
```

The `Validate and deploy ClientSphere` workflow will:

1. install dependencies, validate syntax, run tests, and compile Bicep;
2. sign in to Azure using OIDC;
3. create or update Azure resources;
4. crawl each official customer website;
5. create one isolated vector store and four customer-specific agents per customer, plus the shared live mode when its four Fabric connections exist;
6. build the application image in Azure Container Registry;
7. deploy one Container App replica;
8. verify the configured customer and mode counts;
9. delete obsolete ClientSphere-managed agents and vector stores.

Monitor the run:

```powershell
gh run list --workflow deploy.yml --limit 5
gh run watch
```

The initial deployment may take substantially longer than later deployments because it creates model deployments, crawls every customer, uploads knowledge, and indexes vector stores.

Get the application URL after the run succeeds:

```powershell
$resourceGroup = gh variable get AZURE_RESOURCE_GROUP
$appName = gh variable get AZURE_CONTAINER_APP_NAME
$fqdn = az containerapp show `
  --resource-group $resourceGroup `
  --name $appName `
  --query properties.configuration.ingress.fqdn `
  --output tsv
$appUrl = "https://$fqdn"
$appUrl
Invoke-RestMethod "$appUrl/healthz"
```

Before OAuth is configured, production shows a setup-pending login page. Simulated login remains disabled.

## 6. Configure GitHub OAuth

GitHub does not provide an API for creating an OAuth App, so this is the one manual identity step.

1. Open <https://github.com/settings/applications/new>.
2. Register:
   - **Application name:** a name such as `ClientSphere - Your Team`
   - **Homepage URL:** the exact `$appUrl`
   - **Authorization callback URL:** the exact `$appUrl/auth/callback`
3. Create the OAuth App.
4. Generate a client secret.
5. From the repository, run:

   ```powershell
   .\scripts\configure-github-oauth.ps1
   ```

The script securely prompts for the client ID and client secret, discovers the repository from the `origin` remote, stores both values as GitHub repository secrets, and dispatches a deployment that applies them as a Container App secret and environment variables. The secret is not placed in your PowerShell history or a process argument.

Wait for the new workflow run to succeed:

```powershell
gh run watch
```

OAuth callback URLs must match exactly, including HTTPS, hostname, path, and absence of a trailing slash after `/auth/callback`.

## 7. Configure live Fabric access

The base application deploys without Fabric or Entra configuration. Until this section is complete, the live mode shows **LIVE AGENT SETUP REQUIRED** while all public-intelligence and synthetic modes remain available.

1. Publish four Microsoft Fabric Data Agents that cover the four specialist domains defined in `manufacturing-live.mjs`. Every person using the live mode needs direct read access to each Data Agent and its underlying data sources.
2. In the Foundry project, open **Manage → Connected resources**, add one **Microsoft Fabric** connection for each published Data Agent, and use these exact names:

   | Connection name | Specialist |
   |---|---|
   | `fabric-factory-pulse` | Current operating state, alerts, OEE, and work orders |
   | `fabric-reliability-maintenance` | Condition, downtime, criticality, and maintenance |
   | `fabric-quality-spectrometer` | Quality, inspection, scrap, and spectrometer readings |
   | `fabric-customer-delivery-impact` | Affected orders, customer priority, and delivery impact |

3. Assign every live user, or an Entra group containing those users, the least-privilege **Foundry Agent Consumer** role on the Foundry project. Azure Owner/Contributor alone does not grant agent endpoint data actions. For one user object ID:

   ```powershell
   $projectId = "/subscriptions/<subscription-id>/resourceGroups/rg-clientsphere-<suffix>/providers/Microsoft.CognitiveServices/accounts/clientsphere-ai-<suffix>/projects/clientsphere-project"
   az role assignment create `
     --assignee-object-id "<entra-user-object-id>" `
     --assignee-principal-type User `
     --role "Foundry Agent Consumer" `
     --scope $projectId
   ```

4. Register a single-tenant Microsoft Entra web application. Add the exact redirect URI `$appUrl/auth/fabric/callback`, add the delegated **Azure AI Foundry → user_impersonation** permission, and grant consent if required by tenant policy. ClientSphere requests the resource's `.default` scope and declares the `CP1` client capability so Foundry can issue and challenge a Continuous Access Evaluation-capable delegated token.
5. Create a client secret, then run:

   ```powershell
   .\scripts\configure-live-fabric.ps1
   ```

   The helper verifies the four Foundry connections, shows the exact redirect URI, securely prompts for the application ID and secret, stores them in GitHub, and dispatches a full agent refresh. It never places the secret in command history or a process argument.
6. Wait for the workflow to succeed and verify:

   ```powershell
   Invoke-RestMethod "$appUrl/healthz"
   ```

   A completed live deployment reports `liveFabricAgentsConfigured: 4`, `liveOrchestratorConfigured: true`, and `fabricAuthConfigured: true`.

The browser then shows **CONNECT TO FABRIC**. After the user signs in, it changes to **LIVE · Microsoft Entra** with their identity and token expiry. Live questions go only to the shared orchestrator; it delegates through A2A to one or more specialists under that user's Fabric permissions.

## 8. Become the administrator and onboard users

Open the app and sign in with the GitHub login stored in `ADMIN_LOGINS`. That login becomes the first approved administrator. If a different user reaches the app first, they remain pending and cannot claim administration.

Open:

```text
https://<your-app-host>/admin
```

The admin dashboard can:

- approve, deny, or return users to pending;
- delete user accounts;
- promote an approved user to administrator;
- remove administrator access;
- view usage summaries and recent operational logs;
- show or hide voices and avatars.

New users follow this flow:

1. They sign in through GitHub.
2. Their account is created as `pending`.
3. An administrator reviews them at `/admin`.
4. Approval grants application access.

The sole approved administrator cannot be deleted or demoted.

### Handing administration to another owner

1. Ask the new owner to sign in once.
2. Approve them at `/admin`.
3. Select **Make admin**.
4. Confirm at least two administrators are shown.
5. Demote or delete the old owner if required.
6. Change the recovery login and redeploy:

   ```powershell
   gh variable set ADMIN_LOGINS --body "<new-owner-github-login>"
   gh workflow run deploy.yml --ref main -f refresh_customer_agents=false
   ```

`ADMIN_LOGINS` is a bootstrap/recovery allowlist, not a permanent override of stored admin decisions. Existing stored administrators remain administrators until changed in `/admin`.

## 9. Optional approval email

Email is not required. Without it, all access decisions work in `/admin`.

To enable email, create and connect an Azure Communication Services Email resource and obtain:

- its connection string;
- a verified sender address.

Configure all four values. The connection string is requested as a masked secure prompt:

```powershell
.\scripts\configure-email.ps1 `
  -EmailSender "DoNotReply@<verified-domain>.azurecomm.net" `
  -AdminEmail "<admin-email-address>" `
  -AdminName "<admin-display-name>"
```

The deployment intentionally fails if only part of the email configuration is present. This prevents a success-shaped deployment with broken notifications.

Approval/deny links use a human-confirmed POST, so email security scanners cannot take an access decision merely by opening a link.

## Local development

The easiest local setup uses the same Azure Foundry project as the deployed application.

### 1. Grant your developer identity access

The Node SDK uses `DefaultAzureCredential`, which resolves your Azure CLI login locally:

```powershell
az login --tenant "<azure-tenant-id>"
az account set --subscription "<azure-subscription-id>"
```

If your user does not already have Foundry data-plane access, assign these roles on the generated AI Services account:

- `Azure AI Developer`
- `Cognitive Services OpenAI Contributor`
- `Cognitive Services User`
- `Cognitive Services OpenAI User`

Example for an account permitted to create role assignments:

```powershell
$suffix = gh variable get CLIENTSPHERE_SUFFIX
$resourceGroup = gh variable get AZURE_RESOURCE_GROUP
$foundryName = "clientsphere-ai-$suffix"
$foundryId = az cognitiveservices account show `
  --resource-group $resourceGroup `
  --name $foundryName `
  --query id `
  --output tsv
$myObjectId = az ad signed-in-user show --query id --output tsv

foreach ($role in @(
  "Azure AI Developer",
  "Cognitive Services OpenAI Contributor",
  "Cognitive Services User",
  "Cognitive Services OpenAI User"
)) {
  az role assignment create `
    --assignee-object-id $myObjectId `
    --assignee-principal-type User `
    --role $role `
    --scope $foundryId `
    --output none
}
```

Role propagation can take several minutes.

### 2. Create `.env`

```powershell
Copy-Item .env.example .env
$localSecret = [Convert]::ToBase64String(
  [Security.Cryptography.RandomNumberGenerator]::GetBytes(48)
)
$localSecret
```

Edit `.env`:

```ini
PORT=3000
PROJECT_ENDPOINT=https://clientsphere-ai-<suffix>.services.ai.azure.com/api/projects/clientsphere-project
FOUNDRY_PROJECT_RESOURCE_ID=/subscriptions/<subscription-id>/resourceGroups/rg-clientsphere-<suffix>/providers/Microsoft.CognitiveServices/accounts/clientsphere-ai-<suffix>/projects/clientsphere-project
MODEL_DEPLOYMENT=gpt-5.6-sol
GENERAL_MODEL_DEPLOYMENT=gpt-5.6-sol
USE_CASE_MODEL_SOL=gpt-5.6-sol
USE_CASE_MODEL_LUNA=gpt-5.6-luna
USE_CASE_MODEL_TERRA=gpt-5.6-terra
SPEECH_REGION=swedencentral
SPEECH_STS_ENDPOINT=https://clientsphere-ai-<suffix>.cognitiveservices.azure.com/sts/v1.0/issueToken
CUSTOMER_AGENT_META_PATH=customer-agents.json
AUTH_DEV_MODE=true
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
SESSION_SECRET=<the-generated-local-secret>
ADMIN_LOGINS=<your-github-login>
ENTRA_TENANT_ID=<azure-tenant-id>
ENTRA_CLIENT_ID=<entra-application-client-id>
ENTRA_CLIENT_SECRET=<entra-application-client-secret>
```

Keep `.env` uncommitted. A local session secret can differ from production.

### 3. Generate research and agent metadata

```powershell
npm ci
npm run setup
```

This command:

- crawls up to 12 official-site pages per customer by default;
- writes ignored Markdown profiles under `knowledge/customers/`;
- creates or updates Foundry agents and vector stores;
- writes ignored `customer-agents.json`.

Optional crawler controls:

| Variable | Default | Purpose |
|---|---:|---|
| `MAX_PAGES_PER_CUSTOMER` | `12` | Maximum accepted pages per customer |
| `RESEARCH_CONCURRENCY` | `4` | Concurrent customer workers, capped at 8 |
| `RESEARCH_TIMEOUT_MS` | `15000` | Per-request timeout |
| `RESEARCH_PAGE_CHARS` | `14000` | Maximum text retained per page |

### 4. Start the app

```powershell
npm start
```

Open <http://localhost:3000>. Use the configured GitHub login in simulated development sign-in. To exercise real OAuth locally, create a separate OAuth App with callback `http://localhost:3000/auth/callback`, fill `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`, and set `AUTH_DEV_MODE=false`.

## Day-two operations

### Add, change, or remove customers

1. Edit `config/customers.json`.
2. Run `npm run customers:validate` and `npm test`.
3. Commit and push to `main`.

The workflow detects catalogue changes and refreshes research and agents automatically. It deploys the replacement metadata before deleting obsolete managed agents and stores.

### Force an immediate intelligence refresh

```powershell
gh workflow run deploy.yml --ref main -f refresh_customer_agents=true
gh run watch
```

The scheduled workflow dispatches the same governed refresh every Monday at 05:00 UTC.

### Change agent behaviour

- Common grounding, answer, and safety behaviour: `instructions.mjs`
- Sector matching, scenarios, workflows, models, and sample data: `use-case-registry.mjs`
- Official-source function-tool boundary: `webgrounding.mjs`
- Research crawl behaviour: `scripts/refresh-customer-content.mjs`

Changes to these agent-definition files trigger agent refresh on the next push.

### Change branding and owner attribution

Customer branding is automatic from `config/customers.json`. For a fully rebranded fork, review:

| File | Change |
|---|---|
| `public/index.html` | About modal owner name, role, avatar, email, GitHub link, and website |
| `public/favicon.svg` | Application icon |
| `public/login.html` | Optional local-login example text |
| `email.mjs` | Email brand wording and styles; admin name/email come from environment variables |
| `server.mjs` | Application name, tagline, built-in voice catalogue, and backgrounds |
| `custom-avatar/` | Replace owner-specific preparation examples before applying for a custom likeness |

Do not put passwords, keys, tenant secrets, or customer-confidential content into frontend files.

### Secrets and rotation

| Secret | Rotation guidance |
|---|---|
| `GH_OAUTH_CLIENT_SECRET` | Generate a new GitHub OAuth secret, rerun `configure-github-oauth.ps1`, verify login, then revoke the old secret |
| `ENTRA_CLIENT_SECRET` | Generate a replacement secret, rerun `configure-live-fabric.ps1`, verify a live query, then revoke the old secret |
| `ACS_CONNECTION_STRING` | Set the new GitHub secret and rerun deployment |
| `SESSION_SECRET` | **Do not rotate without an access-registry migration/reset plan** |

`SESSION_SECRET` signs browser sessions, action tokens, and conversation tokens, and encrypts the durable user/admin registry stored in Container App tags. Replacing it invalidates active sessions and makes the existing encrypted registry unreadable. If the secret is lost, the registry must be reset and users must register again.

Never copy production secret values into `.env`, issues, logs, or documentation.

## Persistence and data lifecycle

The default deployment uses one Container App replica:

- the access/admin registry is AES-256-GCM encrypted with `SESSION_SECRET` and persisted in Container App resource tags;
- generated agent metadata is compressed into a Container App environment value and embedded in the private image;
- usage, logs, settings, and email action tokens use the replica's local JSON store and are revision-local;
- customer website research and agent IDs are generated during deployment and are not committed.

`AZURE_STORAGE_ACCOUNT` enables the optional Azure Table Storage backend, but the supplied Bicep does not create or network it. If you enable it, separately provide the account, table data-plane RBAC for the Container App identity, and compatible network access. See [STORAGE.md](STORAGE.md).

## Changing regions or models

Application and AI regions are bootstrap parameters:

```powershell
.\scripts\bootstrap-github-oidc.ps1 `
  -SubscriptionId "<subscription-id>" `
  -Location "<container-app-region>" `
  -AiLocation "<foundry-and-speech-region>"
```

Run this before first deployment. The values are stored in `AZURE_LOCATION` and `AZURE_AI_LOCATION`.

Model names, version, SKU, and capacity are parameters/defaults near the top of `infra/main.bicep`. Before changing them:

1. confirm all three models and the selected version exist in the AI region;
2. confirm your subscription quota;
3. update the Bicep parameters and matching defaults in `.env.example` and `use-case-registry.mjs`;
4. run `az bicep build --file infra\main.bicep`, `npm run check`, and `npm test`;
5. deploy with a forced agent refresh.

The application does not silently fall back to another model. A missing model or insufficient quota should fail deployment explicitly.

## Troubleshooting

| Symptom | Resolution |
|---|---|
| Azure login reports no matching federated identity | Rerun bootstrap from the correct clone; confirm the workflow environment is named `production` and repository detection points to your repo |
| Bootstrap refuses to change the suffix | Reuse the existing suffix, or pass `-AllowSuffixChange` only when intentionally creating a replacement resource set |
| A globally scoped resource name is unavailable | Rerun bootstrap with a different 4-8 character `-Suffix` before production data exists |
| Model deployment fails with quota/capacity/availability | Use a supported AI region, request quota, or deliberately change model capacity/version in Bicep |
| Workflow says `ADMIN_LOGINS` or another variable is empty | Rerun bootstrap and inspect `gh variable list` |
| Production says GitHub sign-in is not configured | Create the OAuth App, verify the exact callback URL, and rerun `configure-github-oauth.ps1` |
| Live mode says setup is required | Create all four named Microsoft Fabric connections in Foundry, then rerun `configure-live-fabric.ps1` |
| Live mode asks the user to connect | Complete Microsoft Entra sign-in; the user must have access to all queried Fabric Data Agents and sources |
| Live query returns 403 from Foundry | Assign the connected user or their group **Foundry Agent Consumer** on the Foundry project |
| Live query returns no authorized data | Grant the connected Entra user direct read access in Fabric; do not replace the governed result with application credentials |
| Owner login remains pending | Confirm `ADMIN_LOGINS` contains the exact GitHub login, dispatch deployment, then sign out and in again |
| `customer-agents.json` is missing locally | Run `npm run setup` with `PROJECT_ENDPOINT` configured and Foundry roles assigned |
| Foundry returns 401/403 locally | Run `az login` in the correct tenant/subscription and check the four data-plane roles |
| A customer profile has zero pages | Verify its official HTTPS URL, redirects, availability, and anti-bot behaviour; the catalogue summary remains as fallback |
| Research refuses to publish | More than half of customers returned zero usable pages; fix the source URLs rather than publishing a mostly empty knowledge base |
| Access changes return 503 | A deployment has temporarily locked access mutations; retry after the workflow finishes |
| Email configuration step fails | Set all four email values or remove all four to keep email disabled |
| Smoke test count fails | Run `npm run customers:validate`; each customer must currently resolve to exactly five visible modes |

## Verification checklist

After setup:

1. `GET /healthz` returns `status: "ok"`.
2. `customers` and `agentsConfigured` equal the number of entries in `config/customers.json`.
3. `agentModesConfigured` equals five times the customer count.
4. GitHub OAuth redirects back to `/auth/callback`.
5. The configured owner is approved and marked admin.
6. A second GitHub user becomes pending, not admin.
7. The admin can approve the second user.
8. Each customer can answer from its own public sources and does not reuse another customer's conversation.
9. A live deployment reports four Fabric specialists, one orchestrator, and configured delegated Entra identity.
10. The latest deployment and scheduled refresh workflows are enabled.

## Removing the deployment

The application and deployment identity use separate resource groups. Deleting them permanently removes the deployed resources and stops new Azure charges:

```powershell
$appResourceGroup = gh variable get AZURE_RESOURCE_GROUP
$suffix = gh variable get CLIENTSPHERE_SUFFIX

az group delete --name $appResourceGroup
az group delete --name "rg-clientsphere-identity-$suffix"
```

Review the resolved names before confirming deletion. Key Vault purge protection can retain a soft-deleted vault for its configured retention period. Delete or archive the GitHub repository secrets and variables separately.
