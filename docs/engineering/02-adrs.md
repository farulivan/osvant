# OSVANT — Architecture Decision Records

> **Eng doc 2 of 9.** One entry per decision. Status: all **accepted** 2026-07-11 unless noted.
> Format: context → decision → consequences. Supersede by adding a new ADR, never by editing history.

## ADR-001 — Framework: Astro 5 (static output) + TypeScript

- **Context:** animation-first site; the motion layer (GSAP/Lenis/Rive/Three) is imperative and owns the DOM after load. React/Vue vDOM re-renders fight this model and add runtime cost against a 350KB budget (`M §10`). Reference build is Webflow static + custom JS layer (research §2) — the same shape.
- **Decision:** Astro 5, all routes prerendered, zero framework runtime shipped. Interactivity = vanilla TS modules (`01-architecture.md §3`). No islands in v1 unless a concrete need appears.
- **Consequences:** full DOM control for the animation layer; smallest possible baseline JS; cart/drawer UI is hand-rolled TS (acceptable — one drawer, one form pattern). Rebuilds needed for content changes (git-driven, ADR-010/011).

## ADR-002 — Page transitions: taxi.js

- **Context:** `M §5` requires SPA-style navigations with a Rive wipe and precise lifecycle hooks. Reference uses taxi.js (research §2). Astro's View Transitions API can't drive the Rive in/out contract as directly.
- **Decision:** taxi.js intercepting same-origin links over Astro's static pages; router orchestration per `01-architecture.md §3.3`.
- **Consequences:** we own module mount/destroy discipline (the #1 bug source — mitigated by the PageModule contract); browser View Transitions unused; matches reference behavior exactly.

## ADR-003 — Commerce: Shopify Basic + Storefront API, hosted checkout

> **SUPERSEDED by ADR-009** (2026-07-13, portfolio re-scope).

- **Context:** RFC B1 approved. 9 SKUs, EUR/EU, guest checkout only (brief §8).
- **Decision:** products/inventory/orders in Shopify; client cart via Storefront API; checkout = hosted Shopify page themed to brand (bg `#111013`, accent `#be29ff`). Custom checkout deferred to phase 2.
- **Consequences:** PCI, tax/VAT, emails, refunds outsourced to Shopify; checkout is the one off-brand-ish step (accepted trade-off, RFC B1.2); `purchase` event tracked via Shopify's GA4 integration, not our code.

## ADR-004 — CMS: Sanity (journal)

> **SUPERSEDED by ADR-010** (2026-07-13, portfolio re-scope).

- **Context:** RFC B6 approved. Product/design author; engineering owns schema + preview.
- **Decision:** Sanity with schema: `title`, `slug`, `date`, `leadImage`, `body` (portable text + pull-quote block), `ogOverride`, optional `scent` reference (deep-link target for the `next drop` chip). Publish webhook → Vercel rebuild.
- **Consequences:** free tier sufficient at this scale; portable-text renderer needed at build time only.

## ADR-005 — Hosting: Vercel

> **SUPERSEDED by ADR-011** (2026-07-13, portfolio re-scope).

- **Context:** static output, PR preview deploys are mandatory for weekly motion reviews on real devices (RFC C5), webhook-triggered rebuilds from Sanity/Shopify.
- **Decision:** Vercel; production = `main`, previews per PR, env vars per environment. Details in `05-cicd-environments.md`.
- **Consequences:** zero server ops; SRI + headers via `vercel.json`.

## ADR-006 — Animation stack & licensing

> **Three.js entry SUPERSEDED by ADR-013** (2026-08-21, no-3D re-scope). The rest of this ADR stands.

- **Context:** stack fixed by `M §1`. Licensing check performed.
- **Decision:** GSAP 3.13+ (100% free since Webflow acquisition, incl. SplitText/CustomEase/CustomWiggle/CustomBounce), Lenis (MIT), `@rive-app/canvas` (MIT runtime; design needs Rive editor seats), ~~Three.js (MIT)~~ *(dropped — ADR-013)*, taxi.js (MIT). Fonts: Archivo + Instrument Serif (OFL, self-hosted).
- **Consequences:** no license fees or blockers; pin exact versions in lockfile; SplitText import from `gsap/SplitText` (no club bundle needed).

## ADR-007 — Analytics & consent: GA4 + Consent Mode v2 + iubenda

> **SUPERSEDED by ADR-012** (2026-07-13, portfolio re-scope).

- **Context:** RFC B7 approved: EU launch → GDPR-grade consent required; GA4 + lightweight CMP.
- **Decision:** iubenda CMP (matches reference, research §2), Google Consent Mode v2 defaults `denied`; GA4 and Klaviyo scripts injected only post-consent via `consent.ts`. Tracking plan in `07-integrations.md §5`.
- **Consequences:** analytics undercounts pre-consent (accepted); CMP script deferred after LCP; consent state exposed to modules via one event bus.

## ADR-008 — Placeholder-first asset strategy

> **GLB placeholder SUPERSEDED by ADR-013** (2026-08-21). The placeholder-first principle stands and now applies to the bottle AVIF.

- **Context:** RFC B4 approved: Rive/GLB/photography arrive weeks 3–6; engineering must never block.
- **Decision:** every external asset has a code-compatible placeholder behind the same interface: clip-path wipe (= Rive transition API), ~~primitive GLB bottle~~ *(now: duotone bottle silhouette behind the same `--light-angle` contract — ADR-013)*, duotone image blocks, CSS button fallback. Swaps are asset-file replacements, not code changes.
- **Consequences:** build reviews before week 4 show placeholder fidelity — expectation set with stakeholders; interface contracts in `06-asset-pipeline.md` are binding for design deliverables.

---

> ADRs below record the 2026-07-13 **portfolio re-scope** (owner decision): site is a personal-portfolio showcase — animation/design/perf are the product; zero external services, zero runtime backend.

## ADR-009 — Commerce: local mock adapter, no real store (supersedes ADR-003)

- **Context:** real commerce buys ops overhead (store account, tokens, consent surface) and no portfolio value.
- **Decision:** `lib/commerce.ts` defines a port interface (`getProducts`, `getAvailability`, `cartCreate/addLine/removeLine`, `checkout`); v1 ships a local adapter reading `src/data/products.json` (SKUs/prices per RFC B2 verbatim). Cart in `localStorage`. Checkout CTA → mock confirmation step in the drawer + microcopy `demo store — no real orders`. Sold-out driven by data flags (fever demoable).
- **Consequences:** zero external accounts; purchase flow honestly mocked; Shopify adapter is a drop-in later — port unchanged; all RFC B3 UI states still built and E2E-tested.

## ADR-010 — Content: Astro content collections, markdown journal (supersedes ADR-004)

- **Decision:** journal = markdown + zod schema mirroring the Sanity model (`title`, `slug`, `date`, `leadImage`+alt, body with pull-quote component, `ogOverride`, optional `scent` ref). Authoring = git commits. No studio, no webhooks.
- **Consequences:** content versioned with code; same shape ports to Sanity later; RFC B6 intent preserved minus vendor.

## ADR-011 — Hosting: AWS S3 + CloudFront, GitHub Actions deploys (supersedes ADR-005)

- **Context:** owner has S3; zero-runtime preference. Raw S3 website endpoint lacks HTTPS/HTTP2/brotli/custom headers — CloudFront mandatory.
- **Decision:** prod bucket behind CloudFront (OAC, brotli, HTTP/2+3, immutable cache on hashed assets, security headers + CSP via response-headers policy). Staging = second distro. PR previews = Actions deploy to `previews/<pr>/` prefix, link commented on PR. Deploy = build artifact → `aws s3 sync` → targeted invalidation. AWS auth via GitHub OIDC role — no long-lived keys in secrets.
- **Consequences:** we own preview plumbing (small Actions script); rollback = redeploy retained previous artifact; cost ≈ pennies/month.

## ADR-012 — Zero third-party scripts; tracking & forms mocked (supersedes ADR-007)

- **Decision:** no GA4, no CMP, no Klaviyo, no third-party JS at all. `track(event, params)` = local no-op emitter (console + `window.dataLayer` push) — the `07 §5` tracking plan stays implemented as instrumentation, vendor-free. Newsletter/notify/contact forms render all RFC C3/C7 validation/success/error states against a local mock with `demo` microcopy.
- **Consequences:** no consent banner, no GDPR surface, maximum perf headroom; forms non-functional by design (honest demo labels); Sentry optional post-launch, off by default.

---

> ADR-013 records the 2026-08-21 **no-3D re-scope** (owner decision, budget-driven): real-time 3D is removed from the stack; the bottle is presented as a composited still.

## ADR-013 — Drop Three.js; bottle presentation is a composited light study (supersedes the 3D parts of ADR-006 and ADR-008)

- **Context:** producing five bottle GLBs (modelling, glass/liquid materials, Draco, HDR, `gltf-validator` acceptance) plus the VP9-alpha + HEVC-alpha turntable twins is outside budget. The 3D layer served exactly two moments — the collection gallery (`M §4.4`) and the PDP bottle (`03 §3.1`) — and the *felt* qualities it delivered there are depth, tactility and revelation, not geometry per se.
- **Decision:** remove `three` from the runtime stack. Both moments are rebuilt on **the light study** (`M §8`): one flat-lit transparent AVIF per scent, composited under CSS/canvas light layers driven by a single `--light-angle` parameter. Depth comes from differential parallax between layers, not from a camera. Scroll drives the angle in the gallery; drag drives it on the PDP — the same interaction contracts, a different payload.
- **Consequences:**
  - **Removed:** `three` dependency (~150KB gzip), the `webgl` lazy chunk, `GLTFLoader`/`DRACOLoader`, the shared HDR, the WebGL context probe, the `deviceMemory < 4` branch, the GLB-timeout path, the turntable fallback tier, the `webgl_fallback` event, and WebGL teardown discipline (guide trap #7).
  - **Budget simplifies:** `M §10`'s "excluding the Three.js chunk" carve-out is withdrawn — the 350KB gzip budget is now flat and honest. The Lighthouse ≥75 carve-out for WebGL pages is withdrawn: **every page targets ≥90** (brief §6.3).
  - **Asset count for the bottle drops from 20 files to 10** — 5 GLB + 5 WebM + 5 MOV + 5 AVIF becomes 5 bottle AVIF + 5 macro detail AVIF (`03 §8`).
  - **Risk retired:** R8 (HEVC-alpha encode) — no alpha video ships. R1 rescoped: the budget risk was WebGL-specific.
  - **Genuinely lost:** true 360° rotation (the back of the bottle is never seen), real-time refraction and caustics, and per-frame lighting response. Parity beat 5 is downgraded from literal to **equivalent** and labelled as such in `M §11` — we do not claim a 3D beat we no longer ship.
  - **Upgrade path, no code change:** the light study reads an N-frame source. N=1 (CSS-composited) ships now; N=8 (a lit-state sequence) and N=24–36 (a true sprite-sheet turntable, which restores rotation) drop in later as asset-only PRs if budget returns.
- **Rejected alternatives:** (a) *keep Three.js with primitive geometry* — the current placeholder already demonstrates that a bad mesh reads as "this is the product" rather than "art direction pending" (review OSV-02); (b) *static stills with no motion layer* — fails `M §0.1` (every section carries a motion behaviour) and forfeits the signature moment outright; (c) *pre-rendered turntable video as the primary* — reintroduces the HEVC-alpha risk (R8) for a beat we can composite more cheaply and control more precisely.

---

## ADR-014 — Typography: one face (Mosvita) via the Astro Fonts API, with subsetting kept in-repo

- **Context:** the house ran two faces — Archivo Variable (workhorse) and Instrument Serif regular + italic (display peaks) — at 56.8KB combined, on a project where fonts are the tightest budget: subsetting Archivo 88KB → 35.8KB is what moved LCP 2630ms → 2136ms under the 2.5s gate (`M §10`). Owner direction was to collapse to a single family and let colour and weight carry the contrast the second face carried (`01 §3.1/§3.3`, brief §3). Separately, there was no `--font-*` token at all: family names were hardcoded string literals at 20 call sites, and the eyebrow and expanded-headline recipes were copy-pasted 38× and 19×.
- **Decision:** ship **Mosvita** in three static cuts (400/100%, 600/100%, 900/125%), wired through **Astro's Fonts API** — stable and top-level in Astro 7.1.1, *not* `experimental.fonts` (the `experimental` block is a `z.strictObject` and would reject the key). `scripts/subset-fonts.mjs` **stays** and runs upstream of Astro. Family names move behind `--font--display` / `--font--body`; the three §3.3 recipes move into `.display` / `.eyebrow` / `.whisper` in `base.css`.
- **Why the subsetter survives — the load-bearing detail:** Astro does **not** subset fonts and does **not** convert `.otf` → `.woff2`. Verified against the installed source, not the docs prose: `dist/assets/fonts/` contains no `subset-font` or `woff2-encode` code path, and the `subsets`/`formats` options are request parameters for *remote* providers that `LocalFontProvider` ignores outright. Local files ship byte-for-byte as authored. Pointing Astro at raw `.otf` would ship unhinted CFF at 2–4× the bytes.
- **What Astro is actually adopted for:** metric-matched fallback generation (it reads real `ascent`/`descent`/`unitsPerEm`/`xWidthAvg` via capsize and synthesises a matched system-font face), content-hashed immutable URLs, and declarative preload filtering. The fallback work matters more than before precisely because three files now replace one. It engages **only** if the last entry in `fallbacks` is a generic family — otherwise it silently no-ops, which is the one failure mode here that produces no error.
- **Consequences:**
  - `public/assets/fonts/` is **deleted**; fonts are the one asset class outside `public/assets/` (`06 §3`). This also retires a duplicated tree — the same three files were committed in both `public/` and `src/`.
  - `src/styles/fonts.css` is **deleted**; `<Font />` emits the `@font-face` rules into both layouts.
  - Licensed `.otf` masters live gitignored in `src/assets/fonts/masters/`; only the subset `woff2` is committed, so a fresh clone builds without them.
  - The old per-file `ARCHIVO_LIMIT_BYTES` ceiling — which by its own comment only ever ran on a manual `pnpm fonts`, never in CI — becomes a **total payload cap** in `scripts/font-budget.mjs`, enforced by the asset guard in CI.
  - Payload **56.8KB → 34.7KB (−39%)**, less than Archivo cost alone.
- **Rejected alternatives:** (a) *keep the hand-rolled `@font-face` and just swap files* — cheapest diff, but forfeits metric-matched fallbacks exactly when the file count triples, and leaves the duplicated `public/` tree; (b) *point Astro at the raw `.otf` masters and drop the subsetter* — the API's headline reading suggests this works, and it does, at ~3× the bytes and with no charset control, which `check-glyphs` depends on; (c) *a variable font instead of static cuts* — not available for this family; the Expanded width is a drawn master, not an axis.

---

> ADR-015 to ADR-017 record the 2026-09-01 **styling-layer migration** (owner decision): the design tokens stop being a convention that review enforces and become the only vocabulary the build can express.

## ADR-015 — Styling: Tailwind v4 via `@tailwindcss/vite`

- **Context:** the build carries 3,238 lines of CSS — 462 global plus **2,776 spread across 27 Astro-scoped `<style>` blocks**. The tokens themselves are healthy: transcribed verbatim from `01 §2/§3/§4` and consumed ~600× through `var()`. What is not healthy is everything between them and the page. `01 §3.3`'s own amendment records the failure mode: the eyebrow recipe had been hand-copied **38 times across 17 files** and the expanded-headline recipe **19 across 16**, "which is how line-heights of 0.8/0.95/1.02 and letter-spacing of -0.01em/-0.02em entered the build with no doc source." `.visually-hidden` is currently defined **four times, byte-identical**, in four separate scoped blocks. Three worklog bugs (404's stale `btn-primary` copy, the `.cart-line` `data-astro-cid` mismatch, the `.nav__links a` override) are all scoped-style specificity accidents. The brand guardrails are stylelint rules, and **stylelint can only see CSS a human typed into a file it was pointed at** — which is exactly how the August finding happened.
- **Decision:** adopt **Tailwind v4** through the **`@tailwindcss/vite`** plugin. Not `@astrojs/tailwind` — that is the v3-era integration and is deprecated; the Vite plugin is what Tailwind's own Astro guide prescribes. CSS-first configuration, so **no `tailwind.config.js` exists**. `src/styles/tokens.css` remains the single source of raw values (`03-eng §2`); the theme is a **mapping**, never a redeclaration — every entry is a `var()` reference to a token that already exists.
- **The two lines that carry the decision:**
  - **`--*: initial`** deletes Tailwind's entire default theme. There is no `bg-white`, no `text-gray-500`, no `shadow-md`, no `rounded-lg`, no 640/768/1024 breakpoint ladder. A banned utility does not fail lint — **it does not exist**, and `class="shadow-md"` compiles to nothing. This converts `01 §1` ("no pure white, no pure black, no neutral gray anywhere") and `01 §4.3` ("no drop shadows … never from `box-shadow`") from rules a reviewer must remember into rules the toolchain cannot express.
  - **`@theme inline`** is mandatory rather than stylistic. Without it, `bg-scent-tint` compiles to `var(--color-scent-tint)` and Tailwind emits that variable on `:root`, so the inner `var(--scent-tint)` resolves **at `:root`** and every element gets the phosphor fallback regardless of its `[data-scent]` scope. That is precisely the bug fixed on 2026-08-31, when the nav wordmark never showed the tint because `<Nav />` is a sibling of the scope. `inline` compiles the utility to `var(--scent-tint)` directly, resolved at the element, so the cascade does the work — which is what `01 §2.3` and guide trap #11 require: scent tinting is **one attribute swap**, and recolouring elements individually is a review fail.
- **Breakpoints are `@custom-variant`, not `--breakpoint-*`.** Tailwind's `max-md:` compiles to `@media (width < 48rem)`; the LAW contract is `(width <= 47.9375rem)`. Those disagree at 767.5px — the exact class of failure the stylelint literal-lock exists to prevent ("the build previously carried one breakpoint written as `48rem`, `47.9375rem` AND `767px`"). Four custom variants emit the four `01 §4.2` literals verbatim and stay desktop-first, matching the 20 media queries already in the build. Because `--breakpoint-*` was wiped, **`sm:`/`md:`/`lg:` do not exist** and a fifth breakpoint cannot be introduced by muscle memory.
- **Preflight is deliberately not imported.** `@import "tailwindcss"` is shorthand for theme + preflight + utilities; the three are imported separately here so preflight can be left out. It is not a reset but a set of opinions, and measuring them against this build showed they are not free: preflight zeroes the margins on every `p` and `h1`–`h6` (**68 elements**), strips the underline from any `<a>` that has not set one (**34**), and made the 404 document **6px taller**. Those are design changes and belong in the section PRs where someone can look at them. The five hand-written reset rules `base.css` already carried are kept verbatim.
- **Consequences:**
  - **Build-time only.** Tailwind emits CSS and ships no runtime and no network request, so **ADR-012 is untouched** and `size-limit` is unmoved at **70.19KB / 350KB gzip** — Tailwind adds no JavaScript at all.
  - **ADR-001 stands.** No React, no framework runtime, no islands. shadcn/ui was evaluated at owner request and rejected: it requires React (its own Astro guide runs `--add react`), and its visual language is `box-shadow` + neutral grays + a `rounded-lg` ladder + a `.dark` duality, all four of which this design system bans. Components stay plain `.astro`.
  - **Measured cost:** inlined CSS **20.9KB → 25.5KB per page**. Lighthouse is **unchanged** — perf 99, a11y 95–100, LCP 1815–2202ms against the 2500ms gate (baseline 1813–2203ms), CLS 0, TBT ≤3ms.
  - `src/styles/base.css` is **deleted**; its content moves into `app.css` as `@layer base` + `@layer components` + four `@utility` roles. The two layouts import one file instead of two.
  - **Automatic content detection is off** (`source(none)` + an explicit `@source` over `src/`). Left on, Tailwind scans every non-ignored file as plain text — including 9,000 lines of LAW docs in which "block", "grid", "static" and "fixed" are ordinary English words, each of which would mint a utility nobody asked for.
- **Rejected alternatives:** (a) *`@astrojs/tailwind`* — deprecated, v3-era, and would reintroduce a JS config file that duplicates `tokens.css`; (b) *Tailwind's default theme plus stylelint policing* — puts the banned values back in the toolchain and relies on a linter that provably cannot see generated CSS; (c) *keep the hand-rolled CSS and fix the duplication by review* — the duplication was already found and fixed by review twice, and returned both times.

## ADR-016 — Utility-first authoring; Astro scoped `<style>` retired

- **Context:** Astro's scoped styles solve a problem this build does not have (leakage between components) and cause two it does. They compile to `.selector[data-astro-cid-…]`, which outranks `base.css` — so a component that re-declares a shared class silently wins, which is how 404 kept a stale `btn-primary` at 4.47:1 contrast. And they only match markup Astro rendered: the cart lines are built at runtime with `innerHTML`, so every `.cart-line*` rule matched nothing at all.
- **Decision:** markup is styled with utilities. The 27 scoped `<style>` blocks are retired one section per PR. Two categories of CSS survive in `app.css`, and the boundary between them is mechanical, not stylistic:
  - **`@utility`** — the four typographic roles `01 §3.3` names as "the only sanctioned implementations": `.display`, `.eyebrow`, `.whisper`, `.peak`. They stay single-definition rather than dissolving into repeated utility strings, because dissolving them recreates the 38×/19× drift the §3.3 amendment was written to close. As utilities they also gain variants (`mobile:eyebrow`) for free.
  - **`@layer components`** — every class JavaScript creates or toggles: `.line-mask` and `.split-word` (GSAP SplitText builds those elements itself via `linesClass`), `.btn-line--ready` / `.btn-line__label--clone`, `nav--solid`, `nav--theme-*`, the cart lines. `@layer`, not `@utility`, is load-bearing: **layer rules are always emitted, `@utility` definitions are usage-driven**, and a utility that only ever appears in a `.ts` string would be tree-shaken out of the build.
- **Consequences:**
  - `data-astro-cid-*` disappears from the output as blocks are retired, which removes the `.cart-line` class of bug by construction and shrinks every document.
  - Cascade order becomes predictable and favourable: `utilities` beats `components` beats `base`, so a utility in markup wins over a component class by design rather than by specificity accident.
  - The JS-contract class strings are **contracts**: `nav.test.ts` asserts `nav--solid`/`nav--theme-*` (7×), `btn-line.test.ts` asserts `.btn-line--ready`/`.btn-line__label--clone` (4×), and `house-manifesto.ts` reads `--color--ink-3`/`--color--white` off `document.documentElement`. Renaming any of them breaks tests or silently returns an empty string.
  - **`scripts/style-parity.mjs`** is added to make each section PR provable rather than eyeballed: it records 46 computed properties for every element on every route at two widths, and diffs two snapshots. It is what caught the preflight regression above. Not a CI gate — GSAP writes `transform`/`opacity` inline as it tweens, so those carry a run-to-run noise floor that must be measured with a same-build control before any result is believed.
- **Rejected alternatives:** (a) *utilities for new work only, scoped styles left in place* — carries two idioms indefinitely and leaves the duplication that motivated ADR-015; (b) *`@apply` inside the existing scoped blocks* — discouraged by Tailwind's own docs, needs `@reference` in every file, and preserves the specificity problem verbatim.

## ADR-017 — Brand guardrails move from source-lint to output-scan

- **Context:** `03 §9` makes three bans pre-merge acceptance boxes — no `#fff`/`#000`/neutral gray (`01 §1`), no `box-shadow` (`01 §4.3`), no `text-transform: uppercase` (brief §4) — and `03-eng §4.6` requires them "enforced by a stylelint rule, not just review." stylelint enforces them on **authored CSS in files it is pointed at**, which turns out to be a strictly smaller set than "CSS that reaches the page." The 2026-08-28 worklog entry is the proof: the cart lines' rules compiled against a `data-astro-cid` that runtime-injected markup never carries, "which is how neutral grey and pure black reached a page whose stylelint config forbids both." ADR-015 widens the same gap from the other side — a generated utility is never linted either.
- **Decision:** the bans are checked against the built output by **`scripts/check-guardrails.mjs`**, wired into the CI `build` job. Because `inlineStylesheets: "always"` puts every byte of CSS inside the documents, one pass over `dist/**/*.html` sees authored CSS, generated utilities and inline `style` attributes alike. The stylelint rules **stay** as the fast local feedback loop; the output scan is the one that cannot be walked around.
- **It parses declarations, not strings** — established by the false positives found while writing it: `box-shadow` legitimately appears as a *name* inside `transition-property: …,box-shadow,…`, and Lightning CSS minifies an authored `transparent` down to `#0000`, which is neutral by channel and paints nothing. Fully transparent values are exempt at any channel, as the token system already ships one deliberately (`--color--phosphor-zero`).
- **Consequences:** the guarantee gets strictly stronger — it now covers generated CSS, runtime-injected markup and inline styles, none of which stylelint could reach. Verified against planted violations: `box-shadow: 0 2px 8px #0008`, `text-transform: uppercase`, `#ccc`, `#FFFFFF` and `rgb(136 136 136)` are each caught and named with their spec section.
- **Known gap, recorded rather than papered over:** `--*: initial` cannot remove Tailwind's *static* utilities. `uppercase` still exists as a class and `shadow-[…]` arbitrary values still compile. The output scan is the backstop for both, which is the reason it is a merge gate and not an advisory.
