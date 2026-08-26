import dns from "node:dns/promises";
import net from "node:net";

export const TRUSTED_PUBLIC_DOMAINS = [
  "companieshouse.gov.uk",
  "find-and-update.company-information.service.gov.uk",
  "gov.uk",
  "londonstockexchange.com",
  "rns-pdf.londonstockexchange.com",
  "sec.gov",
];

// Function tool definition attached to the agent.
export const FETCH_DOC_TOOL = {
  name: "fetch_public_source",
  description:
    "Fetch current text from the assigned customer's official public website or an approved public registry/market source. " +
    "Use for latest developments, leadership, financial reporting, strategy, products, services, and other time-sensitive facts. " +
    "Never fetch unrelated organisations, social media, private pages, or user-supplied arbitrary hosts.",
  parameters: {
    type: "object",
    properties: {
      url: {
        type: "string",
        description: "Full HTTPS URL on the assigned customer's official domain or an approved public-information domain.",
      },
    },
    required: ["url"],
    additionalProperties: false,
  },
};

function hostnameMatches(hostname, domain) {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

function allowedDomainsFor(customer) {
  const official = new URL(customer.website).hostname.toLowerCase().replace(/^www\./, "");
  return [official, ...TRUSTED_PUBLIC_DOMAINS];
}

export function sourceAllowedForCustomer(url, customer) {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    return allowedDomainsFor(customer).some((domain) => hostnameMatches(host, domain));
  } catch {
    return false;
  }
}

export function isPrivateAddress(address) {
  if (net.isIPv4(address)) {
    const [a, b] = address.split(".").map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  if (net.isIPv6(address)) {
    const value = address.toLowerCase();
    return value === "::1" || value === "::" || value.startsWith("fc") ||
      value.startsWith("fd") || value.startsWith("fe8") || value.startsWith("fe9") ||
      value.startsWith("fea") || value.startsWith("feb") || value.startsWith("::ffff:127.") ||
      value.startsWith("::ffff:10.") || value.startsWith("::ffff:192.168.");
  }
  return true;
}

async function assertPublicHost(url) {
  const host = new URL(url).hostname;
  const records = await dns.lookup(host, { all: true, verbatim: true });
  if (!records.length || records.some((record) => isPrivateAddress(record.address))) {
    throw new Error("Source host does not resolve to a public address.");
  }
}

function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<\/(p|div|li|h[1-6]|tr|section|article)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#\d+;/g, " ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Executes a fetch_official_doc tool call. `argsJson` is the model-provided
// arguments string. Returns a string the model reads as the tool output.
export async function fetchOfficialDoc(argsJson, customer, maxChars = 8000) {
  let url;
  try { url = JSON.parse(argsJson || "{}").url; } catch { return "Error: could not parse tool arguments."; }
  if (!url) return "Error: no url provided.";
  if (!customer || !sourceAllowedForCustomer(url, customer)) {
    return `Error: '${url}' is not an approved source for the assigned customer.`;
  }
  try {
    await assertPublicHost(url);
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12000);
    const res = await fetch(url, {
      headers: { "User-Agent": "ClientSphere/2.0 (+public research)", Accept: "text/html,text/plain,application/json;q=0.9,*/*;q=0.2" },
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!sourceAllowedForCustomer(res.url, customer)) return "Error: source redirected to a non-approved domain.";
    await assertPublicHost(res.url);
    if (!res.ok) return `Error: fetching ${url} returned HTTP ${res.status}.`;
    const contentType = res.headers.get("content-type") || "";
    if (!/(text|html|json|xml)/i.test(contentType)) {
      return `Error: ${res.url} returned '${contentType || "unknown"}', which cannot be safely converted to text.`;
    }
    const html = await res.text();
    const text = htmlToText(html).slice(0, maxChars);
    return `Public content from ${res.url} (retrieved ${new Date().toISOString()}):\n\n${text}`;
  } catch (err) {
    return `Error fetching ${url}: ${err.message}`;
  }
}
