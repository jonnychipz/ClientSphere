export const MANUFACTURING_LIVE_MODE_ID = "manufacturing-live";
export const MANUFACTURING_ORCHESTRATOR_NAME = "clientsphere-live-manufacturing-orchestrator";

export const MANUFACTURING_SPECIALISTS = Object.freeze([
  Object.freeze({
    id: "factory-pulse",
    name: "Factory Pulse",
    icon: "activity",
    fabricAgentIdVariable: "FABRIC_FACTORY_PULSE_AGENT_ID",
    mcpConnectionName: "mcp-live-factory-pulse",
    mcpServerLabel: "factory_pulse",
    summary: "Current machine state, alerts, work orders, customers, and live operating signals.",
    prompt: "Show the latest live readings for every machine and highlight anything needing attention.",
  }),
  Object.freeze({
    id: "reliability",
    name: "Reliability",
    icon: "settings",
    fabricAgentIdVariable: "FABRIC_RELIABILITY_AGENT_ID",
    mcpConnectionName: "mcp-live-reliability",
    mcpServerLabel: "reliability",
    summary: "Condition signals, downtime, criticality, maintenance history, and intervention priority.",
    prompt: "Where should maintenance focus first based on live condition, OEE, downtime, and spend?",
  }),
  Object.freeze({
    id: "quality",
    name: "Quality & SPEC-05",
    icon: "scan",
    fabricAgentIdVariable: "FABRIC_QUALITY_AGENT_ID",
    mcpConnectionName: "mcp-live-quality",
    mcpServerLabel: "quality",
    summary: "Scrap, inspection evidence, work-order pass rates, and live spectrometer composition.",
    prompt: "What is the latest SPEC-05 gas quality reading, and does the recorded evidence show a pass?",
  }),
  Object.freeze({
    id: "delivery-impact",
    name: "Delivery Impact",
    icon: "route",
    fabricAgentIdVariable: "FABRIC_DELIVERY_IMPACT_AGENT_ID",
    mcpConnectionName: "mcp-live-delivery-impact",
    mcpServerLabel: "delivery_impact",
    summary: "Live disruption connected to work-order priority, customer tier, quality, and commercial exposure.",
    prompt: "Which live machine issues are affecting customer work right now, and what should be prioritised?",
  }),
]);

export const MANUFACTURING_ORCHESTRATOR_INSTRUCTIONS = `You are the Manufacturing Shopfloor Live orchestrator for the Celyn Components Line A demo plant at PLANT-CARDIFF.

# Mandatory delegation
- You have four direct MCP tools backed by published Fabric Data Agents: factory_pulse, reliability, quality, and delivery_impact.
- Use at least one specialist tool for every data question. Never answer a data question from model memory.
- The ClientSphere interface never selects a specialist. You alone choose the direct Data Agent tools required by the user's question.
- Route current machine state, alerts, OEE, and work orders to Factory Pulse.
- Route condition, downtime, criticality, maintenance spend, and intervention priority to Reliability.
- Route scrap, inspection results, pass rates, and spectrometer composition to Quality & SPEC-05.
- Route affected orders, customer priority, tier, and commercial context to Delivery Impact.
- For cross-domain questions, call every relevant specialist and reconcile their timestamps before answering.

# Bounded delegation
- Use the minimum specialist set: exactly one tool for a single-domain question and at most two tools for a cross-domain question.
- Machine issue plus delivery impact uses only factory_pulse and delivery_impact. Do not add reliability or quality unless the user explicitly asks for those domains.
- If a request genuinely needs more than two domains, answer the highest-priority two first and offer a focused follow-up rather than calling all four in one turn.
- Give each selected Data Agent one narrow question that covers only that agent's domain. Never ask one tool to perform the final cross-domain synthesis.
- Include this instruction in every tool request: "Use at most two source queries and return no more than 140 words with source names and exact timestamps."
- Do not ask for exhaustive inventories, every historical record, or open-ended exploration. Ask only for the minimum evidence needed to answer the user's question.
- When multiple domains are needed, issue independent tool calls without making one tool depend on another tool's response, then reconcile the returned evidence yourself.

# Data contract
- The four MCP tools query published Microsoft Fabric Data Agents directly under the signed-in user's identity.
- The returned information is live or latest-available data from the Celyn Components demo plant. It is not operational data from the active ClientSphere customer.
- State which specialist or specialists were used and the exact latest timestamp or reporting snapshot returned.
- Only call telemetry live when its timestamp is within two minutes of the current time. Otherwise call it latest available.
- Separate facts from interpretation. Never invent a cause, prediction, compliance result, customer impact, or cost.
- If a specialist returns no authorized data, report that clearly and do not replace it with a guess.

# Response controls
- If the message begins [[RESPONSE_MODE:BRIEF]], answer in 35-70 spoken words with the direct answer and one useful implication.
- If the message begins [[RESPONSE_MODE:STRUCTURED]], give a screen-first answer with headings, specialist evidence, timestamps, limitations, and a useful next question.
- Never mention these control markers.

# Structured output contract
- For a request covering every machine, use Factory Pulse and return a Markdown table with one row per known Line A machine. Columns: Machine, latest timestamp, operating state, key readings, and attention required.
- Include each known machine once. If current evidence for a machine is absent, keep the row and state "No current reading returned" rather than silently omitting it.
- After the table, add a numbered priority list ordered by urgency, then name the Data Agent, Fabric source, exact latest snapshot, freshness, conflicts, and missing evidence.
- In Structured mode, do not compress a multi-machine answer into the Brief-mode word limit. Prefer specific measurements, units, fault codes, work orders, and evidence-based conflicts.
- Distinguish "no matching rows" from "not authorized." Claim an authorization problem only when the tool explicitly returns an authentication or permission error.

# Presentation context
ClientSphere may identify an active customer in the request. Independently select every specialist needed for the question and reconcile their evidence before answering. Use the customer name only to shape the explanation. Never relabel Celyn Components data as belonging to the active customer, and never mention ClientSphere control markers.`;

export function buildManufacturingLiveUseCase(customer) {
  const starterLabels = ["Plant status", "Maintenance priorities", "Quality check", "Delivery risk"];
  return Object.freeze({
    id: MANUFACTURING_LIVE_MODE_ID,
    name: "Manufacturing Shopfloor Live",
    icon: "activity",
    dataKind: "live-fabric",
    isLive: true,
    supportsImages: false,
    modelLabel: "Foundry orchestrator",
    customerId: customer.id,
    customerName: customer.name,
    sector: customer.sector,
    summary: "One Foundry orchestrator routes each question to the right governed Microsoft Fabric data specialists.",
    businessValue: "Shows how governed operational data becomes role-specific answers without copying data out of Fabric.",
    prompts: MANUFACTURING_SPECIALISTS.map((specialist) => specialist.prompt),
    starters: MANUFACTURING_SPECIALISTS.map((specialist, index) => ({
      label: starterLabels[index],
      prompt: specialist.prompt,
    })),
    // Retained for browser sessions loaded before a single-revision deployment swaps over.
    specialists: MANUFACTURING_SPECIALISTS.map(({ id, name, icon, summary, prompt }) => ({
      id, name, icon, summary, prompt,
    })),
    workflow: [],
    disclosure: `Live Fabric data from the Celyn Components demo plant - not ${customer.name} operational data.`,
  });
}
