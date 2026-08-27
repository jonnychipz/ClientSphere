# Optional approval email

ClientSphere works without email; administrators can manage all requests at `/admin`.

To enable transactional approval and decision email, create an Azure Communication Services Email resource with a verified sender, then set:

```powershell
.\scripts\configure-email.ps1 `
  -EmailSender "DoNotReply@<verified-domain>.azurecomm.net" `
  -AdminEmail "<administrator-email>" `
  -AdminName "<administrator-name>"
```

All four values are required together. The workflow stops with an explicit error when configuration is partial.

The script requests the connection string through a masked secure prompt, sends it to GitHub through standard input, and starts the deployment. The connection string is applied as a Container App secret. Sender/admin metadata is applied as environment variables. None belongs in source control or shell history.

Approval and deny links are two-step actions: a GET renders confirmation, and only an explicit POST applies the decision. This prevents email security scanners and link previewers from changing access.

Email delivery failure never changes an access decision. The durable source of truth remains the admin dashboard and access registry.
