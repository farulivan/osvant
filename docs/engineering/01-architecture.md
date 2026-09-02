# OSVANT — Technical Architecture (TDD)

> **Eng doc 1 of 9.** How the system is built. Decisions themselves live in `02-adrs.md`; this doc describes the resulting architecture.
> Upstream contracts: `docs/design/*` (what to build), `rfc-001` (resolved product decisions).
> **Implementers: start at `00-implementation-guide.md`** — reading order, build sequence, binding contracts, traps.

## 1. Stack summary

| Layer | Choice | ADR |
|---|---|---|
| Framework | **Astro 5 + TypeScript**, full static output (SSG) | ADR-001 |
| Page transitions | **taxi.js** over static pages (SPA-feel, MPA reality) | ADR-002 |
| Animation | GSAP 3.13+ (ScrollTrigger, SplitText, CustomEase/Wiggle/Bounce), Lenis, Rive web runtime | ADR-006, ADR-013 |
| Commerce | Local mock adapter — `lib/commerce.ts` port + `products.json` | ADR-009 |
| Content | Astro content collections (markdown journal) | ADR-010 |
| Hosting | AWS S3 + CloudFront, GitHub Actions deploys | ADR-011 |
| Analytics | None — local no-op `track()` emitter, zero third-party JS | ADR-012 |

## 2. System overview

```
                      build time                          runtime (browser)
  src/data/products.json ─┐                        ┌─ taxi.js router ─ Rive wipe
  src/content/journal ────┼─► Astro build ─► static┤  page modules (GSAP/Lenis)
  (markdown + zod)        │      HTML/CSS/JS       ├─ light study (CSS/canvas)
                          └─ zero runtime backend  └─ cart module ─► local adapter
```

- All routes prerendered: `/`, `/collection`, `/collection/[scent]` ×5, `/the-house`, `/journal`, `/journal/[slug]`, `/contact`, `/legal/*`, `404`, `500`.
- Product data (prices, availability) from `src/data/products.json` at build (ADR-009). Sold-out is a data flag — flipping it is a one-line commit; fever demo state set this way (RFC B2/B3).
- No webhooks, no rebuild triggers — all content (journal markdown, product data) is git-driven and rides the normal deploy pipeline.

## 3. Client architecture — the animation layer

The core engineering risk in this genre is lifecycle leakage across SPA-style transitions (stale ScrollTriggers, orphaned canvases, double Lenis). Everything below exists to prevent that.

### 3.1 Singletons (module scope, created once per session)

- `scroll.ts` — the one Lenis instance + the one `gsap.ticker` binding (`M §4.1`). Exposes `stop/start/scrollTo`.
- `transition.ts` — Rive `page-transition` state machine behind API `{ in(), out(), speed(n) }`. CSS `clip-path` placeholder implements the same interface (RFC B4.2) — drop-in swap.
- `nav.ts` — nav theming observer (`data-nav-theme` ScrollTriggers, `M §4.9`), cart chip state.
- `cart.ts` — cart state (see §5).
- `track.ts` — no-op analytics emitter (console + `dataLayer` push); implements the `07 §5` event plan vendor-free (ADR-012).

### 3.2 Page modules — the lifecycle contract

Every animated feature is a **page module**: an object registered against a `data-module` attribute.

```ts
interface PageModule {
  selector: string;                    // e.g. '[data-module="gallery"]'
  mount(el: HTMLElement, ctx: PageContext): void | Promise<void>;
  destroy(): void;                     // MUST kill its own ScrollTriggers, SplitText revert, RAFs, canvases
}
```

Rules:

1. Modules NEVER call `ScrollTrigger.getAll().forEach(kill)` — each kills only what it created (store instances locally). The router does the global sweep as a safety net only.
2. `SplitText.revert()` on destroy and on debounced resize re-split (`M §4.2`).
3. Light-study modules unsubscribe their ambient ticker and drag listeners on destroy, and pause via `IntersectionObserver` (`M §8.4`).
4. Modules read config exclusively from `data-*` attributes — markup is the API (matches design docs' motion hooks).

### 3.3 Router orchestration (taxi.js)

```
leave: lenis.stop() → transition.in() → destroy all page modules
enter: swap DOM → reset scroll → mount modules (mount order: nav themes first)
       → transition.out() → hero reveal overlaps at out() 50% (M §5) → lenis.start()
```

Reduced-motion path: transition = 0.3s opacity crossfade, same hooks (`M §9`).

## 4. Code-splitting map (implements `M §10`)

| Chunk | Contents | Load |
|---|---|---|
| `core` | Lenis, GSAP + plugins, router, nav, cart UI, module registry | deferred, every page |
| `transitions` | Rive runtime + `page-transition.riv` + `logo.riv` wiring | preloaded (gates first nav, `M §7`) |
| ~~`webgl`~~ | **Removed (ADR-013)** — the light study is CSS/canvas in the page bundle, no separate chunk | — |
| `rive-extras` | `btn-ui`, `vapor`, `mob-landscape` | idle (`requestIdleCallback`) |

Budget gates in CI: `core + transitions` ≤ 350KB gzip (`M §10`); enforced via size-limit (see `04-testing-qa-plan.md`).

## 5. Cart & commerce flow

- Cart state via the `lib/commerce.ts` local adapter (ADR-009); persisted in `localStorage`; hydrated on `core` init.
- Add-to-cart → drawer update through the port API — same call shapes a real backend would use; failure path still renders amber `no longer available` (RFC B3).
- `checkout` CTA → mock confirmation step in the drawer + `demo store — no real orders` microcopy. `begin_checkout` fires on click (no-op emitter).
- Sold-out: data flag per variant; sold-out PDP renders disabled CTA + `get notified` mock variant (RFC B3) — every state built and E2E-tested.
- Swapping in Shopify later = one adapter file; port interface and all UI states already exist.

## 6. Fallback & degradation matrix

| Condition | Detection | Behavior |
|---|---|---|
| Reduced motion | `prefers-reduced-motion` | native scroll, no pins/scrubs, opacity fades, static marquees (`M §9`) |
| Bottle still fails to load | `img` error event | silhouette block placeholder, identical DOM; light layers still composite (`M §8.1`) |
| Safari alpha video | feature-detect via `canPlayType` | HEVC-alpha `.mov`, else black-composited loop (RFC B4.3) |
| JS disabled | n/a | full content + native links render (Astro static); no cart |

## 7. Repo structure

```
src/
  pages/               # Astro routes
  layouts/             # base shell: head/meta, nav, footer, transition scrim
  components/          # .astro presentational components (markup + motion
                       #   hooks). Utility-first — no <style> blocks (ADR-016)
  styles/              # tokens.css (01-design-system verbatim) + the three
                       #   Tailwind sheets: app.css (entry), light-study.css,
                       #   dev-light.css (imported by /dev/light alone)
  scripts/
    core/              # scroll.ts, router.ts, transition.ts, nav.ts, cart.ts, track.ts
    modules/           # one file per PageModule (hero, gallery, pyramid, marquee…)
  lib/                 # commerce.ts (port + local adapter), content helpers
  content/             # journal markdown + zod schema (ADR-010)
  data/                # products.json — SKUs/prices per RFC B2
public/
  assets/              # fonts, rive, models, video, img (see 06-asset-pipeline.md)
docs/                  # design + engineering docs (this repo is the source of truth)
```

## 8. Cross-cutting constraints (inherited, non-negotiable)

- Tokens implemented verbatim from `01-design-system.md §2/§3/§4` as `tokens.css` — no ad-hoc values. `app.css` **maps** them to Tailwind utilities with `@theme inline` and never restates a value (ADR-015).
- Styling is utility-first; zero Astro-scoped `<style>` blocks exist and none may be added (ADR-016). CSS survives only for what markup cannot express: the `M §8` light-study layers and classes JavaScript creates or toggles.
- All scroll work through Lenis; all RAF through `gsap.ticker` — one loop (`M §10` INP guard).
- Preloader gates fonts + `logo.riv` + `page-transition.riv` + `vapor.riv` only, ~3s cap (RFC A2).
- Hero `h1` text must be LCP on non-preloader loads — no canvas/image may paint larger above the fold before it.
- SEO: per-page meta from RFC C4 formats; Product JSON-LD on PDPs (with `offers.availability`); OG images per scent.
