# ClientSphere

ClientSphere is a self-hosted customer-intelligence and meeting-coaching application built on Azure AI Foundry, Azure Speech, Azure Container Apps, and GitHub Actions. Each configured customer receives an isolated public-source knowledge store, one general adviser, and three sector-tailored synthetic use-case agents.

> The repository's `config/customers.json` is the catalogue for the current deployment. **Replace the entire file with your own customers before the first deployment of a fork.** Generated research, agent IDs, secrets, users, and conversations are not committed.

## What it provides

- A searchable customer switcher with official-site branding, sector context, topics, and sources.
- Four Foundry agent modes per customer: one public-intelligence adviser and three synthetic use-case agents.
- Customer-isolated vector stores, agent metadata, and conversation tokens.
- Brief voice conversations or structured, screen-shareable workflows.
- GPT-5.6 Sol, Luna, and Terra deployments, including bounded image input for multimodal demonstrations.
- Guarded live web grounding limited to the active customer's official domain and approved public registries.
- Azure Speech voices, real-time avatars, speech-to-text, barge-in, and optional custom avatar/voice support.
- GitHub OAuth, administrator-controlled access approval, admin promotion, sole-admin protection, usage views, and logs.
- Bicep infrastructure, secretless GitHub-to-Azure OIDC, automatic deployment, and weekly intelligence refresh.

## Architecture

```text
Browser
  |-- GitHub OAuth and access approval
  |-- customer selector ------> config/customers.json
  |-- customer chat ----------> customer + mode-specific Foundry agent
  |                               |-- isolated vector store
  |                               `-- guarded official-source fetch tool
  `-- voice/avatar -----------> keyless Azure Speech token broker

Azure Container Apps managed identity
  |-- Azure AI Foundry / GPT-5.6 models
  |-- Azure Speech
  |-- Azure Container Registry
  `-- encrypted access registry persisted in Container App tags

GitHub Actions OIDC
  |-- Bicep infrastructure deployment
  |-- public website research
  |-- Foundry agent and vector-store provisioning
  `-- image build, deployment, smoke test, and obsolete-agent cleanup
```

## Fastest production setup

The complete, copy-and-paste setup is in **[SELF-HOSTING.md](SELF-HOSTING.md)**. The shortest path is:

1. Install Git, PowerShell 7, Node.js 22, Azure CLI, and GitHub CLI.
2. Fork or copy this repository into a GitHub repository you administer, then clone it.
3. Replace `config/customers.json` and validate it:

   ```powershell
   npm ci
   npm run customers:validate
   npm test
   ```

4. Sign in and bootstrap GitHub OIDC. The script discovers the current GitHub repository, Azure tenant, GitHub login, and a stable unique resource suffix:

   ```powershell
   az login
   gh auth login
   .\scripts\bootstrap-github-oidc.ps1 -SubscriptionId "<azure-subscription-id>"
   ```

5. Commit and push the customer catalogue to `main`. The deployment workflow creates the Azure resources, researches the official customer sites, provisions all agents, builds the image, and deploys the app.
6. Read the Container App URL from the completed workflow, create a GitHub OAuth App with `<app-url>/auth/callback`, then store its credentials:

   ```powershell
   .\scripts\configure-github-oauth.ps1
   ```

7. Sign in with the GitHub login used during bootstrap. That account becomes the first approved administrator; all other users remain pending until approved at `/admin`.

## Customer catalogue

`config/customers.json` is the only required customer input:

```json
[
  {
    "id": "example-manufacturing",
    "name": "Example Manufacturing",
    "website": "https://www.example-manufacturing.com/",
    "sector": "Industrial manufacturing",
    "summary": "A short public description of the organisation.",
    "topics": [
      "Business overview",
      "Products and services",
      "Strategy",
      "Operations",
      "Sustainability",
      "Recent news"
    ]
  }
]
```

Requirements:

- `id` must be unique and use only lowercase letters, numbers, and hyphens.
- `website` must be the customer's official HTTPS site.
- `sector` drives the three automatically selected use-case agents.
- `summary` and `topics` are catalogue guidance, not confidential account data.
- The file must contain at least one customer.

On a customer change, the deployment workflow automatically rebuilds research and agents. Removed ClientSphere-managed agents and vector stores are deleted after the new deployment passes its smoke test.

## Local development

Local development uses `DefaultAzureCredential`, so run `az login` and use a Foundry project to which your account has the required data-plane roles.

```powershell
Copy-Item .env.example .env
# Fill PROJECT_ENDPOINT, SPEECH_STS_ENDPOINT, SESSION_SECRET, and ADMIN_LOGINS.
npm ci
npm run setup
npm start
```

