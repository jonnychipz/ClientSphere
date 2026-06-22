# Deployment — Hubble on Azure (CI/CD via GitHub Actions)

Hubble is deployed to **Azure App Service (Linux, Node 22)** and ships automatically on every push to `main` via **GitHub Actions**.

## Live environment

| Thing | Value |
|-------|-------|
| URL | https://hubble-coach-kehfuc.azurewebsites.net |
| Repo | https://github.com/jonnychipz/Hubble (private) |
| Resource group | `hubble-rg` (Sweden Central) |
| Compute | App Service plan `hubble-plan` (Linux B1) + Web App `hubble-coach-kehfuc` |
| Identity | System-assigned **managed identity** → keyless access to `hubble-foundry` |
| AI backend | Foundry project `hubble-proj` (gpt-5.4) + Speech STS, both in `rg-hubble` |

> **Why App Service?** Hubble is a single Node/Express app that serves the SPA, brokers short-lived Speech tokens, and calls the Foundry agent. It needs a managed identity and outbound HTTPS — no container orchestration, queues or GPUs — so App Service (Linux) is the simplest, cheapest fit. Container Apps would be the next step up if we later need scale-to-zero or multiple microservices.

## How auth works in the cloud (keyless)
The Web App's **managed identity** is granted **Cognitive Services User** + **Cognitive Services OpenAI User** on the `hubble-foundry` account. The app uses `DefaultAzureCredential`, which on App Service resolves to that managed identity — so it mints Foundry + Speech tokens at runtime with **no API keys stored anywhere**.

## CI/CD pipeline (`.github/workflows/deploy.yml`)
On push to `main` (or manual `workflow_dispatch`):
1. **build** — `npm ci`, syntax-check all server/client JS, zip a release artifact.
2. **deploy** — `azure/webapps-deploy@v3` pushes the zip to App Service using the **publish-profile** GitHub secret.

### GitHub secrets / variables
| Name | Type | Purpose |
|------|------|---------|
| `AZURE_WEBAPP_PUBLISH_PROFILE` | secret | App Service deploy credentials |
| `AZURE_WEBAPP_NAME` | variable | Target web app name |
| `GH_OAUTH_CLIENT_ID` / `GH_OAUTH_CLIENT_SECRET` | secret | OAuth app creds (mirror; set by `set-oauth.ps1`) |

> Azure deploy uses a **publish profile** (not OIDC) because the sandbox tenant blocks app-registration creation for guest accounts. To switch to OIDC later, create an app registration + federated credential and swap the deploy step to `azure/login` with `client-id`/`tenant-id`/`subscription-id`.

## Runtime configuration (App Service application settings)
Set on the Web App (encrypted at rest) — not in code:
`PROJECT_ENDPOINT`, `MODEL_DEPLOYMENT`, `SPEECH_REGION`, `SPEECH_STS_ENDPOINT`,
`AGENT_ID`, `VECTOR_STORE_ID`, `ADMIN_LOGINS=jonnychipz`, `SESSION_SECRET`,
`AUTH_DEV_MODE`, and (after OAuth setup) `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`.

## ⚠️ One manual step: create the GitHub OAuth App
There is **no API** to create a GitHub OAuth App, so this is the only manual step. Until it's done, the deployed app falls back to **dev-mode login** (simulated usernames).

1. Go to **https://github.com/settings/applications/new** (signed in as **jonnychipz**).
2. Fill in:
   - **Application name:** `Hubble — GitHub Sales Coach`
   - **Homepage URL:** `https://hubble-coach-kehfuc.azurewebsites.net`
   - **Authorization callback URL:** `https://hubble-coach-kehfuc.azurewebsites.net/auth/callback`
3. **Register application**, then **Generate a new client secret**.
4. From the repo root, run:
   ```powershell
   ./set-oauth.ps1 -ClientId "<client id>" -ClientSecret "<client secret>"
   ```
   This sets the OAuth app settings on the Web App (flipping it to **real GitHub login**) and mirrors them to GitHub secrets. The app restarts automatically.

Now anyone signing in uses their **real GitHub account**; new users are **pending** until you approve them at `/admin`.

## Notes & next steps
- **Access store** (`data/store.json`) lives on the App Service filesystem and resets if the app is redeployed/scaled. For durable multi-instance state, mount Azure Files or move to a database — fine as-is for a single-instance internal tool.
- Scale up the plan (B1 → P1v3) if you need more headroom or always-on warm starts (`Always On` is already implied on Basic+).
- To redeploy manually: **Actions → Build & Deploy Hubble → Run workflow**.
