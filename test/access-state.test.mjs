import test from "node:test";
import assert from "node:assert/strict";
import { accessStateFromTags, accessStateTags, decodeAccessState, encodeAccessState } from "../access-state.mjs";

const secret = "a-long-test-session-secret";
const users = [
  { login: "owner", status: "approved", isAdmin: true, email: "owner@example.test" },
  { login: "pending", status: "pending", isAdmin: false },
];

test("access registry is encrypted and round-trips", () => {
  const encoded = encodeAccessState(users, secret);
  assert.doesNotMatch(encoded, /owner@example/);
  assert.deepEqual(decodeAccessState(encoded, secret), users);
});

test("access registry rejects the wrong encryption key", () => {
  const encoded = encodeAccessState(users, secret);
  assert.throws(() => decodeAccessState(encoded, "wrong-secret"));
});

test("encrypted access registry is chunked into and restored from resource tags", () => {
  const encoded = encodeAccessState(users, secret);
  assert.equal(accessStateFromTags(accessStateTags(encoded)), encoded);
});
