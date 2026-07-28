# OSVANT — Engineering Worklog

> One entry per PR: date, PR title, spec sections implemented, deviations/flags raised, notable judgment calls. 3–5 lines each, newest first. Required by `00-implementation-guide.md §9`.

## 2026-07-27 — feat: preloader — decanting counter, sessionStorage gate, reduced-motion branch

- Implements guide task 1.7 (`M §6`, RFC A2): `core/preloader.ts`, a core singleton (`guide §6.3`) mounted from `layouts/BaseLayout.astro`'s `[data-preloader]` markup and run once from `scripts/main.ts`.
- Gates on `document.fonts.ready` today; `logo.riv`/`page-transition.riv`/`vapor.riv` are still CSS/SVG placeholders with no network load of their own (`06-asset-pipeline §1`), so the `GATES` array is deliberately a single entry with a comment marking where each real Rive-load promise gets added later — no other code changes needed when those assets land.
- 3s hard cap (`M §6.2`) via `Promise.race` against the real gates — forces completion to 100% if loading overruns rather than hanging.
- Exit sequence reuses `transition.out()`'s existing halfway-hook (built in task 1.5) to dispatch a `window` `osvant:hero-reveal` CustomEvent — this is the binding contract a future hero module listens to for its impact-reveal overlap (`M §6.3`/`§4.2`); documented in `preloader.ts` since no hero module exists yet to consume it.
- Reduced motion (`M §9`, "preloader → counter only, no wipe"): skips `transition.out()` entirely rather than falling into its built-in crossfade branch — the counter still fades 0.3s, but there's no wipe of any kind.
- Judgment call: sessionStorage guard lives inside `run()` and always removes stale `[data-preloader]` markup even when skipped (every full page load renders the static HTML fresh) — otherwise a same-session reload would leave a permanent black screen.
- 5 new unit tests (`preloader.test.ts`) mocking `./transition`; `pnpm build` size unaffected in any meaningful way — 55.21KB gzip / 350KB budget.

## 2026-07-27 — feat: base layout — nav/footer, transition scrim, skip link, stub routes

