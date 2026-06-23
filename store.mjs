// store.mjs — durable data layer on Azure Table Storage (cheap, serverless).
// Falls back to a local JSON file when no storage connection string is set, so
// local dev still works. All functions are async.
//
// Tables:
//   HubbleUsers   (PK="user", RK=login)         — access requests / profiles
//   HubbleUsage   (PK=yyyymmdd, RK=ts-rand)      — usage events
//   HubbleLogs    (PK=yyyymmdd, RK=ts-rand)      — system logs
//   HubbleTokens  (PK="tok", RK=tokenId)         — single-use email-action tokens
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { TableClient, TableServiceClient } from "@azure/data-tables";
import { DefaultAzureCredential } from "@azure/identity";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Keyless: use the storage account name + AAD (managed identity / az login).
const ACCOUNT = process.env.AZURE_STORAGE_ACCOUNT || "";
const TABLE_ENDPOINT = ACCOUNT ? `https://${ACCOUNT}.table.core.windows.net` : "";
export const STORAGE_MODE = ACCOUNT ? "table" : "file";

const nowIso = () => new Date().toISOString();
const dayKey = (iso) => (iso || nowIso()).slice(0, 10).replace(/-/g, "");
const rowKey = () => `${Date.now().toString().padStart(14, "0")}-${crypto.randomBytes(4).toString("hex")}`;

// ----------------------------------------------------------------------------
// Table backend
// ----------------------------------------------------------------------------
let tables = null;
async function initTables() {
  const cred = new DefaultAzureCredential();
  const svc = new TableServiceClient(TABLE_ENDPOINT, cred);
  for (const t of ["HubbleUsers", "HubbleUsage", "HubbleLogs", "HubbleTokens", "HubbleSettings"]) {
    try { await svc.createTable(t); } catch { /* exists */ }
  }
  tables = {
    users: new TableClient(TABLE_ENDPOINT, "HubbleUsers", cred),
    usage: new TableClient(TABLE_ENDPOINT, "HubbleUsage", cred),
    logs: new TableClient(TABLE_ENDPOINT, "HubbleLogs", cred),
    tokens: new TableClient(TABLE_ENDPOINT, "HubbleTokens", cred),
    settings: new TableClient(TABLE_ENDPOINT, "HubbleSettings", cred),
  };
}

// ----------------------------------------------------------------------------
// File backend (local dev fallback)
// ----------------------------------------------------------------------------
const DATA_DIR = path.join(__dirname, "data");
const FILE = path.join(DATA_DIR, "store.json");
let mem = { users: {}, usage: [], logs: [], tokens: {}, settings: {} };
function fileLoad() { try { mem = JSON.parse(fs.readFileSync(FILE, "utf8")); } catch { /* fresh */ } mem.logs = mem.logs || []; mem.tokens = mem.tokens || {}; mem.settings = mem.settings || {}; }
function fileSave() { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(mem, null, 2)); }

export async function initStore() {
  if (STORAGE_MODE === "table") { await initTables(); } else { fileLoad(); }
  console.log(`   Storage: ${STORAGE_MODE === "table" ? "Azure Table Storage" : "local JSON file"}`);
}

// ---- user (de)serialisation for Tables ----
const USER_FIELDS = ["name", "avatar", "email", "bio", "company", "location", "blog",
  "followers", "publicRepos", "htmlUrl", "githubCreatedAt", "status", "isAdmin",
  "requestedAt", "lastLoginAt", "decidedAt", "decidedBy"];
function entToUser(e) {
  const u = { login: e.loginDisplay || e.rowKey };
  for (const f of USER_FIELDS) {
    if (e[f] !== undefined && e[f] !== null) u[f] = e[f];
    else u[f] = f === "isAdmin" ? false : (f === "followers" || f === "publicRepos" ? 0 : null);
  }
  return u;
}
function userToEnt(u) {
  const e = { partitionKey: "user", rowKey: u.login.toLowerCase(), loginDisplay: u.login };
  for (const f of USER_FIELDS) if (u[f] !== undefined && u[f] !== null) e[f] = u[f];
  return e;
}

