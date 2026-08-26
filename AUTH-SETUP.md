# GitHub OAuth setup

GitHub OAuth protects ClientSphere and preserves Hubble's approval/admin experience.

1. Sign in to GitHub as `jonnychipz`.
2. Open <https://github.com/settings/applications/new>.
3. Register:
   - Application name: `ClientSphere`
   - Homepage URL: `https://clientsphere-95bc.azurewebsites.net`
   - Authorization callback URL: `https://clientsphere-95bc.azurewebsites.net/auth/callback`
4. Generate a client secret.
5. Run:

```powershell
.\scripts\configure-github-oauth.ps1 -ClientId "<client id>" -ClientSecret "<client secret>"
```

The values are stored as encrypted GitHub repository secrets. The script triggers the OIDC deployment workflow, which configures App Service. Do not commit either value to the repository.

New users enter `pending` status. Bootstrap administrator `jonnychipz` can approve or deny requests at `/admin`.
