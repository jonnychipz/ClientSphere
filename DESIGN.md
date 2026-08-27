# ClientSphere Design System

> **Documentation:** [Home](README.md) · [Product definition](PRODUCT.md) · [Product tour](docs/SCREENSHOTS.md) · [AI-assisted setup](AI-SETUP-PROMPT.md)

Use this document when changing branding, layout, controls, or screenshots in a repurposed deployment.

## Intent

ClientSphere is used on a seller's laptop in office and presentation-room lighting, often while the user is speaking and scanning rather than reading. The interface uses a low-glare dark shell, restrained violet actions, and high-contrast customer identity so it remains calm on a shared screen.

![Redacted structured workflow](docs/images/clientsphere-workflow-redacted.png)

## Color

Use OKLCH tokens only in authored CSS.

- `--canvas`: near-black violet-neutral application background.
- `--surface`: primary working panels.
- `--surface-raised`: controls, selected rows, and overlays.
- `--ink`: primary text at WCAG AA contrast.
- `--ink-muted`: supporting text at WCAG AA contrast.
- `--accent`: primary action and selected-state violet.
- `--accent-soft`: subtle selected backgrounds.
- `--success`, `--warning`, `--danger`, `--info`: semantic state colors.
- `--customer-accent`: a controlled customer-specific highlight, never used for body text.

## Typography

Use `"Segoe UI Variable", "Segoe UI", system-ui, sans-serif` throughout. Product labels and headings use the same family with weight and size for hierarchy. Avoid display fonts and gradient text. Body copy is 0.875-1rem with a maximum conversational line length of 72ch.

## Layout

- Desktop: the existing two-pane Hubble-derived structure remains recognizable. The left pane is the customer/avatar stage; the right pane is the working conversation.
- The active customer selector is part of the persistent header and is keyboard searchable.
- The customer intelligence drawer contains overview, business, offerings, initiatives, financials, leadership, news, and sources.
- The conversation header contains a persistent four-tile agent switcher: General Adviser first, then three synthetic use cases with an active-mode detail panel, model/modality badges, workflow disclosure, and demo starters.
- A two-state response control sits beside the active mode: `Brief + voice` for concise avatar turns and `Structured` for detailed screen-first artefacts.
- Synthetic modes expose three numbered scenes and a collapsible sample-data panel so the presenter can run a credible demo without typing, while the composer always remains available for free-text questions.
- Tablet: preserve two panes while reducing stage controls.
- Mobile: stack the customer stage above chat, keep the composer sticky, and move secondary controls into an inline disclosure.

## Components

- Buttons and fields share one radius, focus ring, disabled treatment, and 180ms state transition.
- Customer selector rows show logo, name, domain, and selection state.
- Source links show publisher/domain and open in a new tab.
- Multimodal modes expose one familiar paperclip control and a compact image preview; text-first modes explain when image input is not central.
- Customer topic actions are buttons that send a visible, editable prompt rather than hidden navigation.
- Loading uses skeleton rows; errors remain in context with a retry action.

## Motion

Motion communicates state only: selector open/close, drawer transition, listening/speaking feedback, and customer context replacement. Respect `prefers-reduced-motion: reduce` by removing transforms and continuous animation.

## Customer Branding

Customer logos are sourced from official public websites and displayed without alteration. Customer color is an accent, not a theme replacement. The ClientSphere shell remains visually stable when customers change.

## Rebranding a fork

Review these surfaces together:

| Surface | Source |
|---|---|
| Product name, tagline, and runtime configuration | `server.mjs` |
| About owner/contact panel | `public/index.html` |
| Login and access-state pages | `public/login.html`, `public/pending.html`, `public/denied.html` |
| Email wording and contact metadata | `email.mjs`, GitHub email variables |
| Icon and static imagery | `public/favicon.svg`, `public/backgrounds/` |
| Documentation screenshots | `docs/images/`, `docs/SCREENSHOTS.md` |

Never encode tenant IDs, subscription IDs, secrets, private customer notes, or production user details in browser assets.

## Screenshot standard

- Use redacted or synthetic data only.
- Capture at a readable desktop resolution.
- Crop out browser profiles, bookmarks, notifications, and unrelated tabs.
- Remove usernames, email addresses, account identifiers, and secret-bearing URLs.
- Add alt text and an explanatory caption in Markdown.
- Label synthetic inputs and outcomes in the application before capture.
