# GitHub Product Catalogue — Overview

> Source: GitHub public product & pricing documentation. Pricing verified June 2026. Always tell the seller to confirm live pricing at github.com/pricing before quoting a customer.

GitHub sells across four value pillars. A seller should be able to map any customer need to one of these.

## 1. Platform plans (the GitHub subscription a customer is on)
The base collaboration platform: repositories, pull requests, issues, Actions CI/CD, Packages, Pages.

| Plan | Who it's for | Headline |
|------|--------------|----------|
| **GitHub Free** | Individuals & small teams starting out | Unlimited public/private repos, 2,000 Actions minutes/mo, 500 MB Packages, community support |
| **GitHub Team** | Growing teams | Adds protected branches, code owners, required reviews, draft PRs, 3,000 Actions minutes/mo, advanced collaboration |
| **GitHub Enterprise** | Organisations needing scale, governance & security | SAML SSO, SCIM provisioning, audit log, GitHub Connect, Enterprise Managed Users (EMU), 50,000 Actions minutes/mo, advanced security available, choice of **Enterprise Cloud** or **Enterprise Server** (self-hosted) |

**Enterprise Cloud vs Server:** Cloud is GitHub-hosted (SaaS, fastest time-to-value, includes EMU, data residency options). Server is customer-hosted (on-prem/private cloud) for strict data-sovereignty or air-gapped needs. Many enterprises run a hybrid via GitHub Connect.

## 2. GitHub Copilot (AI pair programmer & agentic platform)
The fastest-growing line. Sells both standalone (Copilot can be added to ANY plan, even Free) and as part of Enterprise motions. See `04-copilot-deep-dive.md`.

Tiers: Copilot **Free**, **Pro**, **Pro+**, **Max** (individuals); Copilot **Business** and **Copilot Enterprise** (organisations/enterprises).

## 3. GitHub Advanced Security (application security)
Security capabilities that shift left into the developer workflow. As of 2025 GitHub sells these as **modular SKUs** you can buy independently:

| SKU | What it does |
|-----|--------------|
| **GitHub Secret Protection** | Secret scanning, push protection, secret-scanning for partners, validity checks, Copilot secret scanning |
| **GitHub Code Security** | CodeQL static analysis (SAST), security overview, dependency review, autofix (Copilot Autofix), security campaigns |
| **GitHub Advanced Security** (bundle, legacy/Enterprise) | The combined offering historically sold per committer on Enterprise |

Dependabot (dependency updates) and the dependency graph are included free on all plans.

## 4. GitHub Actions, Packages, Codespaces & Storage (consumption)
Usage-based products that drive expansion revenue:

- **GitHub Actions** — CI/CD automation. Billed by compute minutes (multipliers for Linux/Windows/macOS and larger runners) beyond plan-included minutes.
- **GitHub Packages** — package registry. Billed by storage + data transfer beyond included amounts.
- **GitHub Codespaces** — cloud dev environments. Billed by compute (core-hours) + storage.
- **Git LFS / Storage** — large file storage and data packs.
- **Larger / GPU hosted runners** — premium Actions runners for heavy or ML workloads.

## How the lines combine in a deal
A typical enterprise landing motion:
1. **Land** the platform (GitHub Enterprise) — consolidation, governance, developer experience.
2. **Attach** Copilot Business/Enterprise — productivity and AI story.
3. **Expand** with Advanced Security (Secret Protection + Code Security) — risk reduction.
4. **Grow** consumption (Actions, Codespaces) — modernisation and platform engineering.

The seller's job: find the entry point, then build the multi-product business case (developer velocity + security + cost consolidation).
