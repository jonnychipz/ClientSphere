// store.mjs — tiny JSON-file store for users (access requests) and usage events.
// Low-volume internal tool, so a single JSON file with synchronous writes is fine.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "data");
const STORE_FILE = path.join(DATA_DIR, "store.json");

function load() {
  try {
    return JSON.parse(fs.readFileSync(STORE_FILE, "utf8"));
  } catch {
    return { users: {}, usage: [] };
  }
}
let db = load();

function save() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(STORE_FILE, JSON.stringify(db, null, 2));
}

export function getUser(login) {
  return login ? db.users[login.toLowerCase()] || null : null;
}

// Create on first sight or refresh profile fields. `defaultStatus` applies only
// to brand-new users (e.g. admins start 'approved', everyone else 'pending').
export function upsertUser(profile, defaultStatus = "pending") {
  const key = profile.login.toLowerCase();
  const existing = db.users[key];
  const extra = {
    email: profile.email ?? null,
    bio: profile.bio ?? "",
    company: profile.company ?? "",
    location: profile.location ?? "",
    blog: profile.blog ?? "",
    followers: profile.followers ?? 0,
    publicRepos: profile.publicRepos ?? 0,
    htmlUrl: profile.htmlUrl ?? `https://github.com/${profile.login}`,
    githubCreatedAt: profile.githubCreatedAt ?? null,
  };
  if (existing) {
    existing.name = profile.name ?? existing.name;
    existing.avatar = profile.avatar ?? existing.avatar;
    for (const [k, v] of Object.entries(extra)) if (v !== null && v !== "" && v !== 0) existing[k] = v;
    existing.lastLoginAt = new Date().toISOString();
    save();
    return existing;
  }
  const user = {
    login: profile.login,
    name: profile.name || profile.login,
    avatar: profile.avatar || "",
    ...extra,
    status: defaultStatus,
    requestedAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    decidedAt: null,
    decidedBy: null,
  };
  db.users[key] = user;
  save();
  return user;
}

export function setStatus(login, status, decidedBy) {
  const u = getUser(login);
  if (!u) return null;
  u.status = status;
  u.decidedAt = new Date().toISOString();
  u.decidedBy = decidedBy || null;
  save();
  return u;
}

export function listUsers() {
  return Object.values(db.users).sort((a, b) => (b.requestedAt || "").localeCompare(a.requestedAt || ""));
}

export function logUsage(login, action, detail) {
  db.usage.push({ login, action, detail: detail || null, ts: new Date().toISOString() });
  if (db.usage.length > 5000) db.usage = db.usage.slice(-5000);
  save();
}

export function getUsage(limit = 200) {
  return db.usage.slice(-limit).reverse();
}

export function usageStats() {
  const perUser = {};
  for (const e of db.usage) {
    perUser[e.login] = perUser[e.login] || { login: e.login, total: 0, chats: 0, lastActive: null };
    perUser[e.login].total++;
    if (e.action === "chat") perUser[e.login].chats++;
    if (!perUser[e.login].lastActive || e.ts > perUser[e.login].lastActive) perUser[e.login].lastActive = e.ts;
  }
  return Object.values(perUser).sort((a, b) => b.total - a.total);
}
