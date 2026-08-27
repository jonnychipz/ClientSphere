import { FETCH_DOC_TOOL } from "./webgrounding.mjs";

export function buildFetchPublicSourceTool() {
  return {
    type: "function",
    name: FETCH_DOC_TOOL.name,
    description: FETCH_DOC_TOOL.description,
    strict: true,
    parameters: {
      ...FETCH_DOC_TOOL.parameters,
      additionalProperties: false,
    },
  };
}

export function buildCustomerAgentTools(vectorStoreId, {
  enableWebSearch = false,
  enableCodeInterpreter = false,
} = {}) {
  if (!vectorStoreId) throw new Error("vectorStoreId is required.");
  const tools = [
    { type: "file_search", vector_store_ids: [vectorStoreId] },
    buildFetchPublicSourceTool(),
  ];
  if (enableWebSearch) {
    tools.push({
      type: "web_search",
      search_context_size: "medium",
    });
  }
  if (enableCodeInterpreter) {
    tools.push({ type: "code_interpreter", container: { type: "auto" } });
  }
  return tools;
}
