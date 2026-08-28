// ClientSphere backend: serves the app, routes customer-isolated Foundry agents,
// and brokers keyless Azure Speech tokens for the browser avatar.
// auth tokens for the browser avatar, and proxies chat to the Foundry agent.
// Auth everywhere: DefaultAzureCredential (az login locally / managed identity in cloud).
import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { AIProjectClient } from "@azure/ai-projects";
import { DefaultAzureCredential } from "@azure/identity";
import { FETCH_DOC_TOOL, fetchOfficialDoc } from "./webgrounding.mjs";
import {
  customers, getCustomer, customerPublicView, loadAgentMetadata,
} from "./customer-registry.mjs";
import { buildCustomerSyntheticUseCases, buildCustomerUseCases, getCustomerUseCase } from "./use-case-registry.mjs";
import {
  MANUFACTURING_LIVE_MODE_ID, MANUFACTURING_SPECIALISTS,
} from "./manufacturing-live.mjs";
import { resolveCustomerLogo } from "./customer-logo.mjs";
import { createThreadToken, verifyThreadToken } from "./thread-token.mjs";
import { buildAgentInput } from "./multimodal-input.mjs";
import { renderAgentResponse } from "./response-rendering.mjs";
import {
  DEV_MODE, OAUTH_CONFIGURED, ADMIN_LOGINS, sessionLogin, setSession, clearSession,
  makeState, setStateCookie, checkState, authorizeUrl, exchangeCode, fetchGitHubUser,
} from "./auth.mjs";
import {
  FABRIC_AUTH_CONFIGURED, DelegatedAccessTokenCredential,
  clearFabricSession, clearFabricStateCookie, createFabricState,
  exchangeFabricCode, fabricAuthorizeUrl, fabricStateFromRequest,
  getFabricSession, setFabricSession, setFabricStateCookie, verifyFabricState,
} from "./fabric-auth.mjs";
import {
  initStore, STORAGE_MODE, getUser, registerUser, setStatus, setAdmin, deleteUser,
  listUsers, replaceUsers, logUsage, getUsage, usageStats, log, getLogs, createToken, consumeToken, peekToken,
  getSetting, setSetting,
} from "./store.mjs";
import { approvedAdmins, isApprovedAdmin, removalGuard, withAccessRegistryLock } from "./access-governance.mjs";
import { persistAccessState } from "./access-state.mjs";
import {
  EMAIL_ENABLED, emailAdminNewUser, emailUserPending, emailUserDecision,
  emailAdminAccountDeleted, emailUserAccountDeleted,
} from "./email.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const ENDPOINT = process.env.PROJECT_ENDPOINT;
const SPEECH_REGION = process.env.SPEECH_REGION;
const SPEECH_STS_ENDPOINT = process.env.SPEECH_STS_ENDPOINT;
const THREAD_TOKEN_SECRET = process.env.SESSION_SECRET;

if (!ENDPOINT || !SPEECH_REGION || !SPEECH_STS_ENDPOINT || !THREAD_TOKEN_SECRET) {
  console.error("Missing PROJECT_ENDPOINT, SPEECH_REGION, SPEECH_STS_ENDPOINT, or SESSION_SECRET.");
  process.exit(1);
}

let agentMetadata;
try {
  agentMetadata = await loadAgentMetadata();
} catch (error) {
  console.error(`Could not load customer agent metadata: ${error.message}`);
  console.error("Run `npm run setup` or set CUSTOMER_AGENT_META_PATH.");
  process.exit(1);
}
for (const customer of customers) {
  const metadata = agentMetadata.customers[customer.id];
  const useCasesReady = buildCustomerSyntheticUseCases(customer)
    .every((useCase) => metadata?.useCases?.[useCase.id]?.agentName);
  if (!metadata?.agentName || !useCasesReady) {
    console.error(`Customer agent metadata is missing '${customer.id}'.`);
    process.exit(1);
  }
}
const liveFabricAgentsConfigured = MANUFACTURING_SPECIALISTS.filter(
  (specialist) => agentMetadata.liveManufacturing?.agents?.[specialist.id]?.mcpConnectionId,
).length;
const liveOrchestratorConfigured = Boolean(
  agentMetadata.liveManufacturing?.architecture === "direct-fabric-mcp" &&
  agentMetadata.liveManufacturing?.orchestrator?.agentName,
);
const liveManufacturingReady =
  liveFabricAgentsConfigured === MANUFACTURING_SPECIALISTS.length && liveOrchestratorConfigured;
if (!liveManufacturingReady) {
  console.warn("Shared live manufacturing agent metadata is unavailable; live Fabric mode will remain disabled.");
}

const credential = new DefaultAzureCredential();
const project = new AIProjectClient(ENDPOINT, credential);
const openAI = project.getOpenAIClient();

// ---- Voice + avatar catalogue offered in the UI ----
// Each voice is paired with a distinct avatar BODY (Azure standard avatar
// character + style), so choosing a voice also changes who you see.
const VOICES = {
  female: [
    { id: "en-GB-SoniaNeural", label: "Sonia — British English", character: "lisa", style: "casual-sitting" },
    { id: "en-US-AvaMultilingualNeural", label: "Ava — US English (multilingual)", character: "lori", style: "graceful" },
    { id: "en-US-JennyNeural", label: "Jenny — US English", character: "meg", style: "business" },
    { id: "en-AU-NatashaNeural", label: "Natasha — Australian English", character: "lori", style: "casual" },
  ],
  male: [
    { id: "en-GB-RyanNeural", label: "Ryan — British English", character: "harry", style: "business" },
    { id: "en-US-AndrewMultilingualNeural", label: "Andrew — US English (multilingual)", character: "max", style: "business" },
    { id: "en-US-GuyNeural", label: "Guy — US English", character: "harry", style: "youthful" },
    { id: "en-AU-WilliamNeural", label: "William — Australian English", character: "max", style: "casual" },
  ],
};

