// server.mjs — Hubble backend. Serves the SPA, brokers keyless Azure Speech
// auth tokens for the browser avatar, and proxies chat to the Foundry agent.
// Auth everywhere: DefaultAzureCredential (az login locally / managed identity in cloud).
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { AIProjectClient } from "@azure/ai-projects";
import { DefaultAzureCredential } from "@azure/identity";
import { FETCH_DOC_TOOL, fetchOfficialDoc } from "./webgrounding.mjs";
import {
  DEV_MODE, ADMIN_LOGINS, isAdmin, sessionLogin, setSession, clearSession,
  makeState, setStateCookie, checkState, authorizeUrl, exchangeCode, fetchGitHubUser,
} from "./auth.mjs";
import {
  getUser, upsertUser, setStatus, listUsers, logUsage, getUsage, usageStats,
} from "./store.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const ENDPOINT = process.env.PROJECT_ENDPOINT;
const AGENT_ID = process.env.AGENT_ID;
const SPEECH_REGION = process.env.SPEECH_REGION;
const SPEECH_STS_ENDPOINT = process.env.SPEECH_STS_ENDPOINT;

if (!ENDPOINT || !AGENT_ID) {
  console.error("Missing PROJECT_ENDPOINT or AGENT_ID. Run `npm run setup` first.");
  process.exit(1);
}

const credential = new DefaultAzureCredential();
const project = new AIProjectClient(ENDPOINT, credential);
const agents = project.agents;

// Resolve uploaded-file ids -> friendly source names for citations
let fileMap = {};
try {
  fileMap = JSON.parse(fs.readFileSync(path.join(__dirname, "agent-meta.json"), "utf8")).fileMap || {};
} catch { /* optional */ }
const prettySource = (name) =>
  (name || "knowledge base")
    .replace(/^\d+-/, "")
    .replace(/\.md$/, "")
    .replace(/-/g, " ");

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

// Avatar is rendered on a green backdrop and chroma-keyed out in the browser,
// so any of these scene images can sit behind Hubble. Served locally from
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

// Key GitHub (and Microsoft) resources surfaced in the hideaway drawer.
const RESOURCES = [
  { group: "Products & pricing", links: [
    { icon: "💷", title: "GitHub Pricing", sub: "Plans & list prices", url: "https://github.com/pricing" },
    { icon: "🤖", title: "GitHub Copilot", sub: "Features & plans", url: "https://github.com/features/copilot" },
    { icon: "🛡️", title: "Advanced Security", sub: "Secret Protection & Code Security", url: "https://github.com/security/advanced-security" },
    { icon: "🏢", title: "GitHub Enterprise", sub: "Cloud & Server", url: "https://github.com/enterprise" },
  ]},
  { group: "Documentation", links: [
    { icon: "📚", title: "GitHub Docs", sub: "docs.github.com", url: "https://docs.github.com" },
    { icon: "📘", title: "Copilot Docs", sub: "Setup, plans & billing", url: "https://docs.github.com/copilot" },
    { icon: "💳", title: "Billing & Licensing", sub: "How billing works", url: "https://docs.github.com/billing" },
    { icon: "🎓", title: "Microsoft Learn — GitHub", sub: "learn.microsoft.com", url: "https://learn.microsoft.com/training/github/" },
  ]},
  { group: "Sell & stay current", links: [
    { icon: "🏆", title: "Customer Stories", sub: "Proof points", url: "https://github.com/customer-stories" },
    { icon: "🔒", title: "GitHub Trust Center", sub: "Security & compliance", url: "https://github.com/trust-center" },
    { icon: "🗺️", title: "Public Roadmap", sub: "What's coming", url: "https://github.com/orgs/github/projects/4247" },
    { icon: "📰", title: "Changelog", sub: "Latest releases", url: "https://github.blog/changelog/" },
  ]},
];

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

// ---- Custom avatar + voice (your likeness), enabled via .env once trained ----
const customAvatarChar = (process.env.CUSTOM_AVATAR_CHARACTER || "").trim();
const customVoiceName = (process.env.CUSTOM_VOICE_NAME || "").trim();
const CUSTOM = (process.env.CUSTOM_AVATAR_ENABLED === "true" && (customAvatarChar || customVoiceName))
  ? {
      enabled: true,
      label: process.env.CUSTOM_AVATAR_LABEL || "You (custom)",
      gender: (process.env.CUSTOM_AVATAR_GENDER || "male").toLowerCase() === "female" ? "female" : "male",
      character: customAvatarChar,                       // custom video/photo avatar model name
      style: (process.env.CUSTOM_AVATAR_STYLE || "").trim(),
      photoModel: (process.env.CUSTOM_AVATAR_PHOTO_MODEL || "").trim(), // e.g. "vasa-1" for photo avatar
      voice: customVoiceName,                            // your Custom Neural Voice deployment name
    }
  : null;

