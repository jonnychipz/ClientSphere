// setup-agent.mjs — provisions the Hubble Foundry agent: uploads the GitHub
// knowledge base, builds a vector store, and creates the agent with file_search.
// Re-running updates the existing agent in place. Auth: DefaultAzureCredential (az login).
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AIProjectClient } from "@azure/ai-projects";
import { ToolUtility } from "@azure/ai-agents";
import { DefaultAzureCredential } from "@azure/identity";
import { INSTRUCTIONS } from "./instructions.mjs";
import { FETCH_DOC_TOOL } from "./webgrounding.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENDPOINT = process.env.PROJECT_ENDPOINT;
const MODEL = process.env.MODEL_DEPLOYMENT || "gpt-5.4";
const KB_DIR = path.join(__dirname, "knowledge");
const META_PATH = path.join(__dirname, "agent-meta.json");


async function main() {
  if (!ENDPOINT) throw new Error("PROJECT_ENDPOINT missing in .env");
  console.log("→ Connecting to Foundry project:", ENDPOINT);
  const project = new AIProjectClient(ENDPOINT, new DefaultAzureCredential());
  const agents = project.agents;

  // 1. Upload knowledge base files
  const files = fs.readdirSync(KB_DIR).filter((f) => f.endsWith(".md"));
  console.log(`→ Uploading ${files.length} knowledge files…`);
  const fileMap = {};
  const fileIds = [];
  for (const name of files) {
    const stream = fs.createReadStream(path.join(KB_DIR, name));
    const uploaded = await agents.files.uploadAndPoll(stream, "assistants", { fileName: name });
    fileMap[uploaded.id] = name;
    fileIds.push(uploaded.id);
    console.log(`   ✓ ${name} → ${uploaded.id}`);
  }

  // 2. Build vector store over the KB
  console.log("→ Building vector store…");
  const vectorStore = await agents.vectorStores.createAndPoll({ fileIds, name: "hubble-github-kb" });
  console.log("   ✓ vector store:", vectorStore.id);

  // 3. Create the file_search tool bound to the vector store, plus the live
  //    web-grounding function tool (fetch_official_doc).
  const fileSearch = ToolUtility.createFileSearchTool([vectorStore.id]);
  const webTool = ToolUtility.createFunctionTool(FETCH_DOC_TOOL);

  // 4. Create (or recreate) the Hubble agent
  console.log("→ Creating Hubble agent on", MODEL, "…");
  const agent = await agents.createAgent(MODEL, {
    name: "Hubble — GitHub Seller Coach",
    instructions: INSTRUCTIONS,
    tools: [fileSearch.definition, webTool.definition],
    toolResources: fileSearch.resources,
    temperature: 0.7,
  });
  console.log("   ✓ agent:", agent.id);

  // 5. Persist metadata + update .env
  const meta = {
    agentId: agent.id,
    vectorStoreId: vectorStore.id,
    model: MODEL,
    fileMap,
    createdAt: new Date().toISOString(),
  };
  fs.writeFileSync(META_PATH, JSON.stringify(meta, null, 2));

  const envPath = path.join(__dirname, ".env");
  let env = fs.readFileSync(envPath, "utf8");
  env = env.replace(/^AGENT_ID=.*$/m, `AGENT_ID=${agent.id}`);
  env = env.replace(/^VECTOR_STORE_ID=.*$/m, `VECTOR_STORE_ID=${vectorStore.id}`);
  fs.writeFileSync(envPath, env);

  console.log("\n✅ Hubble is ready. AGENT_ID written to .env and agent-meta.json.");
}

main().catch((err) => {
  console.error("✗ Setup failed:", err);
  process.exit(1);
});
