import test from "node:test";
import assert from "node:assert/strict";
import { approvedAdmins, isApprovedAdmin, registrationDisposition, removalGuard, withAccessRegistryLock } from "../access-governance.mjs";

const admin = (login) => ({ login, status: "approved", isAdmin: true });
const user = (login, status = "approved") => ({ login, status, isAdmin: false });

test("the first registered user becomes an approved administrator", () => {
  assert.deepEqual(registrationDisposition([], "first-user", []), {
    status: "approved",
    isAdmin: true,
    bootstrapped: true,
  });
});

test("the genuine first user is administrator even when a recovery login is configured", () => {
  assert.equal(registrationDisposition([], "alice", ["jonnychipz"]).isAdmin, true);
});

test("later users remain pending until approved", () => {
  assert.equal(registrationDisposition([admin("owner")], "new-user", ["jonnychipz"]).status, "pending");
});

test("a configured bootstrap login is not elevated while another admin exists", () => {
  const disposition = registrationDisposition([admin("someone")], "jonnychipz", ["jonnychipz"]);
  assert.equal(disposition.status, "pending");
  assert.equal(disposition.isAdmin, false);
});

test("configured administrator can recover a registry with no approved admin", () => {
  const disposition = registrationDisposition([user("someone", "denied")], "jonnychipz", ["jonnychipz"]);
  assert.equal(disposition.isAdmin, true);
});

test("only approved stored administrators count", () => {
  assert.equal(isApprovedAdmin({ login: "x", status: "pending", isAdmin: true }), false);
  assert.equal(approvedAdmins([admin("a"), user("b"), { login: "c", status: "denied", isAdmin: true }]).length, 1);
});

test("sole administrator cannot be deleted or demoted", () => {
  assert.equal(removalGuard([admin("owner"), user("member")], "owner").allowed, false);
  assert.equal(removalGuard([admin("owner"), admin("backup")], "owner").allowed, true);
  assert.equal(removalGuard([admin("owner")], "missing").allowed, false);
});

test("registry mutations are serialized", async () => {
  const order = [];
  await Promise.all([
    withAccessRegistryLock(async () => {
      order.push("first-start");
      await new Promise((resolve) => setTimeout(resolve, 20));
      order.push("first-end");
    }),
    withAccessRegistryLock(async () => {
      order.push("second");
    }),
  ]);
  assert.deepEqual(order, ["first-start", "first-end", "second"]);
});
