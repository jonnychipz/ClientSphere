import test from "node:test";
import assert from "node:assert/strict";
import {
  createFabricState, verifyFabricState, safeReturnTo,
  setFabricSession, getFabricSession,
} from "../fabric-auth.mjs";

const secret = "fabric-auth-test-secret";

test("Fabric OAuth state is encrypted, user-bound, and return path constrained", () => {
  const token = createFabricState({ login: "Presenter", returnTo: "/?mode=live" }, secret);
  assert.doesNotMatch(token, /Presenter|mode=live/);
  assert.equal(verifyFabricState(token, "presenter", secret).returnTo, "/?mode=live");
  assert.equal(verifyFabricState(token, "someone-else", secret), null);
  assert.equal(safeReturnTo("https://evil.example"), "/");
  assert.equal(safeReturnTo("//evil.example"), "/");
  assert.equal(safeReturnTo("/\\evil.example"), "/");
  assert.equal(safeReturnTo("/live\\details"), "/");
});

test("Fabric session cookie is encrypted and bound to the GitHub session", () => {
  const headers = [];
  const res = { append(name, value) { headers.push([name, value]); } };
  setFabricSession(res, {
    accessToken: "delegated-token",
    expiresOnMs: Date.now() + 10 * 60 * 1000,
    tenantId: "tenant",
    objectId: "user",
    name: "Presenter",
    username: "presenter@example.com",
  }, "GitHubUser", false, secret);
  const encoded = /clientsphere_fabric=([^;]+)/.exec(headers[0][1])[1];
  const req = { headers: { cookie: `clientsphere_fabric=${encoded}` } };
  assert.equal(getFabricSession(req, "githubuser", secret).accessToken, "delegated-token");
  assert.equal(getFabricSession(req, "other-user", secret), null);
});