// ----------------------------------------------------------------------------
// Users
// ----------------------------------------------------------------------------
export async function getUser(login) {
  if (!login) return null;
  const key = login.toLowerCase();
  if (STORAGE_MODE === "table") {
    try { return entToUser(await tables.users.getEntity("user", key)); }
    catch { return null; }
  }
  return mem.users[key] || null;
}

export async function upsertUser(profile, defaultStatus = "pending") {
  const existing = await getUser(profile.login);
  const extra = {
    email: profile.email ?? (existing?.email ?? null),
    bio: profile.bio ?? (existing?.bio ?? ""),
    company: profile.company ?? (existing?.company ?? ""),
    location: profile.location ?? (existing?.location ?? ""),
    blog: profile.blog ?? (existing?.blog ?? ""),
    followers: profile.followers ?? (existing?.followers ?? 0),
    publicRepos: profile.publicRepos ?? (existing?.publicRepos ?? 0),
    htmlUrl: profile.htmlUrl ?? (existing?.htmlUrl ?? `https://github.com/${profile.login}`),
    githubCreatedAt: profile.githubCreatedAt ?? (existing?.githubCreatedAt ?? null),
  };
  let user;
  if (existing) {
    user = { ...existing, ...extra, name: profile.name ?? existing.name, avatar: profile.avatar ?? existing.avatar, lastLoginAt: nowIso() };
  } else {
    user = {
      login: profile.login, name: profile.name || profile.login, avatar: profile.avatar || "",
      ...extra, status: defaultStatus, isAdmin: false,
      requestedAt: nowIso(), lastLoginAt: nowIso(), decidedAt: null, decidedBy: null,
    };
  }
  await saveUser(user);
  return user;
}

async function saveUser(user) {
  if (STORAGE_MODE === "table") { await tables.users.upsertEntity(userToEnt(user), "Replace"); }
  else { mem.users[user.login.toLowerCase()] = user; fileSave(); }
}

export async function setStatus(login, status, decidedBy) {
  const u = await getUser(login);
  if (!u) return null;
  u.status = status; u.decidedAt = nowIso(); u.decidedBy = decidedBy || null;
  await saveUser(u);
  return u;
}

export async function setAdmin(login, makeAdmin) {
  const u = await getUser(login);
  if (!u) return null;
  u.isAdmin = !!makeAdmin;
  if (makeAdmin && u.status !== "approved") { u.status = "approved"; u.decidedAt = nowIso(); }
  await saveUser(u);
  return u;
}

export async function deleteUser(login) {
  const key = login.toLowerCase();
  if (STORAGE_MODE === "table") { try { await tables.users.deleteEntity("user", key); } catch { return false; } return true; }
  if (!mem.users[key]) return false;
  delete mem.users[key]; fileSave(); return true;
}

export async function listUsers() {
  let users = [];
  if (STORAGE_MODE === "table") { for await (const e of tables.users.listEntities()) users.push(entToUser(e)); }
  else { users = Object.values(mem.users); }
  return users.sort((a, b) => (b.requestedAt || "").localeCompare(a.requestedAt || ""));
}

// ----------------------------------------------------------------------------
// Usage + logs
// ----------------------------------------------------------------------------
export async function logUsage(login, action, detail) {
  const ts = nowIso();
  if (STORAGE_MODE === "table") {
    try { await tables.usage.createEntity({ partitionKey: dayKey(ts), rowKey: rowKey(), login, action, detail: detail || "", ts }); } catch { /* ignore */ }
  } else { mem.usage.push({ login, action, detail: detail || null, ts }); if (mem.usage.length > 5000) mem.usage = mem.usage.slice(-5000); fileSave(); }
}

export async function getUsage(limit = 200) {
  let events = [];
  if (STORAGE_MODE === "table") { for await (const e of tables.usage.listEntities()) events.push({ login: e.login, action: e.action, detail: e.detail, ts: e.ts }); }
  else { events = mem.usage.slice(); }
  return events.sort((a, b) => (b.ts || "").localeCompare(a.ts || "")).slice(0, limit);
}

export async function usageStats() {
  const events = await getUsage(5000);
  const perUser = {};
  for (const e of events) {
    perUser[e.login] = perUser[e.login] || { login: e.login, total: 0, chats: 0, lastActive: null };
    perUser[e.login].total++;
    if (e.action === "chat") perUser[e.login].chats++;
    if (!perUser[e.login].lastActive || e.ts > perUser[e.login].lastActive) perUser[e.login].lastActive = e.ts;
  }
  return Object.values(perUser).sort((a, b) => b.total - a.total);
}

