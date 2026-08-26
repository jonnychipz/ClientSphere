import crypto from "node:crypto";
import zlib from "node:zlib";
import { DefaultAzureCredential } from "@azure/identity";

const ALGORITHM = "aes-256-gcm";
const API_VERSION = "2024-03-01";
const TAG_PREFIX = "clientsphere-access-";
const TAG_CHUNK_SIZE = 220;
let persistenceQueue = Promise.resolve();
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function keyFromSecret(secret) {
  if (!secret) throw new Error("SESSION_SECRET is required for access-state encryption.");
  return crypto.createHash("sha256").update(secret).digest();
}

export function encodeAccessState(users, secret) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, keyFromSecret(secret), iv);
  const compressed = zlib.gzipSync(Buffer.from(JSON.stringify({ version: 1, users }), "utf8"));
  const encrypted = Buffer.concat([cipher.update(compressed), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

export function decodeAccessState(payload, secret) {
  if (!payload) return null;
  const packed = Buffer.from(payload, "base64url");
  if (packed.length < 29) throw new Error("Access-state payload is invalid.");
  const iv = packed.subarray(0, 12);
  const tag = packed.subarray(12, 28);
  const encrypted = packed.subarray(28);
  const decipher = crypto.createDecipheriv(ALGORITHM, keyFromSecret(secret), iv);
  decipher.setAuthTag(tag);
  const value = JSON.parse(zlib.gunzipSync(Buffer.concat([decipher.update(encrypted), decipher.final()])).toString("utf8"));
  if (value.version !== 1 || !Array.isArray(value.users)) throw new Error("Access-state schema is unsupported.");
  return value.users;
}

export function accessStateTags(encoded) {
  const tags = {};
  const parts = encoded.match(new RegExp(`.{1,${TAG_CHUNK_SIZE}}`, "g")) || [];
  if (parts.length > 45) throw new Error("The access registry is too large for durable Container App tags.");
  parts.forEach((part, index) => {
    tags[`${TAG_PREFIX}${String(index).padStart(3, "0")}`] = part;
  });
  tags[`${TAG_PREFIX}parts`] = String(parts.length);
  return tags;
}

export function accessStateFromTags(tags) {
  const count = Number(tags?.[`${TAG_PREFIX}parts`] || 0);
  if (!Number.isInteger(count) || count < 1) return null;
  const parts = [];
  for (let index = 0; index < count; index++) {
    const part = tags[`${TAG_PREFIX}${String(index).padStart(3, "0")}`];
    if (!part) throw new Error(`Access-state tag part ${index} is missing.`);
    parts.push(part);
  }
  return parts.join("");
}

async function managementRequest(url, token, method = "GET", body, etag) {
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(etag ? { "If-Match": etag } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return response;
}

async function containerAppResource() {
  const resourceId = process.env.CLIENTSPHERE_CONTAINER_APP_RESOURCE_ID;
  if (!resourceId) return null;
  const credential = new DefaultAzureCredential();
  const token = await credential.getToken("https://management.azure.com/.default");
  const url = `https://management.azure.com${resourceId}?api-version=${API_VERSION}`;
  let currentResponse;
  for (let attempt = 1; attempt <= 8; attempt++) {
    currentResponse = await managementRequest(url, token.token);
    if (currentResponse.ok || ![403, 409, 429, 500, 502, 503, 504].includes(currentResponse.status) || attempt === 8) break;
    await wait(attempt * 2000);
  }
  if (!currentResponse.ok) throw new Error(`Read Container App state ${currentResponse.status}: ${await currentResponse.text()}`);
  return {
    value: await currentResponse.json(),
    etag: currentResponse.headers.get("etag"),
    token: token.token,
    url,
  };
}

async function pollOperation(response, token) {
  if (response.status !== 202) return;
  const operationUrl = response.headers.get("azure-asyncoperation") || response.headers.get("location");
  if (!operationUrl) throw new Error("Container App state update returned 202 without an operation URL.");
  for (let attempt = 1; attempt <= 60; attempt++) {
    const operationResponse = await managementRequest(operationUrl, token);
    if (!operationResponse.ok) throw new Error(`Read Container App state operation ${operationResponse.status}: ${await operationResponse.text()}`);
    const operation = await operationResponse.json();
    const status = String(operation.status || operation.properties?.provisioningState || "").toLowerCase();
    if (status === "succeeded") return;
    if (["failed", "canceled", "cancelled"].includes(status)) {
      throw new Error(`Container App state update ${status}: ${JSON.stringify(operation.error || operation.properties?.error || {})}`);
    }
    if (attempt === 60) throw new Error("Container App state update did not complete within five minutes.");
    await wait(5000);
  }
}

export async function readPersistedAccessState(secret = process.env.SESSION_SECRET) {
  const resource = await containerAppResource();
  if (!resource) return null;
  const encoded = accessStateFromTags(resource.value.tags);
  return encoded ? decodeAccessState(encoded, secret) : null;
}

async function writeContainerAppState(encoded) {
  const resourceId = process.env.CLIENTSPHERE_CONTAINER_APP_RESOURCE_ID;
  if (!resourceId) return false;
  for (let attempt = 1; attempt <= 5; attempt++) {
    const current = await containerAppResource();
    const retainedTags = Object.fromEntries(
      Object.entries(current.value.tags || {}).filter(([key]) => !key.startsWith(TAG_PREFIX)),
    );
    const updateResponse = await managementRequest(
      current.url,
      current.token,
      "PATCH",
      { location: current.value.location, tags: { ...retainedTags, ...accessStateTags(encoded) } },
      current.etag,
    );
    if (updateResponse.status === 412 && attempt < 5) {
      await wait(attempt * 1000);
      continue;
    }
    if (!updateResponse.ok) throw new Error(`Persist Container App state ${updateResponse.status}: ${await updateResponse.text()}`);
    await pollOperation(updateResponse, current.token);
    return true;
  }
  throw new Error("Container App access registry changed concurrently too many times.");
}

export async function persistAccessState(users, secret = process.env.SESSION_SECRET) {
  const encoded = encodeAccessState(users, secret);
  persistenceQueue = persistenceQueue.catch(() => {}).then(() => writeContainerAppState(encoded));
  return persistenceQueue;
}
