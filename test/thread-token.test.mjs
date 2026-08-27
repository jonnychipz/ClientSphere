import test from "node:test";
import assert from "node:assert/strict";
import { createThreadToken, verifyThreadToken } from "../thread-token.mjs";

const secret = "a-test-secret-long-enough-for-hmac";
const input = { customerId: "customer-one", agentMode: "visual-safety", threadId: "resp_123", userLogin: "Portfolio-Admin" };

test("thread token binds customer, thread, and user", () => {
  const token = createThreadToken(input, secret);
  assert.equal(
    verifyThreadToken(token, { customerId: "customer-one", agentMode: "visual-safety", userLogin: "portfolio-admin" }, secret),
    "resp_123",
  );
});

test("thread token rejects customer relabelling, user changes, and tampering", () => {
  const token = createThreadToken(input, secret);
  assert.equal(verifyThreadToken(token, { customerId: "customer-two", agentMode: "visual-safety", userLogin: "portfolio-admin" }, secret), null);
  assert.equal(verifyThreadToken(token, { customerId: "customer-one", agentMode: "asset-service", userLogin: "portfolio-admin" }, secret), null);
  assert.equal(verifyThreadToken(token, { customerId: "customer-one", agentMode: "visual-safety", userLogin: "other-user" }, secret), null);
  assert.equal(verifyThreadToken(`${token}x`, { customerId: "customer-one", agentMode: "visual-safety", userLogin: "portfolio-admin" }, secret), null);
});
