# meadows

A canvas for thinking in systems — stocks, flows, faucets, and feedback loops.
Inspired by Donella Meadows' *Thinking in Systems*.

Deployed at https://meadows.apoena.dev

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
