const MODEL_DEPLOYMENTS = {
  general: process.env.GENERAL_MODEL_DEPLOYMENT || process.env.MODEL_DEPLOYMENT || "gpt-5.6-sol",
  luna: process.env.USE_CASE_MODEL_LUNA || "gpt-5.6-luna",
  terra: process.env.USE_CASE_MODEL_TERRA || "gpt-5.6-terra",
  sol: process.env.USE_CASE_MODEL_SOL || process.env.GENERAL_MODEL_DEPLOYMENT || process.env.MODEL_DEPLOYMENT || "gpt-5.6-sol",
};

const INDUSTRIAL = [
  {
    id: "visual-safety",
    name: "Visual Safety & Quality Inspector",
    model: "luna",
    icon: "scan",
    supportsImages: true,
    summary: "Reviews site, product, equipment, or installation images alongside public standards and customer context.",
    businessValue: "Shortens inspection cycles, improves consistency, and turns visual observations into evidence-led actions.",
    persona: "a senior quality and workplace-safety engineer",
    workflow: ["Frame the inspection objective", "Review the image and visible evidence", "Cross-check public product and safety context", "Rank observations by impact", "Recommend human validation and actions", "Summarise measurable operational value"],
    prompts: ["Inspect this image for visible safety or quality concerns", "Create a synthetic incoming-quality inspection", "Show the business case for AI-assisted visual inspection"],
  },
  {
    id: "asset-service",
    name: "Asset & Service Orchestrator",
    model: "terra",
    icon: "settings",
    supportsImages: false,
    summary: "Synthesises asset, maintenance, service, and operational signals into a prioritised intervention plan.",
    businessValue: "Reduces downtime and service cost while improving technician focus and customer responsiveness.",
    persona: "an operations and service transformation lead",
    workflow: ["Capture the asset or service scenario", "Separate evidence from assumptions", "Identify failure and delay drivers", "Prioritise interventions", "Define owner, SLA, and escalation", "Estimate value and validation metrics"],
    prompts: ["Run a synthetic asset failure triage", "Design a service workflow for this customer", "Build a downtime-reduction value story"],
  },
  {
    id: "supply-chain",
    name: "Supply Chain Scenario Planner",
    model: "sol",
    icon: "route",
    supportsImages: false,
    summary: "Explores demand, supplier, inventory, production, and logistics scenarios grounded in the customer's public operating model.",
    businessValue: "Improves resilience and working-capital decisions before disruption reaches customers.",
    persona: "a supply-chain strategy adviser",
    workflow: ["Define the decision and horizon", "Map public operating dependencies", "Create base, upside, and disruption scenarios", "Quantify directional impacts", "Recommend mitigations and triggers", "Produce an executive decision brief"],
    prompts: ["Model a synthetic supplier disruption", "Create three demand scenarios", "Show likely supply-chain value for this customer"],
  },
];

const AEROSPACE = [
  {
    id: "mission-readiness",
    name: "Mission Readiness Copilot",
    model: "terra",
    icon: "radar",
    supportsImages: false,
    summary: "Turns mission, fleet, component, crew, and support constraints into a readiness decision picture.",
    businessValue: "Improves availability, planning confidence, and response speed across complex operational dependencies.",
    persona: "an aviation mission-readiness director",
    workflow: ["Establish mission and readiness criteria", "Map assets, people, and constraints", "Identify evidence gaps", "Score readiness risks", "Sequence corrective actions", "Brief the go/no-go decision"],
    prompts: ["Run a synthetic mission-readiness review", "Triage an aircraft-on-ground scenario", "Build the availability value narrative"],
  },
  {
    id: "maintenance-evidence",
    name: "Multimodal Maintenance Analyst",
    model: "luna",
    icon: "scan",
    supportsImages: true,
    summary: "Combines component images, maintenance notes, warranty context, and public technical information.",
    businessValue: "Accelerates evidence review, improves warranty recovery, and supports consistent maintenance decisions.",
    persona: "a licensed maintenance and warranty analyst",
    workflow: ["Confirm the synthetic asset context", "Inspect visual and written evidence", "Identify anomalies without overclaiming", "Check maintenance and warranty logic", "Recommend engineering validation", "Summarise cost and readiness impact"],
    prompts: ["Analyse this synthetic component image", "Review a warranty evidence pack", "Show how multimodal maintenance analysis creates value"],
  },
  {
    id: "contract-risk",
    name: "Programme & Contract Risk Navigator",
    model: "sol",
    icon: "shield",
    supportsImages: false,
    summary: "Frames delivery, supplier, compliance, milestone, and commercial risks for complex aerospace programmes.",
    businessValue: "Surfaces emerging programme risk earlier and improves evidence-led executive intervention.",
    persona: "an aerospace programme assurance executive",
    workflow: ["Define programme outcomes and milestones", "Map public stakeholders and dependencies", "Identify risk signals", "Model schedule and commercial impacts", "Assign mitigations and leading indicators", "Create an executive risk brief"],
    prompts: ["Create a synthetic programme risk review", "Model a supplier delay scenario", "Prepare an executive contract-risk brief"],
  },
];

