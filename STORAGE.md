# Data storage — Azure Table Storage (keyless)

Hubble persists users, usage, system logs and email-action tokens in **Azure Table Storage** — a serverless, pay-per-use key/value store that costs pennies per month at this scale and survives app redeploys/restarts (unlike the App Service filesystem).

## Why Table Storage
- **Cheap**: ~£0.05/GB/month + tiny per-transaction cost. For an internal tool this is effectively free.
- **Serverless & durable**: no server to manage; data persists independently of the web app.
- **Right shape**: our data is simple keyed records (users by login, time-ordered usage/logs, tokens by id) — a perfect fit for Tables.
- **Keyless**: authenticated with the web app's **managed identity** (no keys), consistent with the rest of Hubble. The tenant blocks shared-key auth, so we use AAD.

## Resource
| Resource | Purpose |
|----------|---------|
| Storage account `hubblestore…` (`hubble-rg`, Standard_LRS) | Hosts the tables |

Tables (auto-created on first run):
- `HubbleUsers` — one row per user (login, profile, status, isAdmin, timestamps)
- `HubbleUsage` — usage events (login, chat, decide, signup, account-deleted…)
- `HubbleLogs` — system logs (info/warn/error) shown on the admin Logs panel
- `HubbleTokens` — **single-use** email-action tokens

## Auth (keyless)
The app reads `AZURE_STORAGE_ACCOUNT` (account name) and uses `DefaultAzureCredential`:
- **In Azure**: the App Service **managed identity**, granted **Storage Table Data Contributor** on the account.
- **Locally**: your `az login` identity (also granted the role).

No connection strings or keys are stored anywhere.

```powershell
# grant an identity table access
az role assignment create --assignee-object-id <objectId> --assignee-principal-type ServicePrincipal `
  --role "Storage Table Data Contributor" --scope <storageAccountResourceId>
```

If `AZURE_STORAGE_ACCOUNT` is unset (e.g. quick local dev), the app falls back to a local `data/store.json` file automatically.

## Single-use email tokens (anti-spoofing)
Approve/Deny email links **do not** encode the username (which a user could forge). Instead:
1. On signup, the server creates two random 32-byte token ids (one for approve, one for deny) and stores `{login, decision, used:false, exp}` in `HubbleTokens`.
2. The email link carries only the opaque token id.
3. On click, the server **atomically consumes** the token (etag-guarded): it must exist, be unused, unexpired, and match the decision. It's then marked `used` so the link can never be replayed.

This makes the links unforgeable (random id, server-side record) and strictly single-use.