const app = express();
app.use(express.json({ limit: "1mb" }));

// ---------------- Authentication & access control ----------------
const PUBLIC_PAGES = new Set(["/login", "/pending", "/denied"]);
function baseUrl(req) {
  return `${req.protocol}://${req.get("host")}`;
}
function redirectUri(req) {
  return `${baseUrl(req)}/auth/callback`;
}
// Resolve the signed-in user (full record) onto req.authUser.
function resolveUser(req) {
  const login = sessionLogin(req);
  if (!login) return null;
  // Admins are always approved, even before any decision is recorded.
  let user = getUser(login);
  if (!user && isAdmin(login)) user = upsertUser({ login, name: login }, "approved");
  if (user && isAdmin(login) && user.status !== "approved") user.status = "approved";
  return user;
}
function requireApproved(req, res, next) {
  const u = resolveUser(req);
  if (!u) return res.status(401).json({ error: "Not signed in" });
  if (u.status !== "approved") return res.status(403).json({ error: "Access not approved", status: u.status });
  req.authUser = u;
  next();
}
function requireAdmin(req, res, next) {
  const u = resolveUser(req);
  if (!u || !isAdmin(u.login)) return res.status(403).json({ error: "Admin only" });
  req.authUser = u;
  next();
}

// Static assets (css/js/images/backgrounds) are open; the HTML entry + APIs are gated.
app.use(express.static(path.join(__dirname, "public"), { index: false }));

// ---- auth routes ----
app.get("/auth/login", (req, res) => {
  if (DEV_MODE) return res.redirect("/login?dev=1");
  const state = makeState();
  setStateCookie(res, state);
  res.redirect(authorizeUrl(state, redirectUri(req)));
});

app.get("/auth/callback", async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!checkState(req, state)) return res.status(400).send("Invalid OAuth state. <a href='/login'>Try again</a>.");
    const token = await exchangeCode(code, redirectUri(req));
    const gh = await fetchGitHubUser(token);
    const user = upsertUser(gh, isAdmin(gh.login) ? "approved" : "pending");
    setSession(res, user.login);
    logUsage(user.login, "login");
    res.redirect("/");
  } catch (err) {
    console.error("oauth callback error:", err.message);
    res.status(500).send("Sign-in failed: " + err.message + " <a href='/login'>Back</a>");
  }
});

// Dev-mode sign-in (only when no real OAuth App is configured).
app.post("/auth/dev", (req, res) => {
  if (!DEV_MODE) return res.status(404).json({ error: "Dev login disabled" });
  const login = (req.body?.login || "").trim();
  if (!/^[a-zA-Z0-9-]{1,39}$/.test(login)) return res.status(400).json({ error: "Enter a valid GitHub username" });
  const user = upsertUser({ login, name: login }, isAdmin(login) ? "approved" : "pending");
  setSession(res, user.login);
  logUsage(user.login, "login", "dev");
  res.json({ ok: true, status: user.status });
});

app.get("/auth/logout", (req, res) => { clearSession(res); res.redirect("/login"); });

app.get("/api/me", (req, res) => {
  const u = resolveUser(req);
  if (!u) return res.status(401).json({ error: "Not signed in" });
  res.json({ login: u.login, name: u.name, avatar: u.avatar, status: u.status, isAdmin: isAdmin(u.login) });
});

