# Authentication & access control — setup

Hubble is gated behind **GitHub sign-in** with an **admin approval** workflow. The admin (**jonnychipz**) reviews each sign-up and allows or denies access from an admin dashboard, and all usage is logged.

## How it works
1. Visiting `/` with no session → redirected to **`/login`**.
2. User clicks **Sign in with GitHub** → GitHub OAuth → returns to Hubble.
3. First-time users are created with status **pending** → see the **Awaiting approval** page.
4. The admin opens **`/admin`**, and **Approves** or **Denies** them (or later Revokes).
5. Approved users get the full app. Every login, chat, and admin decision is recorded and shown in the dashboard (KPIs, per-user usage, activity feed).
6. Admins (`ADMIN_LOGINS`) are auto-approved and see an **Admin** link in the header.

Auth is enforced server-side: `/` serves the app only to approved users, and `/api/chat`, `/api/speech-token`, `/api/relay-token` require an approved session. Sessions are signed HttpOnly cookies (HMAC, 7-day expiry).

## Dev mode (no OAuth App yet)
While `GITHUB_CLIENT_ID`/`SECRET` are blank **or** `AUTH_DEV_MODE=true`, the login page offers a **simulated** username sign-in so you can test the whole approval flow locally. Disable it by setting real credentials and `AUTH_DEV_MODE=false`.

## Enabling real GitHub login (2 minutes)
1. Go to **https://github.com/settings/developers → OAuth Apps → New OAuth App**.
2. Fill in:
   - **Application name:** Hubble — GitHub Sales Coach
   - **Homepage URL:** `http://localhost:3000`
   - **Authorization callback URL:** `http://localhost:3000/auth/callback`
   *(for a deployed URL, use that host instead of localhost in both fields)*
3. Create it, then **Generate a new client secret**.
4. Put the values in `.env`:
   ```ini
   GITHUB_CLIENT_ID=<your client id>
   GITHUB_CLIENT_SECRET=<your client secret>
   AUTH_DEV_MODE=false
   SESSION_SECRET=<a long random string>
   ADMIN_LOGINS=jonnychipz
   ```
5. Restart: `npm start`. The login page now does real GitHub OAuth.

> The OAuth scope requested is `read:user` (public profile + login only). No repo access is requested.

## Admin
- Admins are listed in `ADMIN_LOGINS` (comma-separated GitHub logins). Default: `jonnychipz`.
- Admin dashboard: **`/admin`** — approve/deny/revoke users, see usage per user and a live activity feed.
- You cannot deny/revoke another admin from the UI (guarded server-side).

## Data
- Users and usage are stored in **`data/store.json`** (gitignored). Delete it to reset all access state; admins re-create automatically on next sign-in.
