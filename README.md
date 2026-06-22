# Hubble — Your GitHub Sales Coach 🛰️

An AI voice + avatar coach that helps sellers get up to speed selling the **entire GitHub portfolio**. Hubble is deep product/commercial expert, researcher and sales coach in one — built on **Azure AI Foundry (GPT‑5.4)** with the **Agent framework**, a **real‑time talking avatar**, **speech‑to‑text**, and a clean single‑page web app.

![Hubble live](hubble-live.png)

## What it does
- **Deep expert** — answers on every GitHub product, **pricing in USD / GBP / EUR**, and licensing rules, **grounded in a knowledge base with citations**.
- **Researcher** — synthesises and explains tricky concepts (e.g. the *active committer* model) with sources.
- **Coach** — asks you qualifying questions, hands you customer discovery questions, positioning, objection handling and a next step.
- **Voice assistant on/off** — toggle a live, lip‑synced **talking avatar** that speaks Hubble's replies.
- **Avatar choice** — switch between a **female (Lisa)** and **male (Harry)** avatar, each with a selectable neural **voice** (British / US / Australian).
- **Type or talk** — full text chat plus a **microphone** (speech‑to‑text) input.

## Architecture
```
Browser SPA (public/)
  ├── Chat UI ──────────────► POST /api/chat ──► Azure AI Foundry Agent (gpt‑5.4)
  │                                              └─ file_search over GitHub KB (vector store) → citations
  ├── Talking avatar (WebRTC) ─ GET /api/relay-token ─► Azure Speech avatar relay (ICE)
  └── STT + avatar TTS ──────── GET /api/speech-token ─► Speech token (keyless)

Backend (server.mjs, Express, Node)
  └── DefaultAzureCredential (Entra ID) — keyless throughout
      └─ exchanges an Entra token for a Speech token via the AIServices custom‑domain STS
```

### Azure resources (Sweden Central)
| Resource | Purpose |
|----------|---------|
| `hubble-foundry` (AIServices) + project `hubble-proj` | Foundry project hosting the agent |
| `gpt-5.4` deployment | The agent model |
| `hubble-foundry` custom‑domain STS | Mints keyless Speech tokens (Entra → Speech token) |
| Azure Speech (Sweden Central) | Real‑time TTS avatar + speech‑to‑text |

> **Auth is 100% keyless (Microsoft Entra ID).** No API keys are stored or sent to the browser. The tenant enforces `disableLocalAuth`, so the backend uses `DefaultAzureCredential` and brokers short‑lived Speech tokens to the client.

## Project layout
```
.
├── knowledge/                 GitHub product/pricing/licensing/coaching KB (→ vector store)
├── public/                    Single‑page app (index.html, styles.css, app.js)
├── setup-agent.mjs            Uploads KB, builds vector store, creates the Hubble agent
├── server.mjs                 Express backend (chat proxy + token brokers + static)
├── agent-meta.json            Generated: agent id, vector store id, file→source map
└── .env                       Config (no secrets — endpoints + ids only)
```

## Prerequisites
- Node.js 20+ and Azure CLI, signed in: `az login` (account with **Cognitive Services User** on the Foundry + Speech resources).
- The Azure resources above (already provisioned in the sandbox subscription).

## Run it
```powershell
npm install
npm run setup     # one‑time: creates the agent + vector store, writes AGENT_ID to .env
npm start         # serves http://localhost:3000
```
Then open **http://localhost:3000**, ask a question, and click **Voice assistant: Off → On** to bring the avatar to life. Use the **Female/Male** toggle and **Voice** dropdown to change the presenter. Click the **🎙️** to talk.

## API
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/config` | GET | Agent name, voice + avatar catalogue |
| `/api/chat` | POST | `{ message, threadId? }` → `{ threadId, reply, citations[] }` |
| `/api/speech-token` | GET | Keyless Speech auth token + region (for browser SDK) |
| `/api/relay-token` | GET | ICE/relay servers for the avatar WebRTC peer connection |

## Notes
- Pricing in the knowledge base was **verified June 2026**; Hubble always reminds sellers to confirm live pricing at github.com/pricing before quoting formally. GBP/EUR figures are indicative conversions, not GitHub's billed local price.
- To re‑provision the agent after editing the KB, just re‑run `npm run setup`.