// Avatar is rendered on a green backdrop and chroma-keyed out in the browser.
// /public/backgrounds, so no external dependency at runtime.
const AVATAR_GREEN = "#00FF00FF";
const BACKGROUNDS = [
  { id: "modern-office", label: "Modern Office", img: "/backgrounds/01-modern-office.jpg" },
  { id: "city-skyline", label: "City Skyline", img: "/backgrounds/02-city-skyline.jpg" },
  { id: "mountains", label: "Mountains", img: "/backgrounds/03-mountains.jpg" },
  { id: "tech-workspace", label: "Tech Workspace", img: "/backgrounds/04-tech-workspace.jpg" },
  { id: "boardroom", label: "Boardroom", img: "/backgrounds/05-boardroom.jpg" },
  { id: "forest", label: "Sunlit Forest", img: "/backgrounds/06-forest.jpg" },
  { id: "library", label: "Grand Library", img: "/backgrounds/07-library.jpg" },
  { id: "coastal", label: "Coastline", img: "/backgrounds/08-coastal.jpg" },
  { id: "coworking", label: "Co-working Space", img: "/backgrounds/09-coworking.jpg" },
  { id: "skyline-night", label: "Sunset Skyline", img: "/backgrounds/10-skyline-night.jpg" },
];

function resourcesFor(customer) {
  return [
    {
      group: "Customer intelligence",
      links: customer.topics.map((topic, index) => ({
        icon: ["building", "cpu", "map", "star", "card", "rss"][index % 6],
        title: topic,
        sub: `Ask the ${customer.name} adviser`,
        prompt: `Give me an evidence-led briefing on ${topic.toLowerCase()} for ${customer.name}. Include dates and public sources.`,
      })),
    },
    {
      group: "Synthetic use-case agents",
      links: buildCustomerSyntheticUseCases(customer).map((useCase) => ({
        icon: useCase.icon,
        title: useCase.name,
        sub: useCase.businessValue,
        prompt: useCase.prompts[0],
        agentMode: useCase.id,
      })),
    },
    {
      group: "Live Fabric data",
      links: [{
        icon: "activity",
        title: "Manufacturing Shopfloor Live",
        sub: "Celyn Components live demo plant",
        prompt: "Give me a live operational briefing across plant status, reliability, quality, and delivery risk.",
        agentMode: MANUFACTURING_LIVE_MODE_ID,
      }],
    },
    {
      group: "Public sources",
      links: [
        {
          icon: "link",
          title: `${customer.name} official website`,
          sub: customer.domain,
          url: customer.website,
        },
        {
          icon: "book-open",
          title: "Executive customer brief",
          sub: "Business, strategy, financials, developments, and meeting angles",
          prompt: "[[CUSTOMER_BRIEF]] Build an evidence-led executive briefing for the active customer.",
        },
      ],
    },
  ];
}

// ---- Cached Speech authorization token for the browser SDK (keyless) ----
// Exchanges an Entra token for a 10-min Speech token via the custom-domain STS.
let cachedToken = null; // { value, expiresOnMs }
async function getSpeechToken() {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresOnMs - now > 60_000) return cachedToken;
  const aad = await credential.getToken("https://cognitiveservices.azure.com/.default");
  const r = await fetch(SPEECH_STS_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${aad.token}`, "Content-Length": "0" },
  });
  if (!r.ok) throw new Error(`issueToken ${r.status}: ${await r.text()}`);
  const speechToken = await r.text();
  cachedToken = { value: speechToken, expiresOnMs: now + 9 * 60_000 };
  return cachedToken;
}

// ---- Optional custom avatars and voices, enabled only after approval/training ----
// Shared custom VOICE (personal voice or CNV) that all custom avatars speak with.
const customVoiceName = (process.env.CUSTOM_VOICE_NAME || "").trim();
const customVoiceEndpoint = (process.env.CUSTOM_VOICE_ENDPOINT_ID || "").trim();
const customVoiceProfileId = (process.env.CUSTOM_VOICE_PROFILE_ID || "").trim();
const customVoiceBaseModel = (process.env.CUSTOM_VOICE_BASE_MODEL || "DragonLatestNeural").trim();
const customGender = (process.env.CUSTOM_AVATAR_GENDER || "male").toLowerCase() === "female" ? "female" : "male";
const customPhotoModel = (process.env.CUSTOM_AVATAR_PHOTO_MODEL || "").trim();
const sharedVoice = {
  voice: customVoiceName,
  voiceEndpointId: customVoiceEndpoint,
  voiceProfileId: customVoiceProfileId,
  voiceBaseModel: customVoiceBaseModel,
  bodyCharacter: (process.env.CUSTOM_BODY_CHARACTER || "harry").trim(),
  bodyStyle: (process.env.CUSTOM_BODY_STYLE || "business").trim(),
};

// One or more custom avatar faces, all paired with the shared custom voice.
// CUSTOM_AVATARS is a JSON array: [{ id, label, character, photoModel?, gender?, style? }].
// For backwards-compat, a single CUSTOM_AVATAR_CHARACTER (+_LABEL) is also accepted.
function parseCustomAvatars() {
  const out = [];
  const raw = (process.env.CUSTOM_AVATARS || "").trim();
  if (raw) {
    let arr = null;
    // Preferred: JSON array. But Azure/Windows shells often strip the quotes, so
    // we also accept a quote-free delimited form:
    //   id|Label|character|photoModel|gender|style ; id2|Label2|character2 ...
    if (raw.startsWith("[")) {
      try { arr = JSON.parse(raw); } catch { arr = null; }
    }
    if (!arr) {
      arr = raw.split(";").map((s) => s.trim()).filter(Boolean).map((seg) => {
        const [id, label, character, photoModel, gender, style] = seg.split("|").map((x) => (x || "").trim());
        return { id, label, character: character || id, photoModel, gender, style };
      });
    }
    for (const a of arr) {
      if (!a || !a.character) continue;
      out.push({
        id: String(a.id || a.character),
        label: a.label || a.character,
        character: String(a.character).trim(),
        style: (a.style || "").trim(),
        photoModel: (a.photoModel || customPhotoModel || "").trim(),
        gender: (a.gender || customGender).toLowerCase() === "female" ? "female" : "male",
      });
    }
  }
  const singleChar = (process.env.CUSTOM_AVATAR_CHARACTER || "").trim();
  if (singleChar && !out.some((a) => a.character === singleChar)) {
    out.unshift({
      id: singleChar,
      label: process.env.CUSTOM_AVATAR_LABEL || "You (custom)",
      character: singleChar,
      style: (process.env.CUSTOM_AVATAR_STYLE || "").trim(),
      photoModel: customPhotoModel,
      gender: customGender,
    });
  }
  if (!out.length && (customVoiceName || customVoiceProfileId)) {
    out.push({
      id: "custom-voice",
      label: process.env.CUSTOM_AVATAR_LABEL || "Custom presenter",
      character: "",
      style: "",
      photoModel: "",
      gender: customGender,
    });
  }
  return out;
}
const CUSTOM_ENABLED = process.env.CUSTOM_AVATAR_ENABLED === "true";
const CUSTOM_AVATARS = CUSTOM_ENABLED ? parseCustomAvatars().map((a) => ({ ...a, ...sharedVoice })) : [];
// Default visibility = all visible; admins can hide/show via the admin portal.
const SETTINGS_AVATAR_VIS = "avatarVisibility"; // { [avatarId]: boolean }

const app = express();
app.set("trust proxy", 1); // App Service terminates TLS at a proxy; trust X-Forwarded-Proto/Host
app.use(express.json({ limit: "7mb" }));
app.use(express.urlencoded({ extended: false })); // for the email confirm-action POST form

// ---------------- Authentication & access control ----------------
const PUBLIC_PAGES = new Set(["/login", "/pending", "/denied"]);
function baseUrl(req) {
  return `${req.protocol}://${req.get("host")}`;
}
function redirectUri(req) {
  return `${baseUrl(req)}/auth/callback`;
}
function fabricRedirectUri(req) {
  return `${baseUrl(req)}/auth/fabric/callback`;
}
const appUrlOf = (req) => process.env.PUBLIC_BASE_URL || baseUrl(req);

