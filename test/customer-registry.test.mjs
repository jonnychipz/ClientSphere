import test from "node:test";
import assert from "node:assert/strict";
import { customers, getCustomer, customerPublicView } from "../customer-registry.mjs";

test("catalogue contains at least one uniquely identified customer", () => {
  assert.ok(customers.length > 0);
  assert.equal(new Set(customers.map((customer) => customer.id)).size, customers.length);
});

test("catalogue entries expose safe public fields", () => {
  const customer = customers[0];
  assert.equal(getCustomer(customer.id), customer);
  assert.equal(customer.domain, new URL(customer.website).hostname.replace(/^www\./, ""));
  assert.equal(customer.logoUrl, `/customer-logos/${customer.id}`);
  assert.deepEqual(
    Object.keys(customerPublicView(customer)).sort(),
    ["domain", "id", "initials", "logoUrl", "name", "sector", "summary", "topics", "useCases", "website"].sort(),
  );
  assert.equal(customerPublicView(customer).useCases.length, 4);
});

test("unknown customer ids are rejected", () => {
  assert.equal(getCustomer("not-a-customer"), null);
});
