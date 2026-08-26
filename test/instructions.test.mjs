import test from "node:test";
import assert from "node:assert/strict";
import { buildCustomerInstructions } from "../instructions.mjs";
import { getCustomer } from "../customer-registry.mjs";

test("customer prompt names and isolates the assigned organisation", () => {
  const customer = getCustomer("de-la-rue");
  const prompt = buildCustomerInstructions(customer, "2026-08-26T10:00:00Z");
  assert.match(prompt, /Assigned customer/);
  assert.match(prompt, /De La Rue/);
  assert.match(prompt, /Customer isolation - absolute rule/);
  assert.match(prompt, /Never use facts from another customer/);
  assert.match(prompt, /2026-08-26/);
});
