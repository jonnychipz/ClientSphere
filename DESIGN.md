# ClientSphere Design System

## Intent

ClientSphere is used on a seller's laptop in office and presentation-room lighting, often while the user is speaking and scanning rather than reading. The interface uses a low-glare dark shell, restrained violet actions, and high-contrast customer identity so it remains calm on a shared screen.

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
