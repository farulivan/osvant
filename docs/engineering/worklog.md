# OSVANT — Engineering Worklog

> One entry per PR: date, PR title, spec sections implemented, deviations/flags raised, notable judgment calls. 3–5 lines each, newest first. Required by `00-implementation-guide.md §9`.

## 2026-07-18 — chore: scaffold Astro app, toolchain, and pnpm verify

- Implements guide task 1.1 (`03-eng §1/§2`): Astro via `create-astro` (minimal), TS strict, ESLint 10 flat + Prettier + stylelint token guards, Vitest via `getViteConfig`, `pnpm verify`, PR template, repo layout per `01-arch §7`.
- Version call: Astro 7.1.1 installed — guide §4 declares doc versions as floors, not targets (ADR-001's "Astro 5" reading). Latest-at-install policy per owner instruction.
- TypeScript pinned 6.0.3 (not 7.x): `typescript-eslint` and `@astrojs/check` peer ranges cap at <6.1. Revisit when upstream moves.
- pnpm 11.15.1 pinned (11.13.0 is a known-broken release); build-script approvals + a jsx-a11y peer-range allowance recorded in `pnpm-workspace.yaml`.
- Stylelint mechanically enforces: no `#fff`/`#000`/neutral-gray hexes, no `box-shadow`, no `text-transform: uppercase`, hex colors only in `tokens.css`. ESLint bans native scroll listeners + bare rAF (`03-eng §4.4`).
