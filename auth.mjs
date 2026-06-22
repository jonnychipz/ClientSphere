// auth.mjs — GitHub OAuth (web flow), signed-cookie sessions, and a dev-mode
// login for local testing before a real OAuth App exists.
import crypto from "node:crypto";

const CLIENT_ID = (process.env.GITHUB_CLIENT_ID || "").trim();
const CLIENT_SECRET = (process.env.GITHUB_CLIENT_SECRET || "").trim();
const SECRET = process.env.SESSION_SECRET || "hubble-dev-secret-change-me";
const COOKIE = "hubble_session";
const MAX_AGE = 7 * 24 * 60 * 60; // 7 days (seconds)

export const ADMIN_LOGINS = (process.env.ADMIN_LOGINS || "jonnychipz")
  .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
export const isAdmin = (login) => !!login && ADMIN_LOGINS.includes(login.toLowerCase());

// Real GitHub OAuth is used when credentials exist; otherwise dev mode.
export const DEV_MODE = !(CLIENT_ID && CLIENT_SECRET) || process.env.AUTH_DEV_MODE === "true";

// ---------- signed cookies ----------
function b64url(buf) { return Buffer.from(buf).toString("base64url"); }
function sign(payloadObj) {
  const payload = b64url(JSON.stringify(payloadObj));
  const mac = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
  return `${payload}.${mac}`;
}
function verify(token) {
  if (!token || !token.includes(".")) return null;
  const [payload, mac] = token.split(".");
  const expected = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
  if (mac.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
  try {
    const obj = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!obj.iat || Date.now() / 1000 - obj.iat > MAX_AGE) return null;
    return obj;
  } catch { return null; }
}

export function parseCookies(req) {
  const out = {};
  (req.headers.cookie || "").split(";").forEach((c) => {
    const i = c.indexOf("=");
    if (i > -1) out[c.slice(0, i).trim()] = decodeURIComponent(c.slice(i + 1).trim());
  });
  return out;
}
export function setSession(res, login) {
  const token = sign({ login, iat: Math.floor(Date.now() / 1000) });
  res.setHeader("Set-Cookie", `${COOKIE}=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${MAX_AGE}`);
}
export function clearSession(res) {
  res.setHeader("Set-Cookie", `${COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`);
}
export function sessionLogin(req) {
  const obj = verify(parseCookies(req)[COOKIE]);
  return obj ? obj.login : null;
}

// ---------- OAuth state (CSRF) ----------
export function makeState() { return crypto.randomBytes(16).toString("hex"); }
export function setStateCookie(res, state) {
  res.setHeader("Set-Cookie", `hubble_oauth_state=${state}; HttpOnly; Path=/; SameSite=Lax; Max-Age=600`);
}
export function checkState(req, state) {
  return state && parseCookies(req).hubble_oauth_state === state;
}

// ---------- GitHub OAuth web flow ----------
export function authorizeUrl(state, redirectUri) {
  const p = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: redirectUri,
    scope: "read:user",
    state,
    allow_signup: "true",
  });
  return `https://github.com/login/oauth/authorize?${p}`;
}
export async function exchangeCode(code, redirectUri) {
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, code, redirect_uri: redirectUri }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(data.error_description || "Token exchange failed");
  return data.access_token;
}
export async function fetchGitHubUser(token) {
  const res = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "User-Agent": "Hubble" },
  });
  if (!res.ok) throw new Error(`GitHub /user returned ${res.status}`);
  const u = await res.json();
  return { login: u.login, name: u.name || u.login, avatar: u.avatar_url || "" };
}
