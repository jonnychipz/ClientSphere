# Optional approval email workflow

ClientSphere keeps Hubble's Azure Communication Services email integration in `email.mjs`, but email is disabled until these App Service settings are supplied:

- `ACS_CONNECTION_STRING`
- `EMAIL_SENDER`
- `ADMIN_EMAIL`
- `ADMIN_NAME`

Without them, access requests and decisions remain fully manageable in `/admin`; email failures never change an access decision.

If enabled later, store the ACS connection string as a GitHub secret or Key Vault secret and apply it through a reviewed GitHub Actions workflow. Do not commit it.
