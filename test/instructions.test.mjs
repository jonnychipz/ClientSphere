import test from "node:test";
import assert from "node:assert/strict";
import { buildCustomerInstructions, buildUseCaseInstructions } from "../instructions.mjs";
import { getCustomer } from "../customer-registry.mjs";
import { buildCustomerUseCases } from "../use-case-registry.mjs";

test("customer prompt names and isolates the assigned organisation", () => {
  const customer = getCustomer("de-la-rue");
  const prompt = buildCustomerInstructions(customer, "2026-08-26T10:00:00Z");
  assert.match(prompt, /Assigned customer/);
  assert.match(prompt, /De La Rue/);
  assert.match(prompt, /Customer isolation - absolute rule/);
  assert.match(prompt, /Never use facts from another customer/);
  assert.match(prompt, /2026-08-26/);
  assert.match(prompt, /35-70 spoken words/);
});

test("synthetic use-case prompt is detailed internally and concise conversationally", () => {
  const customer = getCustomer("xp-power");
  const useCase = buildCustomerUseCases(customer)[0];
  const prompt = buildUseCaseInstructions(customer, useCase, "2026-08-26T10:00:00Z");
  assert.match(prompt, /synthetic use-case demonstration/i);
  assert.match(prompt, /Operating workflow/);
  assert.match(prompt, /Multimodal behaviour/);
  assert.match(prompt, /normally no more than 70 words/);
  for (const step of useCase.workflow) assert.match(prompt, new RegExp(step.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});
