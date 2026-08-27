# GitHub OAuth setup

> **Documentation:** [Home](README.md) · [Manual setup](SELF-HOSTING.md) · [AI-assisted setup](AI-SETUP-PROMPT.md) · [Deployment](DEPLOYMENT.md)

ClientSphere uses GitHub OAuth for user identity and its own approved-user/admin registry for application authorization.

![Synthetic access-governance dashboard](docs/images/clientsphere-admin-governance-synthetic.png)

Complete Azure bootstrap and the first deployment before this step so the Container App URL exists. See [SELF-HOSTING.md](SELF-HOSTING.md).

## Register the OAuth App

1. Get the deployed URL:

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
   ```

2. Sign in to the GitHub account or organisation that will own the OAuth App.
3. Open <https://github.com/settings/applications/new>.
4. Register:
   - **Application name:** `ClientSphere - <your team>`
   - **Homepage URL:** the exact `$appUrl`
   - **Authorization callback URL:** the exact `$appUrl/auth/callback`
5. Generate a client secret.
6. Store and deploy the values:

   ```powershell
   .\scripts\configure-github-oauth.ps1
   ```

The script securely prompts for both values, detects the repository from the `origin` remote, stores them as encrypted GitHub repository secrets, and dispatches the deployment workflow. The client secret is not placed in PowerShell history or a process argument. Do not commit either value.

## Access behaviour

- The GitHub login in the `ADMIN_LOGINS` repository variable is permitted to bootstrap the first administrator.
- A different first visitor remains pending and cannot claim administration.
- New users remain pending until an administrator approves them at `/admin`.
- Approved users can be promoted to administrator from `/admin`.
- The sole approved administrator cannot be deleted or demoted.
- `ADMIN_LOGINS` also permits recovery when the durable registry contains no approved administrator.

For an ownership handover, approve and promote the new owner before changing `ADMIN_LOGINS` and demoting the old owner.

## Local OAuth

Development defaults to simulated sign-in when `AUTH_DEV_MODE=true`. To test OAuth locally, create a separate OAuth App with:

```text
Homepage URL: http://localhost:3000
Callback URL: http://localhost:3000/auth/callback
```

Put its credentials only in ignored `.env` and set `AUTH_DEV_MODE=false`.

## Verify the result

1. Open the deployed app in a private browser window.
2. Sign in with a login in `ADMIN_LOGINS`.
3. Confirm `/admin` opens and shows that account as administrator.
4. Sign in once with a different GitHub account.
5. Confirm the second account remains pending until approved.
6. Approve it and verify application access.

Never test first-admin behavior with an account that is not listed in `ADMIN_LOGINS`.
