import test from "node:test";
import assert from "node:assert/strict";
import { createThreadToken, verifyThreadToken } from "../thread-token.mjs";

const secret = "a-test-secret-long-enough-for-hmac";
const input = { customerId: "a-safe", agentMode: "visual-safety", threadId: "resp_123", userLogin: "JonnyChipz" };

test("thread token binds customer, thread, and user", () => {
  const token = createThreadToken(input, secret);
  assert.equal(
    verifyThreadToken(token, { customerId: "a-safe", agentMode: "visual-safety", userLogin: "jonnychipz" }, secret),
    "resp_123",
  );
});

test("thread token rejects customer relabelling, user changes, and tampering", () => {
  const token = createThreadToken(input, secret);
  assert.equal(verifyThreadToken(token, { customerId: "barrett-steel", agentMode: "visual-safety", userLogin: "jonnychipz" }, secret), null);
  assert.equal(verifyThreadToken(token, { customerId: "a-safe", agentMode: "asset-service", userLogin: "jonnychipz" }, secret), null);
  assert.equal(verifyThreadToken(token, { customerId: "a-safe", agentMode: "visual-safety", userLogin: "other-user" }, secret), null);
  assert.equal(verifyThreadToken(`${token}x`, { customerId: "a-safe", agentMode: "visual-safety", userLogin: "jonnychipz" }, secret), null);
});