- Implements guide task 1.6 (`01 §5.2/§5.6`, `03 §sitemap`): `layouts/BaseLayout.astro` (head/meta, skip link, `[data-taxi]`/`[data-taxi-view]` container, transition scrim, `scripts/main.ts` bootstrap); `components/Nav.astro` + `components/Footer.astro`; every sitemap route stubbed (`/`, `/collection`, `/collection/[scent]` ×5, `/the-house`, `/journal`, `/contact`, `/legal/privacy`, `/legal/terms`, `/404`).
- `core/nav.ts` (named in `01-arch §3.1`) is the nav-theme `PageModule` — registered first per `01-arch §3.3` ("mount order: nav themes first") via `scripts/main.ts`'s import order. One `ScrollTrigger` per `data-nav-theme` section (`M §4.9`) plus the `nav--solid` toggle past 100vh (`01 §5.2`); applies the correct theme immediately on mount rather than waiting for the next scroll crossing, since a page can load already scrolled past a themed section. Cart chip renders a static `0` — count wiring is `lib/commerce.ts` scope (task 1.8).
- Moved the transition scrim from self-owned DOM (task 1.5's `transition.ts`) into layout markup per `01-arch §7`'s repo-structure note ("layouts: ... transition scrim"); `transition.ts` is unchanged — it still lazily creates its own node if the layout's isn't found, so its existing unit tests needed no changes.
- Added `lib/url.ts` (`withBase()`) — every internal `<a href>` and asset reference now resolves through `import.meta.env.BASE_URL`, closing guide trap #2 (preview deploys serve under `/previews/pr-<n>/`) before any real navigation exists to trip over it.
- Judgment call: the nav's mobile menu is a CSS-only disclosure (button + class toggle) — the spec'd SplitText staggered entrance (`01 §5.2`) is a motion-layer feature better built as its own `PageModule`/animation module once that pattern exists (M2), not hand-rolled into the persistent nav script.
- 10 new unit tests (`lib/url.ts`, `core/nav.ts`); `pnpm build` now emits real client JS — `core+transitions` sits at 54.85KB gzip against the 350KB budget.

## 2026-07-27 — feat: router — taxi.js wiring, clip-path transition API

- Implements guide task 1.5 (`01-arch §3.3`, `M §5`): `core/router.ts` wires `@unseenco/taxi`'s `Core`/`Renderer`/`Transition` to the exact lifecycle in `01-arch §3.3` — leave: `lenis.stop()` → `transition.in()` → destroy page modules → `ScrollTrigger` sweep; enter: mount modules → `transition.out()` (hero-overlap hook) → `lenis.start()`. `core/transition.ts` ships the clip-path placeholder for `{ in(), out(), speed(n) }` (guide §6.5, RFC B4.2) with a 0.3s opacity-crossfade branch under reduced motion (`M §9`).
- Traps closed (guide §8): `document.title` synced manually in `Renderer.onEnter` (#1); `ScrollTrigger.refresh()` once in `onEnterCompleted`, never per-module (#4); `history.scrollRestoration = "manual"` + a pathname→scrollY map restores position on `popstate`, resets to top otherwise (#5).
- Judgment call: `transition.out()`'s "hero reveal overlaps at 50%" hook (§6.5) is implemented as a fixed-delay `setTimeout` at half the tween duration rather than a live GSAP progress callback — the guide explicitly permits either, and a timer keeps the placeholder trivial to swap for the real Rive `speed`-driven timeline later.
- `@unseenco/taxi`'s `Renderer` is reconstructed per navigation (fresh instance per page) while `Transition` state (destroyers, last trigger, scroll positions) must survive across instances — both classes are defined as closures inside `initRouter()` over shared `Map`/`let` state, avoiding module-level mutable singletons that would leak between test runs.
- 13 new unit tests (5 in `transition.test.ts`, 8 in `router.test.ts`) mock `@unseenco/taxi`/`gsap`/`gsap/ScrollTrigger` to assert the wiring rather than the libraries themselves — consistent with the `scroll.ts` test pattern from task 1.4.
- Not wired into a real page yet — no `[data-taxi]` markup exists until the base layout (task 1.6) calls `initRouter()`.

## 2026-07-27 — feat: core singletons — scroll, track, PageModule registry

- Implements guide task 1.4 (`01-arch §3.1/§3.2`): `core/scroll.ts` (Lenis + `gsap.ticker`, the one scroll/RAF loop per §6.1), `core/track.ts` (no-op `dataLayer` emitter, ADR-012), `core/registry.ts` (`PageModule`/`PageContext` contract + `mountModules` per §6.2).
- Added `gsap` + `lenis` as runtime deps — already covered by ADR-006, no new ADR needed.
- Judgment call: `scroll.ts`'s binding-contract snippet is literal, but `M §9` separately mandates "Lenis disabled (native scroll)" under reduced motion — added that branch now per `03-eng §4.4` ("reduced-motion branches written with the feature, not retrofitted"), with `scrollTo` falling back to `scrollIntoView`/native `window.scrollTo`.
- `registry.ts` exports `createModuleRegistry()` (a factory) plus a `registry` singleton — the factory keeps the registry unit-testable without a reset-for-tests escape hatch; the router (task 1.5) will consume the singleton.
- Added `jsdom` + `environment: "jsdom"` in `vitest.config.ts`: these singletons are browser-only (`window`, `matchMedia`, DOM). 13 unit tests cover registration order, destroyer wiring, async mount, reduced-motion branching, and the dataLayer contract.
- Not yet wired into any page/script — `pnpm size` still reports no client JS; wiring lands with the router in task 1.5.

## 2026-07-26 — chore: CI pipeline (lint/types/unit/build + size-limit + LHCI + asset guard)

- Implements guide task 1.3 (`05-cicd §2`): GitHub Actions `ci.yml` — static (format/lint/typecheck) + unit + build jobs in parallel, asset guard, LHCI budgets gated on the build artifact.
- Deviation flagged (guide §7): preview-deploy-then-LHCI-against-CDN needs AWS (S3/CloudFront/OIDC), not yet provisioned. LHCI currently audits `dist/` via `@lhci/cli`'s local static server; swap to the preview URL once `05 §1` infra lands. Staging/prod deploy jobs deferred with it.
- `size-limit` budget (350KB gzip, `M §10`) wrapped in `scripts/check-size.mjs`: no client JS exists before task 1.4 (core runtime), and size-limit throws on a zero-file glob. Wrapper skips with a message until JS exists, then defers to the real check — avoids a fake budget or a permanently-green gate.
- `scripts/check-assets.mjs`: zero-dependency Node script enforcing GLB ≤ 1.5MB, AVIF-only raster images, WebM/MP4 video pairs, woff2-only fonts (`M §8`, `06-asset-pipeline`).
- INP has no lab equivalent; asserted TBT ≤ 200ms as the CI-time proxy (noted in the workflow header).
- Build artifact retained 90 days per `05 §4` (rollback source once promote exists).

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
