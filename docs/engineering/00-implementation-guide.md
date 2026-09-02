# OSVANT — Implementation Guide (READ THIS FIRST)

> **Eng doc 0 of 9 — the entry point for the implementing engineer.**
> You are implementing a fully specified project. This guide tells you how to navigate the docs, what order to build in, which contracts are binding, and where the traps are. It adds NO new requirements — everything here derives from the docs it points to. If this guide ever contradicts a source doc, the source doc wins and the conflict must be flagged.

## 1. Project in one paragraph

OSVANT is a fictional luxury fragrance brand site — a **portfolio showcase** whose product is animation, design, and performance. It reproduces the interaction grammar of landonorris.com (13 named "parity beats") across a compact static Astro sitemap (home, collection, 5 PDPs, the house, journal, contact, legal): GSAP + Lenis + taxi.js page transitions + Rive + a composited-light bottle gallery (`M §8`, ADR-013). There is no real backend: commerce, journal content, forms, and analytics are all local/mocked behind ports (ADR-009..012). Hosting is S3 + CloudFront via GitHub Actions. Success = all 13 beats recognizable (beat 5 as *equivalent*, ADR-013) + Lighthouse ≥90 mobile **on every page** + the acceptance boxes in `docs/design/03-page-specs.md`.

## 2. Reading order & doc map

Read in this order before writing any code:

| # | Doc | Role | Authority |
|---|---|---|---|
| 1 | `docs/design/00-design-brief.md` | vision, voice, success criteria | canonical (what) |
| 2 | `docs/design/01-design-system.md` | tokens, type, components | **normative — all values** |
| 3 | `docs/design/02-motion-guidelines.md` ("`M`") | easing, recipes, Rive, budgets | **normative — all motion** |
| 4 | `docs/design/03-page-specs.md` | per-section specs + acceptance boxes | **normative — structure** |
| 5 | `docs/engineering/02-adrs.md` | why the stack is what it is | decisions record |
| 6 | `docs/engineering/01-architecture.md` | system + client architecture | canonical (how) |
| 7 | `docs/engineering/03-engineering-standards.md` | conventions + Definition of Done | merge gate |
| 8 | `docs/engineering/07-integrations.md` | data shapes + mock behavior | binding contracts |
| 9 | `docs/engineering/04..06, 08, 09` | QA, CI/CD, assets, plan, risks | operational |
| — | `docs/design/landonorris-design-research.md` | reference-site analysis | context only, not spec |
| — | `docs/engineering/rfc-001-*.md` | resolved product decisions | history; patches already applied to design docs |

**Notation legend** used everywhere: `M §4.2` = motion guidelines section 4.2 · `01 §5.1` = design-system section 5.1 · `03 §1.5` = page-specs section 1.5 · `RFC B3` = rfc-001 item B3 · `ADR-009` = ADR entry.

**Normative vs informative.** The three design docs (01/02/03) are **normative**: they state binding requirements, and code implements them rather than interpreting them. Everything else is **informative** — it explains, records or contextualises, and cannot be cited to justify a value. `landonorris-design-research.md` and `rfc-001` are informative by construction; the ADRs are normative for *decisions* but never for design values.

> Renamed 2026-09-02. These docs were previously labelled **LAW**, which is what older worklog entries, the 2026-08-21 design review and some commit messages still call them. Same meaning — `normative`/`informative` is the standard pairing (W3C/IETF/ISO) and reads to anyone who has not read this guide.

**Precedence on conflict:** design docs (01/02/03) > architecture/ADRs > this guide > research doc. Within motion: `M §4` recipes > `M §2` register table (RFC A4). If two normative docs disagree → stop, flag it (see §7). Never improvise a value.

## 3. Non-negotiables (the fastest ways to fail review)

