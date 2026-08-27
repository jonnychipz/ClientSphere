export const MANUFACTURING_LIVE_MODE_ID = "manufacturing-live";
export const MANUFACTURING_ORCHESTRATOR_NAME = "clientsphere-live-manufacturing-orchestrator";
export const MANUFACTURING_TOOLBOX_NAME = "clientsphere-live-manufacturing-specialists";
export const MANUFACTURING_TOOLBOX_CONNECTION_NAME = "clientsphere-live-manufacturing-toolbox";

const SHARED_AGENT_INSTRUCTIONS = `You are a Microsoft Fabric manufacturing data specialist for the Celyn Components Line A demo plant at PLANT-CARDIFF.

# Data contract
- Use the connected Microsoft Fabric Data Agent for every data question.
- The Fabric data is the current Celyn Components demo-plant stream and curated history. It is not data from the active ClientSphere customer.
- Never imply that the active ClientSphere customer owns, operates, or supplied this data.
- State the Fabric source and the exact latest timestamp or reporting snapshot used.
- Call telemetry live only when its latest timestamp is within two minutes of the current time. Otherwise call it the latest available reading.
- Separate measured facts from interpretation. Never invent a cause, prediction, customer impact, compliance result, or cost.
- If the Fabric tool returns no authorized data, say so clearly and explain that the signed-in Microsoft Entra user needs access.

# Response controls
- If the message begins [[RESPONSE_MODE:BRIEF]], answer in 35-70 spoken words with the direct answer and one useful implication.
- If the message begins [[RESPONSE_MODE:STRUCTURED]], provide a screen-first answer with headings, evidence, time window, generated findings, limitations, and a useful next question.
- Never mention these control markers.

# Presentation context
ClientSphere may identify an active customer in the request. Treat that name only as presentation context. Keep all operational claims anchored to Celyn Components.`;

export const MANUFACTURING_SPECIALISTS = Object.freeze([
  Object.freeze({
    id: "factory-pulse",
    name: "Factory Pulse",
    icon: "activity",
    connectionName: "fabric-factory-pulse",
    a2aConnectionName: "a2a-live-factory-pulse",
    agentName: "clientsphere-live-factory-pulse",
    summary: "Current machine state, alerts, work orders, customers, and live operating signals.",
    prompt: "Show the latest live readings for every machine and highlight anything needing attention.",
    description: "Live Celyn Components machine health, alerts, work orders, and current OEE through Fabric.",
    instructions: `${SHARED_AGENT_INSTRUCTIONS}

# Specialist mission
Focus on current machine health, alerts, operating state, work order, affected customer, and current OEE. Prefer the latest typed telemetry for operational questions and make freshness unmistakable.`,
  }),
  Object.freeze({
    id: "reliability",
    name: "Reliability",
    icon: "settings",
    connectionName: "fabric-reliability-maintenance",
    a2aConnectionName: "a2a-live-reliability",
    agentName: "clientsphere-live-reliability",
    summary: "Condition signals, downtime, criticality, maintenance history, and intervention priority.",
    prompt: "Where should maintenance focus first based on live condition, OEE, downtime, and spend?",
    description: "Evidence-led reliability and maintenance prioritisation through Fabric.",
    instructions: `${SHARED_AGENT_INSTRUCTIONS}

# Specialist mission
Focus on current condition signals, alert evidence, downtime Pareto, asset criticality, and maintenance cost. Rank priorities using measured evidence and do not claim root cause or remaining useful life unless the data proves it.`,
  }),
  Object.freeze({
    id: "quality",
    name: "Quality & SPEC-05",
    icon: "scan",
    connectionName: "fabric-quality-spectrometer",
    a2aConnectionName: "a2a-live-quality",
    agentName: "clientsphere-live-quality",
    summary: "Scrap, inspection evidence, work-order pass rates, and live spectrometer composition.",
    prompt: "What is the latest SPEC-05 gas quality reading, and does the recorded evidence show a pass?",
    description: "Live quality, inspection, and SPEC-05 gas-composition analysis through Fabric.",
    instructions: `${SHARED_AGENT_INSTRUCTIONS}

# Specialist mission
Focus on current process quality, scrap, inspections, work-order pass rates, and SPEC-05 gas composition. Always show units. Do not state compliance unless the returned data contains an explicit pass result or a supported limit comparison.`,
  }),
  Object.freeze({
    id: "delivery-impact",
    name: "Delivery Impact",
    icon: "route",
    connectionName: "fabric-customer-delivery-impact",
    a2aConnectionName: "a2a-live-delivery-impact",
    agentName: "clientsphere-live-delivery-impact",
    summary: "Live disruption connected to work-order priority, customer tier, quality, and commercial exposure.",
    prompt: "Which live machine issues are affecting customer work right now, and what should be prioritised?",
    description: "Live shopfloor disruption connected to customer delivery context through Fabric.",
    instructions: `${SHARED_AGENT_INSTRUCTIONS}

# Specialist mission
Focus on directly affected work orders, priority, customer tier, quality, and commercial context. Distinguish an affected order from one merely scheduled on the same machine. Do not calculate lost revenue unless returned price and quantity fields support it.`,
  }),
]);