const HEALTH = [
  {
    id: "care-operations",
    name: "Care & Service Operations Navigator",
    model: "terra",
    icon: "activity",
    supportsImages: false,
    summary: "Orchestrates synthetic patient, clinician, laboratory, or service workflows using safe public context.",
    businessValue: "Reduces hand-off friction, improves capacity use, and helps teams focus on the next best operational action.",
    persona: "a healthcare operations transformation leader",
    workflow: ["Define the service journey and safety boundary", "Map demand, capacity, and hand-offs", "Identify delay and quality risks", "Prioritise operational interventions", "Set human approvals and escalation", "Define outcome and experience measures"],
    prompts: ["Map a synthetic patient or service journey", "Triage a capacity bottleneck", "Build the operational-value story"],
  },
  {
    id: "quality-evidence",
    name: "Multimodal Quality Evidence Analyst",
    model: "luna",
    icon: "scan",
    supportsImages: true,
    summary: "Reviews synthetic device, laboratory, packaging, facility, or process images with quality evidence.",
    businessValue: "Speeds evidence preparation and improves consistency while preserving expert and regulatory oversight.",
    persona: "a regulated quality and clinical-safety specialist",
    workflow: ["Confirm intended use and limitations", "Review image and document evidence", "Separate observation from diagnosis", "Map quality or compliance implications", "Recommend expert validation", "Produce an auditable evidence summary"],
    prompts: ["Review this synthetic quality image", "Create a mock evidence assessment", "Explain the value of multimodal quality review"],
  },
  {
    id: "regulatory-growth",
    name: "Regulatory & Growth Scenario Agent",
    model: "sol",
    icon: "compass",
    supportsImages: false,
    summary: "Explores market, evidence, regulatory, site, and commercial pathways without presenting synthetic analysis as fact.",
    businessValue: "Connects compliant growth choices to investment, evidence, and operational readiness.",
    persona: "a life-sciences strategy and regulatory adviser",
    workflow: ["Define the synthetic growth decision", "Map public market and regulatory context", "Identify evidence requirements", "Compare pathway scenarios", "Sequence investment and controls", "Create a board-level recommendation"],
    prompts: ["Model a synthetic market-entry decision", "Compare three growth pathways", "Create a compliant innovation narrative"],
  },
];