1. **No invented values.** Every color/size/duration/ease traces to a token, a Tailwind default, or a `M` recipe. Missing value = flag, don't guess. **Default-first (ADR-018): reach for Tailwind's step before adding a custom one** — all six `01 §4.4` spacing steps ARE Tailwind defaults (`2/4/6/10/16/24`), so `gap-6` and `p-10` are the design system rather than an approximation of it. The three bans (no `#fff`/`#000`/neutral gray, no `box-shadow`, no `text-transform: uppercase`) are enforced against the **built output** by `pnpm check:guardrails` (ADR-017); stylelint keeps the same rules as the fast local loop, but it only ever saw authored CSS.
2. **Lifecycle discipline.** Every ScrollTrigger/SplitText/tween/canvas a module creates, that module kills in `destroy()`. Router global sweep is a safety net, not the mechanism (`01-arch §3.2`).
3. **One scroll, one loop.** All scroll via Lenis, all RAF via `gsap.ticker`. `window.addEventListener("scroll")` and bare `requestAnimationFrame` are banned (`03-eng §4.4`).
4. **Reduced-motion written WITH each feature** (`M §9`), not retrofitted.
5. **Budgets are CI gates**, not aspirations: `core+transitions` ≤ 350KB gzip, LCP ≤ 2.5s, CLS < 0.1, INP < 200ms, Lighthouse floors (`04-qa §4`).
6. **Placeholder-first** (ADR-008): never block on an asset; never fake one either — placeholders are honest and swap via one file.
7. **Zero third-party requests.** E2E asserts no external network calls (ADR-012). New runtime dependency ⇒ new ADR line first.
8. **markup is the API:** modules configure exclusively from `data-*` attributes (`03-eng §3` table). Every section carries `data-nav-theme` — a section without it fails review.

## 4. Environment & versions

- Node LTS (pin in `.nvmrc`), **pnpm**. Pin exact dependency versions in the lockfile at install; the table below gives floors, not targets.

| Package | Floor | Notes |
|---|---|---|
| `astro` | 5.x | static output only; no adapters, no islands in v1 (ADR-001) |
| `gsap` | 3.13 | free incl. `SplitText`, `CustomEase`, `CustomWiggle`, `CustomBounce`; import plugins from `gsap/<Plugin>` and `registerPlugin` once in core |
| `lenis` | 1.x | package name is `lenis` (not `@studio-freight/lenis`) |
| `@unseenco/taxi` | 1.x | page transitions (ADR-002) |
| `@rive-app/canvas` | 2.x | web runtime for `.riv` files |
| ~~`three`~~ | — | **Removed (ADR-013)** — the light study needs no 3D runtime |
| `typescript` | 5.x | strict mode |
| `vitest`, `@playwright/test`, `size-limit`, `@lhci/cli` | latest | wired per `04-qa` / `05-cicd` |

Tooling: **Tailwind v4** via `@tailwindcss/vite` (ADR-015; *not* `@astrojs/tailwind`, which is the deprecated v3-era integration) + ESLint + Prettier (with `prettier-plugin-tailwindcss` last) + stylelint (custom rules per `03-eng §4.6`). CSS-first configuration — **there is no `tailwind.config.js`**.

## 5. Build sequence (granular, follows `08-delivery-plan.md`)

Work top-to-bottom; each row ≈ one PR. Acceptance = the listed doc sections.

### M1 — Foundation (w1–2)
| # | Task | Spec |
|---|---|---|
| 1.1 | Scaffold: Astro + TS strict + pnpm + lint/stylelint/prettier + `.nvmrc` + repo layout per `01-arch §7`; README with AI-process section; PR template with `04-qa §5` checklist | `03-eng §1/§2` |
| 1.2 | `tokens.css` verbatim from `01 §2/§3/§4` + `app.css` (the Tailwind entry: `@theme inline` mapping, custom variants, base styles for selection/focus/scrollbar `01 §6`) + font self-hosting (Mosvita via the Astro Fonts API, ADR-014) | `01` |
| 1.3 | CI: lint/types/unit/build + size-limit + LHCI skeleton + asset guard; S3/CloudFront staging+prod deploy jobs, previews `previews/pr-<n>/`, OIDC | `05-cicd` |
| 1.4 | Core singletons: `scroll.ts` (Lenis+ticker, §6.1 below), `track.ts`, module registry + `PageModule` contract (§6.2) | `01-arch §3` |
| 1.5 | Router: taxi.js wiring, transition API with clip-path placeholder, lifecycle order, reduced-motion crossfade, `document.title` sync | `01-arch §3.3`, `M §5` |
| 1.6 | Base layout: nav (all 3 themes via `data-nav-theme` observer), footer markup, transition scrim, skip link; stub pages for every route | `01 §5.2/§5.6`, `03 §sitemap` |
| 1.7 | Preloader: `decanting…` + counter, sessionStorage once-per-session, gates per RFC A2, reduced-motion = counter only | `M §6` |
| 1.8 | `products.json` + `lib/commerce.ts` port + local adapter + unit tests | `07 §1` |
| 1.9 | `/dev` harnesses (rive, light, motion) — staging only, `noindex` | `06-assets §2` |
| 1.10 | Capture landonorris.com parity recordings, 13 beats, archive in repo or linked storage | R11, `M §11` |

