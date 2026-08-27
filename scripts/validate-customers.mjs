import { customers } from "../customer-registry.mjs";
import { buildCustomerUseCases } from "../use-case-registry.mjs";

for (const customer of customers) {
  const useCases = buildCustomerUseCases(customer);
  if (useCases.length !== 3) {
    throw new Error(`${customer.name} must resolve to exactly three use-case agents.`);
  }
}

console.log(`Validated ${customers.length} customer${customers.length === 1 ? "" : "s"} and ${customers.length * 4} agent modes.`);