const ENERGY = [
  {
    id: "field-integrity",
    name: "Multimodal Field Integrity Agent",
    model: "luna",
    icon: "scan",
    supportsImages: true,
    summary: "Reviews synthetic field, terminal, pipeline, network, or equipment imagery with operating context.",
    businessValue: "Accelerates anomaly triage and focuses engineers on the highest-value inspection work.",
    persona: "an asset-integrity and field-safety engineer",
    workflow: ["Define asset and inspection context", "Inspect visible evidence", "Identify possible integrity signals", "Cross-check public operating context", "Prioritise expert inspection", "Summarise risk and avoided-cost value"],
    prompts: ["Inspect this synthetic field image", "Triage a visible asset anomaly", "Build the value case for visual integrity analysis"],
  },
  {
    id: "network-operations",
    name: "Network & Terminal Operations Copilot",
    model: "terra",
    icon: "activity",
    supportsImages: false,
    summary: "Coordinates synthetic capacity, maintenance, safety, demand, and incident decisions.",
    businessValue: "Improves operational resilience, throughput, and response quality across interconnected assets.",
    persona: "an energy operations control leader",
    workflow: ["Establish operating objective", "Map constraints and dependencies", "Detect synthetic risk signals", "Prioritise operating actions", "Define escalation and communications", "Track resilience and throughput outcomes"],
    prompts: ["Run a synthetic operations-control scenario", "Triage a capacity constraint", "Create an incident decision brief"],
  },
  {
    id: "transition-investment",
    name: "Transition Investment Strategist",
    model: "sol",
    icon: "leaf",
    supportsImages: false,
    summary: "Builds evidence-led scenarios for transition, decarbonisation, infrastructure, and capital allocation.",
    businessValue: "Clarifies investment trade-offs and connects sustainability commitments to operational economics.",
    persona: "an energy-transition investment strategist",
    workflow: ["Define transition ambition and horizon", "Ground the public baseline", "Create investment scenarios", "Assess operational and stakeholder impacts", "Define milestones and leading indicators", "Prepare an executive recommendation"],
    prompts: ["Create three transition investment scenarios", "Model a synthetic infrastructure decision", "Build the board-level value narrative"],
  },
];

const ASSURANCE = [
  {
    id: "evidence-review",
    name: "Multimodal Evidence Reviewer",
    model: "luna",
    icon: "scan",
    supportsImages: true,
    summary: "Reviews synthetic certificates, labels, inspection images, test evidence, or secure artefacts.",
    businessValue: "Accelerates evidence triage and raises consistency without replacing authorised reviewers.",
    persona: "a senior assurance and evidence specialist",
    workflow: ["Confirm scope and acceptance criteria", "Inspect visual and written evidence", "Detect inconsistencies and omissions", "Cross-check public requirements", "Route exceptions to human review", "Produce an auditable findings summary"],
    prompts: ["Review this synthetic evidence image", "Create a mock conformity assessment", "Show the value of AI-assisted evidence review"],
  },
  {
    id: "audit-orchestration",
    name: "Audit & Inspection Orchestrator",
    model: "terra",
    icon: "checklist",
    supportsImages: false,
    summary: "Plans synthetic audits, testing programmes, inspections, findings, and remediation workflows.",
    businessValue: "Improves assessor productivity, coverage, consistency, and closure of high-impact findings.",
    persona: "an audit and inspection programme director",
    workflow: ["Define scope, criteria, and materiality", "Build a risk-based evidence plan", "Generate synthetic interview and test steps", "Classify findings", "Assign remediation and verification", "Summarise assurance outcomes"],
    prompts: ["Design a synthetic risk-based audit", "Create an inspection workflow", "Triage mock findings by materiality"],
  },
  {
    id: "trust-growth",
    name: "Trust & Customer Growth Adviser",
    model: "sol",
    icon: "shield",
    supportsImages: false,
    summary: "Connects assurance, security, quality, and trust propositions to customer growth conversations.",
    businessValue: "Turns technical evidence into clearer differentiation, faster decisions, and stronger customer confidence.",
    persona: "a trust-led commercial strategy adviser",
    workflow: ["Identify buyer and trust decision", "Map public customer pressures", "Select relevant evidence", "Shape differentiated value", "Anticipate objections", "Recommend proof and next action"],
    prompts: ["Build a synthetic trust-led sales conversation", "Prepare questions for a risk buyer", "Turn assurance evidence into business value"],
  },
];

