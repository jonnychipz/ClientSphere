import crypto from "node:crypto";
import { parseCookies } from "./auth.mjs";

const FABRIC_COOKIE = "clientsphere_fabric";
const FABRIC_STATE_COOKIE = "clientsphere_fabric_state";
const FABRIC_SCOPE = "openid profile email https://ai.azure.com/user_impersonation";
const EXPECTED_AUDIENCES = new Set(["https://ai.azure.com", "https://ai.azure.com/"]);

const TENANT_ID = (process.env.ENTRA_TENANT_ID || "").trim();
const CLIENT_ID = (process.env.ENTRA_CLIENT_ID || "").trim();
const CLIENT_SECRET = (process.env.ENTRA_CLIENT_SECRET || "").trim();
const SESSION_SECRET = process.env.SESSION_SECRET || "clientsphere-dev-secret-change-me";

export const FABRIC_AUTH_CONFIGURED = Boolean(TENANT_ID && CLIENT_ID && CLIENT_SECRET);

function encryptionKey(secret) {
  return crypto.createHash("sha256").update(secret).digest();
}

function seal(value, secret = SESSION_SECRET) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(secret), iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64url");
}

function open(token, secret = SESSION_SECRET) {
  if (!token) return null;
  try {
    const bytes = Buffer.from(token, "base64url");
    if (bytes.length < 29) return null;
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      encryptionKey(secret),
      bytes.subarray(0, 12),
    );
    decipher.setAuthTag(bytes.subarray(12, 28));
    const plaintext = Buffer.concat([
      decipher.update(bytes.subarray(28)),
      decipher.final(),
    ]);
    return JSON.parse(plaintext.toString("utf8"));
  } catch {
    return null;
  }
}

function decodeJwt(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    return JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

function cookie(name, value, { secure, maxAge }) {
  return `${name}=${encodeURIComponent(value)}; HttpOnly; Path=/; SameSite=Lax;${secure ? " Secure;" : ""} Max-Age=${maxAge}`;
}

export function safeReturnTo(value) {
  const candidate = String(value || "/");
  return candidate.startsWith("/") &&
    !candidate.startsWith("//") &&
    !candidate.includes("\\")
    ? candidate
    : "/";
}

export function createFabricState({ login, returnTo = "/" }, secret = SESSION_SECRET) {
  return seal({
    kind: "fabric-state",
    nonce: crypto.randomBytes(24).toString("base64url"),
    login: String(login).toLowerCase(),
    returnTo: safeReturnTo(returnTo),
    exp: Math.floor(Date.now() / 1000) + 10 * 60,
  }, secret);
}

export function verifyFabricState(token, login, secret = SESSION_SECRET) {
  const value = open(token, secret);
  if (!value || value.kind !== "fabric-state" || value.exp < Date.now() / 1000) return null;
  if (value.login !== String(login || "").toLowerCase()) return null;
  return value;
}

export function setFabricStateCookie(res, state, secure) {
  res.setHeader("Set-Cookie", cookie(FABRIC_STATE_COOKIE, state, { secure, maxAge: 10 * 60 }));
}

export function clearFabricStateCookie(res, secure) {
  res.append("Set-Cookie", cookie(FABRIC_STATE_COOKIE, "", { secure, maxAge: 0 }));
}

export function fabricAuthorizeUrl({ state, redirectUri }) {
  if (!FABRIC_AUTH_CONFIGURED) throw new Error("Microsoft Entra connection is not configured.");
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: "code",
    redirect_uri: redirectUri,
    response_mode: "query",
    scope: FABRIC_SCOPE,
    state,
    prompt: "select_account",
  });
  return `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/authorize?${params}`;
}

export async function exchangeFabricCode(code, redirectUri) {
  if (!FABRIC_AUTH_CONFIGURED) throw new Error("Microsoft Entra connection is not configured.");
  const response = await fetch(`https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: "authorization_code",
      code: String(code || ""),
      redirect_uri: redirectUri,
      scope: FABRIC_SCOPE,
    }),
  });
  const payload = await response.json();
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description || payload.error || `Microsoft Entra token exchange returned ${response.status}.`);
  }
  const claims = decodeJwt(payload.access_token);
  if (!claims || claims.tid !== TENANT_ID || !EXPECTED_AUDIENCES.has(claims.aud)) {
    throw new Error("Microsoft Entra returned a token for an unexpected tenant or audience.");
  }
  return {
    accessToken: payload.access_token,
    expiresOnMs: Date.now() + Number(payload.expires_in || 3600) * 1000,
    tenantId: claims.tid,
    objectId: claims.oid,
    name: claims.name || claims.preferred_username || "Microsoft Entra user",
    username: claims.preferred_username || claims.upn || "",
  };
}

export function setFabricSession(res, session, login, secure, secret = SESSION_SECRET) {
  const expiresOnMs = Math.min(session.expiresOnMs, Date.now() + 60 * 60 * 1000);
  const token = seal({
    kind: "fabric-session",
    ...session,
    expiresOnMs,
    login: String(login).toLowerCase(),
  }, secret);
  const maxAge = Math.max(0, Math.floor((expiresOnMs - Date.now()) / 1000));
  res.append("Set-Cookie", cookie(FABRIC_COOKIE, token, { secure, maxAge }));
}

export function clearFabricSession(res, secure) {
  res.append("Set-Cookie", cookie(FABRIC_COOKIE, "", { secure, maxAge: 0 }));
}

export function getFabricSession(req, login, secret = SESSION_SECRET) {
  const value = open(parseCookies(req)[FABRIC_COOKIE], secret);
  if (!value || value.kind !== "fabric-session") return null;
  if (value.login !== String(login || "").toLowerCase()) return null;
  if (!value.accessToken || value.expiresOnMs <= Date.now() + 60_000) return null;
  return value;
}

export function fabricStateFromRequest(req) {
  return parseCookies(req)[FABRIC_STATE_COOKIE] || "";
}

export class DelegatedAccessTokenCredential {
  constructor(accessToken, expiresOnMs) {
    this.accessToken = accessToken;
    this.expiresOnMs = expiresOnMs;
  }

  async getToken() {
    if (!this.accessToken || this.expiresOnMs <= Date.now() + 30_000) {
      throw new Error("Microsoft Entra session expired. Reconnect Fabric data.");
    }
    return { token: this.accessToken, expiresOnTimestamp: this.expiresOnMs };
  }
}
