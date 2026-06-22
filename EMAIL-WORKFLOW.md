# Email approval workflow (Azure Communication Services)

When a **new user** signs in to Hubble, an automated approval workflow runs — built on **Azure Communication Services (ACS) Email**, provisioned in `hubble-rg` and called from the Node app.

## What happens
1. A brand‑new, non‑admin user completes GitHub sign‑in.
2. **Admin email** → `johnlunn@microsoft.com` gets a slick branded email with the user's GitHub profile (avatar, name, @login, email if public, company, location, bio, repos, followers, account age) and **one‑click Approve / Deny** buttons.
3. **User email** → the new user gets a "request received / pending review" email at their GitHub‑registered address.
4. **Decision** → approving or denying (from the email buttons *or* the `/admin` dashboard) emails the user the outcome (approved = launch link; denied = polite note with contact).

Every email is purple‑branded and lists **John Lunn** as the point of contact (email, @jonnychipz, jonnychipz.com).

## Why ACS Email (and not Logic Apps)
Logic Apps' email connectors (Office 365 / Outlook) need an **interactive, user‑delegated mailbox connection** that can't be provisioned non‑interactively and is often blocked in corporate tenants. **ACS Email** is the Azure‑native transactional email service: fully provisionable via CLI/ARM, callable straight from the app with the official SDK, and stored as code in this repo (`email.mjs`). It's the right tool for app‑generated transactional mail.

## Azure resources (in `hubble-rg`)
| Resource | Purpose |
|----------|---------|
| `hubble-email` (Email Communication Service) | Hosts the email domain |
| `AzureManagedDomain` (`…azurecomm.net`) | Pre‑verified sender domain (SPF/DKIM/DMARC all Verified) |
| `hubble-acs` (Communication Service) | Sends email; linked to the domain |

Sender: `DoNotReply@<managed-domain>.azurecomm.net`.

## Configuration (App Service settings / `.env`)
| Key | Value |
|-----|-------|
| `ACS_CONNECTION_STRING` | ACS primary connection string (also a GitHub secret) |
| `EMAIL_SENDER` | `DoNotReply@…azurecomm.net` |
| `ADMIN_EMAIL` | `johnlunn@microsoft.com` |
| `ADMIN_NAME` | `John Lunn` |
| `PUBLIC_BASE_URL` | Deployed site URL (for email action links) |

If `ACS_CONNECTION_STRING`/`EMAIL_SENDER` are blank (e.g. local dev), email is **disabled gracefully** (logged, not sent).

## Security of the email action links
Approve/Deny links carry an **HMAC‑signed, 14‑day‑expiry token** (signed with `SESSION_SECRET`) that authorises acting on that specific user. Only the admin receives the email, and the token can't be tampered with. Admins can't be approved/denied via links. Decisions are also logged in the admin activity feed.

## GitHub scope
The OAuth scope is `read:user user:email` so the workflow can email the user at their verified primary GitHub email (if the user keeps it private, the user emails are skipped but the admin notification still arrives).

## Recreate the ACS resources
```powershell
az communication email create -n hubble-email -g hubble-rg --location global --data-location Europe
az communication email domain create --domain-name AzureManagedDomain --email-service-name hubble-email -g hubble-rg --location global --domain-management AzureManaged
az communication create -n hubble-acs -g hubble-rg --location global --data-location Europe
# link the domain, then read the connection string:
az communication list-key -n hubble-acs -g hubble-rg --query primaryConnectionString -o tsv
```

> **Deliverability note:** Azure‑managed‑domain mail can be filtered by strict corporate tenants (Junk/Quarantine). For production, add a **custom verified domain** in ACS for best deliverability.