const CONSUMER = [
  {
    id: "product-concierge",
    name: "Multimodal Product Concierge",
    model: "luna",
    icon: "sparkles",
    supportsImages: true,
    summary: "Uses product imagery and public catalogue context to create a synthetic guided customer experience.",
    businessValue: "Improves discovery, conversion, and service while giving teams a differentiated brand interaction.",
    persona: "a premium digital product and customer-experience designer",
    workflow: ["Understand shopper intent", "Interpret visual and textual cues", "Match suitable public products", "Explain recommendations concisely", "Offer alternatives and human help", "Capture conversion and satisfaction signals"],
    prompts: ["Use this image for a synthetic product recommendation", "Design a guided shopping conversation", "Build the conversion-value story"],
  },
  {
    id: "demand-growth",
    name: "Demand & Merchandising Strategist",
    model: "terra",
    icon: "chart",
    supportsImages: false,
    summary: "Explores synthetic demand, range, channel, geography, and availability scenarios.",
    businessValue: "Improves ranging and inventory choices while reducing missed demand and avoidable markdown.",
    persona: "a consumer demand and merchandising strategist",
    workflow: ["Define category and commercial goal", "Ground public brand and channel context", "Create demand scenarios", "Identify range and availability actions", "Set experiments and guardrails", "Measure margin, conversion, and service outcomes"],
    prompts: ["Create three synthetic demand scenarios", "Plan a new range launch", "Model conversion and inventory value"],
  },
  {
    id: "brand-studio",
    name: "Brand & Launch Studio",
    model: "sol",
    icon: "megaphone",
    supportsImages: false,
    summary: "Builds synthetic launch narratives, audience propositions, campaign tests, and executive briefs.",
    businessValue: "Speeds creative strategy while preserving a consistent, evidence-led brand story.",
    persona: "a global brand and commercial innovation lead",
    workflow: ["Define launch outcome and audience", "Ground public brand truth", "Create proposition territories", "Test message and channel scenarios", "Identify brand and execution risks", "Produce launch recommendation and measures"],
    prompts: ["Create a synthetic launch concept", "Compare three audience propositions", "Build an executive brand brief"],
  },
];

const FIELD_SERVICES = [
  {
    id: "field-vision",
    name: "Multimodal Field Service Guide",
    model: "luna",
    icon: "scan",
    supportsImages: true,
    summary: "Uses synthetic site, grounds, pest, equipment, or product images to guide consistent field action.",
    businessValue: "Improves first-time resolution, safety, evidence quality, and technician productivity.",
    persona: "a field-service quality and safety leader",
    workflow: ["Capture location and service intent", "Inspect visible conditions", "Identify possible service needs", "Cross-check public service context", "Recommend safe human action", "Record evidence and outcome value"],
    prompts: ["Review this synthetic field image", "Guide a mock technician visit", "Build the first-time-fix value story"],
  },
  {
    id: "workforce-routing",
    name: "Workforce & Route Orchestrator",
    model: "terra",
    icon: "route",
    supportsImages: false,
    summary: "Plans synthetic jobs, skills, routes, weather constraints, stock, and service commitments.",
    businessValue: "Reduces travel and delay while improving utilisation and customer service.",
    persona: "a national field-operations planner",
    workflow: ["Define service demand and SLAs", "Map skills, geography, and constraints", "Prioritise work", "Create route and resource scenarios", "Plan exceptions and communications", "Measure utilisation, service, and cost"],
    prompts: ["Optimise a synthetic field-service day", "Triage an SLA backlog", "Model workforce and routing value"],
  },
  {
    id: "customer-retention",
    name: "Customer Retention Adviser",
    model: "sol",
    icon: "heart",
    supportsImages: false,
    summary: "Builds synthetic service, renewal, cross-sell, and proactive-care conversations.",
    businessValue: "Improves retention and account growth by connecting service signals to timely customer action.",
    persona: "a service-led customer growth director",
    workflow: ["Define customer segment and outcome", "Ground public proposition and market context", "Identify retention signals", "Design next-best conversations", "Set human approval and cadence", "Measure renewal, satisfaction, and growth"],
    prompts: ["Design a synthetic retention journey", "Create a proactive service conversation", "Build the recurring-value narrative"],
  },
];

