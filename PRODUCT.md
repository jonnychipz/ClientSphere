# Product

> **Documentation:** [Home](README.md) · [Product tour](docs/SCREENSHOTS.md) · [Design system](DESIGN.md) · [AI-assisted setup](AI-SETUP-PROMPT.md)

This document defines what ClientSphere is, who it serves, and which boundaries a repurposed deployment must preserve.

## Users

Microsoft sellers and technical presenters use ClientSphere before and during customer conversations. Their primary task is to select the customer in front of them, understand that organisation quickly, and hold a credible, source-grounded conversation without mixing information between accounts.

![Redacted customer intelligence experience](docs/images/clientsphere-intelligence-redacted.png)

## Product Purpose

ClientSphere turns a portfolio of public customer information into a focused conversational briefing and demonstration experience. Success means the presenter can switch customers in seconds, use a concise general adviser, move into three clearly tailored synthetic agent workflows, add an image where relevant, rehearse a meeting, and trace material claims to current public sources.

## Core journeys

| Journey | Expected outcome |
|---|---|
| Prepare | Select a customer and build an evidence-led public brief |
| Explore | Ask questions with citations and clear uncertainty |
| Demonstrate | Run three tailored synthetic workflows or query the shared live Fabric shopfloor experience |
| Rehearse | Practise a customer conversation and receive coaching |
| Present | Use brief voice/avatar turns or structured screen-first artefacts |
| Govern | Approve users, delegate administration, and inspect usage |

## Brand Personality

Credible, composed, and incisive. The product should feel like a prepared account strategist: confident without bluffing, polished without theatre, and concise enough to use live in a meeting.

## Anti-references

- A generic chatbot with no visible customer context.
- A noisy CRM dashboard full of unrelated cards and internal sales data.
- A clone of GitHub branding, Hubble naming, or proprietary customer portals.
- Decorative glass, gradient text, novelty controls, or motion that distracts during a presentation.
- Uncited claims, invented financial figures, or information from one customer appearing in another customer's session.

## Design Principles

1. Make the active customer unmistakable at every moment.
2. Keep evidence one click away and uncertainty explicit.
3. Preserve conversational focus: answer first, expand on demand.
4. Let customer context shape the experience without weakening a consistent product shell.
5. Treat customer isolation, source provenance, and safe retrieval as product features.
6. Make the general adviser, three synthetic use cases, and live Fabric mode unmistakably different but effortless to switch.

## Accessibility & Inclusion

Target WCAG 2.2 AA. Support keyboard navigation, visible focus, screen-reader labels, 4.5:1 text contrast, non-colour status cues, responsive layouts, captions through the text chat, and reduced-motion behavior for every animated state.

## Repurposing checklist

A fork is not complete until it has:

1. replaced the entire customer catalogue;
2. removed previous-owner contact/resource values;
3. kept public and synthetic data clearly separated;
4. preserved one general, three synthetic use cases, and the shared live Fabric mode per customer;
5. configured its own Azure/GitHub identity and administrator;
6. rewritten all documentation for its actual audience and customer sectors;
7. passed the dynamic customer/agent smoke test.
