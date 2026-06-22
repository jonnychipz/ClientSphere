// update-agent.mjs — updates the existing Hubble agent's instructions in place
// (keeps the same AGENT_ID, vector store and file_search tool). Auth: DefaultAzureCredential.
import "dotenv/config";
import { AIProjectClient } from "@azure/ai-projects";
import { DefaultAzureCredential } from "@azure/identity";
import { INSTRUCTIONS } from "./instructions.mjs";

const ENDPOINT = process.env.PROJECT_ENDPOINT;
const AGENT_ID = process.env.AGENT_ID;

async function main() {
  if (!ENDPOINT || !AGENT_ID) throw new Error("PROJECT_ENDPOINT and AGENT_ID required in .env (run npm run setup first)");
  const project = new AIProjectClient(ENDPOINT, new DefaultAzureCredential());
  console.log("→ Updating agent", AGENT_ID, "…");
  const agent = await project.agents.updateAgent(AGENT_ID, {
    instructions: INSTRUCTIONS,
    temperature: 0.7,
  });
  console.log("✅ Updated:", agent.id, "(instructions length", INSTRUCTIONS.length + ")");
}

main().catch((err) => { console.error("✗ Update failed:", err); process.exit(1); });
