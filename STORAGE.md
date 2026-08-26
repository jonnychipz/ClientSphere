# Storage

ClientSphere uses the keyless `stclientsphere95bc` storage account:

- `ClientSphereUsers` - access requests and GitHub profiles.
- `ClientSphereUsage` - login, chat, decision, and account events.
- `ClientSphereLogs` - administrator-visible system events.
- `ClientSphereTokens` - single-use approval/denial tokens.
- `ClientSphereSettings` - avatar and voice visibility.
- `config/customer-agents.json` - private Foundry agent/vector-store metadata.

The App Service managed identity has Table Data Contributor and Blob Data Reader. The GitHub deployment identity has Blob Data Contributor so it can publish refreshed agent metadata. Shared-key access and public blob access are disabled.
