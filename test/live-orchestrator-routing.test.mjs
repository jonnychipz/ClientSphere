import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const serverSource = fs.readFileSync(new URL("../server.mjs", import.meta.url), "utf8");
const browserSource = fs.readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
const provisionSource = fs.readFileSync(new URL("../scripts/provision-customer-agents.mjs", import.meta.url), "utf8");

test("live chat is wired only to the Foundry orchestrator", () => {
  assert.match(
    serverSource,
    /customerAgent = isLiveFabric && liveManufacturingReady\s*\?\s*agentMetadata\.liveManufacturing\?\.orchestrator/s,
  );
  assert.match(serverSource, /agentContext = isLiveFabric \? "orchestrator" : ""/);
  assert.match(serverSource, /toolChoice: isLiveFabric \? "required" : undefined/);
  assert.match(serverSource, /FABRIC_CAPACITY_EXCEEDED/);
  assert.match(serverSource, /FABRIC_TOOL_TIMEOUT/);
  assert.doesNotMatch(serverSource, /liveSpecialist|CLIENTSPHERE_SPECIALIST_LENS/);
});

test("browser does not expose or send specialist selection", () => {
  assert.doesNotMatch(browserSource, /liveSpecialist|selectLiveSpecialist|data-live-specialist/);
  assert.match(browserSource, /Ask the shopfloor orchestrator/);
  assert.match(browserSource, /orchestrator selects and combines the underlying Fabric Data Agents/);
  assert.match(browserSource, /mode\.isLive \? "structured" : preferred/);
});

test("orchestrator uses direct Fabric MCP tools rather than the A2A toolbox", () => {
  assert.match(provisionSource, /tools: directFabricTools/);
  assert.match(provisionSource, /server_label: specialist\.mcpServerLabel/);
  assert.match(provisionSource, /clientsphereArchitecture: "direct-fabric-mcp"/);
  assert.doesNotMatch(provisionSource, /server_label: "manufacturing_specialists"/);
});
