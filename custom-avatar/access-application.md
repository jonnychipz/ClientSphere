# Limited Access application checklist

> **Documentation:** [Custom avatar and voice](README.md) · [Consent](consent-statements.md) · [Training](submission-guide.md) · [Home](../README.md)

Use this as a drafting checklist for the current Microsoft Limited Access intake form. Do not submit placeholder text, and do not claim approval, consent, controls, or deployment details that are not true.

Apply through <https://aka.ms/customneural> and verify the current form and terms.

## Applicant details

```text
Organisation:
Applicant name:
Job title/team:
Work email:
Country/region:
Azure tenant ID:
Azure subscription ID:
Target Azure AI Services/Speech resource:
Target Azure region:
```

Do not commit completed personal, tenant, or subscription details to this repository.

## Capability requested

Select only what is needed:

- Custom Text to Speech Avatar
- Professional/Custom Neural Voice
- Voice sync for avatar, if currently offered and required

## Short use-case template

```text
ClientSphere is an access-controlled customer-intelligence and meeting-coaching
application. It uses public customer information and synthetic demonstration
data. We want to use an authorised custom avatar and/or voice for an identified
presenter, with explicit consent and visible synthetic-media disclosure.
```

## Detailed scenario questions

Prepare truthful answers for:

| Topic | Information to provide |
|---|---|
| Audience | Internal team, customers, public users, or another defined group |
| Content | What the avatar/voice will say and which data sources ground it |
| Channel | Real-time web experience using Azure Speech |
| Scale | Estimated users, sessions, geography, and expected concurrency |
| Talent | Whose likeness/voice is used and their relationship to the applicant |
| Consent | How consent is captured, verified, retained, and withdrawn |
| Disclosure | Where users are told the media is synthetic |
| Access | How GitHub OAuth and ClientSphere approval limit users |
| Misuse controls | How impersonation, deception, unsafe content, and unauthorised reuse are prevented |
| Data handling | Media storage, access, retention, deletion, and regional requirements |
| Human oversight | Who owns approval, incident response, and periodic review |

## ClientSphere-specific safeguards to describe accurately

- GitHub OAuth plus an approved-user registry.
- Administrator review for later users.
- Managed identity for Azure service access.
- Public-source customer grounding and customer-isolated stores.
- Standard Microsoft content-safety policy on model deployments.
- Synthetic demonstration data labelled as synthetic.
- Ability for administrators to hide a custom voice/avatar.

Do not state that ClientSphere stores consent media or governs training data; those controls belong to the Azure Speech training/deployment process and your organisation.

## Before submission

1. Confirm the applicant is authorised to submit for the Azure subscription.
2. Obtain talent consent and organisational approval.
3. Confirm target region and S0/eligible resource requirements from current docs.
4. Complete privacy, legal, security, accessibility, and Responsible AI reviews.
5. Save the application and approval evidence in an approved organisational location, not this Git repository.

After approval, continue with [consent-statements.md](consent-statements.md) and [submission-guide.md](submission-guide.md).
