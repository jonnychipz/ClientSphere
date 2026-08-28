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
import { buildCustomerSyntheticUseCases, getGeneralModelDeployment } from "../use-case-registry.mjs";
import { buildCustomerAgentTools } from "../agent-tooling.mjs";
import {
  MANUFACTURING_LIVE_MODE_ID, MANUFACTURING_ORCHESTRATOR_INSTRUCTIONS,
  MANUFACTURING_ORCHESTRATOR_NAME, MANUFACTURING_SPECIALISTS,
  MANUFACTURING_TOOLBOX_CONNECTION_NAME, MANUFACTURING_TOOLBOX_NAME,
} from "../manufacturing-live.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const endpoint = process.env.PROJECT_ENDPOINT;
const projectResourceId = process.env.FOUNDRY_PROJECT_RESOURCE_ID;
const generalModel = getGeneralModelDeployment();
const knowledgeRoot = path.join(root, "knowledge", "customers");
const outputPath = path.join(root, "customer-agents.json");
if (!endpoint) throw new Error("PROJECT_ENDPOINT is required.");
if (!projectResourceId) throw new Error("FOUNDRY_PROJECT_RESOURCE_ID is required.");

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
  tools,
  extraMetadata = {},
}) {
  const definition = {
    kind: "prompt",
    model: modelDeployment,
    instructions,
    tools: tools || buildCustomerAgentTools(vectorStoreId, {
      enableWebSearch: mode === "general",
      enableCodeInterpreter: mode !== "general" && mode !== "portfolio",
    }),
  };
  const options = {
    description,
    metadata: {
      clientsphereCustomerId: customerId,
      clientsphereMode: mode,
      clientsphereManaged: "true",
      ...extraMetadata,
    },
  };
  const agent = existingAgents.has(name)
    ? await project.agents.update(name, definition, options)
    : await project.agents.create(name, definition, options);
  return agent;
}

async function enableIncomingA2A(specialist) {
  const access = await credential.getToken("https://ai.azure.com/.default");
  const response = await fetch(`${endpoint}/agents/${encodeURIComponent(specialist.agentName)}?api-version=v1`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${access.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      agent_card: {
        version: "1.0",
        description: specialist.description,
        skills: [{
          id: specialist.id,
          name: specialist.name,
          description: specialist.summary,
        }],
      },
      agent_endpoint: {
        protocol_configuration: {
          responses: {},
          a2a: {},
        },
      },
    }),
  });
  if (!response.ok) {
    throw new Error(`Could not enable A2A for ${specialist.name}: ${response.status} ${await response.text()}`);
  }
}

async function ensureA2AConnection(specialist) {
  const access = await credential.getToken("https://management.azure.com/.default");
  const target = `${endpoint}/agents/${specialist.agentName}/endpoint/protocols/a2a`;
  const response = await fetch(
    `https://management.azure.com${projectResourceId}/connections/${specialist.a2aConnectionName}?api-version=2025-04-01-preview`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${access.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: specialist.a2aConnectionName,
        type: "Microsoft.MachineLearningServices/workspaces/connections",
        properties: {
          authType: "UserEntraToken",
          group: "ServicesAndApps",
          category: "RemoteA2A",
          target,
          isSharedToAll: true,
          sharedUserList: [],
          Credentials: {},
          metadata: { ApiType: "Azure", audience: "https://ai.azure.com" },
        },
      }),
    },
  );
  if (!response.ok) {
    throw new Error(`Could not create A2A connection for ${specialist.name}: ${response.status} ${await response.text()}`);
  }
  return project.connections.get(specialist.a2aConnectionName);
}

async function ensureToolboxConnection(toolboxUrl) {
  const access = await credential.getToken("https://management.azure.com/.default");
  const response = await fetch(
    `https://management.azure.com${projectResourceId}/connections/${MANUFACTURING_TOOLBOX_CONNECTION_NAME}?api-version=2025-04-01-preview`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${access.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: MANUFACTURING_TOOLBOX_CONNECTION_NAME,
        type: "Microsoft.MachineLearningServices/workspaces/connections",
        properties: {
          authType: "UserEntraToken",
          group: "ServicesAndApps",
          category: "RemoteTool",
          target: toolboxUrl,
          isSharedToAll: true,
          sharedUserList: [],
          Credentials: {},
          metadata: { ApiType: "Azure", audience: "https://ai.azure.com" },
        },
      }),
    },
  );
  if (!response.ok) {
    throw new Error(`Could not create manufacturing toolbox connection: ${response.status} ${await response.text()}`);
  }
  return project.connections.get(MANUFACTURING_TOOLBOX_CONNECTION_NAME);
}