// System logs (separate from usage; richer detail + level)
export async function log(level, message, detail) {
  const ts = nowIso();
  const entry = { level, message, detail: detail || "", ts };
  if (STORAGE_MODE === "table") {
    try { await tables.logs.createEntity({ partitionKey: dayKey(ts), rowKey: rowKey(), ...entry }); } catch { /* ignore */ }
  } else { mem.logs.push(entry); if (mem.logs.length > 5000) mem.logs = mem.logs.slice(-5000); fileSave(); }
}
export async function getLogs(limit = 300) {
  let logs = [];
  if (STORAGE_MODE === "table") { for await (const e of tables.logs.listEntities()) logs.push({ level: e.level, message: e.message, detail: e.detail, ts: e.ts }); }
  else { logs = mem.logs.slice(); }
  return logs.sort((a, b) => (b.ts || "").localeCompare(a.ts || "")).slice(0, limit);
}

// ----------------------------------------------------------------------------
// Single-use action tokens (email Approve/Deny). The email link carries the
// token id; the server verifies the HMAC signature AND that the token exists,
// is unused, and matches the target login + decision.
// ----------------------------------------------------------------------------
export async function createToken(login, decision) {
  const id = crypto.randomBytes(24).toString("base64url");
  const exp = Math.floor(Date.now() / 1000) + 14 * 24 * 60 * 60;
  const row = { login: login.toLowerCase(), decision, used: false, exp, createdAt: nowIso() };
  if (STORAGE_MODE === "table") { await tables.tokens.upsertEntity({ partitionKey: "tok", rowKey: id, ...row }, "Replace"); }
  else { mem.tokens[id] = row; fileSave(); }
  return id;
}

// Atomically consume: returns {login,decision} once, then null forever.
export async function consumeToken(id, expectedDecision) {
  if (!id) return null;
  if (STORAGE_MODE === "table") {
    let e;
    try { e = await tables.tokens.getEntity("tok", id); } catch { return null; }
    if (e.used || Math.floor(Date.now() / 1000) > e.exp || e.decision !== expectedDecision) return null;
    try {
      await tables.tokens.updateEntity({ partitionKey: "tok", rowKey: id, used: true, usedAt: nowIso() }, "Merge", { etag: e.etag });
    } catch { return null; } // etag mismatch = already consumed by a concurrent click
    return { login: e.login, decision: e.decision };
  }
  const t = mem.tokens[id];
  if (!t || t.used || Math.floor(Date.now() / 1000) > t.exp || t.decision !== expectedDecision) return null;
  t.used = true; t.usedAt = nowIso(); fileSave();
  return { login: t.login, decision: t.decision };
}

// Non-destructive read: returns the token's state WITHOUT consuming it. Used to
// render the confirmation page on GET so that email-client link prefetch/scanners
// (which only issue GET requests) never trigger a decision. Returns
// { login, decision, used, expired } or null if the id is unknown.
export async function peekToken(id) {
  if (!id) return null;
  let e;
  if (STORAGE_MODE === "table") {
    try { e = await tables.tokens.getEntity("tok", id); } catch { return null; }
  } else {
    e = mem.tokens[id];
    if (!e) return null;
  }
  return {
    login: e.login,
    decision: e.decision,
    used: !!e.used,
    expired: Math.floor(Date.now() / 1000) > e.exp,
  };
}

// ----------------------------------------------------------------------------
// Settings (small admin-controlled key/value JSON blobs)
// ----------------------------------------------------------------------------
export async function getSetting(key, fallback = null) {
  if (STORAGE_MODE === "table") {
    try {
      const e = await tables.settings.getEntity("settings", key);
      return e.json ? JSON.parse(e.json) : fallback;
    } catch { return fallback; }
  }
  return key in mem.settings ? mem.settings[key] : fallback;
}

export async function setSetting(key, value) {
  if (STORAGE_MODE === "table") {
    await tables.settings.upsertEntity({ partitionKey: "settings", rowKey: key, json: JSON.stringify(value) }, "Replace");
  } else {
    mem.settings[key] = value; fileSave();
  }
  return value;
}
