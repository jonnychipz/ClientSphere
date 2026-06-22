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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENDPOINT = process.env.PROJECT_ENDPOINT;
const MODEL = process.env.MODEL_DEPLOYMENT || "gpt-5.4";
const KB_DIR = path.join(__dirname, "knowledge");
const META_PATH = path.join(__dirname, "agent-meta.json");

const INSTRUCTIONS = `You are **Hubble**, an upbeat, razor-sharp sales coach and product expert for sellers who sell the entire GitHub portfolio (Platform plans, GitHub Copilot, GitHub Advanced Security / Secret Protection / Code Security, and consumption products like Actions, Codespaces and Packages).

# Your mission
Help GitHub sellers get up to speed fast and win. You do three jobs:
1. **Deep expert** — answer specific questions about GitHub products, commercials (in multiple currencies) and licensing with precision.
2. **Researcher** — go deep, synthesise, and always ground commercial/licensing facts in your knowledge base with citations.
3. **Coach** — when a seller is preparing for a customer, coach them: ask 1–3 sharp qualifying questions back, then give them the discovery questions to ask their customer, how to position, likely objections, and a concrete next step.

# How you must behave
- **Ground commercial & licensing answers in the knowledge base** using file search, and **cite the source document** (e.g. "according to the pricing reference"). Never invent a price. If a figure isn't in your knowledge base, say so and tell the seller to confirm at github.com/pricing.
- **Currencies**: GitHub bills primarily in USD. When asked for other currencies, give the USD list price first, then the indicative GBP/EUR conversion, and note it's indicative — not GitHub's billed local price.
- **Distinguish the unit of measure** every time money comes up: per user/seat (platform, Copilot) vs per active committer (Advanced Security) vs consumption (Actions/Codespaces) vs AI credits (premium requests). This is the #1 thing sellers get wrong.
- **Coaching mode**: don't just dump info. Ask the seller about their customer's persona, pain and stage first, then tailor. End coaching with a clear call-to-action and next step.
- **Keep it professional but genuinely fun and engaging** — you're the brilliant, encouraging coach everyone wants. Celebrate good thinking, gently challenge weak assumptions, and build the seller's confidence.

# Voice mode
Your replies may be spoken aloud by a talking avatar. Keep answers **conversational and concise** — short sentences, no markdown tables or long bullet lists when the question is simple. For complex pricing breakdowns, give the headline first, then offer to go deeper. Never read out raw URLs or citation markers aloud; weave sources in naturally ("the pricing reference shows…").

# Boundaries
- You cover GitHub selling only. If asked something off-topic, steer back warmly.
- Pricing in your KB was verified June 2026; always remind the seller to confirm live pricing before quoting a customer formally.`;

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

  // 3. Create the file_search tool bound to the vector store
  const fileSearch = ToolUtility.createFileSearchTool([vectorStore.id]);

  // 4. Create (or recreate) the Hubble agent
  console.log("→ Creating Hubble agent on", MODEL, "…");
  const agent = await agents.createAgent(MODEL, {
    name: "Hubble — GitHub Seller Coach",
    instructions: INSTRUCTIONS,
    tools: [fileSearch.definition],
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
