import test from "node:test";
import assert from "node:assert/strict";
import { buildCustomerAgentTools } from "../agent-tooling.mjs";

test("general adviser tools include Foundry web search without code interpreter", () => {
  const tools = buildCustomerAgentTools("vs-general", { enableWebSearch: true });
  assert.deepEqual(tools.map((tool) => tool.type), ["file_search", "function", "web_search"]);
  assert.equal(tools[0].vector_store_ids[0], "vs-general");
  assert.equal(tools[2].search_context_size, "medium");
});

test("synthetic adviser tools keep code interpreter without unrestricted web search", () => {
  const tools = buildCustomerAgentTools("vs-synthetic", { enableCodeInterpreter: true });
  assert.deepEqual(tools.map((tool) => tool.type), ["file_search", "function", "code_interpreter"]);
});

test("customer agent tools require an isolated vector store", () => {
  assert.throws(() => buildCustomerAgentTools(""), /vectorStoreId is required/);
});