// ---- gated pages ----
app.get("/", (req, res) => {
  const u = resolveUser(req);
  if (!u) return res.redirect("/login");
  if (u.status === "denied") return res.redirect("/denied");
  if (u.status !== "approved") return res.redirect("/pending");
  res.sendFile(path.join(__dirname, "public", "index.html"));
});
for (const p of PUBLIC_PAGES) {
  app.get(p, (req, res) => res.sendFile(path.join(__dirname, "public", p.slice(1) + ".html")));
}
app.get("/admin", (req, res) => {
  const u = resolveUser(req);
  if (!u || !isAdmin(u.login)) return res.redirect("/login");
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

// ---- admin APIs ----
app.get("/api/admin/users", requireAdmin, (req, res) => res.json({ users: listUsers(), admins: ADMIN_LOGINS }));
app.get("/api/admin/usage", requireAdmin, (req, res) => res.json({ recent: getUsage(150), stats: usageStats() }));
app.post("/api/admin/decide", requireAdmin, (req, res) => {
  const { login, decision } = req.body || {};
  if (!["approved", "denied", "pending"].includes(decision)) return res.status(400).json({ error: "bad decision" });
  if (isAdmin(login)) return res.status(400).json({ error: "Cannot change an admin's access" });
  const u = setStatus(login, decision, req.authUser.login);
  if (!u) return res.status(404).json({ error: "user not found" });
  logUsage(req.authUser.login, "decide", `${login} -> ${decision}`);
  res.json({ ok: true, user: u });
});

app.get("/api/config", (req, res) => {
  res.json({
    agentName: "Hubble",
    tagline: "Your AI GitHub sales coach",
    speechRegion: SPEECH_REGION,
    voices: VOICES,
    backgrounds: BACKGROUNDS,
    resources: RESOURCES,
    custom: CUSTOM,
    avatarGreen: AVATAR_GREEN,
  });
});

app.get("/api/speech-token", requireApproved, async (req, res) => {
  try {
    const t = await getSpeechToken();
    res.json({ token: t.value, region: SPEECH_REGION, expiresOn: t.expiresOnMs });
  } catch (err) {
    console.error("speech-token error:", err.message);
    res.status(500).json({ error: "Could not mint speech token", detail: err.message });
  }
});

// Server-side relay (ICE) token for the real-time avatar WebRTC peer connection.
app.get("/api/relay-token", requireApproved, async (req, res) => {
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
});

// Extract assistant text + citations from the latest assistant message
function renderAssistantMessage(msg) {
  let text = "";
  const citations = [];
  const seen = new Set();
  for (const part of msg.content || []) {
    if (part.type !== "text" || !part.text) continue;
    // Collect unique sources for the citation chips
    for (const ann of part.text.annotations || []) {
      const fileId = ann.fileCitation?.fileId || ann.filePath?.fileId;
      const src = prettySource(fileMap[fileId]);
      if (!seen.has(src)) { seen.add(src); citations.push(src); }
    }
    text += part.text.value || "";
  }
  // Strip file_search citation markers (【4:2†source】) cleanly by pattern only.
  text = text
    .replace(/\u3010[^\u3011]*\u3011/g, "") // full 【...】 tokens
    .replace(/[\u3010\u3011]/g, "")          // any orphan brackets
    .replace(/\[\d+\]/g, "")
    .replace(/ {2,}/g, " ")
    .replace(/ +([.,;:])/g, "$1")
    .replace(/\n{3,}/g, "\n\n");
  return { text: text.trim(), citations };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Run the agent and resolve any function tool calls (live web grounding) until
// the run reaches a terminal state.
async function runAgent(tid) {
  let run = await agents.runs.create(tid, AGENT_ID);
  for (let i = 0; i < 60; i++) {
    if (["queued", "in_progress", "cancelling"].includes(run.status)) {
      await sleep(800);
      run = await agents.runs.get(tid, run.id);
      continue;
    }
    if (run.status === "requires_action") {
      const calls = run.requiredAction?.submitToolOutputs?.toolCalls || [];
      const outputs = [];
      for (const c of calls) {
        const fn = c.function || c.functionDetails;
        let output = `Error: unknown tool '${fn?.name}'.`;
        if (fn?.name === FETCH_DOC_TOOL.name) {
          output = await fetchOfficialDoc(fn.arguments);
        }
        outputs.push({ toolCallId: c.id, output });
      }
      run = await agents.runs.submitToolOutputs(tid, run.id, outputs);
      continue;
    }
    break; // completed / failed / expired / cancelled
  }
  return run;
}

app.post("/api/chat", requireApproved, async (req, res) => {
  const { message, threadId } = req.body || {};
  if (!message || !message.trim()) return res.status(400).json({ error: "message required" });
  try {
    const tid = threadId || (await agents.threads.create()).id;
    await agents.messages.create(tid, "user", message);
    const run = await runAgent(tid);
    if (run.status !== "completed") {
      return res.status(502).json({ error: `Run ${run.status}`, detail: run.lastError?.message || run.lastError?.code });
    }
    // newest assistant message
    const list = agents.messages.list(tid, { order: "desc", limit: 10 });
    let reply = "", citations = [];
    for await (const m of list) {
      if (m.role === "assistant") { ({ text: reply, citations } = renderAssistantMessage(m)); break; }
    }
    // Capture usage (don't log raw system directives verbatim — just the kind).
    const kind = /^\[\[(\w+)/.exec(message)?.[1] || (message.startsWith("[SYSTEM") ? "greeting" : "chat");
    logUsage(req.authUser.login, "chat", kind);
    res.json({ threadId: tid, reply, citations });
  } catch (err) {
    console.error("chat error:", err);
    res.status(500).json({ error: "Chat failed", detail: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n🛰  Hubble running at http://localhost:${PORT}`);
  console.log(`   Agent: ${AGENT_ID}`);
  console.log(`   Speech region: ${SPEECH_REGION} (keyless AAD)`);
  console.log(`   Auth: ${DEV_MODE ? "DEV MODE (no OAuth App) — simulated GitHub login" : "GitHub OAuth"} | admins: ${ADMIN_LOGINS.join(", ")}\n`);
});
