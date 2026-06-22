# GitHub Licensing & Billing Mechanics

> The details sellers get wrong most often. Master the unit of measure for each product.

## Units of measure (memorise this table)

| Product | Licensed by | Billing trigger |
|---------|-------------|-----------------|
| Platform (Free/Team/Enterprise) | **Per user** (member of org/enterprise) | Each active member seat per month |
| Copilot Business / Enterprise | **Per seat** (assigned licence) | Each assigned seat per month, prorated when added mid-cycle |
| Secret Protection / Code Security / GHAS | **Per active committer** | Unique committer who pushed in last 90 days to an enabled repo |
| Actions / Codespaces / Packages | **Per consumption** | Minutes / core-hours / GB beyond included allowance |
| Copilot premium requests | **Per AI credit** | Usage beyond the plan's included premium-request allowance |

## Platform seat rules
- A **seat = one user**. If a user belongs to multiple orgs inside one enterprise, the enterprise is billed **once**.
- Enterprise plans support **Enterprise Managed Users (EMU)** — identities fully provisioned and controlled by the enterprise IdP (SCIM), isolated from public GitHub.
- Outside collaborators consume a seat if they have access to private repos.

## Copilot licensing rules
- A Copilot **seat = one user**. Seats are assigned by org/enterprise admins (directly, by team, or to all members).
- If a user has **both** a Business and an Enterprise seat in the same enterprise, **only the Enterprise seat is billed**.
- If an individual with personal **Copilot Pro/Pro+/Max** is assigned an org seat, their personal plan is **auto-cancelled with a prorated refund**.
- Adding seats: takes effect immediately, **prorated** for the remainder of the cycle. Removing: access continues until end of cycle (monthly), no proration.
- **IP indemnity** and **content exclusion** (block named repos/paths from being used as context) are Business/Enterprise features — a key enterprise-trust talking point.

## Copilot premium requests & AI credits
- Each paid Copilot plan includes a monthly allowance of **premium requests** (used by advanced models and agentic features).
- Usage beyond the allowance is billed as **usage-based AI credits** (metered).
- Admins can set **budgets** at user, org, cost-centre and enterprise level with alerts at 75/90/100%. Budgets monitor and can **cap** additional usage but do not stop base licence charges.
- Standard model completions/chat within plan are not metered as premium requests; premium models and agent runs consume the allowance.

## Advanced Security: the "active committer" model (critical)
- You are billed for **unique active committers**, not total developers.
- An active committer is counted when they **push a commit in the last 90 days** to a repository where the security feature is **enabled**.
- A committer enabled across multiple repos/orgs in the enterprise counts **once**.
- This means customers can **pilot on a subset of repos** to control cost, then expand — a powerful land-and-expand lever.
- Secret Protection and Code Security can now be **bought separately**; you no longer must take the full GHAS bundle.

## Purchasing routes
- **Self-serve / credit card** — individuals and small orgs (Team, Copilot Pro).
- **GitHub invoiced / Enterprise Agreement** — larger orgs; annual term, volume pricing.
- **Microsoft enterprise agreement / Azure marketplace** — GitHub can be transacted through Microsoft for customers with an existing Microsoft relationship (often the smoothest enterprise path; can draw down Microsoft commitment).
- **Volume discounts** apply at scale; always engage deal desk for large or multi-year.

## Compliance & governance talking points
- Audit log + audit log streaming (Enterprise).
- SAML/OIDC SSO + SCIM provisioning.
- Data residency (GitHub Enterprise Cloud with data residency) for EU/regional requirements.
- IP indemnification for Copilot Business/Enterprise output.