const MEMBERSHIP = [
  {
    id: "participant-concierge",
    name: "Multimodal Participant Concierge",
    model: "luna",
    icon: "sparkles",
    supportsImages: true,
    summary: "Creates a synthetic member, participant, fan, owner, or event-support experience using images and public knowledge.",
    businessValue: "Improves access to information, engagement, and service consistency across diverse audiences.",
    persona: "a digital membership and participant-experience leader",
    workflow: ["Identify participant and intent", "Interpret supplied visual context", "Retrieve relevant public guidance", "Give a concise personalised response", "Escalate welfare or policy decisions", "Capture engagement and service outcomes"],
    prompts: ["Use this image in a synthetic participant journey", "Design a member concierge conversation", "Build the engagement-value story"],
  },
  {
    id: "event-operations",
    name: "Event Operations Copilot",
    model: "terra",
    icon: "activity",
    supportsImages: false,
    summary: "Coordinates synthetic schedules, venues, people, communications, incidents, and operational decisions.",
    businessValue: "Improves event readiness and response while reducing coordination overhead.",
    persona: "an international event operations director",
    workflow: ["Define event outcome and operating plan", "Map dependencies and readiness", "Identify synthetic incident scenarios", "Prioritise response actions", "Coordinate stakeholder communications", "Review service, safety, and engagement metrics"],
    prompts: ["Run a synthetic event-readiness review", "Triage a mock event incident", "Create an operations command brief"],
  },
  {
    id: "integrity-growth",
    name: "Integrity & Growth Strategist",
    model: "sol",
    icon: "shield",
    supportsImages: false,
    summary: "Connects governance, welfare, participation, digital engagement, and commercial growth scenarios.",
    businessValue: "Balances mission, trust, and sustainable growth in a clear executive decision framework.",
    persona: "a governance and participation strategy adviser",
    workflow: ["Define mission and growth decision", "Ground public governance context", "Map stakeholder impacts", "Create balanced scenarios", "Set integrity guardrails and measures", "Recommend an executive path"],
    prompts: ["Model a synthetic participation-growth decision", "Balance integrity and commercial value", "Prepare a governance-led executive brief"],
  },
];

const DEFAULT = [
  {
    id: "experience-copilot",
    name: "Multimodal Experience Copilot",
    model: "luna",
    icon: "sparkles",
    supportsImages: true,
    summary: "Uses images and public business context to demonstrate a tailored customer or employee experience.",
    businessValue: "Makes complex information easier to access and turns visual context into faster next-best action.",
    persona: "a digital experience transformation lead",
    workflow: ["Identify user and outcome", "Review text and visual context", "Retrieve public evidence", "Recommend next-best action", "Apply human controls", "Measure experience and productivity value"],
    prompts: ["Analyse this image in a synthetic workflow", "Design a tailored concierge experience", "Build the experience-value narrative"],
  },
  {
    id: "operations-agent",
    name: "Intelligent Operations Agent",
    model: "terra",
    icon: "settings",
    supportsImages: false,
    summary: "Coordinates synthetic work, exceptions, evidence, and operational decisions.",
    businessValue: "Reduces manual coordination and helps teams focus on high-impact exceptions.",
    persona: "an intelligent operations architect",
    workflow: ["Define operating outcome", "Map work and dependencies", "Identify exceptions", "Prioritise actions", "Set ownership and controls", "Measure cost, speed, and quality"],
    prompts: ["Run a synthetic operations scenario", "Triage a mock exception backlog", "Build the automation-value story"],
  },
  {
    id: "strategy-agent",
    name: "Business Value Scenario Agent",
    model: "sol",
    icon: "compass",
    supportsImages: false,
    summary: "Builds evidence-led synthetic strategy, investment, and transformation scenarios.",
    businessValue: "Connects an AI concept to executive outcomes, risks, proof points, and next steps.",
    persona: "an executive business-value strategist",
    workflow: ["Define decision and stakeholders", "Ground the public baseline", "Create three scenarios", "Assess value and risks", "Design proof and measures", "Recommend next action"],
    prompts: ["Create three synthetic AI value scenarios", "Prepare an executive transformation brief", "Design a measurable proof of value"],
  },
];

