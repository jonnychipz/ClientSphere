import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cataloguePath = path.join(__dirname, "config", "customers.json");

function validateCustomer(customer, index) {
  const required = ["id", "name", "website", "sector", "summary", "topics"];
  for (const field of required) {
    if (!customer[field] || (field === "topics" && !Array.isArray(customer[field]))) {
      throw new Error(`Customer ${index + 1} is missing '${field}'.`);
    }
  }
  if (!/^[a-z0-9-]+$/.test(customer.id)) {
    throw new Error(`Customer id '${customer.id}' must use lowercase letters, numbers, and hyphens.`);
  }
  const url = new URL(customer.website);
  if (url.protocol !== "https:") throw new Error(`${customer.name} website must use HTTPS.`);
}

const rawCustomers = JSON.parse(fs.readFileSync(cataloguePath, "utf8"));
if (!Array.isArray(rawCustomers) || !rawCustomers.length) throw new Error("Customer catalogue is empty.");
rawCustomers.forEach(validateCustomer);

const ids = new Set();
for (const customer of rawCustomers) {
  if (ids.has(customer.id)) throw new Error(`Duplicate customer id '${customer.id}'.`);
  ids.add(customer.id);
}

function initials(name) {
  return name
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

export const customers = Object.freeze(rawCustomers.map((customer) => {
  const url = new URL(customer.website);
  return Object.freeze({
    ...customer,
    domain: url.hostname.replace(/^www\./, ""),
    logoUrl: `${url.origin}/favicon.ico`,
    initials: initials(customer.name),
  });
}));

export const customersById = new Map(customers.map((customer) => [customer.id, customer]));

export function getCustomer(id) {
  return customersById.get(String(id || "").toLowerCase()) || null;
}

export function customerPublicView(customer) {
  return {
    id: customer.id,
    name: customer.name,
    website: customer.website,
    domain: customer.domain,
    logoUrl: customer.logoUrl,
    initials: customer.initials,
    sector: customer.sector,
    summary: customer.summary,
    topics: customer.topics,
  };
}

function validateMetadata(payload, source) {
  if (!payload.customers || typeof payload.customers !== "object") {
    throw new Error(`Agent metadata at '${source}' has no customers map.`);
  }
  return payload;
}

export async function loadAgentMetadata(metaPath = process.env.CUSTOMER_AGENT_META_PATH) {
  const resolved = metaPath ? path.resolve(metaPath) : path.join(__dirname, "customer-agents.json");
  return validateMetadata(JSON.parse(fs.readFileSync(resolved, "utf8")), resolved);
}
