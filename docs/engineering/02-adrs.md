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