const CLUSTER_RULES = [
  { pattern: /(aerospace|aviation|satellite)/i, useCases: AEROSPACE },
  { pattern: /(health|medical|occupational|infection|pharmaceutical|scientific)/i, useCases: HEALTH },
  { pattern: /(energy|gas network)/i, useCases: ENERGY },
  { pattern: /(assurance|certification|testing|inspection|authentication|currency)/i, useCases: ASSURANCE },
  { pattern: /(consumer product)/i, useCases: CONSUMER },
  { pattern: /(agricultural|groundcare|environmental|pest management)/i, useCases: FIELD_SERVICES },
  { pattern: /(sport|membership|animal welfare)/i, useCases: MEMBERSHIP },
  { pattern: /(industrial|manufactur|steel|cable|construction|materials|machinery|machine tool|safety|automotive|infrastructure|power electronics|textile|tools|vehicle)/i, useCases: INDUSTRIAL },
];

const SYNTHETIC_DATA = {
  "visual-safety": { site: "Plant 04 / loading zone", asset: "Barrier line B-17", observation: "Visible anchor displacement after vehicle contact", openActions: 3, productionRiskHours: 6 },
  "asset-service": { asset: "Critical unit AX-204", healthScore: 61, alerts: 4, slaHours: 4, estimatedDowntimeHours: 9 },
  "supply-chain": { supplier: "Synthetic Supplier North", leadTimeDays: 41, inventoryCoverDays: 19, demandVariancePercent: 18, delayDays: 21 },
  "mission-readiness": { mission: "Exercise Horizon", availableAssets: 7, requiredAssets: 8, crewCoveragePercent: 92, unresolvedConstraints: 3 },
  "maintenance-evidence": { component: "Synthetic actuator AC-77", cycles: 4180, warrantyDaysRemaining: 94, evidenceItems: 6, anomalyConfidencePercent: 78 },
  "contract-risk": { programme: "Programme Orion", milestoneDaysAtRisk: 24, supplierDependencies: 7, openRisks: 11, contractValueBand: "£25m-£50m" },
  "care-operations": { service: "Synthetic outpatient pathway", dailyDemand: 146, availableSlots: 128, handoffDelayMinutes: 47, highPriorityCases: 9 },
  "quality-evidence": { batch: "SYN-QA-2408", evidenceItems: 12, missingRecords: 2, reviewSlaHours: 8, sampleDeviationPercent: 3.4 },
  "regulatory-growth": { market: "Synthetic Market A", evidenceGaps: 4, pathwayMonths: 14, investmentBand: "£3m-£5m", forecastPatients: 6200 },
  "field-integrity": { asset: "Synthetic line section P-18", inspectionAgeDays: 287, anomalySignals: 3, riskScore: 72, followupHours: 12 },
  "network-operations": { networkZone: "Zone West-3", utilisationPercent: 91, plannedOutages: 2, activeConstraints: 4, demandUpliftPercent: 12 },
  "transition-investment": { initiative: "Synthetic low-carbon hub", capexBand: "£20m-£30m", emissionsReductionPercent: 18, paybackYears: 5.2, deliveryRisks: 6 },
  "evidence-review": { caseId: "SYN-EV-1042", documents: 18, imageEvidence: 5, inconsistencies: 3, materialExceptions: 1 },
  "audit-orchestration": { audit: "Synthetic multi-site audit", sites: 8, controls: 42, highRiskControls: 7, assessorDays: 18 },
  "trust-growth": { buyer: "Synthetic enterprise risk committee", evidenceAssets: 9, openObjections: 4, decisionDays: 45, opportunityBand: "£1m-£3m" },
  "product-concierge": { shopper: "Synthetic returning customer", occasion: "Premium gift", budget: "£45-£70", preferenceSignals: 5, candidateProducts: 12 },
  "demand-growth": { category: "Synthetic hero range", stores: 64, demandUpliftPercent: 22, stockCoverDays: 16, markdownRiskPercent: 11 },
  "brand-studio": { launch: "Synthetic seasonal collection", audiences: 3, markets: 4, campaignBudgetBand: "£500k-£750k", targetConversionPercent: 4.8 },
  "field-vision": { visit: "SYN-FS-8821", location: "Customer site 14", visibleSignals: 4, firstTimeFixTargetPercent: 86, slaHours: 6 },
  "workforce-routing": { jobs: 38, technicians: 12, skillGroups: 5, travelHours: 29, slaBreachesAtRisk: 7 },
  "customer-retention": { segment: "Synthetic strategic accounts", accounts: 48, renewalValueBand: "£4m-£6m", riskSignals: 13, nextBestActions: 9 },
  "participant-concierge": { participant: "Synthetic international visitor", event: "Championship week", serviceRequests: 3, languages: 2, accessibilityNeeds: 1 },
  "event-operations": { event: "Synthetic global championship", venues: 5, attendees: 18000, readinessIssues: 8, criticalIncidents: 1 },
  "integrity-growth": { initiative: "Synthetic participation programme", regions: 6, targetParticipants: 25000, integrityControls: 12, fundingBand: "£2m-£4m" },
  "experience-copilot": { journey: "Synthetic customer onboarding", steps: 9, frictionPoints: 4, completionRatePercent: 63, targetRatePercent: 82 },
  "operations-agent": { process: "Synthetic service operation", cases: 240, exceptions: 28, manualHoursWeekly: 74, targetCycleReductionPercent: 35 },
  "strategy-agent": { decision: "Synthetic AI transformation portfolio", initiatives: 7, investmentBand: "£5m-£8m", targetValueBand: "£12m-£18m", risks: 9 },
};

