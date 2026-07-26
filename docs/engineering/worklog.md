# OSVANT — Engineering Worklog

> One entry per PR: date, PR title, spec sections implemented, deviations/flags raised, notable judgment calls. 3–5 lines each, newest first. Required by `00-implementation-guide.md §9`.

## 2026-07-21 — feat: design tokens, base styles, self-hosted fonts

- Implements guide task 1.2 (`01` LAW): `tokens.css` verbatim (colors §2.1, scent tints §2.3, type scale §3.2, layout §4.1, radius §4.3), `fonts.css` (@font-face ×3), `base.css` (focus ring per `M §9`).
- Spec gap flagged + resolved: task 1.2 cites `01 §6` for selection/scrollbar styles, but `01 §6` is Iconography — no such values exist. Owner approved gap-fill: selection = UV bg/black text; scrollbar = thin, `ink-3` on `black` (standard `scrollbar-color` only, no webkit pseudos — Safari keeps native).
- Fonts: Google Fonts latin-subset woff2 (OFL) self-hosted — `archivo-var` 88KB (wdth 62–125 + wght 100–900), `instrument-serif` ±15KB ×2. Archivo preloaded; serif idle-loads on first use. Within guide §4 weight assumptions.
- Style imports + preload live in the temporary `index.astro` shell; they move to the base layout in task 1.6.
- Token guards proven: negative test confirms stylelint catches `#fff`, neutral-gray hex, `box-shadow`, `uppercase`.

## 2026-07-18 — chore: scaffold Astro app, toolchain, and pnpm verify

- Implements guide task 1.1 (`03-eng §1/§2`): Astro via `create-astro` (minimal), TS strict, ESLint 10 flat + Prettier + stylelint token guards, Vitest via `getViteConfig`, `pnpm verify`, PR template, repo layout per `01-arch §7`.
- Version call: Astro 7.1.1 installed — guide §4 declares doc versions as floors, not targets (ADR-001's "Astro 5" reading). Latest-at-install policy per owner instruction.
- TypeScript pinned 6.0.3 (not 7.x): `typescript-eslint` and `@astrojs/check` peer ranges cap at <6.1. Revisit when upstream moves.
- pnpm 11.15.1 pinned (11.13.0 is a known-broken release); build-script approvals + a jsx-a11y peer-range allowance recorded in `pnpm-workspace.yaml`.
- Stylelint mechanically enforces: no `#fff`/`#000`/neutral-gray hexes, no `box-shadow`, no `text-transform: uppercase`, hex colors only in `tokens.css`. ESLint bans native scroll listeners + bare rAF (`03-eng §4.4`).