async function ensureFabricMcpConnection(specialist) {
    const workspaceId = (process.env.FABRIC_WORKSPACE_ID || "").trim();
    const artifactId = (process.env[specialist.fabricAgentIdVariable] || "").trim();
    if (!workspaceId || !artifactId) {
      throw new Error(
        `Both FABRIC_WORKSPACE_ID and ${specialist.fabricAgentIdVariable} are required to configure ${specialist.name}.`,
      );
    }
    const guidPattern = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
    if (!guidPattern.test(workspaceId) || !guidPattern.test(artifactId)) {
      throw new Error(`Fabric workspace and Data Agent IDs for ${specialist.name} must be valid GUIDs.`);
    }
    const fabricApi = "https://api.fabric.microsoft.com";
    const serverUrl = `${fabricApi}/v1/mcp/workspaces/${workspaceId}/dataagents/${artifactId}/agent`;
    const access = await credential.getToken("https://management.azure.com/.default");
    const response = await fetch(
      `https://management.azure.com${projectResourceId}/connections/${specialist.mcpConnectionName}?api-version=2025-04-01-preview`,
      {
        method: "PUT",
        headers: {
          Authorization: "Bearer " + access.token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: specialist.mcpConnectionName,
          type: "Microsoft.MachineLearningServices/workspaces/connections",
          properties: {
            authType: "UserEntraToken",
            group: "ServicesAndApps",
            category: "RemoteTool",
            target: serverUrl,
            audience: fabricApi,
            isSharedToAll: true,
            sharedUserList: [],
            Credentials: {},
            metadata: { ApiType: "Azure", type: "generic_mcp", audience: fabricApi },
          },
        }),
      },
    );
    if (!response.ok) {
      throw new Error(`Could not reconcile Fabric MCP connection for ${specialist.name}: ${response.status} ${await response.text()}`);
    }
    return {
      artifactId,
      serverUrl,
      connection: await project.connections.get(specialist.mcpConnectionName),
    };
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
  liveManufacturing: null,
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
  for (const useCase of buildCustomerSyntheticUseCases(customer)) {
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

const workspaceId = (process.env.FABRIC_WORKSPACE_ID || "").trim();
const configuredArtifactIds = MANUFACTURING_SPECIALISTS
  .map((specialist) => (process.env[specialist.fabricAgentIdVariable] || "").trim());
const hasAnyLiveBinding = Boolean(workspaceId || configuredArtifactIds.some(Boolean));
const hasEveryLiveBinding = Boolean(workspaceId && configuredArtifactIds.every(Boolean));

if (hasAnyLiveBinding && !hasEveryLiveBinding) {
  throw new Error("Live Fabric configuration is incomplete. Set FABRIC_WORKSPACE_ID and all four FABRIC_*_AGENT_ID values.");
}

if (!hasEveryLiveBinding) {
  console.warn("Live Fabric agent provisioning skipped; no complete direct Data Agent MCP configuration was supplied.");
} else {
  console.log("Provisioning direct live Fabric Data Agent MCP tools...");
  const liveAgents = {};
  const directFabricTools = [];
  for (const specialist of MANUFACTURING_SPECIALISTS) {
    const binding = await ensureFabricMcpConnection(specialist);
    directFabricTools.push({
      type: "mcp",
      server_label: specialist.mcpServerLabel,
      server_url: binding.serverUrl,
      require_approval: "never",
      project_connection_id: binding.connection.id,
    });
    liveAgents[specialist.id] = {
      name: specialist.name,
      fabricAgentId: binding.artifactId,
      workspaceId,
      serverLabel: specialist.mcpServerLabel,
      mcpConnectionName: specialist.mcpConnectionName,
      mcpConnectionId: binding.connection.id,
    };
    console.log(`  ${specialist.name}: ${binding.artifactId}`);
  }

  const orchestrator = await upsertAgent({
    customerId: "shared-manufacturing",
    name: MANUFACTURING_ORCHESTRATOR_NAME,
    description: "Routes one ClientSphere live conversation directly across four published Fabric Data Agents.",
    instructions: MANUFACTURING_ORCHESTRATOR_INSTRUCTIONS,
    modelDeployment: generalModel,
    mode: MANUFACTURING_LIVE_MODE_ID,
    tools: directFabricTools,
    extraMetadata: {
      clientsphereRole: "orchestrator",
      clientsphereArchitecture: "direct-fabric-mcp",
    },
  });
  metadata.liveManufacturing = {
    modeId: MANUFACTURING_LIVE_MODE_ID,
    architecture: "direct-fabric-mcp",
    orchestrator: {
      agentName: MANUFACTURING_ORCHESTRATOR_NAME,
      agentVersion: orchestrator.versions.latest.version,
      agentId: orchestrator.versions.latest.id,
      model: generalModel,
      toolCount: directFabricTools.length,
    },
    agents: liveAgents,
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
const liveAgentCount = Object.keys(metadata.liveManufacturing?.agents || {}).length;
console.log(`Provisioned ${customers.length} customer agent sets, ${liveAgentCount} shared live Fabric specialists, and the portfolio guide.`);
