import test from "node:test";
import assert from "node:assert/strict";
import { customers, getCustomer, customerPublicView } from "../customer-registry.mjs";

test("catalogue contains all Edge SME&C customer favourites", () => {
  assert.equal(customers.length, 40);
  assert.equal(new Set(customers.map((customer) => customer.id)).size, 40);
  assert.equal(customers.some((customer) => customer.id === "cobham-satcom"), false);
  assert.equal(customers.some((customer) => customer.id === "royal-kennel-club"), false);
});

test("catalogue entries expose safe public fields", () => {
  const customer = getCustomer("a-safe");
  assert.equal(customer.name, "A-SAFE");
  assert.equal(customer.domain, "asafe.com");
  assert.equal(customer.logoUrl, "/customer-logos/a-safe");
  assert.deepEqual(
    Object.keys(customerPublicView(customer)).sort(),
    ["domain", "id", "initials", "logoUrl", "name", "sector", "summary", "topics", "useCases", "website"].sort(),
  );
  assert.equal(customerPublicView(customer).useCases.length, 3);
});

test("unknown customer ids are rejected", () => {
  assert.equal(getCustomer("not-a-customer"), null);
});