`npm run setup` crawls the configured official sites, provisions or updates Foundry agents, and writes the ignored `customer-agents.json`. With `AUTH_DEV_MODE=true`, local sign-in is simulated; production never exposes simulated login.

See [Local development](SELF-HOSTING.md#local-development) for exact role and configuration instructions.

## Configuration and secrets

| Name | Type | Required | Purpose |
|---|---|---:|---|
| `SESSION_SECRET` | GitHub secret | Yes | Signs sessions and encrypts the durable access registry; generated by bootstrap |
| `GH_OAUTH_CLIENT_ID` | GitHub secret | Yes for production login | GitHub OAuth App client ID |
| `GH_OAUTH_CLIENT_SECRET` | GitHub secret | Yes for production login | GitHub OAuth App client secret |
| `ACS_CONNECTION_STRING` | GitHub secret | No | Enables approval and decision emails |
| `AZURE_*` | GitHub variables | Yes | OIDC identity, tenant, subscription, regions, resource group, and app name |
| `CLIENTSPHERE_SUFFIX` | GitHub variable | Yes | Stable 4-8 character resource-name suffix |
| `ADMIN_LOGINS` | GitHub variable | Yes | GitHub login(s) permitted to bootstrap or recover administration |
| `EMAIL_SENDER`, `ADMIN_EMAIL`, `ADMIN_NAME` | GitHub variables | No | Required together when approval email is enabled |

No Azure AI, Speech, or registry API keys are stored. GitHub Actions and the Container App use managed identities.

Do not rotate `SESSION_SECRET` casually: it also encrypts the persisted access registry. See [Secrets and rotation](SELF-HOSTING.md#secrets-and-rotation).

## Administration

The configured bootstrap login is the only account that can become the initial administrator. At `/admin`, an approved administrator can:

- approve, deny, or delete users;
- promote approved users to administrator or remove their admin role;
- inspect recent usage and operational logs;
- show or hide available voices and avatars.

The application prevents deletion or demotion of the sole approved administrator. For ownership handover, approve and promote the new owner before demoting the old one.

## Repository map

| Path | Purpose |
|---|---|
| `config/customers.json` | Customer catalogue to replace in a fork |
| `scripts/refresh-customer-content.mjs` | Official-site crawler and knowledge-file generator |
| `scripts/provision-customer-agents.mjs` | Foundry agents and vector stores |
| `scripts/configure-email.ps1` | Securely prompts for optional approval-email configuration |
| `instructions.mjs` | Shared and customer-specific agent instructions |
| `use-case-registry.mjs` | Sector-to-use-case definitions |
| `server.mjs` | Web server, chat, Speech, auth, and admin APIs |
| `public/` | Browser application and admin UI |
| `infra/main.bicep` | Azure infrastructure and managed-identity roles |
| `.github/workflows/deploy.yml` | Validation, provisioning, image build, deployment, and smoke test |
| `.github/workflows/refresh-customer-agents.yml` | Weekly governed refresh trigger |
| `custom-avatar/` | Optional custom avatar and voice preparation kit |

## Common commands

| Command | Action |
|---|---|
| `npm run customers:validate` | Validate the customer catalogue and generated mode count |
| `npm run customers:refresh` | Crawl official customer sites into ignored local knowledge files |
| `npm run agents:provision` | Create or update Foundry agents and metadata |
| `npm run agents:cleanup` | Delete obsolete ClientSphere-managed agents and stores |
| `npm run setup` | Refresh research, then provision agents |
| `npm run check` | Run JavaScript syntax checks |
| `npm test` | Run the Node test suite |
| `npm start` | Start the app |

## Security and data boundary

ClientSphere is designed for public-source customer intelligence. Do not place customer-confidential data, internal account notes, private communications, credentials, or personal data in `config/customers.json` or the crawled knowledge path. Runtime web retrieval blocks private-network addresses and unrelated domains. Image uploads are type- and size-bounded.

The default single-replica deployment persists the encrypted user/admin registry across revisions, while usage and log history are revision-local. See [STORAGE.md](STORAGE.md).

## Further documentation

- [SELF-HOSTING.md](SELF-HOSTING.md) - complete clone-to-production and local-development guide
- [DEPLOYMENT.md](DEPLOYMENT.md) - deployment workflow reference
- [AUTH-SETUP.md](AUTH-SETUP.md) - GitHub OAuth registration
- [STORAGE.md](STORAGE.md) - persistence model
- [EMAIL-WORKFLOW.md](EMAIL-WORKFLOW.md) - optional approval email
- [custom-avatar/README.md](custom-avatar/README.md) - optional custom avatar and voice
