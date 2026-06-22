# GitHub Copilot — Deep Dive

> The flagship AI line. Sellers must be fluent in the tiers, the surfaces, the models, and the agentic capabilities.

## The tiers at a glance

| Tier | Audience | Price (USD) | Why a customer picks it |
|------|----------|-------------|--------------------------|
| Copilot Free | Individual | $0 | Try it; light usage |
| Copilot Pro | Individual dev | $10/mo | Full features for one developer |
| Copilot Pro+ | Power individual | $39/mo | Max model access + high premium-request allowance |
| Copilot Max | Heaviest individual | $100/mo | Maximum premium-request volume |
| Copilot Business | Organisation | $19/seat/mo | Central management, policy, indemnity, content exclusion |
| Copilot Enterprise | Enterprise | $39/seat/mo | Org knowledge, Copilot across github.com, deeper customisation |

## Where Copilot shows up (the "surfaces")
- **IDE** — VS Code, Visual Studio, JetBrains, Neovim, Xcode: completions, Copilot Chat, inline chat.
- **Copilot Chat** — conversational help, explain, fix, test, refactor.
- **Agent mode / Copilot coding agent** — Copilot takes an issue, plans, edits across files, runs, and opens a PR.
- **Copilot in the CLI** — command suggestions and explanations.
- **Copilot in GitHub.com** (Enterprise) — chat grounded in your repos, knowledge bases, PR summaries.
- **Copilot code review** — AI review comments on pull requests.
- **Copilot Autofix** — suggested fixes for CodeQL/security alerts (ties to Code Security).
- **Copilot Extensions** — third-party tools (and your own) inside Chat.
- **Copilot Spaces / knowledge bases** (Enterprise) — curated context for grounded answers.

## Models
Copilot offers a **model picker** with multiple frontier models (OpenAI GPT family, Anthropic Claude, Google Gemini among them, evolving over time). Higher tiers unlock more models and more **premium requests**. Sellers should frame this as "choice of best model for the task, governed centrally" rather than naming a single model.

## Business vs Enterprise — how to position
**Lead with Business** when the customer wants productivity + central control + trust (indemnity, content exclusion, policy). It's the volume SKU.

**Step up to Enterprise** when the customer wants:
- Copilot **grounded in their own org knowledge** (knowledge bases, Copilot Spaces).
- Copilot **across github.com**, not just the IDE.
- **PR summaries**, deeper review, and broader customisation.
- A unified AI-native developer platform story at scale.

You can **mix** Business and Enterprise across orgs within one enterprise.

## Value framing (what to quantify with the customer)
- **Developer productivity**: task time reduction, faster onboarding, less context-switching. Tie to fully-loaded developer cost.
- **Throughput**: more PRs merged, faster cycle time.
- **Quality & security**: Autofix reduces vulnerability dwell time.
- **Talent**: developer satisfaction and retention.
Build the business case as: (seats × monthly price) vs (hours saved × loaded hourly cost) + risk reduction. A few % of a developer's time usually pays for the seat many times over.

## Trust & governance objections (have answers ready)
- "Is our code used to train models?" — Business/Enterprise: your code/prompts are **not** used to train the foundation models; content exclusion lets you block specific repos/paths.
- "IP risk?" — IP **indemnity** is included for Business/Enterprise.
- "Data residency / compliance?" — combine with Enterprise Cloud data residency.
- "Cost control?" — budgets + premium-request allowances + usage caps.
