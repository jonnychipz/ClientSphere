import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { toFile } from "openai";
import { AIProjectClient } from "@azure/ai-projects";
import { DefaultAzureCredential } from "@azure/identity";
import { customers } from "../customer-registry.mjs";
import { buildCustomerInstructions, buildUseCaseInstructions, BASE_INSTRUCTIONS } from "../instructions.mjs";
import { buildCustomerUseCases, getGeneralModelDeployment } from "../use-case-registry.mjs";
import { FETCH_DOC_TOOL } from "../webgrounding.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const endpoint = process.env.PROJECT_ENDPOINT;
const generalModel = getGeneralModelDeployment();
const knowledgeRoot = path.join(root, "knowledge", "customers");
const outputPath = path.join(root, "customer-agents.json");
if (!endpoint) throw new Error("PROJECT_ENDPOINT is required.");

const credential = new DefaultAzureCredential();
const project = new AIProjectClient(endpoint, credential);
const openAI = project.getOpenAIClient();
const existingAgents = new Map();
const existingStoresByName = new Map();
let previousMetadata = null;

for await (const agent of project.agents.list({ limit: 100, order: "desc" })) {
  existingAgents.set(agent.name, agent);
}

for await (const store of openAI.vectorStores.list({ limit: 100, order: "desc" })) {
  if (!store.name?.startsWith("clientsphere-")) continue;
  const stores = existingStoresByName.get(store.name) || [];
  stores.push(store);
  existingStoresByName.set(store.name, stores);
}

if (fs.existsSync(outputPath)) {
  previousMetadata = JSON.parse(fs.readFileSync(outputPath, "utf8"));
}

const functionTool = {
  type: "function",
  name: FETCH_DOC_TOOL.name,
  description: FETCH_DOC_TOOL.description,
  strict: true,
  parameters: {
    ...FETCH_DOC_TOOL.parameters,
    additionalProperties: false,
  },
};

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function uploadFileWithRetry(storeId, file) {
  const bytes = fs.readFileSync(file.path);
  const filename = path.basename(file.path);
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    let fileInfo;
    let attached = false;
    try {
      const uploadable = await toFile(bytes, filename, { type: "text/markdown" });
      fileInfo = await openAI.files.create({
        file: uploadable,
        purpose: "assistants",
      }, {
        timeout: 2 * 60 * 1000,
      });

      let indexed;
      for (let pollAttempt = 1; pollAttempt <= 3; pollAttempt++) {
        try {
          if (!attached) {
            await openAI.vectorStores.files.create(storeId, { file_id: fileInfo.id });
            attached = true;
          }
          indexed = await openAI.vectorStores.files.poll(storeId, fileInfo.id, {
            pollIntervalMs: 1000,
            timeout: 8 * 60 * 1000,
          });
          break;
        } catch (error) {
          lastError = error;
          if (pollAttempt === 3) throw error;
          console.warn(`  Polling ${filename} failed (${error.status || error.code || error.message}); retrying by file ID...`);
          await wait(pollAttempt * 2000);
        }
      }

      if (indexed?.status !== "completed") {
        const detail = indexed?.last_error
          ? `${indexed.last_error.code}: ${indexed.last_error.message}`
          : `status ${indexed?.status || "unknown"}`;
        throw new Error(`Indexing ${filename} failed: ${detail}`);
      }
      return indexed;
    } catch (error) {
      lastError = error;
      if (fileInfo?.id) {
        if (attached) {
          await openAI.vectorStores.files.delete(fileInfo.id, { vector_store_id: storeId }).catch(() => {});
        }
        await openAI.files.delete(fileInfo.id).catch(() => {});
      }
      if (attempt === 3) break;
      console.warn(`  Upload ${filename} failed (${error.status || error.code || error.message}); retrying...`);
      await wait(attempt * 2500);
    }
  }
  throw lastError;
}

function contentAddressedStoreName(baseName, files) {
  const hash = crypto.createHash("sha256");
  for (const file of files) {
    hash.update(path.basename(file.path));
    const content = fs.readFileSync(file.path, "utf8")
      .replace(/^- Retrieved:.*$/m, "- Retrieved: <normalized>");
    hash.update(content);
  }
  return `${baseName}-${hash.digest("hex").slice(0, 12)}`;
}

async function createKnowledgeStore(baseName, files) {
  const storeName = contentAddressedStoreName(baseName, files);
  const reusable = (existingStoresByName.get(storeName) || [])
    .find((store) => store.status === "completed" && store.file_counts.completed === files.length);
  if (reusable) {
    console.log(`  Reusing indexed knowledge store ${reusable.id}.`);
    return { store: reusable, fileMap: {} };
  }

  const store = await openAI.vectorStores.create({
    name: storeName,
    metadata: { clientsphereManaged: "true", contentHash: storeName.slice(-12) },
  });
  const fileMap = {};
  try {
    for (const file of files) {
      const uploaded = await uploadFileWithRetry(store.id, file);
      fileMap[uploaded.id] = file.label;
    }
  } catch (error) {
    await openAI.vectorStores.delete(store.id).catch(() => {});
    throw error;
  }
  return { store, fileMap };
}

async function upsertAgent({
  customerId,
  name,
  description,
  instructions,
  modelDeployment,
  mode,
  vectorStoreId,
}) {
  const definition = {
    kind: "prompt",
    model: modelDeployment,
    instructions,
    tools: [
      { type: "file_search", vector_store_ids: [vectorStoreId] },
      functionTool,
      ...(mode === "general" || mode === "portfolio"
        ? []
        : [{ type: "code_interpreter", container: { type: "auto" } }]),
    ],
  };
  const options = {
    description,
    metadata: {
      clientsphereCustomerId: customerId,
      clientsphereMode: mode,
      clientsphereManaged: "true",
    },
  };
  const agent = existingAgents.has(name)
    ? await project.agents.update(name, definition, options)
    : await project.agents.create(name, definition, options);
  return agent;
}