function formatSyntheticData(data) {
  return Object.entries(data)
    .map(([key, value]) => `${key.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase())}: ${value}`)
    .join("; ");
}

function buildDemoScenes(template, customer) {
  const data = { customer: customer.name, ...(SYNTHETIC_DATA[template.id] || {}) };
  const dataLine = formatSyntheticData(data);
  return [
    {
      id: "live-signal",
      label: "1. Live signal",
      title: "Open the synthetic case",
      prompt: `Start a live ${template.name} demo for ${customer.name}. Act as if this synthetic case has just arrived. Synthetic data: ${dataLine}. Give a brief in-role opening, show the signal, and ask me to click or say "analyse".`,
      syntheticData: data,
    },
    {
      id: "agent-work",
      label: "2. Agent at work",
      title: "Run the agent workflow",
      prompt: `Continue the ${template.name} demo for ${customer.name} using this synthetic data: ${dataLine}. Run the complete six-step workflow, show meaningful intermediate decisions, use Code Interpreter for any useful calculations, and pause at the human approval point.`,
      syntheticData: data,
    },
    {
      id: "business-value",
      label: "3. Value realised",
      title: "Land business value",
      prompt: `Close the ${template.name} demo for ${customer.name}. Using the synthetic case (${dataLine}), provide a structured before/after value view, directional KPI impact, risks, human controls, a 30-day proof-of-value plan, and the next executive question.`,
      syntheticData: data,
    },
  ];
}

function enrichUseCase(template, customer) {
  return {
    ...template,
    modelDeployment: MODEL_DEPLOYMENTS[template.model],
    modelLabel: `GPT-5.6 ${template.model[0].toUpperCase()}${template.model.slice(1)}`,
    customerId: customer.id,
    customerName: customer.name,
    sector: customer.sector,
    summary: `${template.summary} Tailored to ${customer.name}'s ${customer.sector.toLowerCase()} context.`,
    demoScenes: buildDemoScenes(template, customer),
  };
}

export function buildCustomerUseCases(customer) {
  const cluster = CLUSTER_RULES.find((rule) => rule.pattern.test(customer.sector))?.useCases || DEFAULT;
  return cluster.map((template) => Object.freeze(enrichUseCase(template, customer)));
}

export function getCustomerUseCase(customer, useCaseId) {
  return buildCustomerUseCases(customer).find((useCase) => useCase.id === useCaseId) || null;
}

export function getGeneralModelDeployment() {
  return MODEL_DEPLOYMENTS.general;
}
