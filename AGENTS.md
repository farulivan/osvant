# AGENTS.md — instructions for AI agents working in this repo

## What this repo is

OSVANT — a fictional luxury fragrance brand site, built as a portfolio showcase of animation-first front-end engineering. Fully static (Astro + GSAP/Lenis/taxi.js/Rive/Three.js), zero backend, all integrations mocked behind ports. Docs-first project: every value, motion and behavior is specified before code exists.

## Start here (non-optional)

1. Read `docs/engineering/00-implementation-guide.md` — reading order, build sequence, binding contracts, known traps, escalation rules.
2. Design docs (`docs/design/01-design-system.md`, `02-motion-guidelines.md`, `03-page-specs.md`) are **LAW** for values, motion and structure. Never invent a value — flag gaps instead (guide §7).

## Ground rules

- No new runtime dependency without an ADR entry (`docs/engineering/02-adrs.md`).
- Zero third-party scripts/requests (ADR-012) — E2E asserts this.
- Lifecycle discipline: everything a module creates, its `destroy()` kills (guide §6.2).
- Budgets are merge gates: `core+transitions` ≤ 350KB gzip; Lighthouse ≥ 90 mobile (≥ 75 on WebGL pages); LCP ≤ 2.5s, CLS < 0.1, INP < 200ms.
- Reduced-motion branches are written with each feature, never retrofitted (`M §9`).
- No `#fff`/`#000`/neutral gray, no `box-shadow`, no `text-transform: uppercase` — stylelint-enforced.

## Workflow

- Conventional commits (`feat:`/`fix:`/`perf:`/`docs:`/`chore:`); body explains _why_. AI-assisted commits carry a `Co-authored-by:` trailer.
- One module/section per PR. PR description links the spec section it implements and quotes its acceptance boxes; visual changes need recordings; mobile screenshots mandatory.
- Append 3–5 lines per PR to `docs/engineering/worklog.md`: what, spec refs, deviations, judgment calls.
- Stop and escalate per guide §7: missing values, LAW-doc conflicts, infeasible budgets, new deps/routes, anything touching `docs/design/*` content.

## Commands

Node 24 (`.nvmrc`), pnpm (pinned via `packageManager`).

- `pnpm install` — install (build-script approvals live in `pnpm-workspace.yaml`)
- `pnpm dev` — dev server
- `pnpm build` / `pnpm preview` — production build / serve it locally
- `pnpm verify` — format (Prettier, writes) → lint (ESLint + stylelint) → typecheck (`astro check`) → unit tests (Vitest). Run before every push.
- `pnpm format:check` — CI-style non-mutating format check
- Granular: `pnpm format` · `pnpm lint` · `pnpm typecheck` · `pnpm test`

## AI transparency

This project is intentionally AI-paired end-to-end: docs authored with an AI head-of-engineering counterpart (see `docs/engineering/rfc-001-design-product-questions.md` for the question-driven spec process), implementation by an AI senior engineer against these docs, human as product owner and review gate. The process artifacts (RFC, ADRs, worklog, commit trail) are part of the portfolio.
