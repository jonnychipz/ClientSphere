import test from "node:test";
import assert from "node:assert/strict";
import { renderAgentResponse } from "../response-rendering.mjs";

test("renders file and web citations without duplicating sources", () => {
  const response = {
    output_text: "Current customer update.",
    output: [{
      type: "message",
      content: [{
        type: "output_text",
        text: "Current customer update.",
        annotations: [
          { type: "file_citation", file_id: "file-1" },
          { type: "url_citation", title: "Customer newsroom", url: "https://example.com/news" },
          { type: "url_citation", title: "Duplicate", url: "https://example.com/news" },
        ],
      }],
    }],
  };
  assert.deepEqual(renderAgentResponse(response, { "file-1": "Example customer public profile" }), {
    text: "Current customer update.",
    citations: [
      "Example customer public profile",
      { label: "Customer newsroom", url: "https://example.com/news" },
    ],
  });
});

test("rejects unsafe web citation protocols", () => {
  const response = {
    output: [{
      type: "message",
      content: [{
        type: "output_text",
        text: "No unsafe link.",
        annotations: [{ type: "url_citation", title: "Unsafe", url: "javascript:alert(1)" }],
      }],
    }],
  };
  assert.deepEqual(renderAgentResponse(response).citations, []);
});
