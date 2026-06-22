// server.mjs — Hubble backend. Serves the SPA, brokers keyless Azure Speech
// auth tokens for the browser avatar, and proxies chat to the Foundry agent.
// Auth everywhere: DefaultAzureCredential (az login locally / managed identity in cloud).
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { AIProjectClient } from "@azure/ai-projects";
import { DefaultAzureCredential } from "@azure/identity";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const ENDPOINT = process.env.PROJECT_ENDPOINT;
const AGENT_ID = process.env.AGENT_ID;
const SPEECH_REGION = process.env.SPEECH_REGION;
const SPEECH_STS_ENDPOINT = process.env.SPEECH_STS_ENDPOINT;

if (!ENDPOINT || !AGENT_ID) {
  console.error("Missing PROJECT_ENDPOINT or AGENT_ID. Run `npm run setup` first.");
  process.exit(1);
}

const credential = new DefaultAzureCredential();
const project = new AIProjectClient(ENDPOINT, credential);
const agents = project.agents;

// Resolve uploaded-file ids -> friendly source names for citations
let fileMap = {};
try {
  fileMap = JSON.parse(fs.readFileSync(path.join(__dirname, "agent-meta.json"), "utf8")).fileMap || {};
} catch { /* optional */ }
const prettySource = (name) =>
  (name || "knowledge base")
    .replace(/^\d+-/, "")
    .replace(/\.md$/, "")
    .replace(/-/g, " ");

// ---- Voice + avatar catalogue offered in the UI ----
const VOICES = {
  female: [
    { id: "en-GB-SoniaNeural", label: "Sonia — British English" },
    { id: "en-US-AvaMultilingualNeural", label: "Ava — US English (multilingual)" },
    { id: "en-US-JennyNeural", label: "Jenny — US English" },
    { id: "en-AU-NatashaNeural", label: "Natasha — Australian English" },
  ],
  male: [
    { id: "en-GB-RyanNeural", label: "Ryan — British English" },
    { id: "en-US-AndrewMultilingualNeural", label: "Andrew — US English (multilingual)" },
    { id: "en-US-GuyNeural", label: "Guy — US English" },
    { id: "en-AU-WilliamNeural", label: "William — Australian English" },
  ],
};
// Real-time TTS avatar characters/styles supported by Azure
const AVATARS = {
  female: { character: "lisa", style: "casual-sitting", defaultVoice: "en-GB-SoniaNeural" },
  male: { character: "harry", style: "business", defaultVoice: "en-GB-RyanNeural" },
};

// ---- Cached Speech authorization token for the browser SDK (keyless) ----
// Exchanges an Entra token for a 10-min Speech token via the custom-domain STS.
let cachedToken = null; // { value, expiresOnMs }
async function getSpeechToken() {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresOnMs - now > 60_000) return cachedToken;
  const aad = await credential.getToken("https://cognitiveservices.azure.com/.default");
  const r = await fetch(SPEECH_STS_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${aad.token}`, "Content-Length": "0" },
  });
  if (!r.ok) throw new Error(`issueToken ${r.status}: ${await r.text()}`);
  const speechToken = await r.text();
  cachedToken = { value: speechToken, expiresOnMs: now + 9 * 60_000 };
  return cachedToken;
}

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/config", (req, res) => {
  res.json({
    agentName: "Hubble",
    tagline: "Your GitHub sales coach",
    speechRegion: SPEECH_REGION,
    voices: VOICES,
    avatars: AVATARS,
  });
});

app.get("/api/speech-token", async (req, res) => {
  try {
    const t = await getSpeechToken();
    res.json({ token: t.value, region: SPEECH_REGION, expiresOn: t.expiresOnMs });
  } catch (err) {
    console.error("speech-token error:", err.message);
    res.status(500).json({ error: "Could not mint speech token", detail: err.message });
  }
});

// Server-side relay (ICE) token for the real-time avatar WebRTC peer connection.
app.get("/api/relay-token", async (req, res) => {
  try {
    const t = await getSpeechToken();
    const url = `https://${SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/avatar/relay/token/v1`;
    const r = await fetch(url, { headers: { Authorization: `Bearer ${t.value}` } });
    if (!r.ok) {
      const detail = await r.text();
      return res.status(502).json({ error: `Relay token ${r.status}`, detail });
    }
    res.json(await r.json());
  } catch (err) {
    console.error("relay-token error:", err.message);
    res.status(500).json({ error: "Could not get relay token", detail: err.message });
  }
});

// Extract assistant text + citations from the latest assistant message
function renderAssistantMessage(msg) {
  let text = "";
  const citations = [];
  const seen = new Set();
  for (const part of msg.content || []) {
    if (part.type !== "text" || !part.text) continue;
    // Collect unique sources for the citation chips
    for (const ann of part.text.annotations || []) {
      const fileId = ann.fileCitation?.fileId || ann.filePath?.fileId;
      const src = prettySource(fileMap[fileId]);
      if (!seen.has(src)) { seen.add(src); citations.push(src); }
    }
    text += part.text.value || "";
  }
  // Strip file_search citation markers (【4:2†source】) cleanly by pattern only.
  text = text
    .replace(/\u3010[^\u3011]*\u3011/g, "") // full 【...】 tokens
    .replace(/[\u3010\u3011]/g, "")          // any orphan brackets
    .replace(/\[\d+\]/g, "")
    .replace(/ {2,}/g, " ")
    .replace(/ +([.,;:])/g, "$1")
    .replace(/\n{3,}/g, "\n\n");
  return { text: text.trim(), citations };
}

app.post("/api/chat", async (req, res) => {
  const { message, threadId } = req.body || {};
  if (!message || !message.trim()) return res.status(400).json({ error: "message required" });
  try {
    const tid = threadId || (await agents.threads.create()).id;
    await agents.messages.create(tid, "user", message);
    const run = await agents.runs.createAndPoll(tid, AGENT_ID);
    if (run.status !== "completed") {
      return res.status(502).json({ error: `Run ${run.status}`, detail: run.lastError?.message });
    }
    // newest assistant message
    const list = agents.messages.list(tid, { order: "desc", limit: 10 });
    let reply = "", citations = [];
    for await (const m of list) {
      if (m.role === "assistant") { ({ text: reply, citations } = renderAssistantMessage(m)); break; }
    }
    res.json({ threadId: tid, reply, citations });
  } catch (err) {
    console.error("chat error:", err);
    res.status(500).json({ error: "Chat failed", detail: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n🛰  Hubble running at http://localhost:${PORT}`);
  console.log(`   Agent: ${AGENT_ID}`);
  console.log(`   Speech region: ${SPEECH_REGION} (keyless AAD)\n`);
});