### M2 — Motion system + core pages (w3–4)
Headline reveal module (`M §4.2`) → shared behaviors `data-anim="card|parallax|btn-line"` (`M §4.3/§4.5`, `01 §5.1`) → marquee (`M §4.7`) → Home sections in `03 §1` order → PLP (`03 §2`) → cart drawer + mock checkout (`01 §5.3`, `07 §1.3`) → mobile guardrails (RFC C5: sticky ATC bar, hamburger overlay `M §4.10`, landscape prompt) → swap in `logo.riv`/`page-transition.riv` when delivered (EOW3).

### M3 — Signature moments (w5–6)
Collection gallery (`M §4.4`, light study `M §8`) → PDP template ×5 (`03 §3`: scent hero + drag-to-light bottle `M §4.4b`, pyramid `M §4.6`, formula story pin, cross-sell, sold-out variants RFC B3) → remaining Rive (`btn-ui`, `vapor`, `mob-landscape`) → journal collection + article template (`03 §5`, `07 §2`) → the-house (`03 §4`) → contact (`03 §6`, `07 §4`).

### M4 — Content & hardening (w7–8)
Final copy/photography swaps → SEO/meta/JSON-LD/OG (RFC C4 formats) → legal pages → 404/500 (`03 §7`, RFC C7) → perf tuning on device → full a11y pass → launch QA (`04-qa §7`) → freeze.

**Every PR:** Definition of Done in `03-eng §6`. Motion PRs additionally: side-by-side recording vs. the reference beat.

## 6. Binding contracts (implement exactly)

### 6.1 The one scroll/RAF loop

```ts
// core/scroll.ts — the ONLY place Lenis and ticker meet
const lenis = new Lenis();
lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add((t) => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);
```

### 6.2 PageModule + registry

```ts
interface PageContext {
  url: URL;
  fromUrl?: URL;              // undefined on first load
  firstLoad: boolean;
  reducedMotion: boolean;     // matchMedia, evaluated at mount
}
interface PageModule {
  selector: string;           // '[data-module="<name>"]'
  mount(el: HTMLElement, ctx: PageContext): void | Promise<void>;
  destroy(): void;            // kills ONLY what it created
}
```

Registry: scans the incoming taxi view for `[data-module]`, mounts matching modules (nav-theme observer first), collects destroyers; router calls all destroyers on leave, then `ScrollTrigger.getAll().forEach(t => t.kill())` as sweep, then `ScrollTrigger.refresh()` after mount completes.

### 6.3 Canonical `data-module` names

`hero` · `doors` · `gallery` (light-study procession) · `campaign` · `social` · `plp-grid` · `pdp-hero` (bottle light study) · `pyramid` · `formula` · `cross-sell` · `journal-index` · `article` · `house` · `contact-form` · `newsletter` · `marquee`. Cart drawer + nav + preloader are core singletons, not page modules. New names = kebab-case, added to this list via PR.

### 6.4 `products.json` entry shape (`07 §1.1`)

```json
{
  "scent": "fever",
  "name": "the fever",
  "batch": "004",
  "variants": [
    { "sku": "OSV-FEVER-50", "size": "50ml", "price": 135,
      "currency": "EUR", "availableForSale": true, "limited": true }
  ]
}
```

All 5 scents (volt, nocturne, static, fever, halo); non-fever scents have 50ml + 100ml variants at €110/€160; `limited` only on fever.

Disambiguation: `batch` = product index by collection order (volt `001` … halo `005`) and feeds the PDP eyebrow `batch 0N` (`03 §3.1`). The campaign band's `fever — limited batch 001` (`03 §1.5`) is fixed marketing copy — first limited RUN — not this field. Do not derive one from the other.

### 6.5 Transition API

`transition.in(): Promise<void>` (covers viewport ≤0.9s) · `transition.out(): Promise<void>` · `transition.speed(n)`. Clip-path placeholder ships first; Rive implementation replaces the internals, never the API (RFC B4.2). Hero reveal of the incoming page starts at `out()` 50% progress — expose a progress callback or fixed-delay hook for this.

