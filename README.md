# ClientSphere

ClientSphere is a customer-specific public-intelligence and meeting-coaching application built on Azure AI Foundry. It preserves Hubble's proven two-pane voice/avatar experience while replacing the GitHub-only knowledge domain with 42 isolated customer agents sourced from the `SME&C Accounts` Edge favourites.

## Capabilities

- Searchable customer switcher with official logo/favicon, sector, summary, discussion topics, and sources.
- Four deterministic Foundry modes per customer: one concise general adviser plus three industry-tailored synthetic use-case agents, all sharing that customer's isolated vector store.
- 126 synthetic demo agents covering image-first, operational reasoning, and business-value scenario workflows.
- GPT-5.6 Sol, Luna, and Terra model deployments with bounded PNG/JPEG/WebP input for multimodal demonstrations.
- Customer-owned conversation tokens that prevent conversations being reused across customer agents.
- Public-source research over official customer websites, refreshed weekly with retrieval notes and timestamps.
- Guarded live web grounding restricted to the active customer's official domain and approved public registries.
- Evidence-led executive brief, roleplay and scorecard, session recap, citations, and public links.
- Azure Speech real-time avatars, speech-to-text, barge-in, scenes, and the complete Hubble built-in voice catalogue.
- Optional custom Jonnychipz avatar/voice wiring, disabled until assets become available.
- GitHub OAuth access approval, audit/usage data, and an admin dashboard.
- Bicep infrastructure and GitHub Actions deployment using secretless OIDC.

## Customer set

`config/customers.json` contains the 42 official sites captured from the Edge favourites folder. Generated website research is written to `knowledge/customers/` and deliberately ignored by Git because it is refreshed by GitHub Actions.

## Architecture

```text
Browser
  |-- customer selector ------> GET /api/customers/:id
  |-- customer chat ----------> POST /api/chat { customerId, agentMode, threadId, message, attachments? }
  |                               |-- general or synthetic customer Foundry agent
  |                               |-- isolated file-search vector store
  |                               `-- guarded fetch_public_source function tool
  |-- avatar + speech --------> keyless Azure Speech token and relay endpoints
  `-- GitHub OAuth -----------> approval and admin workflow

Azure Container Apps managed identity
  |-- Azure AI Foundry / GPT-5.4
  |-- Azure Speech avatar and STT
  |-- four-mode agent metadata embedded in the deployed image
  |-- single-replica local user, usage, log, setting, and token store
  `-- Key Vault and Container App session secret
```

## Local development

```powershell
npm install
npm run customers:refresh

# PROJECT_ENDPOINT must address an existing Foundry project.
npm run agents:provision
npm start
```

Copy `.env.example` to `.env`. Local development enables simulated GitHub login only when `NODE_ENV` is not `production` and OAuth credentials are absent.

## Validation

```powershell
npm run check
npm test
az bicep build --file infra\main.bicep
```

## Azure deployment

Target:

- Tenant: `3081f76f-4086-4566-8b14-b57af1297762` (`mngenvmcap864574.onmicrosoft.com`)
- Subscription: `c540854a-5c6f-4049-95bc-dce4eff11340`
- Application region: UK South
- Foundry/Speech region: Sweden Central
- Model: `gpt-5.4`, version `2026-03-05`, Global Standard

The one-time OIDC bootstrap creates only the GitHub deployment identity:

```powershell
.\scripts\bootstrap-github-oidc.ps1
```

After that, all platform and application changes are provisioned by `.github/workflows/deploy.yml`. Public customer research and agent definitions refresh every Monday through `.github/workflows/refresh-customer-agents.yml`.

See [DEPLOYMENT.md](DEPLOYMENT.md) and [AUTH-SETUP.md](AUTH-SETUP.md).

## Public-data boundary

ClientSphere uses public sources only. It does not ingest Microsoft internal account data, private communications, or customer-confidential content. Agents are required to distinguish facts, inferences, and unknowns, and to state reporting periods for financial and time-sensitive claims.
