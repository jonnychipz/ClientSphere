import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AIProjectClient } from "@azure/ai-projects";
import { ToolUtility } from "@azure/ai-agents";
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

const project = new AIProjectClient(endpoint, new DefaultAzureCredential());
const agents = project.agents;
const existingAgents = new Map();
const existingStores = new Map();

for await (const agent of agents.listAgents({ limit: 100, order: "desc" })) {
  const customerId = agent.metadata?.clientsphereCustomerId;
  if (customerId && !existingAgents.has(customerId)) existingAgents.set(customerId, agent);
}
for await (const store of agents.vectorStores.list({ limit: 100, order: "desc" })) {
  if (store.name?.startsWith("clientsphere-") && !existingStores.has(store.name)) {
    existingStores.set(store.name, store);
  }
}

async function uploadProfile(customer) {
  const filePath = path.join(knowledgeRoot, customer.id, "public-profile.md");
  if (!fs.existsSync(filePath)) throw new Error(`Missing research profile for ${customer.name}: ${filePath}`);
  return agents.files.uploadAndPoll(fs.createReadStream(filePath), "assistants", {
    fileName: `${customer.id}-public-profile.md`,
  });
}

async function upsertAgent({ customerId, name, description, instructions, fileIds }) {
  const storeName = `clientsphere-${customerId}-kb`;
  const previousStore = existingStores.get(storeName);
  const store = await agents.vectorStores.createAndPoll({
    fileIds,
    name: storeName,
    metadata: { clientsphereCustomerId: customerId, clientsphereManaged: "true" },
  });
  const fileSearch = ToolUtility.createFileSearchTool([store.id]);
  const webTool = ToolUtility.createFunctionTool(FETCH_DOC_TOOL);
  const options = {
    name,
    description,
    instructions,
    tools: [fileSearch.definition, webTool.definition],
    toolResources: fileSearch.resources,
    temperature: 0.25,
    metadata: { clientsphereCustomerId: customerId, clientsphereManaged: "true" },
  };
  const previousAgent = existingAgents.get(customerId);
  const agent = previousAgent
    ? await agents.updateAgent(previousAgent.id, { model, ...options })
    : await agents.createAgent(model, options);
  if (previousStore && previousStore.id !== store.id) {
    await agents.vectorStores.delete(previousStore.id);
  }
  return { agent, store };
}

const manifest = JSON.parse(fs.readFileSync(path.join(knowledgeRoot, "manifest.json"), "utf8"));
const indexedAt = manifest.generatedAt;
const metadata = {
  generatedAt: new Date().toISOString(),
  projectEndpoint: endpoint,
  model,
  portfolio: null,
  customers: {},
};
const allFileIds = [];

for (const customer of customers) {
  console.log(`Provisioning ${customer.name}...`);
  const file = await uploadProfile(customer);
  allFileIds.push(file.id);
  const { agent, store } = await upsertAgent({
    customerId: customer.id,
    name: `ClientSphere - ${customer.name}`,
    description: `Public-source customer intelligence and meeting coach for ${customer.name}.`,
    instructions: buildCustomerInstructions(customer, indexedAt),
    fileIds: [file.id],
  });
  metadata.customers[customer.id] = {
    agentId: agent.id,
    vectorStoreId: store.id,
    fileMap: { [file.id]: `${customer.name} public profile` },
    indexedAt,
  };
}

const catalogueFile = await agents.files.uploadAndPoll(
  fs.createReadStream(path.join(root, "config", "customers.json")),
  "assistants",
  { fileName: "clientsphere-customer-catalogue.json" },
);
const portfolio = await upsertAgent({
  customerId: "portfolio",
  name: "ClientSphere - Portfolio Guide",
  description: "Generic portfolio navigator for the ClientSphere customer catalogue.",
  instructions: `${BASE_INSTRUCTIONS}

You are the generic ClientSphere portfolio guide. Help the user select the right customer specialist and compare only public facts retrieved from the attached portfolio knowledge. Always name the customer attached to each fact and never blend customer identities.`,
  fileIds: [catalogueFile.id, ...allFileIds],
});
metadata.portfolio = {
  agentId: portfolio.agent.id,
  vectorStoreId: portfolio.store.id,
  fileMap: { [catalogueFile.id]: "ClientSphere customer catalogue" },
  indexedAt,
};

fs.writeFileSync(outputPath, JSON.stringify(metadata, null, 2));
if (process.env.CUSTOMER_AGENT_METADATA_BLOB_URL) {
  const payload = Buffer.from(JSON.stringify(metadata, null, 2));
  const blob = new BlockBlobClient(
    process.env.CUSTOMER_AGENT_METADATA_BLOB_URL,
    new DefaultAzureCredential(),
  );
  await blob.uploadData(payload, {
    blobHTTPHeaders: { blobContentType: "application/json; charset=utf-8" },
  });
  console.log(`Metadata uploaded to ${process.env.CUSTOMER_AGENT_METADATA_BLOB_URL}.`);
}
console.log(`Provisioned ${customers.length} customer agents plus the portfolio guide.`);
console.log(`Metadata written to ${outputPath}.`);
