import test from "node:test";
import assert from "node:assert/strict";
import { buildCustomerInstructions, buildUseCaseInstructions } from "../instructions.mjs";
import { customers } from "../customer-registry.mjs";
import { buildCustomerUseCases } from "../use-case-registry.mjs";

test("customer prompt names and isolates the assigned organisation", () => {
  const customer = customers[0];
  const prompt = buildCustomerInstructions(customer, "2026-08-26T10:00:00Z");
  assert.match(prompt, /Assigned customer/);
  assert.match(prompt, new RegExp(customer.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(prompt, /Customer isolation - absolute rule/);
  assert.match(prompt, /Never use facts from another customer/);
  assert.match(prompt, /2026-08-26/);
  assert.match(prompt, /35-70 spoken words/);
});

test("synthetic use-case prompt is detailed internally and concise conversationally", () => {
  const customer = customers[0];
  const useCase = buildCustomerUseCases(customer)[0];
  const prompt = buildUseCaseInstructions(customer, useCase, "2026-08-26T10:00:00Z");
  assert.match(prompt, /synthetic use-case demonstration/i);
  assert.match(prompt, /Operating workflow/);
  assert.match(prompt, /Multimodal behaviour/);
  assert.match(prompt, /Guided three-scene demo/);
  assert.match(prompt, /Code Interpreter/);
  assert.match(prompt, /RESPONSE_MODE:BRIEF/);
  assert.match(prompt, /RESPONSE_MODE:STRUCTURED/);
  assert.match(prompt, /normally no more than 70 words/);
  for (const step of useCase.workflow) assert.match(prompt, new RegExp(step.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});