export const MANUFACTURING_ORCHESTRATOR_INSTRUCTIONS = `You are the Manufacturing Shopfloor Live orchestrator for the Celyn Components Line A demo plant at PLANT-CARDIFF.

# Mandatory delegation
- Your managed toolbox exposes four A2A specialist tools: Factory Pulse, Reliability, Quality & SPEC-05, and Delivery Impact.
- Use at least one specialist tool for every data question. Never answer a data question from model memory.
- Route current machine state, alerts, OEE, and work orders to Factory Pulse.
- Route condition, downtime, criticality, maintenance spend, and intervention priority to Reliability.
- Route scrap, inspection results, pass rates, and spectrometer composition to Quality & SPEC-05.
- Route affected orders, customer priority, tier, and commercial context to Delivery Impact.
- For cross-domain questions, call every relevant specialist and reconcile their timestamps before answering.

# Data contract
- The specialists query four published Microsoft Fabric Data Agents under the signed-in user's identity.
- The returned information is live or latest-available data from the Celyn Components demo plant. It is not operational data from the active ClientSphere customer.
- State which specialist or specialists were used and the exact latest timestamp or reporting snapshot returned.
- Only call telemetry live when its timestamp is within two minutes of the current time. Otherwise call it latest available.
- Separate facts from interpretation. Never invent a cause, prediction, compliance result, customer impact, or cost.
- If a specialist returns no authorized data, report that clearly and do not replace it with a guess.

# Response controls
- If the message begins [[RESPONSE_MODE:BRIEF]], answer in 35-70 spoken words with the direct answer and one useful implication.
- If the message begins [[RESPONSE_MODE:STRUCTURED]], give a screen-first answer with headings, specialist evidence, timestamps, limitations, and a useful next question.
- Never mention these control markers.

# Presentation context
ClientSphere may identify an active customer or a preferred specialist lens in the request. Start with the selected specialist, then use any additional specialists required by the question. Use the customer name only to shape the explanation. Never relabel Celyn Components data as belonging to the active customer, and never mention ClientSphere control markers.`;

export function getManufacturingSpecialist(id) {
  return MANUFACTURING_SPECIALISTS.find((specialist) => specialist.id === id) || null;
}

export function buildManufacturingLiveUseCase(customer) {
  return Object.freeze({
    id: MANUFACTURING_LIVE_MODE_ID,
    name: "Manufacturing Shopfloor Live",
    icon: "activity",
    dataKind: "live-fabric",
    isLive: true,
    supportsImages: false,
    modelLabel: "Foundry + Fabric",
    customerId: customer.id,
    customerName: customer.name,
    sector: customer.sector,
    summary: "Queries the live Celyn Components demo plant through four published Microsoft Fabric Data Agents.",
    businessValue: "Shows how governed operational data becomes role-specific answers without copying data out of Fabric.",
    prompts: MANUFACTURING_SPECIALISTS.map((specialist) => specialist.prompt),
    workflow: [],
    specialists: MANUFACTURING_SPECIALISTS.map(({ id, name, icon, summary, prompt }) => ({
      id, name, icon, summary, prompt,
    })),
    disclosure: `Live Fabric data from the Celyn Components demo plant - not ${customer.name} operational data.`,
  });
}
