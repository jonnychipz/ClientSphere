# GitHub Pricing — Multi-Currency Reference

> **Billing currency:** GitHub bills primarily in **USD**. GitHub Copilot is offered in **local currency** in some markets. The GBP/EUR figures below are **indicative conversions** for seller conversations, not GitHub's billed local price. FX used (indicative, June 2026): **1 USD ≈ 0.79 GBP ≈ 0.92 EUR**. Verified list prices: June 2026 — always confirm live at github.com/pricing.

## Platform plans (per user / month)

| Plan | USD | GBP (≈) | EUR (≈) | Notes |
|------|-----|---------|---------|-------|
| Free | $0 | £0 | €0 | Unlimited repos; 2,000 Actions min/mo |
| Team | $4.00 | £3.16 | €3.68 | Billed per user/month; some markets show annual discount |
| Enterprise | $21.00 | £16.59 | €19.32 | Cloud or Server; volume/EA pricing common |

> Enterprise customers usually buy through a **GitHub Enterprise Agreement (EA)** or via a Microsoft enterprise agreement — list price is a starting point; volume discounts and term commitments apply.

## GitHub Copilot — individuals (per month)

| Plan | USD/mo | USD/yr | GBP/mo (≈) | EUR/mo (≈) | Highlights |
|------|--------|--------|------------|------------|-----------|
| Copilot Free | $0 | — | £0 | €0 | Limited completions + chat, individual use only |
| Copilot Pro | $10 | $100 | £7.90 | €9.20 | Full completions, chat, agent mode, premium request allowance |
| Copilot Pro+ | $39 | $390 | £30.81 | €35.88 | Highest premium-request allowance, access to all frontier models |
| Copilot Max | $100 | — | £79.00 | €92.00 | Maximum premium-request volume for power users |

## GitHub Copilot — organisations & enterprises (per seat / month)

| Plan | USD | GBP (≈) | EUR (≈) | Highlights |
|------|-----|---------|---------|-----------|
| Copilot Business | $19 | £15.01 | €17.48 | Org-wide management, policy controls, IP indemnity, content exclusion, included premium requests |
| Copilot Enterprise | $39 | £30.81 | €35.88 | Everything in Business + knowledge bases, Copilot in github.com, PR summaries, fine-grained models, larger premium-request allowance |

Both Business and Enterprise are **billed monthly per assigned seat**. Premium requests beyond the included allowance are billed via **AI credits / usage-based billing** (see `03-licensing.md`).

## GitHub Advanced Security (per active committer / month)

| SKU | USD | GBP (≈) | EUR (≈) | Notes |
|-----|-----|---------|---------|-------|
| GitHub Secret Protection | $19 | £15.01 | €17.48 | Standalone since 2025; per active committer |
| GitHub Code Security | $30 | £23.70 | €27.60 | Standalone since 2025; per active committer |
| GitHub Advanced Security (legacy bundle) | $49 | £38.71 | €45.08 | Combined, historically Enterprise-only per committer |

> **Active committer** = a licensed user who has pushed a commit to a repo with the feature enabled in the last 90 days. This is the single most misunderstood pricing concept — see `03-licensing.md`.

## Consumption (pay-as-you-go, USD list)

| Product | Unit | Indicative USD |
|---------|------|----------------|
| Actions — Linux (standard) | per minute | $0.008 |
| Actions — Windows | per minute | $0.016 (2× Linux) |
| Actions — macOS | per minute | $0.08 (10× Linux) |
| Packages / Storage | per GB/mo | $0.25 |
| Codespaces compute | per core-hour | from $0.18 (2-core ≈ $0.36/hr) |
| Codespaces storage | per GB/mo | $0.07 |
| Git LFS data pack | 50 GB storage + 50 GB bandwidth | $5 |

Included monthly amounts vary by plan (e.g. Enterprise includes 50,000 Actions minutes + 50 GB Packages). Overages bill in USD.

## Quoting discipline (tell the seller)
- Quote **USD list** as the anchor, then offer indicative local currency only as a guide.
- Always separate **per-user/seat** costs (platform, Copilot) from **per-committer** costs (Advanced Security) from **consumption** (Actions/Codespaces) — mixing them is the #1 quoting error.
- For anything above ~50 seats, move the conversation to **Enterprise + EA / Microsoft agreement** for volume pricing.
