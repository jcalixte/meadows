# meadows

A canvas for thinking in systems — stocks, flows, converters, and feedback loops.
Inspired by Donella Meadows' _Thinking in Systems_.

Deployed at https://meadows.apoena.dev

## Design & docs

- [CONTEXT.md](./CONTEXT.md) — the ubiquitous language: Stock, Flow, Converter,
  Information Link, Polarity, and the Feedback Loops (Reinforcing / Balancing) the
  wiring forms.
- [DESIGN.md](./DESIGN.md) — goal-driven design (QFD): goals → functions →
  components, the House of Quality, the performance budget, and recorded tradeoffs.
- Architecture decisions (`docs/adr/`):
  - [ADR-0001](./docs/adr/0001-detected-feedback-loops.md) — feedback loops are
    detected from structure, not stored.
  - [ADR-0002](./docs/adr/0002-vue-flow-substrate.md) — Vue Flow is the editor
    substrate; the domain Model is the source of truth.
  - [ADR-0003](./docs/adr/0003-flow-as-node-materialised-clouds.md) — a Flow is a
    node; Source/Sink clouds are materialised nodes.
  - [ADR-0004](./docs/adr/0004-rate-rules-not-formulas.md) — simulation behaviour
    comes from a small fixed vocabulary of rules over Information Links, not
    free-form formulas.

## Stack

Vite + Vue 3 + TypeScript, Tailwind v4, DaisyUI. Lint/format via [oxc](https://oxc.rs)
(oxlint + oxfmt). SPA-only — diagram model is client-side.

## Develop

```bash
pnpm install
pnpm dev           # frontend on :5173
pnpm lint          # oxlint  (pnpm lint:fix to autofix)
pnpm fmt           # oxfmt   (pnpm fmt:check to verify only)
pnpm build         # type-check + production build (what Coolify runs)
```

## Deploy

Pushes to `main` are picked up by Coolify at https://platform.apoena.dev.
