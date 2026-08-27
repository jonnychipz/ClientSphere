import { customers } from "../customer-registry.mjs";
import { buildCustomerSyntheticUseCases, buildCustomerUseCases } from "../use-case-registry.mjs";

for (const customer of customers) {
  const syntheticUseCases = buildCustomerSyntheticUseCases(customer);
  if (syntheticUseCases.length !== 3) {
    throw new Error(`${customer.name} must resolve to exactly three use-case agents.`);
  }
  if (buildCustomerUseCases(customer).length !== 4) {
    throw new Error(`${customer.name} must expose three synthetic use cases and one live Fabric use case.`);
  }
}

console.log(`Validated ${customers.length} customer${customers.length === 1 ? "" : "s"} and ${customers.length * 5} agent modes.`);
