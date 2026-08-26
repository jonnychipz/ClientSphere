import dns from "node:dns/promises";
import https from "node:https";
import { isPrivateAddress } from "./webgrounding.mjs";

const cache = new Map();
const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/png", "image/jpeg", "image/webp", "image/gif",
  "image/x-icon", "image/vnd.microsoft.icon",
]);

function attribute(tag, name) {
  const match = new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, "i").exec(tag);
  return match?.[1] || "";
}

function logoCandidates(html, website) {
  const candidates = [];
  for (const tag of html.match(/<link\b[^>]*>/gi) || []) {
    const rel = attribute(tag, "rel").toLowerCase();
    const href = attribute(tag, "href");
    if (!href || !/(^|\s)(apple-touch-icon|icon|shortcut icon)(\s|$)/.test(rel)) continue;
    try { candidates.push(new URL(href, website).toString()); } catch { /* ignore malformed public markup */ }
  }
  try { candidates.push(new URL("/favicon.ico", website).toString()); } catch { /* validated elsewhere */ }
  return [...new Set(candidates)];
}

function officialHost(url, customer) {
  const parsed = new URL(url);
  const hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");
  return parsed.protocol === "https:" && (!parsed.port || parsed.port === "443") && hostname === customer.domain;
}

async function publicOfficialAddress(url, customer) {
  if (!officialHost(url, customer)) throw new Error("Logo URL left the official customer domain.");
  const records = await dns.lookup(new URL(url).hostname, { all: true, verbatim: true });
  if (!records.length || records.some((record) => isPrivateAddress(record.address))) {
    throw new Error("Logo URL did not resolve to a public address.");
  }
  return records[0];
}

function pinnedHttpsRequest(url, address, accept, milliseconds) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const request = https.request(parsed, {
      method: "GET",
      headers: { "User-Agent": "ClientSphereLogoResolver/1.0", Accept: accept },
      servername: parsed.hostname,
      lookup: (_hostname, options, callback) => {
        if (options?.all) callback(null, [{ address: address.address, family: address.family }]);
        else callback(null, address.address, address.family);
      },
    }, (response) => {
      const chunks = [];
      let size = 0;
      response.on("data", (chunk) => {
        size += chunk.length;
        if (size > MAX_LOGO_BYTES) {
          request.destroy(new Error("Logo response exceeded the size limit."));
          return;
        }
        chunks.push(chunk);
      });
      response.on("end", () => {
        const body = Buffer.concat(chunks);
        const headers = new Headers();
        for (const [key, value] of Object.entries(response.headers)) {
          if (value !== undefined) headers.set(key, Array.isArray(value) ? value.join(", ") : value);
        }
        resolve({
          status: response.statusCode || 0,
          ok: (response.statusCode || 0) >= 200 && (response.statusCode || 0) < 300,
          headers,
          text: async () => body.toString("utf8"),
          arrayBuffer: async () => body,
        });
      });
    });
    request.setTimeout(milliseconds, () => request.destroy(new Error("Logo request timed out.")));
    request.on("error", reject);
    request.end();
  });
}

async function fetchOfficial(url, customer, accept, milliseconds = 8000) {
  let current = url;
  for (let redirect = 0; redirect <= 4; redirect++) {
    const address = await publicOfficialAddress(current, customer);
    const response = await pinnedHttpsRequest(current, address, accept, milliseconds);
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers.get("location");
    if (!location) throw new Error("Logo redirect did not include a location.");
    current = new URL(location, current).toString();
  }
  throw new Error("Logo URL exceeded the redirect limit.");
}

function fallbackSvg(customer) {
  const initials = customer.initials.replace(/[^A-Z0-9]/g, "").slice(0, 2) || "CS";
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">` +
    `<rect width="96" height="96" rx="20" fill="#f5f3ff"/>` +
    `<circle cx="48" cy="48" r="33" fill="#6d28d9"/>` +
    `<text x="48" y="57" text-anchor="middle" font-family="Segoe UI,Arial,sans-serif" font-size="27" font-weight="700" fill="white">${initials}</text>` +
    `</svg>`,
  );
}

export async function resolveCustomerLogo(customer) {
  const existing = cache.get(customer.id);
  if (existing) return existing;
  try {
    const homepage = await fetchOfficial(customer.website, customer, "text/html");
    const html = homepage.ok ? await homepage.text() : "";
    for (const candidate of logoCandidates(html, customer.website)) {
      try {
        const response = await fetchOfficial(candidate, customer, "image/png,image/jpeg,image/webp,image/x-icon,image/*;q=0.7");
        const contentType = (response.headers.get("content-type") || "").split(";")[0].toLowerCase();
        const length = Number(response.headers.get("content-length") || 0);
        if (!response.ok || !ALLOWED_TYPES.has(contentType) || length > MAX_LOGO_BYTES) continue;
        const body = Buffer.from(await response.arrayBuffer());
        if (!body.length || body.length > MAX_LOGO_BYTES) continue;
        const result = { body, contentType, fallback: false };
        cache.set(customer.id, result);
        return result;
      } catch { /* try next official icon */ }
    }
  } catch { /* use deterministic fallback */ }
  const result = { body: fallbackSvg(customer), contentType: "image/svg+xml", fallback: true };
  cache.set(customer.id, result);
  return result;
}
