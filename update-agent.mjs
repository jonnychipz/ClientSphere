// update-agent.mjs — updates the existing Hubble agent's instructions AND tools
// in place (keeps the same AGENT_ID + vector store). Auth: DefaultAzureCredential.
import "dotenv/config";
import { AIProjectClient } from "@azure/ai-projects";
import { ToolUtility } from "@azure/ai-agents";
import { DefaultAzureCredential } from "@azure/identity";
import { INSTRUCTIONS } from "./instructions.mjs";
import { FETCH_DOC_TOOL } from "./webgrounding.mjs";

const ENDPOINT = process.env.PROJECT_ENDPOINT;
const AGENT_ID = process.env.AGENT_ID;
const VECTOR_STORE_ID = process.env.VECTOR_STORE_ID;

async function main() {
  if (!ENDPOINT || !AGENT_ID) throw new Error("PROJECT_ENDPOINT and AGENT_ID required in .env (run npm run setup first)");
  const project = new AIProjectClient(ENDPOINT, new DefaultAzureCredential());

  const tools = [];
  let toolResources;
  if (VECTOR_STORE_ID) {
    const fileSearch = ToolUtility.createFileSearchTool([VECTOR_STORE_ID]);
    tools.push(fileSearch.definition);
    toolResources = fileSearch.resources;
  }
  tools.push(ToolUtility.createFunctionTool(FETCH_DOC_TOOL).definition);

  console.log("→ Updating agent", AGENT_ID, "(instructions + tools) …");
  const agent = await project.agents.updateAgent(AGENT_ID, {
    instructions: INSTRUCTIONS,
    tools,
    toolResources,
    temperature: 0.7,
  });
  console.log("✅ Updated:", agent.id, "| tools:", tools.map((t) => t.type).join(", "));
}

main().catch((err) => { console.error("✗ Update failed:", err); process.exit(1); });