// Effective admin is an approved user with the stored administrator flag.
function effectiveAdmin(user) {
  return isApprovedAdmin(user);
}

async function usersWithGovernance() {
  const users = await listUsers();
  const admins = approvedAdmins(users);
  return { users, admins, adminCount: admins.length };
}

async function persistAccessRegistry() {
  if (STORAGE_MODE !== "file") return;
  await persistAccessState(await listUsers());
}

function accessMutationsLocked() {
  return process.env.CLIENTSPHERE_ACCESS_MUTATIONS_LOCKED === "true";
}

function assertAccessMutationsAvailable() {
  if (!accessMutationsLocked()) return;
  const error = new Error("Access administration is briefly locked during deployment. Try again in a few minutes.");
  error.statusCode = 503;
  throw error;
}

async function registerIdentity(profile) {
  return withAccessRegistryLock(async () => {
    const snapshot = await listUsers();
    const existing = await getUser(profile.login);
    if (accessMutationsLocked()) {
      if (existing) return { user: existing, isNew: false, bootstrapped: false, profileUpdated: false };
      assertAccessMutationsAvailable();
    }
    try {
      const registration = await registerUser(profile, ADMIN_LOGINS);
      if (registration.isNew || registration.bootstrapped || registration.profileUpdated) await persistAccessRegistry();
      return registration;
    } catch (error) {
      await replaceUsers(snapshot);
      throw error;
    }
  });
}

async function publicGitHubProfile(login) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`https://api.github.com/users/${encodeURIComponent(login)}`, {
      headers: { "User-Agent": "ClientSphere", Accept: "application/vnd.github+json" },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const profile = await response.json();
    return {
      login: profile.login,
      name: profile.name || profile.login,
      avatar: profile.avatar_url || "",
      bio: profile.bio || "",
      company: profile.company || "",
      location: profile.location || "",
      blog: profile.blog || "",
      followers: profile.followers ?? 0,
      publicRepos: profile.public_repos ?? 0,
      htmlUrl: profile.html_url || `https://github.com/${profile.login}`,
      githubCreatedAt: profile.created_at || null,
      profileHydratedAt: new Date().toISOString(),
    };
  } catch {
    return { login, name: login, profileHydratedAt: new Date().toISOString() };
  } finally {
    clearTimeout(timer);
  }
}

async function mutateAccessRegistry(operation) {
  return withAccessRegistryLock(async () => {
    assertAccessMutationsAvailable();
    const snapshot = await listUsers();
    try {
      const result = await operation();
      await persistAccessRegistry();
      return result;
    } catch (error) {
      await replaceUsers(snapshot);
      throw error;
    }
  });
}

// Resolve the signed-in user. A configured bootstrap login only recovers a registry with no administrator.
async function resolveUser(req) {
  const login = sessionLogin(req);
  if (!login) return null;
  let user = await getUser(login);
  if (!user) return null;
  const hydrationAge = user.profileHydratedAt ? Date.now() - Date.parse(user.profileHydratedAt) : Infinity;
  if (!accessMutationsLocked() && hydrationAge > 24 * 60 * 60 * 1000) {
    const profile = await publicGitHubProfile(user.login);
    if (profile) {
      user = (await registerIdentity(profile)).user;
    }
  }
  return user;
}
function requireApproved(handler) {
  return async (req, res) => {
    try {
      const u = await resolveUser(req);
      if (!u) return res.status(401).json({ error: "Not signed in" });
      if (u.status !== "approved") return res.status(403).json({ error: "Access not approved", status: u.status });
      req.authUser = u;
      return await handler(req, res);
    } catch (error) {
      console.error("approved route error:", error);
      return res.status(error.statusCode || 500).json({ error: error.message || "Request failed" });
    }
  };
}
function requireAdmin(handler) {
  return async (req, res) => {
    try {
      const u = await resolveUser(req);
      if (!effectiveAdmin(u)) return res.status(403).json({ error: "Approved administrator access required" });
      req.authUser = u;
      return await handler(req, res);
    } catch (error) {
      console.error("admin route error:", error);
      return res.status(error.statusCode || 500).json({ error: error.message || "Admin action failed" });
    }
  };
}

