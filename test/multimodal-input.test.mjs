import test from "node:test";
import assert from "node:assert/strict";
import { buildAgentInput } from "../multimodal-input.mjs";

test("text-only input remains compact", () => {
  assert.equal(buildAgentInput("Hello", []), "Hello");
});

test("valid image input becomes multimodal Responses content", () => {
  const dataUrl = `data:image/png;base64,${Buffer.from("synthetic-image").toString("base64")}`;
  const input = buildAgentInput("Inspect this", [{ mimeType: "image/png", dataUrl }]);
  assert.equal(input[0].content[0].type, "input_text");
  assert.equal(input[0].content[1].type, "input_image");
  assert.equal(input[0].content[1].image_url, dataUrl);
});

test("invalid or multiple attachments are rejected", () => {
  assert.throws(
    () => buildAgentInput("Inspect", [{ mimeType: "image/gif", dataUrl: "data:image/gif;base64,AA==" }]),
    /PNG, JPEG, or WebP/,
  );
  assert.throws(
    () => buildAgentInput("Inspect", [{}, {}]),
    /at most one image/,
  );
});
