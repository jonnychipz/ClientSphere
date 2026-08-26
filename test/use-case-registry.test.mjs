import test from "node:test";
import assert from "node:assert/strict";
import { customers, getCustomer } from "../customer-registry.mjs";
import { buildCustomerUseCases } from "../use-case-registry.mjs";

test("every customer receives three distinct latest-model use cases", () => {
  for (const customer of customers) {
    const useCases = buildCustomerUseCases(customer);
    assert.equal(useCases.length, 3, customer.name);
    assert.equal(new Set(useCases.map((item) => item.id)).size, 3, customer.name);
    assert.equal(useCases.some((item) => item.supportsImages), true, customer.name);
    for (const useCase of useCases) {
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
  }
});

test("sector mapping creates recognisably tailored demonstrations", () => {
  assert.equal(buildCustomerUseCases(getCustomer("a-safe"))[0].id, "visual-safety");
  assert.equal(buildCustomerUseCases(getCustomer("jellycat"))[0].id, "product-concierge");
  assert.equal(buildCustomerUseCases(getCustomer("sgn"))[0].id, "field-integrity");
  assert.equal(buildCustomerUseCases(getCustomer("itf"))[0].id, "participant-concierge");
  assert.equal(buildCustomerUseCases(getCustomer("draken"))[0].id, "mission-readiness");
});