// Branded confirmation page for email one-click actions.
function actionPage(title, message, ok) {
  const accent = ok ? "#a78bfa" : "#f0a35e";
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>ClientSphere · ${title}</title><link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <style>body{margin:0;height:100vh;display:flex;align-items:center;justify-content:center;background:radial-gradient(900px 600px at 50% -10%,#241a45,#0a0813 60%);font-family:Segoe UI,Arial,sans-serif;color:#ece9f6}
  .c{width:420px;max-width:92vw;background:linear-gradient(180deg,#16111f,#0e0a18);border:1px solid rgba(139,92,246,.38);border-radius:18px;padding:34px;text-align:center;box-shadow:0 24px 70px rgba(0,0,0,.6),0 0 50px -14px rgba(139,92,246,.55);position:relative;overflow:hidden}
  .c::before{content:"";position:absolute;inset:0 0 auto 0;height:3px;background:linear-gradient(90deg,transparent,#a78bfa,#8b5cf6,transparent)}
  h1{font-family:Orbitron,Segoe UI,Arial;letter-spacing:2px;font-size:22px;margin:0 0 6px;color:${accent}}
  p{color:#cfc8e6;font-size:14px;line-height:1.6}a{color:#a78bfa;text-decoration:none}</style></head>
  <body><div class="c"><h1>${title}</h1><p>${message}</p>
  <p style="margin-top:18px"><a href="/admin">Open the admin dashboard →</a></p></div></body></html>`;
}

// Prevent the static middleware from exposing the admin document to non-admin users.
app.get("/admin.html", (req, res) => res.redirect("/admin"));
app.get("/customer-logos/:customerId", async (req, res) => {
  const customer = getCustomer(req.params.customerId);
  if (!customer) return res.status(404).end();
  const logo = await resolveCustomerLogo(customer);
  res.setHeader("Content-Type", logo.contentType);
  res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.send(logo.body);
});

// Static assets (css/js/images/backgrounds) are open; the HTML entry + APIs are gated.
app.use(express.static(path.join(__dirname, "public"), { index: false }));

// ---- auth routes ----
app.get("/auth/login", (req, res) => {
  if (DEV_MODE) return res.redirect("/login?dev=1");
  if (!OAUTH_CONFIGURED) return res.status(503).send("GitHub sign-in is not configured yet. <a href='/login'>Back</a>.");
  const state = makeState();
  setStateCookie(res, state, req.secure);
  res.redirect(authorizeUrl(state, redirectUri(req)));
});

async function startApprovalWorkflow(user, req) {
  const appUrl = appUrlOf(req);
  const approveTok = await createToken(user.login, "approved");
  const denyTok = await createToken(user.login, "denied");
  const approveUrl = `${appUrl}/admin/action?token=${encodeURIComponent(approveTok)}&d=approved`;
  const denyUrl = `${appUrl}/admin/action?token=${encodeURIComponent(denyTok)}&d=denied`;
  emailAdminNewUser(user, approveUrl, denyUrl, appUrl).catch((e) => console.error("admin email:", e.message));
  emailUserPending(user, appUrl).catch((e) => console.error("user pending email:", e.message));
  await logUsage(user.login, "signup");
  await log("info", "New access request", `@${user.login} (${user.email || "no email"})`);
}

app.get("/auth/callback", async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!checkState(req, state)) return res.status(400).send("Invalid OAuth state. <a href='/login'>Try again</a>.");
    const token = await exchangeCode(code, redirectUri(req));
    const gh = await fetchGitHubUser(token);
    const { user, isNew, bootstrapped } = await registerIdentity(gh);
    setSession(res, user.login, req.secure);
    await logUsage(user.login, "login");
    if (isNew && !effectiveAdmin(user)) await startApprovalWorkflow(user, req);
    if (bootstrapped) await log("info", "First administrator created", `@${user.login}`);
    res.redirect("/");
  } catch (err) {
    console.error("oauth callback error:", err.message);
    res.status(500).send("Sign-in failed: " + err.message + " <a href='/login'>Back</a>");
  }
});

// Dev-mode sign-in (only when no real OAuth App is configured).
app.post("/auth/dev", async (req, res) => {
  if (!DEV_MODE) return res.status(404).json({ error: "Dev login disabled" });
  const login = (req.body?.login || "").trim();
  if (!/^[a-zA-Z0-9-]{1,39}$/.test(login)) return res.status(400).json({ error: "Enter a valid GitHub username" });
  // Pull the real public GitHub profile (avatar etc.) so dev mode looks real.
  let profile = { login, name: login };
  try {
    const r = await fetch(`https://api.github.com/users/${login}`, { headers: { "User-Agent": "ClientSphere", Accept: "application/vnd.github+json" } });
    if (r.ok) { const g = await r.json(); profile = { login: g.login, name: g.name || g.login, avatar: g.avatar_url, bio: g.bio, company: g.company, location: g.location, blog: g.blog, followers: g.followers, publicRepos: g.public_repos, htmlUrl: g.html_url, githubCreatedAt: g.created_at }; }
  } catch { /* offline ok */ }
  const { user, isNew, bootstrapped } = await registerIdentity(profile);
  setSession(res, user.login, req.secure);
  await logUsage(user.login, "login", "dev");
  if (isNew && !effectiveAdmin(user)) await startApprovalWorkflow(user, req);
  if (bootstrapped) await log("info", "First administrator created", `@${user.login}`);
  res.json({ ok: true, status: effectiveAdmin(user) ? "approved" : user.status });
});

app.get("/auth/logout", (req, res) => { clearSession(res, req.secure); res.redirect("/login"); });

app.get("/api/authmode", (req, res) => res.json({ devMode: DEV_MODE, oauthConfigured: OAUTH_CONFIGURED }));

app.get("/api/me", async (req, res) => {
  try {
    const u = await resolveUser(req);
    if (!u) return res.status(401).json({ error: "Not signed in" });
    const usage = (await usageStats()).find((s) => s.login.toLowerCase() === u.login.toLowerCase()) || { total: 0, chats: 0, lastActive: null };
    res.json({
      login: u.login, name: u.name, avatar: u.avatar, email: u.email, status: u.status,
      isAdmin: effectiveAdmin(u), company: u.company, location: u.location, bio: u.bio,
      followers: u.followers, publicRepos: u.publicRepos, htmlUrl: u.htmlUrl,
      requestedAt: u.requestedAt, usage,
    });
  } catch (error) {
    console.error("profile route error:", error);
    res.status(error.statusCode || 500).json({ error: error.message || "Could not load profile" });
  }
});

app.get("/auth/fabric/start", requireApproved(async (req, res) => {
  if (!FABRIC_AUTH_CONFIGURED) {
    return res.status(503).send("Microsoft Entra connection is not configured. <a href='/'>Back</a>.");
  }
  const state = createFabricState({
    login: req.authUser.login,
    returnTo: req.query.returnTo,
  });
  setFabricStateCookie(res, state, req.secure);
  res.redirect(fabricAuthorizeUrl({ state, redirectUri: fabricRedirectUri(req) }));
}));

app.get("/auth/fabric/callback", async (req, res) => {
  try {
    const user = await resolveUser(req);
    if (!user || user.status !== "approved") return res.redirect("/login");
    const stateToken = fabricStateFromRequest(req);
    if (!stateToken || stateToken !== req.query.state) {
      return res.status(400).send("Invalid Microsoft Entra state. <a href='/'>Try again</a>.");
    }
    const state = verifyFabricState(stateToken, user.login);
    if (!state) return res.status(400).send("Microsoft Entra sign-in expired. <a href='/'>Try again</a>.");
    const session = await exchangeFabricCode(req.query.code, fabricRedirectUri(req));
    clearFabricStateCookie(res, req.secure);
    setFabricSession(res, session, user.login, req.secure);
    await logUsage(user.login, "fabric-connect", session.username || session.objectId);
    res.redirect(state.returnTo);
  } catch (error) {
    console.error("Fabric OAuth callback error:", error.message);
    res.status(500).send(`Microsoft Entra connection failed: ${error.message} <a href='/'>Back</a>`);
  }
});

app.get("/api/fabric/status", requireApproved(async (req, res) => {
  const session = getFabricSession(req, req.authUser.login);
  res.setHeader("Cache-Control", "no-store");
  res.json({
    available: Boolean(liveManufacturingReady),
    configured: FABRIC_AUTH_CONFIGURED,
    connected: Boolean(session),
    name: session?.name || null,
    username: session?.username || null,
    expiresOn: session ? new Date(session.expiresOnMs).toISOString() : null,
    connectUrl: "/auth/fabric/start?returnTo=%2F",
  });
}));

app.post("/api/fabric/disconnect", requireApproved(async (req, res) => {
  clearFabricSession(res, req.secure);
  await logUsage(req.authUser.login, "fabric-disconnect");
  res.json({ ok: true });
}));

// Self-service: delete my own account (notifies the admin).
app.post("/api/me/delete", requireApproved(async (req, res) => {
  const u = req.authUser;
  await mutateAccessRegistry(async () => {
    if (effectiveAdmin(u)) {
      const governance = await usersWithGovernance();
      const guard = removalGuard(governance.users, u.login);
      if (!guard.allowed) {
        const error = new Error(guard.reason);
        error.statusCode = 409;
        throw error;
      }
    }
    await deleteUser(u.login);
  });
  await logUsage(u.login, "account-deleted", "self");
  await log("warn", "Account self-deleted", `@${u.login} (${u.email || "no email"})`);
  // Notify the admin, and confirm to the user that their account + data were removed.
  emailAdminAccountDeleted(u, appUrlOf(req), "self").catch((e) => console.error("admin delete email:", e.message));
  emailUserAccountDeleted(u, appUrlOf(req), "self").catch((e) => console.error("user delete email:", e.message));
  clearSession(res, req.secure);
  res.json({ ok: true });
}));

// ---- gated pages ----
app.get("/", async (req, res) => {
  try {
    const u = await resolveUser(req);
    if (!u) return res.redirect("/login");
    if (u.status === "denied") return res.redirect("/denied");
    if (u.status !== "approved" && !effectiveAdmin(u)) return res.redirect("/pending");
    res.sendFile(path.join(__dirname, "public", "index.html"));
  } catch (error) {
    console.error("home route error:", error);
    res.status(503).send("ClientSphere is temporarily unavailable. Please retry shortly.");
  }
});
for (const p of PUBLIC_PAGES) {
  app.get(p, (req, res) => res.sendFile(path.join(__dirname, "public", p.slice(1) + ".html")));
}
app.get("/admin", async (req, res) => {
  try {
    const u = await resolveUser(req);
    if (!u) return res.redirect("/login");
    if (!effectiveAdmin(u)) return res.redirect(u.status === "pending" ? "/pending" : "/");
    res.sendFile(path.join(__dirname, "public", "admin.html"));
  } catch (error) {
    console.error("admin page error:", error);
    res.status(503).send("Administration is temporarily unavailable. Please retry shortly.");
  }
});

// ---- admin APIs ----
app.get("/api/admin/users", requireAdmin(async (req, res) => {
  const governance = await usersWithGovernance();
  const users = governance.users.map((u) => ({
    ...u,
    effectiveAdmin: effectiveAdmin(u),
    soleAdmin: effectiveAdmin(u) && governance.adminCount === 1,
    currentUser: u.login.toLowerCase() === req.authUser.login.toLowerCase(),
    canPromote: u.status === "approved" && !effectiveAdmin(u),
  }));
  res.json({ users, adminCount: governance.adminCount, currentLogin: req.authUser.login });
}));
app.get("/api/admin/usage", requireAdmin(async (req, res) => res.json({ recent: await getUsage(150), stats: await usageStats() })));
app.get("/api/admin/logs", requireAdmin(async (req, res) => res.json({ logs: await getLogs(300) })));

app.post("/api/admin/decide", requireAdmin(async (req, res) => {
  const { login, decision } = req.body || {};
  if (!["approved", "denied", "pending"].includes(decision)) return res.status(400).json({ error: "bad decision" });
  const u = await mutateAccessRegistry(async () => {
    const governance = await usersWithGovernance();
    const target = governance.users.find((user) => user.login.toLowerCase() === String(login).toLowerCase());
    if (!target) {
      const error = new Error("User not found.");
      error.statusCode = 404;
      throw error;
    }
    if (decision !== "approved" && effectiveAdmin(target)) {
      const guard = removalGuard(governance.users, login);
      if (!guard.allowed) {
        const error = new Error(guard.reason);
        error.statusCode = 409;
        throw error;
      }
    }
    return setStatus(login, decision, req.authUser.login);
  });
  await logUsage(req.authUser.login, "decide", `${login} -> ${decision}`);
  await log("info", `Access ${decision}`, `@${login} by @${req.authUser.login}`);
  if (decision === "approved" || decision === "denied") emailUserDecision(u, decision, appUrlOf(req)).catch((e) => console.error("decision email:", e.message));
  res.json({ ok: true, user: u });
}));

app.post("/api/admin/delete", requireAdmin(async (req, res) => {
  const { login } = req.body || {};
  const target = await mutateAccessRegistry(async () => {
    const governance = await usersWithGovernance();
    const guard = removalGuard(governance.users, login);
    if (!guard.allowed) {
      const error = new Error(guard.reason);
      error.statusCode = guard.reason === "User not found." ? 404 : 409;
      throw error;
    }
    const targetUser = guard.target;
    const ok = await deleteUser(login);
    if (!ok) {
      const error = new Error("User not found.");
      error.statusCode = 404;
      throw error;
    }
    return targetUser;
  });
  await log("warn", "Account deleted by admin", `@${login} by @${req.authUser.login}`);
  // Email both the affected user (their access was removed) and the admin mailbox (record).
  if (target) {
    emailUserAccountDeleted(target, appUrlOf(req), "admin").catch((e) => console.error("user delete email:", e.message));
    emailAdminAccountDeleted(target, appUrlOf(req), "admin", req.authUser.login).catch((e) => console.error("admin delete email:", e.message));
  }
  const selfDeleted = login.toLowerCase() === req.authUser.login.toLowerCase();
  if (selfDeleted) clearSession(res, req.secure);
  res.json({ ok: true, selfDeleted });
}));

app.post("/api/admin/set-admin", requireAdmin(async (req, res) => {
  const { login, makeAdmin } = req.body || {};
  const u = await mutateAccessRegistry(async () => {
    const governance = await usersWithGovernance();
    const target = governance.users.find((user) => user.login.toLowerCase() === String(login).toLowerCase());
    if (!target) {
      const error = new Error("User not found.");
      error.statusCode = 404;
      throw error;
    }
    if (makeAdmin && target.status !== "approved") {
      const error = new Error("Approve the user before promoting them to administrator.");
      error.statusCode = 409;
      throw error;
    }
    if (!makeAdmin && effectiveAdmin(target)) {
      const guard = removalGuard(governance.users, login);
      if (!guard.allowed) {
        const error = new Error(guard.reason);
        error.statusCode = 409;
        throw error;
      }
    }
    return setAdmin(login, !!makeAdmin);
  });
  await log("info", makeAdmin ? "Promoted to admin" : "Admin removed", `@${login} by @${req.authUser.login}`);
  const selfDemoted = !makeAdmin && login.toLowerCase() === req.authUser.login.toLowerCase();
  res.json({ ok: true, selfDemoted, user: { ...u, effectiveAdmin: effectiveAdmin(u) } });
}));

// ----- One-click Approve/Deny from the admin's email -----
// IMPORTANT: email clients (Outlook Safe Links, corporate scanners, mobile
// preloaders) issue background GET requests against every link in a message.
// If the GET itself mutated state, BOTH the approve and deny links would fire
// automatically with no human action. So the flow is two-step:
//   GET  /admin/action  -> renders a confirmation page (NO state change)
//   POST /admin/action  -> actually consumes the single-use token + applies it
// Scanners never POST, so the decision only happens on a real button click.
function confirmActionPage(token, decision, login) {
  const word = decision === "approved" ? "approve" : "deny";
  const accent = decision === "approved" ? "#a78bfa" : "#f0a35e";
  const btnBg = decision === "approved"
    ? "linear-gradient(135deg,#a78bfa,#6d28d9)"
    : "linear-gradient(135deg,#f0a35e,#b4541b)";
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>ClientSphere · Confirm</title><link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <style>body{margin:0;height:100vh;display:flex;align-items:center;justify-content:center;background:radial-gradient(900px 600px at 50% -10%,#241a45,#0a0813 60%);font-family:Segoe UI,Arial,sans-serif;color:#ece9f6}
  .c{width:430px;max-width:92vw;background:linear-gradient(180deg,#16111f,#0e0a18);border:1px solid rgba(139,92,246,.38);border-radius:18px;padding:34px;text-align:center;box-shadow:0 24px 70px rgba(0,0,0,.6),0 0 50px -14px rgba(139,92,246,.55);position:relative;overflow:hidden}
  .c::before{content:"";position:absolute;inset:0 0 auto 0;height:3px;background:linear-gradient(90deg,transparent,#a78bfa,#8b5cf6,transparent)}
  h1{font-family:Orbitron,Segoe UI,Arial;letter-spacing:2px;font-size:21px;margin:0 0 8px;color:${accent}}
  p{color:#cfc8e6;font-size:14px;line-height:1.6}
  button{cursor:pointer;border:0;margin-top:14px;background:${btnBg};color:#fff;font-weight:700;font-size:15px;padding:13px 26px;border-radius:11px;font-family:Segoe UI,Arial}
  a{color:#a78bfa;text-decoration:none}</style></head>
  <body><div class="c"><h1>Confirm: ${word} access</h1>
  <p>You're about to <b>${word}</b> ClientSphere access for <b>@${login}</b>.</p>
  <form method="POST" action="/admin/action">
    <input type="hidden" name="token" value="${token}"/>
    <input type="hidden" name="d" value="${decision}"/>
    <button type="submit">Yes, ${word} @${login}</button>
  </form>
  <p style="margin-top:18px"><a href="/admin">Open the admin dashboard instead →</a></p></div></body></html>`;
}

app.get("/admin/action", async (req, res) => {
  const { token, d } = req.query;
  const decision = d === "approved" ? "approved" : d === "denied" ? "denied" : null;
  const fail = (msg) => res.status(400).send(actionPage("Link problem", msg, false));
  if (!decision || !token) return fail("That link is missing a valid decision.");
  // Peek only — never mutate on GET (prevents email-scanner prefetch from acting).
  const info = await peekToken(token);
  if (!info || info.decision !== decision) return fail("This link is invalid. Use the admin dashboard instead.");
  if (info.used) return fail("This link has already been used. Manage access in the admin dashboard.");
  if (info.expired) return fail("This link has expired. Manage access in the admin dashboard.");
  res.send(confirmActionPage(String(token), decision, info.login));
});

// The decision is applied ONLY here, on an explicit human POST (button click).
app.post("/admin/action", async (req, res) => {
  const token = req.body?.token || req.query?.token;
  const d = req.body?.d || req.query?.d;
  const decision = d === "approved" ? "approved" : d === "denied" ? "denied" : null;
  const fail = (msg) => res.status(400).send(actionPage("Link problem", msg, false));
  if (!decision) return fail("That request is missing a valid decision.");
  if (accessMutationsLocked()) return res.status(503).send(actionPage("Deployment in progress", "Access decisions are briefly locked. Try this link again in a few minutes.", false));
  // Consume the single-use token; it must match the decision and be unused.
  const consumed = await consumeToken(token, decision);
  if (!consumed) return fail("This link is invalid, already used, or expired. Use the admin dashboard instead.");
  const login = consumed.login;
  let u;
  try {
    u = await mutateAccessRegistry(async () => {
      const target = await getUser(login);
      if (!target) {
        const error = new Error("That user no longer exists.");
        error.statusCode = 404;
        throw error;
      }
      if (effectiveAdmin(target)) {
        const governance = await usersWithGovernance();
        const guard = removalGuard(governance.users, login);
        if (!guard.allowed) {
          const error = new Error(guard.reason);
          error.statusCode = 409;
          throw error;
        }
      }
      await setStatus(login, decision, "email-link");
      return target;
    });
  } catch (error) {
    return fail(error.message);
  }
  await logUsage("email-link", "decide", `${login} -> ${decision}`);
  await log("info", `Access ${decision} (email link)`, `@${login}`);
  emailUserDecision(u, decision, appUrlOf(req)).catch((e) => console.error("decision email:", e.message));
  const word = decision === "approved" ? "approved" : "denied";
  res.send(actionPage(`Access ${word}`, `<b>@${login}</b> has been <b>${word}</b>${u.email ? ` and notified at ${u.email}` : ""}.`, true));
});

// ---- Avatar / voice visibility (built-in voices + custom avatars) ----
// Visibility is one flat map { [id]: boolean } in settings; default = visible.
// IDs are built-in voice ids (e.g. "en-GB-SoniaNeural") and custom avatar ids
// An empty gender list would break the picker, so the
// end-user views fall back to "all visible for that gender" if everything is off.
function isVisible(vis, id) { return vis[id] !== false; }

async function customAvatarsView(forAdmin = false) {
  if (!CUSTOM_AVATARS.length) return [];
  const vis = (await getSetting(SETTINGS_AVATAR_VIS, {})) || {};
  const all = CUSTOM_AVATARS.map((a) => ({ ...a, hidden: !isVisible(vis, a.id) }));
  if (forAdmin) return all;
  const visible = all.filter((a) => !a.hidden);
  return visible; // may be empty; that's fine — built-in voices still exist
}

// End-user voices filtered by visibility, with empty-guard per gender.
async function voicesView() {
  const vis = (await getSetting(SETTINGS_AVATAR_VIS, {})) || {};
  const out = {};
  for (const g of ["female", "male"]) {
    const filtered = (VOICES[g] || []).filter((v) => isVisible(vis, v.id));
    out[g] = filtered.length ? filtered : (VOICES[g] || []); // never leave a gender empty
  }
  return out;
}

// Admin view: built-in voices + custom avatars grouped by gender, with hidden flags.
async function avatarAdminView() {
  const vis = (await getSetting(SETTINGS_AVATAR_VIS, {})) || {};
  const group = (g) => {
    const builtins = (VOICES[g] || []).map((v) => ({
      id: v.id, label: v.label, kind: "builtin", gender: g, hidden: !isVisible(vis, v.id),
    }));
    const customs = CUSTOM_AVATARS.filter((a) => a.gender === g).map((a) => ({
      id: a.id, label: a.label, kind: "custom", gender: g, character: a.character,
      photoModel: a.photoModel, hidden: !isVisible(vis, a.id),
    }));
    return [...customs, ...builtins];
  };
  return { female: group("female"), male: group("male") };
}
// All valid visibility ids (built-in voice ids + custom avatar ids).
function allVisibilityIds() {
  return new Set([
    ...Object.values(VOICES).flat().map((v) => v.id),
    ...CUSTOM_AVATARS.map((a) => a.id),
  ]);
}

app.get("/api/config", async (req, res) => {
  const customList = await customAvatarsView(false);
  const defaultCustomer = customers[0];
  res.json({
    agentName: "ClientSphere",
    tagline: "Public intelligence for every customer conversation",
    speechRegion: SPEECH_REGION,
    voices: await voicesView(),
    backgrounds: BACKGROUNDS,
    customers: customers.map(customerPublicView),
    defaultCustomerId: defaultCustomer.id,
    resources: resourcesFor(defaultCustomer),
    // Back-compat: `custom` is the first visible custom avatar (older client);
    // `customAvatars` is the full visible list (new client).
    custom: customList[0] || null,
    customAvatars: customList,
    avatarGreen: AVATAR_GREEN,
  });
});

app.get("/api/customers/:customerId", requireApproved(async (req, res) => {
  const customer = getCustomer(req.params.customerId);
  if (!customer) return res.status(404).json({ error: "Unknown customer" });
  res.json({ customer: customerPublicView(customer), resources: resourcesFor(customer) });
}));

app.get("/healthz", (req, res) => {
  const agentModesConfigured = customers.reduce(
    (total, customer) => total + 1 + buildCustomerUseCases(customer).length,
    0,
  );
  res.json({
    status: "ok",
    app: "ClientSphere",
    customers: customers.length,
    agentsConfigured: Object.keys(agentMetadata.customers).length,
    agentModesConfigured,
    liveFabricAgentsConfigured,
    liveOrchestratorConfigured,
    fabricAuthConfigured: FABRIC_AUTH_CONFIGURED,
  });
});

// ---- admin: list all avatars/voices (incl. hidden) + toggle visibility ----
app.get("/api/admin/avatars", requireAdmin(async (req, res) => {
  res.json(await avatarAdminView());
}));
app.post("/api/admin/avatars/visibility", requireAdmin(async (req, res) => {
  const { id, visible } = req.body || {};
  if (!id || !allVisibilityIds().has(id)) return res.status(404).json({ error: "unknown avatar/voice" });
  const vis = (await getSetting(SETTINGS_AVATAR_VIS, {})) || {};
  vis[id] = !!visible;
  await setSetting(SETTINGS_AVATAR_VIS, vis);
  await log("info", `Voice/avatar ${visible ? "shown" : "hidden"}`, `${id} by @${req.authUser.login}`);
  res.json({ ok: true, ...(await avatarAdminView()) });
}));

app.get("/api/speech-token", requireApproved(async (req, res) => {
  try {
    const t = await getSpeechToken();
    res.json({ token: t.value, region: SPEECH_REGION, expiresOn: t.expiresOnMs });
  } catch (err) {
    console.error("speech-token error:", err.message);
    res.status(500).json({ error: "Could not mint speech token", detail: err.message });
  }
}));

// Server-side relay (ICE) token for the real-time avatar WebRTC peer connection.
app.get("/api/relay-token", requireApproved(async (req, res) => {
  try {
    const t = await getSpeechToken();
    const url = `https://${SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/avatar/relay/token/v1`;
    const r = await fetch(url, { headers: { Authorization: `Bearer ${t.value}` } });
    if (!r.ok) {
      const detail = await r.text();
      return res.status(502).json({ error: `Relay token ${r.status}`, detail });
    }
    res.json(await r.json());
  } catch (err) {
    console.error("relay-token error:", err.message);
    res.status(500).json({ error: "Could not get relay token", detail: err.message });
  }
}));

  // Strip file_search citation markers (【4:2†source】) cleanly by pattern only.
// Response text and both file/web citations are normalized after this call.
async function runAgent(previousResponseId, agentName, customer, input, options = {}) {
  const responseClient = options.openAIClient || openAI;
  const agentReference = { name: agentName, type: "agent_reference" };
  const request = { input };
  if (options.toolChoice) request.tool_choice = options.toolChoice;
  if (previousResponseId) request.previous_response_id = previousResponseId;
  let response = await responseClient.responses.create(
    request,
    { body: { agent_reference: agentReference } },
  );
  for (let turn = 0; turn < 6; turn++) {
    const calls = (response.output || []).filter((item) => item.type === "function_call");
    if (!calls.length) return response;
    const outputs = [];
    for (const call of calls) {
      let output = `Error: unknown tool '${call.name}'.`;
      if (call.name === FETCH_DOC_TOOL.name) {
        output = await fetchOfficialDoc(call.arguments, customer);
      }
      outputs.push({
        type: "function_call_output",
        call_id: call.call_id,
        output,
      });
    }
    response = await responseClient.responses.create(
      { input: outputs, previous_response_id: response.id },
      { body: { agent_reference: agentReference } },
    );
  }
  throw new Error("Agent exceeded the live-source tool-call limit.");
}

app.post("/api/chat", requireApproved(async (req, res) => {
  const {
    message, threadId, customerId, agentMode = "general", responseMode = "brief",
    attachments,
  } = req.body || {};
  if (!message || !message.trim()) return res.status(400).json({ error: "message required" });
  if (!["brief", "structured"].includes(responseMode)) return res.status(400).json({ error: "valid responseMode required" });
  const customer = getCustomer(customerId);
  if (!customer) return res.status(400).json({ error: "valid customerId required" });
  const customerMetadata = agentMetadata.customers[customer.id];
  const useCase = agentMode === "general" ? null : getCustomerUseCase(customer, agentMode);
  if (agentMode !== "general" && !useCase) return res.status(400).json({ error: "valid agentMode required" });
  const isLiveFabric = agentMode === MANUFACTURING_LIVE_MODE_ID;
  if (isLiveFabric && attachments?.length) {
    return res.status(400).json({ error: "The live Fabric mode accepts text questions only." });
  }
  const customerAgent = isLiveFabric && liveManufacturingReady
    ? agentMetadata.liveManufacturing?.orchestrator
    : agentMode === "general"
      ? (customerMetadata.general || customerMetadata)
      : customerMetadata.useCases?.[agentMode];
  if (!customerAgent?.agentName) return res.status(503).json({ error: "Selected agent is not provisioned yet." });
  try {
    const fabricSession = isLiveFabric ? getFabricSession(req, req.authUser.login) : null;
    if (isLiveFabric && !fabricSession) {
      return res.status(401).json({
        error: "Connect Microsoft Entra to query the live Fabric data.",
        code: "FABRIC_AUTH_REQUIRED",
        connectUrl: "/auth/fabric/start?returnTo=%2F",
      });
    }
    const customerContext = isLiveFabric
      ? `\n[[CLIENTSPHERE_CONTEXT: The active customer is ${customer.name}. The Fabric data belongs to the Celyn Components demo plant, not ${customer.name}.]]`
      : "";
    const controlledMessage = `[[RESPONSE_MODE:${responseMode.toUpperCase()}]]${customerContext}\n${message.trim()}`;
    const input = buildAgentInput(controlledMessage, attachments);
    const agentContext = isLiveFabric ? "orchestrator" : "";
    let previousResponseId = null;
    if (threadId) {
      previousResponseId = verifyThreadToken(
        threadId,
        { customerId: customer.id, agentMode, agentContext, userLogin: req.authUser.login },
        THREAD_TOKEN_SECRET,
      );
      if (!previousResponseId) {
        return res.status(409).json({ error: "Conversation belongs to a different customer. Start a new conversation." });
      }
    }
    let delegatedOpenAI = null;
    if (isLiveFabric) {
      const delegatedProject = new AIProjectClient(
        ENDPOINT,
        new DelegatedAccessTokenCredential(fabricSession.accessToken, fabricSession.expiresOnMs),
      );
      delegatedOpenAI = delegatedProject.getOpenAIClient();
    }
    const response = await runAgent(
      previousResponseId,
      customerAgent.agentName,
      customer,
      input,
      {
        openAIClient: delegatedOpenAI,
        toolChoice: isLiveFabric ? "required" : undefined,
      },
    );
    if (response.status !== "completed") {
      return res.status(502).json({
        error: `Response ${response.status}`,
        detail: response.error?.message || response.incomplete_details?.reason,
      });
    }
    const { text: reply, citations } = renderAgentResponse(response, customerMetadata.fileMap || {});
    // Capture usage (don't log raw system directives verbatim — just the kind).
    const kind = /^\[\[(\w+)/.exec(message)?.[1] || (message.startsWith("[SYSTEM") ? "greeting" : "chat");
    logUsage(req.authUser.login, "chat", `${customer.id}:${agentMode}:${agentContext || kind}`);
    res.json({
      threadId: createThreadToken(
        { customerId: customer.id, agentMode, agentContext, threadId: response.id, userLogin: req.authUser.login },
        THREAD_TOKEN_SECRET,
      ),
      customerId: customer.id,
      agentMode,
      agentRole: isLiveFabric ? "orchestrator" : null,
      responseMode,
      reply,
      citations,
    });
  } catch (err) {
    console.error("chat error:", err);
    res.status(err.statusCode || 500).json({ error: err.statusCode ? err.message : "Chat failed", detail: err.statusCode ? undefined : err.message });
  }
}));

await initStore();
app.listen(PORT, () => {
  console.log(`\nClientSphere running at http://localhost:${PORT}`);
  console.log(`   Customer agents: ${customers.length}`);
  console.log(`   Speech region: ${SPEECH_REGION} (keyless AAD)`);
  console.log(`   Auth: ${DEV_MODE ? "DEV MODE (no OAuth App) — simulated GitHub login" : "GitHub OAuth"} | admins: ${ADMIN_LOGINS.join(", ")}`);
  console.log(`   Email: ${EMAIL_ENABLED ? "ACS enabled" : "disabled (no ACS config)"}`);
  console.log(`   Storage mode: ${STORAGE_MODE}\n`);
});
