import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { customers } from "../customer-registry.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(root, "knowledge", "customers");
const maxPages = Math.max(1, Number(process.env.MAX_PAGES_PER_CUSTOMER || 12));
const concurrency = Math.max(1, Math.min(8, Number(process.env.RESEARCH_CONCURRENCY || 4)));
const requestTimeoutMs = Math.max(3000, Number(process.env.RESEARCH_TIMEOUT_MS || 15000));
const pageChars = Math.max(3000, Number(process.env.RESEARCH_PAGE_CHARS || 14000));

const priorityTerms = [
  "about", "who-we-are", "company", "products", "services", "solutions", "industries",
  "investor", "annual-report", "results", "financial", "strategy", "leadership",
  "management", "sustainability", "esg", "innovation", "news", "media", "press",
];

function decodeEntities(value) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function htmlToText(html) {
  return decodeEntities(html)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<\/(p|div|li|h[1-6]|tr|section|article|header|footer)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function pageTitle(html, fallback) {
  const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1];
  return htmlToText(title || fallback).slice(0, 180);
}

function normalizeUrl(value) {
  const url = new URL(value);
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) {
    if (/^(utm_|mtm_|msclkid|gclid|fbclid)/i.test(key)) url.searchParams.delete(key);
  }
  return url.toString();
}

function sameOfficialDomain(candidate, customer) {
  const rootHost = new URL(customer.website).hostname.replace(/^www\./, "");
  const host = candidate.hostname.replace(/^www\./, "");
  return host === rootHost || host.endsWith(`.${rootHost}`);
}

function discoverLinks(html, pageUrl, customer) {
  const links = new Set();
  const pattern = /href\s*=\s*["']([^"'#]+)["']/gi;
  for (const match of html.matchAll(pattern)) {
    try {
      const value = decodeEntities(match[1]).trim();
      if (/^(mailto:|tel:|javascript:)/i.test(value)) continue;
      const url = new URL(value, pageUrl);
      if (url.protocol !== "https:" || !sameOfficialDomain(url, customer)) continue;
      if (/\.(jpg|jpeg|png|gif|svg|webp|zip|mp4|mp3)(\?|$)/i.test(url.pathname)) continue;
      links.add(normalizeUrl(url.toString()));
    } catch {
      // Ignore malformed links from public pages.
    }
  }
  return [...links];
}

function rankLink(url) {
  const value = url.toLowerCase();
  const index = priorityTerms.findIndex((term) => value.includes(term));
  return index === -1 ? 1000 : index;
}

async function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), requestTimeoutMs);
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "ClientSphereResearch/2.0 (+public website indexing)",
        Accept: "text/html,text/plain,application/xhtml+xml;q=0.9,*/*;q=0.1",
      },
      redirect: "follow",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const type = response.headers.get("content-type") || "";
    if (!/(text|html|xml)/i.test(type)) throw new Error(`unsupported content type '${type || "unknown"}'`);
    return { html: await response.text(), finalUrl: response.url };
  } finally {
    clearTimeout(timer);
  }
}

async function crawlCustomer(customer) {
  const startedAt = new Date().toISOString();
  const seed = normalizeUrl(customer.website);
  const queue = [seed];
  const seen = new Set();
  const pages = [];
  const errors = [];

  while (queue.length && pages.length < maxPages) {
    const url = queue.shift();
    if (seen.has(url)) continue;
    seen.add(url);
    try {
      const { html, finalUrl } = await fetchText(url);
      const final = new URL(finalUrl);
      if (!sameOfficialDomain(final, customer)) throw new Error(`redirected outside ${customer.domain}`);
      const text = htmlToText(html).slice(0, pageChars);
      if (text.length >= 200) {
        pages.push({ title: pageTitle(html, finalUrl), url: finalUrl, text });
      }
      const discovered = discoverLinks(html, finalUrl, customer)
        .filter((link) => !seen.has(link))
        .sort((a, b) => rankLink(a) - rankLink(b));
      for (const link of discovered) {
        if (queue.length >= maxPages * 8) break;
        queue.push(link);
      }
    } catch (error) {
      errors.push({ url, error: error.message });
    }
  }

  const lines = [
    `# ${customer.name} public-source profile`,
    "",
    `- Official website: ${customer.website}`,
    `- Sector: ${customer.sector}`,
    `- Catalogue summary: ${customer.summary}`,
    `- Retrieved: ${startedAt}`,
    `- Pages indexed: ${pages.length}`,
    "",
    "This file contains public website text for evidence retrieval. Treat publication dates and changing facts as time-sensitive.",
    "",
  ];
  for (const page of pages) {
    lines.push(`## ${page.title}`, "", `Source: ${page.url}`, "", page.text, "");
  }
  if (errors.length) {
    lines.push("## Retrieval notes", "");
    for (const item of errors.slice(0, 20)) lines.push(`- ${item.url}: ${item.error}`);
    lines.push("");
  }

  const directory = path.join(outputRoot, customer.id);
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, "public-profile.md"), lines.join("\n"), "utf8");
  return { id: customer.id, pages: pages.length, errors: errors.length };
}

async function worker(queue, results) {
  while (queue.length) {
    const customer = queue.shift();
    console.log(`Researching ${customer.name}...`);
    const result = await crawlCustomer(customer);
    results.push(result);
    console.log(`  ${result.pages} pages indexed, ${result.errors} retrieval warnings`);
  }
}

await fs.mkdir(outputRoot, { recursive: true });
const queue = [...customers];
const results = [];
await Promise.all(Array.from({ length: concurrency }, () => worker(queue, results)));
results.sort((a, b) => a.id.localeCompare(b.id));
await fs.writeFile(
  path.join(outputRoot, "manifest.json"),
  JSON.stringify({ generatedAt: new Date().toISOString(), maxPages, customers: results }, null, 2),
  "utf8",
);

const empty = results.filter((result) => result.pages === 0);
if (empty.length > Math.ceil(customers.length / 2)) {
  throw new Error(`Research failed for ${empty.length}/${customers.length} customers; refusing to publish a mostly empty knowledge base.`);
}
console.log(`Customer research complete: ${customers.length} profiles, ${empty.length} with catalogue-only fallback.`);
