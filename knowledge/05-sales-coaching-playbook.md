# Sales Coaching Playbook — Discovery & Positioning for GitHub Sellers

> Hubble uses this to coach the seller on **what questions to ask** and **how to position**. Coaching means asking the seller smart questions back, not just lecturing.

## The coaching stance
When the seller asks "how do I sell X" or "I have a meeting with customer Y", Hubble should:
1. Ask 1–3 sharp qualifying questions first (don't assume).
2. Offer a discovery question set tailored to the persona.
3. Suggest how to position the relevant product(s) and quantify value.
4. Surface likely objections and the response.
5. Recommend a concrete next step / call to action.

## Discovery framework (MEDDPICC-lite for GitHub)
- **Metrics** — What does the customer measure? (cycle time, deployment frequency, security MTTR, developer NPS, onboarding time.)
- **Economic buyer** — Who owns the budget? (VP Eng, CTO, CISO, Platform lead.)
- **Decision criteria** — What must be true to choose GitHub? (security, integration, TCO, developer adoption.)
- **Decision process** — How do they buy? (procurement, EA, security review, POC.)
- **Pain** — What hurts today? (tool sprawl, slow CI, security debt, low velocity.)
- **Champion** — Who internally will sell for you?
- **Competition** — GitLab, Atlassian (Bitbucket/Jira), Azure DevOps, Harness, Snyk, Cursor, etc.

## Persona-based discovery questions

### VP Engineering / Head of Platform
- "How do you measure developer productivity today, and are you happy with it?"
- "Where do developers lose the most time in your current toolchain?"
- "How standardised is your CI/CD across teams, or does every team roll their own?"
- "What's your onboarding time for a new engineer to first meaningful commit?"
- "If you could remove one tool from your stack, what would it be and why?"

### CISO / Security lead
- "How do you catch secrets before they hit a repo today?"
- "What's your mean time to remediate a critical vulnerability in application code?"
- "How much of your AppSec is shifting left into the developer workflow vs gating at the end?"
- "How do you govern AI coding tools your developers may already be using unofficially?"
- "What does your audit and compliance evidence trail look like across your SCM?"

### CTO / Economic buyer
- "What's your strategic bet on AI in the SDLC over the next 12–18 months?"
- "How many separate tools are in your developer toolchain, and what do they cost in total?"
- "What would a 10–20% improvement in engineering throughput be worth to the business?"
- "Is consolidation onto one platform a priority this fiscal year?"

### Developer / Champion
- "Which AI coding tools are your developers already using, sanctioned or not?"
- "Where does the team feel the most friction day to day?"
- "What would make developers genuinely excited rather than just compliant?"

## Positioning plays
- **AI productivity play** → Copilot Business (land), Enterprise (expand with org knowledge).
- **Security / shift-left play** → Secret Protection + Code Security + Copilot Autofix.
- **Consolidation / TCO play** → GitHub Enterprise replacing fragmented SCM + CI + security point tools.
- **Platform engineering play** → Actions + Codespaces + reusable workflows.
- **Governance of shadow AI** → "Your devs are already using AI tools — Copilot Business gives you the productivity AND the policy, indemnity and content controls to do it safely."

## Common objections & responses
| Objection | Response angle |
|-----------|----------------|
| "We already have GitLab/ADO." | Quantify consolidation TCO + AI-native developer experience + adoption; offer side-by-side POC on real repos. |
| "Copilot is too expensive." | Reframe per-seat cost vs hours saved × loaded dev cost; pilot to prove ROI; budgets to control spend. |
| "Security of AI / our code." | Indemnity, no-training on your code, content exclusion, SOC/compliance posture. |
| "Developers won't adopt." | Adoption is high precisely because devs already know GitHub; run a 30-day pilot and measure. |
| "Let's wait." | Cost of inaction: shadow AI risk, competitor velocity, security debt accruing. |

## Always close with a next step
Coach the seller to leave every interaction with a concrete CTA: a scoped pilot/POC, a technical deep-dive, a business-value workshop, or an exec briefing. No meeting should end without an agreed next action and date.

## Tone reminder for Hubble
Professional, upbeat, energising — like a brilliant sales coach who's done the deals. Use the seller's momentum. Celebrate good thinking, gently challenge assumptions, and always make the seller feel more confident walking into the room.
