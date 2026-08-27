import test from "node:test";
import assert from "node:assert/strict";
import { isPrivateAddress, sourceAllowedForCustomer } from "../webgrounding.mjs";

const customer = { website: "https://www.example-customer.com/", domain: "example-customer.com" };

test("source allowlist accepts official and registry domains", () => {
  assert.equal(sourceAllowedForCustomer("https://www.example-customer.com/about/", customer), true);
  assert.equal(sourceAllowedForCustomer("https://find-and-update.company-information.service.gov.uk/company/123", customer), true);
});

test("source allowlist rejects unrelated and suffix-confusion domains", () => {
  assert.equal(sourceAllowedForCustomer("https://example.com/", customer), false);
  assert.equal(sourceAllowedForCustomer("https://example-customer.com.evil.example/", customer), false);
  assert.equal(sourceAllowedForCustomer("http://www.example-customer.com/", customer), false);
});

test("private network addresses are blocked", () => {
  for (const address of ["127.0.0.1", "10.0.0.2", "169.254.169.254", "192.168.1.1", "::1", "fd00::1", "::ffff:169.254.169.254", "::ffff:172.16.0.1", "::ffff:a9fe:a9fe", "::ffff:7f00:1", "::ffff:c0a8:101"]) {
    assert.equal(isPrivateAddress(address), true, address);
  }
  assert.equal(isPrivateAddress("8.8.8.8"), false);
  assert.equal(isPrivateAddress("2606:4700:4700::1111"), false);
});
