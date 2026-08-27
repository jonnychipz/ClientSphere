import test from "node:test";
import assert from "node:assert/strict";
import { customers } from "../customer-registry.mjs";
import { buildCustomerSyntheticUseCases, buildCustomerUseCases } from "../use-case-registry.mjs";

test("every customer receives three synthetic use cases and one live Fabric mode", () => {
  for (const customer of customers) {
    const useCases = buildCustomerUseCases(customer);
    const syntheticUseCases = buildCustomerSyntheticUseCases(customer);
    assert.equal(useCases.length, 4, customer.name);
    assert.equal(syntheticUseCases.length, 3, customer.name);
    assert.equal(new Set(useCases.map((item) => item.id)).size, 4, customer.name);
    assert.equal(useCases.some((item) => item.supportsImages), true, customer.name);
    for (const useCase of syntheticUseCases) {
      assert.match(useCase.modelDeployment, /^gpt-5\.6-(sol|luna|terra)$/);
      assert.equal(useCase.workflow.length, 6);
      assert.equal(useCase.prompts.length, 3);
      assert.equal(useCase.demoScenes.length, 3);
      assert.deepEqual(useCase.demoScenes.map((scene) => scene.id), ["live-signal", "agent-work", "business-value"]);
      for (const scene of useCase.demoScenes) {
        assert.match(scene.prompt, new RegExp(customer.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
        assert.ok(Object.keys(scene.syntheticData).length >= 4);
      }
    }
    const live = useCases[3];
    assert.equal(live.id, "manufacturing-live");
    assert.equal(live.isLive, true);
    assert.equal(live.specialists.length, 4);
    assert.equal(live.workflow.length, 0);
    assert.match(live.disclosure, new RegExp(`not ${customer.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} operational data`, "i"));
  }
});

test("sector mapping creates recognisably tailored demonstrations", () => {
  const fixture = (id, sector) => ({ id, name: id, website: "https://example.com", sector, summary: "Test", topics: ["Test"] });
  assert.equal(buildCustomerUseCases(fixture("safety", "Industrial safety"))[0].id, "visual-safety");
  assert.equal(buildCustomerUseCases(fixture("consumer", "Consumer products"))[0].id, "product-concierge");
  assert.equal(buildCustomerUseCases(fixture("utility", "Gas networks"))[0].id, "field-integrity");
  assert.equal(buildCustomerUseCases(fixture("sport", "International sport"))[0].id, "participant-concierge");
  assert.equal(buildCustomerUseCases(fixture("aviation", "Aerospace and defence"))[0].id, "mission-readiness");
});
