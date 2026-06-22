// webgrounding.mjs — the "fetch_official_doc" function tool: definition (for the
// agent) + handler (for the server's run loop). Restricted to official domains.

export const ALLOWED_DOMAINS = [
  "github.com", "www.github.com",
  "docs.github.com",
  "github.blog",
  "resources.github.com",
  "githubnext.com",
  "learn.microsoft.com",
  "azure.microsoft.com",
  "techcommunity.microsoft.com",
  "devblogs.microsoft.com",
];

// Function tool definition attached to the agent.
export const FETCH_DOC_TOOL = {
  name: "fetch_official_doc",
  description:
    "Fetch the live text of an OFFICIAL GitHub or Microsoft web page to ground an answer in current information. " +
    "Use this when the user asks about current pricing, brand-new or recently changed features, or anything that may " +
    "have changed since the knowledge base was verified (June 2026). Only official domains are allowed: github.com, " +
    "docs.github.com, github.blog, resources.github.com, learn.microsoft.com, azure.microsoft.com. Do not use it for " +
    "stable facts already in the knowledge base.",
  parameters: {
    type: "object",
    properties: {
      url: {
        type: "string",
        description: "Full https:// URL of an official GitHub or Microsoft page to fetch.",
      },
    },
    required: ["url"],
  },
};

function hostAllowed(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    return ALLOWED_DOMAINS.some((d) => host === d || host.endsWith("." + d));
  } catch {
    return false;
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
export async function fetchOfficialDoc(argsJson, maxChars = 6000) {
  let url;
  try { url = JSON.parse(argsJson || "{}").url; } catch { return "Error: could not parse tool arguments."; }
  if (!url) return "Error: no url provided.";
  if (!hostAllowed(url)) {
    return `Error: '${url}' is not an allowed official domain. Allowed: ${ALLOWED_DOMAINS.join(", ")}.`;
  }
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12000);
    const res = await fetch(url, {
      headers: { "User-Agent": "Hubble-GitHub-Coach/1.0", Accept: "text/html,*/*" },
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) return `Error: fetching ${url} returned HTTP ${res.status}.`;
    const html = await res.text();
    const text = htmlToText(html).slice(0, maxChars);
    return `Live content from ${url} (fetched ${new Date().toISOString().slice(0, 10)}):\n\n${text}`;
  } catch (err) {
    return `Error fetching ${url}: ${err.message}`;
  }
}
