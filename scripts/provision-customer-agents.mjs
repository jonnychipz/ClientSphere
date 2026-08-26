import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AIProjectClient } from "@azure/ai-projects";
import { DefaultAzureCredential } from "@azure/identity";
import { BlockBlobClient } from "@azure/storage-blob";
import { customers } from "../customer-registry.mjs";
import { buildCustomerInstructions, BASE_INSTRUCTIONS } from "../instructions.mjs";
import { FETCH_DOC_TOOL } from "../webgrounding.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const endpoint = process.env.PROJECT_ENDPOINT;
const model = process.env.MODEL_DEPLOYMENT || "gpt-5.4";
const knowledgeRoot = path.join(root, "knowledge", "customers");
const outputPath = path.join(root, "customer-agents.json");
if (!endpoint) throw new Error("PROJECT_ENDPOINT is required.");

const credential = new DefaultAzureCredential();
const project = new AIProjectClient(endpoint, credential);
const openAI = project.getOpenAIClient();
const existingAgents = new Set();
let previousMetadata = null;

for await (const agent of project.agents.list({ limit: 100, order: "desc" })) {
  existingAgents.add(agent.name);
}

if (process.env.CUSTOMER_AGENT_METADATA_BLOB_URL) {
  try {
    const blob = new BlockBlobClient(process.env.CUSTOMER_AGENT_METADATA_BLOB_URL, credential);
    previousMetadata = JSON.parse((await blob.downloadToBuffer()).toString("utf8"));
  } catch (error) {
    if (error.statusCode !== 404 && error.status !== 404) {
      console.warn(`Could not load previous agent metadata: ${error.message || error.code}`);
    }
  }
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

async function createKnowledgeStore(storeName, files) {
  const store = await openAI.vectorStores.create({ name: storeName });
  const fileMap = {};
  try {
    for (const file of files) {
      const uploaded = await openAI.vectorStores.files.uploadAndPoll(
        store.id,
        fs.createReadStream(file.path),
      );
      fileMap[uploaded.id] = file.label;
    }
  } catch (error) {
    await openAI.vectorStores.del(store.id).catch(() => {});
    throw error;
  }
  return { store, fileMap };
}

async function upsertAgent({
  customerId,
  name,
  description,
  instructions,
  vectorStoreId,
  previousStoreId,
}) {
  const definition = {
    kind: "prompt",
    model,
    instructions,
    tools: [
      { type: "file_search", vector_store_ids: [vectorStoreId] },
      functionTool,
    ],
  };
  const options = {
    description,
    metadata: {
      clientsphereCustomerId: customerId,
      clientsphereManaged: "true",
    },
  };
  const agent = existingAgents.has(name)
    ? await project.agents.update(name, definition, options)
    : await project.agents.create(name, definition, options);
  if (previousStoreId && previousStoreId !== vectorStoreId) {
    await openAI.vectorStores.del(previousStoreId).catch((error) => {
      console.warn(`Could not delete previous vector store ${previousStoreId}: ${error.message}`);
    });
  }
  return agent;
}

const manifest = JSON.parse(fs.readFileSync(path.join(knowledgeRoot, "manifest.json"), "utf8"));
const indexedAt = manifest.generatedAt;
const metadata = {
  generatedAt: new Date().toISOString(),
  projectEndpoint: endpoint,
  model,
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
    vectorStoreId: store.id,
    previousStoreId: previousMetadata?.customers?.[customer.id]?.vectorStoreId,
  });
  metadata.customers[customer.id] = {
    agentName,
    agentVersion: agent.versions.latest.version,
    agentId: agent.versions.latest.id,
    vectorStoreId: store.id,
    fileMap,
    indexedAt,
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
  previousStoreId: previousMetadata?.portfolio?.vectorStoreId,
});
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
if (process.env.CUSTOMER_AGENT_METADATA_BLOB_URL) {
  const blob = new BlockBlobClient(process.env.CUSTOMER_AGENT_METADATA_BLOB_URL, credential);
  await blob.uploadData(payload, {
    blobHTTPHeaders: { blobContentType: "application/json; charset=utf-8" },
  });
  console.log(`Metadata uploaded to ${process.env.CUSTOMER_AGENT_METADATA_BLOB_URL}.`);
}
console.log(`Provisioned ${customers.length} customer agents plus the portfolio guide.`);