## 7. When to stop and ask (escalation to head of eng)

- A needed value/copy/behavior is missing from the docs (do NOT invent — the RFC process exists for this).
- Two normative docs conflict.
- A budget is infeasible as spec'd on target hardware (bring measurements, propose per `09-risks` contingency).
- Anything requires a new runtime dependency, a new route, or touching `docs/design/*` content.
- An asset fails its `06-assets §2` acceptance spec.

Everything else — file structure detail, test organization, internal naming within conventions — is your call as senior engineer. Record notable calls in the worklog (§9).

## 8. Known traps (learn from these, don't rediscover them)

1. **taxi.js swaps only the view container.** Core scripts/nav/scrim live OUTSIDE `[data-taxi]`; per-page `<script>` tags inside views will NOT re-execute reliably — all behavior goes through PageModules. Sync `document.title`/meta manually on nav (crawlers see static HTML, so SEO is unaffected).
2. **Astro `base` on previews:** preview deploys serve under `/previews/pr-<n>/` — use `import.meta.env.BASE_URL`-aware URLs everywhere (assets, internal links, fetches of `products.json` if fetched). Absolute-root paths will 404 on previews only.
3. **SplitText before fonts = garbage line breaks.** Await `document.fonts.ready` (preloader already gates the Mosvita cuts) before any split; re-split on debounced resize; `revert()` in destroy (`M §4.2`).
4. **ScrollTrigger + pinned sections after swap:** create triggers in mount order top-to-bottom, then one `ScrollTrigger.refresh()`; set `ScrollTrigger.config({ ignoreMobileResize: true })` once — iOS URL-bar resize otherwise re-layouts pins mid-scroll.
5. **Scroll restoration:** `history.scrollRestoration = "manual"`; router resets to top during cover (except back/forward — restore saved position after mount).
6. **Lenis + overlay scroll lock:** drawer/menu open = `lenis.stop()`, close = `lenis.start()` (`M §4.10`); focus trap + ESC per `03 §9`; `inert` on background content.
7. **Light-study teardown:** on destroy — unsubscribe the ambient `gsap.ticker` callback, remove pointer/drag and keyboard listeners, disconnect the `IntersectionObserver`. Trap #7 was WebGL context disposal (retired with ADR-013); the leak class it guarded against now lives in the ticker subscription, which is just as easy to orphan on repeat navigation (R4).
8. **Rive teardown:** `rive.cleanup()` on destroy; instantiate per artboard from one loaded `.riv` buffer; respect the exact artboard/input names in `M §7` — they are the design-side contract.
9. **Preloader vs LCP:** the counter is live HTML text (LCP-eligible, RFC A2) — no canvas/image may paint larger before hero `h1`. Preloader runs once per session (`sessionStorage`), never on internal navs.
10. **Marquees:** CSS-transform loop driven by `gsap.ticker` with velocity from Lenis, duplicated content for seamlessness, `aria-hidden` on duplicates, paused off-viewport via IntersectionObserver (`M §4.7`).
11. **Scent tinting is ONE attribute swap** (`data-scent` on the PDP root) — CSS custom properties cascade does the rest (`01 §2.3`). Recoloring elements individually = review fail (`03 §3.1` box).
12. **Reduced-motion is registry-level too:** when `prefers-reduced-motion`, Lenis is not instantiated at all (native scroll), pins/scrubs are never created, transitions become 0.3s crossfade (`M §9`) — modules receive `ctx.reducedMotion` and branch at creation, not by killing after.

## 9. Worklog (required)

Maintain `docs/engineering/worklog.md`: one entry per PR — date, PR title, spec sections implemented, deviations/flags raised, notable judgment calls. This is the review trail for the head-of-eng review and part of the portfolio narrative. Keep entries to 3–5 lines.

## 10. Hand-off state (what already exists)

- All docs final and internally consistent as of 2026-07-14; RFC-001 closed (18/18 items, patches applied).
- No code exists yet — M1 task 1.1 starts from an empty repo (owner creates GitHub repo; remote + first doc commits handled at kickoff).
- No assets exist yet — every asset has a spec'd placeholder (`06-assets §1` ledger). Build against placeholders; swaps are one-file PRs.
- Design-doc content (copy, values) is FINAL for v1 except items marked with week-4–6 delivery dates in the asset/copy ledgers.