async function cleanupStores(previousStoreIds, currentStoreId) {
  for (const previousStoreId of new Set(previousStoreIds || [])) {
    if (!previousStoreId || previousStoreId === currentStoreId) continue;
    await openAI.vectorStores.delete(previousStoreId).catch((error) => {
      console.warn(`Could not delete previous vector store ${previousStoreId}: ${error.message}`);
    });
  }
}

const manifest = JSON.parse(fs.readFileSync(path.join(knowledgeRoot, "manifest.json"), "utf8"));
const indexedAt = manifest.generatedAt;
const metadata = {
  generatedAt: new Date().toISOString(),
  projectEndpoint: endpoint,
  models: {
    general: generalModel,
    luna: process.env.USE_CASE_MODEL_LUNA || "gpt-5.6-luna",
    terra: process.env.USE_CASE_MODEL_TERRA || "gpt-5.6-terra",
    sol: process.env.USE_CASE_MODEL_SOL || "gpt-5.6-sol",
  },
  apiSurface: "foundry-v1",
  portfolio: null,
  customers: {},
};

for (const customer of customers) {
  console.log(`Provisioning ${customer.name}...`);
  const profilePath = path.join(knowledgeRoot, customer.id, "public-profile.md");
  if (!fs.existsSync(profilePath)) throw new Error(`Missing research profile for ${customer.name}: ${profilePath}`);
  const { store, fileMap } = await createKnowledgeStore(
    `clientsphere-${customer.id}-kb`,
    [{ path: profilePath, label: `${customer.name} public profile` }],
  );
  const agentName = `clientsphere-${customer.id}`;
  const agent = await upsertAgent({
    customerId: customer.id,
    name: agentName,
    description: `Public-source customer intelligence and meeting coach for ${customer.name}.`,
    instructions: buildCustomerInstructions(customer, indexedAt),
    modelDeployment: generalModel,
    mode: "general",
    vectorStoreId: store.id,
  });
  const useCaseAgents = {};
  for (const useCase of buildCustomerUseCases(customer)) {
    console.log(`  Creating ${useCase.name}...`);
    const useCaseAgentName = `clientsphere-${customer.id}-uc-${useCase.id}`;
    const useCaseAgent = await upsertAgent({
      customerId: customer.id,
      name: useCaseAgentName,
      description: `Synthetic ${useCase.name} demonstration for ${customer.name}.`,
      instructions: buildUseCaseInstructions(customer, useCase, indexedAt),
      modelDeployment: useCase.modelDeployment,
      mode: useCase.id,
      vectorStoreId: store.id,
    });
    useCaseAgents[useCase.id] = {
      agentName: useCaseAgentName,
      agentVersion: useCaseAgent.versions.latest.version,
      agentId: useCaseAgent.versions.latest.id,
      model: useCase.modelDeployment,
    };
  }
  await cleanupStores([
    previousMetadata?.customers?.[customer.id]?.vectorStoreId,
    previousMetadata?.customers?.[customer.id]?.general?.vectorStoreId,
    ...[...existingStoresByName.entries()]
      .filter(([name]) => name.startsWith(`clientsphere-${customer.id}-kb-`))
      .flatMap(([, stores]) => stores.map((store) => store.id)),
  ], store.id);
  metadata.customers[customer.id] = {
    agentName,
    agentVersion: agent.versions.latest.version,
    agentId: agent.versions.latest.id,
    vectorStoreId: store.id,
    fileMap,
    indexedAt,
    general: {
      agentName,
      agentVersion: agent.versions.latest.version,
      agentId: agent.versions.latest.id,
      model: generalModel,
    },
    useCases: useCaseAgents,
  };
}

console.log("Provisioning generic portfolio guide...");
const portfolioFiles = [
  { path: path.join(root, "config", "customers.json"), label: "ClientSphere customer catalogue" },
  ...customers.map((customer) => ({
    path: path.join(knowledgeRoot, customer.id, "public-profile.md"),
    label: `${customer.name} public profile`,
  })),
];
const portfolioKnowledge = await createKnowledgeStore("clientsphere-portfolio-kb", portfolioFiles);
const portfolioName = "clientsphere-portfolio";
const portfolioAgent = await upsertAgent({
  customerId: "portfolio",
  name: portfolioName,
  description: "Generic portfolio navigator for the ClientSphere customer catalogue.",
  instructions: `${BASE_INSTRUCTIONS}

You are the generic ClientSphere portfolio guide. Help the user select the right customer specialist and compare only public facts retrieved from the attached portfolio knowledge. Always name the customer attached to each fact and never blend customer identities.`,
  vectorStoreId: portfolioKnowledge.store.id,
  modelDeployment: generalModel,
  mode: "portfolio",
});
await cleanupStores([
  previousMetadata?.portfolio?.vectorStoreId,
  ...[...existingStoresByName.entries()]
    .filter(([name]) => name.startsWith("clientsphere-portfolio-kb-"))
    .flatMap(([, stores]) => stores.map((store) => store.id)),
], portfolioKnowledge.store.id);
metadata.portfolio = {
  agentName: portfolioName,
  agentVersion: portfolioAgent.versions.latest.version,
  agentId: portfolioAgent.versions.latest.id,
  vectorStoreId: portfolioKnowledge.store.id,
  fileMap: portfolioKnowledge.fileMap,
  indexedAt,
};

const payload = Buffer.from(JSON.stringify(metadata, null, 2));
fs.writeFileSync(outputPath, payload);
console.log(`Provisioned ${customers.length} customer agents plus the portfolio guide.`);
