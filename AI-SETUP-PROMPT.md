# AI-assisted repurposing prompt

> **Documentation:** [Home](README.md) · [Manual setup](SELF-HOSTING.md) · [Product tour](docs/SCREENSHOTS.md) · [Deployment](DEPLOYMENT.md)

Use this prompt with Microsoft Scout, GitHub Copilot coding agent, or GitHub Copilot CLI after opening a clone of your own ClientSphere repository. It instructs the agent to reconfigure, document, deploy, and verify the application rather than merely describe the steps.

## Before you paste it

Prepare:

- your Azure subscription ID;
- your Azure tenant ID, if the subscription is not in your current default tenant;
- one or more GitHub logins that may recover administration;
- your customer list, ideally with official website and sector;
- your team/app display name and owner/contact details;
- preferred Azure application and AI regions, or permission to use the defaults.

Never paste passwords, OAuth client secrets, connection strings, or API keys into the prompt. The repository helpers request secrets through masked prompts.

## Complete prompt

Copy everything inside the block and replace only the values in the `MY INPUTS` section. You may leave optional values blank.

```text
You are working inside my cloned ClientSphere Git repository. Repurpose and deploy this repository completely for my organisation and customer portfolio. Do the work in the repository and Azure/GitHub; do not stop at a plan or generic instructions.

MY INPUTS
- Azure subscription ID: <SUBSCRIPTION_ID>
- Azure tenant ID (optional; discover it from the subscription if blank): <TENANT_ID>
- GitHub repository (optional; use the origin remote if blank): <OWNER/REPOSITORY>
- Bootstrap/recovery GitHub login(s), comma-separated: <GITHUB_LOGINS>
- Application region (default uksouth): <APP_REGION>
- Azure AI Foundry/Speech region (default swedencentral): <AI_REGION>
- Product/team display name: <DISPLAY_NAME>
- Product tagline: <TAGLINE>
- Product owner/contact name: <OWNER_NAME>
- Product owner role/team: <OWNER_ROLE>
- Product owner email: <OWNER_EMAIL>
- Product owner GitHub URL (optional): <OWNER_GITHUB_URL>
- Product website (optional): <PRODUCT_WEBSITE>
- Enable approval email? yes/no: <EMAIL_ENABLED>
- Enable a custom avatar/voice now? yes/no: <CUSTOM_AVATAR_ENABLED>
- Enable the shared live Fabric mode now? yes/no: <LIVE_FABRIC_ENABLED>
- Four published Fabric Data Agent workspace/artifact IDs, when enabled: <LIVE_FABRIC_DATA_AGENTS>

CUSTOMERS
Replace the example below with my complete customer list. Accept JSON, CSV-like rows, or plain text. If only a customer name is supplied, research and confirm the official HTTPS website before writing it. Never guess an ambiguous organisation or domain.

<CUSTOMER_LIST>
Example format:
1. Example Manufacturing | https://www.example-manufacturing.com/ | Industrial manufacturing | public business, products, strategy, operations, sustainability, recent news
2. Example Health | https://www.example-health.com/ | Healthcare | public business, services, locations, clinical innovation, leadership, recent news
</CUSTOMER_LIST>

NON-NEGOTIABLE SAFETY AND DATA RULES
1. Work only in this clone and the Azure subscription/repository confirmed from MY INPUTS.
2. Before changing Azure or GitHub, show me the resolved repository, tenant, subscription, regions, generated resource suffix, administrator logins, and customer count. Ask once for confirmation if any supplied value is ambiguous or conflicts with the signed-in context.
3. Treat all existing customers as sample/current-owner data. Replace the entire config/customers.json array; do not merge my customers with it.
4. Use public information only. Do not put private emails, internal account notes, CRM data, opportunity data, credentials, or customer-confidential information into the catalogue, prompts, screenshots, tests, or Markdown.
5. Never print, paste, log, commit, or place a secret in a command-line argument. Use the repository SecureString/stdin helper scripts for OAuth and email. Keep .env, data/, knowledge/customers/, and customer-agents.json untracked.
6. Use managed identity and immutable repository-ID-bound GitHub OIDC. Do not create a deployment service-principal client secret, publish profile, registry password, Azure AI key, or Speech key. A separate delegated Entra application secret is permitted only for the optional live Fabric user sign-in and must be stored through the secure helper.
7. Preserve unrelated user changes and untracked files. Stage and commit only files changed for this repurposing.
8. Do not delete Azure resources, GitHub environments, users, agents, or vector stores unless the repository workflow explicitly manages obsolete ClientSphere assets and the replacement deployment has passed.
9. Do not claim completion until tests, deployment, OAuth, administrator access, customer counts, and /healthz are verified.

PHASE 1 - DISCOVER AND PREFLIGHT
1. Read README.md, AI-SETUP-PROMPT.md, SELF-HOSTING.md, config/customers.json, package.json, infra/main.bicep, .github/workflows/deploy.yml, .env.example, scripts/bootstrap-github-oidc.ps1, scripts/configure-github-oauth.ps1, instructions.mjs, use-case-registry.mjs, auth.mjs, and all Markdown files.
2. Inspect git status, branch, origin remote, GitHub authentication, Azure authentication, selected tenant/subscription, provider availability, regional model availability/quota, and required local tools.
3. Require Node.js 22+, Git, PowerShell 7, Azure CLI, and GitHub CLI. Install only missing project dependencies with npm ci.
4. If the target repository is a fork, ensure origin points to my repository, not the source/upstream repository.
5. Confirm the target supports the configured GPT-5.6 Sol, Luna, and Terra model version/capacity in the selected AI region. If not, present the smallest valid model/region change and wait for my decision; do not silently substitute.

PHASE 2 - REPLACE AND TAILOR THE CUSTOMER PORTFOLIO
1. Build a new config/customers.json containing only my customers.
2. For each customer, create:
   - a stable lowercase-hyphen id;
   - exact display name;
   - verified official HTTPS website;
   - concise sector;
   - one-sentence public summary;
   - 4-8 useful public-intelligence topics.
3. Resolve duplicate IDs and reject duplicate or ambiguous organisations.
4. Check how each sector maps in use-case-registry.mjs. Add or improve sector mappings only where needed so every customer receives three credible, distinct scenarios. Preserve one general mode, three synthetic modes, and the shared live Fabric mode unless you intentionally update all dependent UI, tests, and smoke-count logic.
5. Keep synthetic scenario records clearly labelled synthetic. Do not invent real customer results, incidents, financials, or endorsements.
6. Update tests so they validate portable catalogue behavior and sector fixtures, never the previous owner's exact customers or customer count.

PHASE 3 - REBRAND AND REWRITE THE DOCUMENTATION
1. Replace previous-owner names, emails, GitHub links, websites, resource IDs, tenant IDs, subscription IDs, fixed suffixes, customer counts, customer names, and personal avatar examples wherever they are not intentionally preserved as generic attribution.
2. Tailor the app display name, tagline, About content, contact details, email wording, and relevant UI text to MY INPUTS. Keep secrets and non-public data out of browser files.
3. Review and rewrite every tracked *.md file. Each document must:
   - start with a clear title and navigation back to README.md;
   - state its purpose and intended reader;
   - use my product/team terminology and generic placeholders instead of prior-owner values;
   - contain commands that match the actual scripts and current file names;
   - link to the canonical detailed guide rather than duplicate conflicting instructions;
   - identify optional, billable, destructive, Limited Access, or manual steps;
   - use relative links that work on GitHub;
   - distinguish redacted/synthetic screenshots from live customer data.
4. Rewrite README.md as a concise landing page with:
   - value proposition;
   - one featured screenshot;
   - AI-assisted and manual setup routes;
   - capabilities, architecture, customer schema, security boundary, and documentation map.
5. Rewrite SELF-HOSTING.md as the canonical manual clone-to-production runbook for my tenant/subscription.
6. Rewrite AI-SETUP-PROMPT.md so a future agent can reproduce my tailored setup without containing secrets or old customer data.
7. Genericise all custom-avatar/*.md files for my owner/company and current Azure resource naming. Preserve the warning that custom avatar/voice features require consent, Limited Access approval, and current Microsoft documentation.
8. Keep or replace screenshots only with redacted/synthetic images. Update docs/SCREENSHOTS.md captions to explain the user journey.
9. Check every relative Markdown link and image path.

PHASE 4 - VALIDATE LOCALLY
Run the existing project checks:
- npm run customers:validate
- npm run check
- npm test
- az bicep build --file infra/main.bicep
- git diff --check

Fix failures caused by the repurposing. Do not weaken tests or add broad fallbacks to hide errors.

PHASE 5 - BOOTSTRAP AZURE AND GITHUB
1. Ensure az and gh are signed in to the confirmed tenant/subscription and repository.
2. Run scripts/bootstrap-github-oidc.ps1 with my subscription, tenant if supplied, administrator logins, and selected regions.
3. Let the script discover/reuse the stable suffix unless I explicitly provided one.
4. Verify:
   - the production environment allows only main;
   - the OIDC subject is immutable and contains the target repository ID;
   - required GitHub variables exist;
   - SESSION_SECRET exists as a GitHub secret but its value is never displayed;
   - the deployment identity has only the roles currently required by the Bicep/workflow.
5. If repository or Azure policy blocks a step, report the exact policy/permission and the least-privilege remediation.

PHASE 6 - COMMIT, PUSH, DEPLOY, AND MONITOR
1. Show the final diff summary and confirm no secrets or generated data are staged.
2. Commit only the intentional repurposing files with a clear message and push main to origin.
3. Watch the Validate and deploy ClientSphere workflow to completion.
4. If it fails, inspect the failing job logs, fix the root cause, recommit, and rerun. Do not stop at the first failure.
5. Read the deployed Container App URL from Azure/GitHub output and verify /healthz:
   - status is ok;
   - customers equals config/customers.json length;
   - agentsConfigured equals that customer count;
   - agentModesConfigured equals five times that customer count;
   - when LIVE_FABRIC_ENABLED=yes, liveFabricAgentsConfigured is 4, liveOrchestratorConfigured is true, and fabricAuthConfigured is true.

PHASE 7 - COMPLETE IDENTITY AND ADMINISTRATION
1. GitHub OAuth App creation may require my interactive GitHub approval. If it does:
   - give me the exact Homepage URL and callback URL;
   - open the correct GitHub registration page when browser control is available;
   - never expose or retain the generated client secret.
2. After I create the OAuth App, run scripts/configure-github-oauth.ps1 and let it request values through masked prompts. Watch the deployment it dispatches.
3. If LIVE_FABRIC_ENABLED=yes, ensure the four Fabric Data Agents are published and the four exact Microsoft Fabric connections in SELF-HOSTING.md exist. Assign every delegated user or group **Foundry Agent Consumer** on the project plus direct access to the Fabric Data Agents and sources. Register a single-tenant Entra web application with the exact `/auth/fabric/callback`, delegated Azure AI Foundry `user_impersonation`, and required consent. Run scripts/configure-live-fabric.ps1 so its masked prompt stores the client secret and triggers a full refresh.
4. Have me sign in with a login listed in ADMIN_LOGINS. Verify it becomes the first approved administrator and /admin opens.
5. Explain that all later users start pending, how to approve/promote them, and how to hand ownership to another admin without removing the sole administrator.
6. If EMAIL_ENABLED=yes, run scripts/configure-email.ps1 using non-secret metadata arguments and its masked connection-string prompt. If no, leave all four email values unset.
7. If CUSTOM_AVATAR_ENABLED=yes, do not fabricate approval or consent. Follow custom-avatar/README.md and stop for the required Limited Access, consent recording, training, and deployment steps.

FINAL HANDOFF
Return:
- repository and commit URL;
- GitHub Actions run URL and conclusion;
- Azure tenant/subscription names and IDs used;
- resource group, Foundry account/project, Container App, and live URL;
- customer count and agent-mode count;
- bootstrap administrator login(s);
- OAuth status and optional email/custom-avatar status;
- /healthz result;
- any manual action still required;
- a short day-two guide for adding/removing customers and forcing a refresh.

Do not finish with only recommendations. Persist until the tailored repository and deployment are working, except where a user-only login, consent, or approval action is genuinely required.
```

## Expected human checkpoints

Even a capable agent should stop for:

1. ambiguous customer identities or domains;
2. confirmation of the target Azure subscription/repository when context differs;
3. unavailable model quota/region choices;
4. GitHub OAuth App registration and its new secret;
5. optional ACS connection string;
6. custom avatar/voice Limited Access, consent, and training.

Everything else in the standard path is represented by repository scripts and GitHub Actions.
