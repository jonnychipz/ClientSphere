# GitHub OAuth setup

GitHub OAuth protects ClientSphere and preserves Hubble's approval/admin experience.

1. Sign in to GitHub as `jonnychipz`.
2. Open <https://github.com/settings/applications/new>.
3. Copy the live URL from the production GitHub Actions environment or run:
   `az containerapp show -g rg-clientsphere-95bc -n clientsphere-95bc --query properties.configuration.ingress.fqdn -o tsv`
4. Register:
   - Application name: `ClientSphere`
   - Homepage URL: `https://<container-app-fqdn>`
   - Authorization callback URL: `https://<container-app-fqdn>/auth/callback`
5. Generate a client secret.
6. Run:

```powershell
.\scripts\configure-github-oauth.ps1 -ClientId "<client id>" -ClientSecret "<client secret>"
```

The values are stored as encrypted GitHub repository secrets. The script triggers the OIDC deployment workflow, which configures Container Apps. Do not commit either value to the repository.

New users enter `pending` status. Bootstrap administrator `jonnychipz` can approve or deny requests at `/admin`.
