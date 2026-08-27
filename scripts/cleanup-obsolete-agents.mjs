import "dotenv/config";
import { AIProjectClient } from "@azure/ai-projects";
import { DefaultAzureCredential } from "@azure/identity";
import { customers } from "../customer-registry.mjs";
import { buildCustomerSyntheticUseCases } from "../use-case-registry.mjs";
import { MANUFACTURING_ORCHESTRATOR_NAME, MANUFACTURING_SPECIALISTS } from "../manufacturing-live.mjs";

const endpoint = process.env.PROJECT_ENDPOINT;
if (!endpoint) throw new Error("PROJECT_ENDPOINT is required.");

const project = new AIProjectClient(endpoint, new DefaultAzureCredential());
const openAI = project.getOpenAIClient();
const validAgentNames = new Set(["clientsphere-portfolio"]);
const validStorePrefixes = new Set(["clientsphere-portfolio-kb-"]);
for (const specialist of MANUFACTURING_SPECIALISTS) validAgentNames.add(specialist.agentName);
validAgentNames.add(MANUFACTURING_ORCHESTRATOR_NAME);
for (const customer of customers) {
  validAgentNames.add(`clientsphere-${customer.id}`);
  validStorePrefixes.add(`clientsphere-${customer.id}-kb-`);
  for (const useCase of buildCustomerSyntheticUseCases(customer)) {
    validAgentNames.add(`clientsphere-${customer.id}-uc-${useCase.id}`);
  }
}

async function retry(label, operation) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try { return await operation(); }
    catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
    }
  }
  throw new Error(`${label} failed: ${lastError.message}`);
}

let deletedAgents = 0;
for await (const agent of project.agents.list({ limit: 100, order: "desc" })) {
  if (!agent.name.startsWith("clientsphere-") || validAgentNames.has(agent.name)) continue;
  await retry(`Delete agent ${agent.name}`, () => project.agents.delete(agent.name, { force: true }));
  deletedAgents++;
  console.log(`Deleted obsolete agent ${agent.name}`);
}

let deletedStores = 0;
for await (const store of openAI.vectorStores.list({ limit: 100, order: "desc" })) {
  if (!store.name?.startsWith("clientsphere-")) continue;
  if ([...validStorePrefixes].some((prefix) => store.name.startsWith(prefix))) continue;
  await retry(`Delete vector store ${store.id}`, () => openAI.vectorStores.delete(store.id));
  deletedStores++;
  console.log(`Deleted obsolete vector store ${store.id}`);
}

console.log(`Obsolete cleanup complete: ${deletedAgents} agents, ${deletedStores} vector stores.`);
