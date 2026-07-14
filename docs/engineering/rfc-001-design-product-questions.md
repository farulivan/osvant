# RFC-001 — Design/Product Decisions Required Before Build

> **Status:** Closed 2026-07-13 — all 18 items resolved; design-doc patches landed (A1–A4, B4.3, C1, C3 in `01/02/03`); decisions actioned into `docs/engineering/01–09`
> **From:** Engineering · **To:** Head of Product & Design
> **Date:** 2026-07-11
> **Inputs reviewed:** `docs/design/00-design-brief.md`, `01-design-system.md`, `02-motion-guidelines.md`, `03-page-specs.md`, `landonorris-design-research.md`
> **Build impact:** nothing here blocks build start — weeks 1–3 proceed on placeholders. Each item states what it blocks and when we need the answer (weeks are relative to build kickoff).

## How to respond

- Answer inline under each item's **Resolution**, or write `approved` to accept the stated **Engineering default** as-is.
- Keep item IDs (A/B/C-n) in all responses for traceability.
- Where an answer requires a design-doc edit, engineering will patch the doc after sign-off and record the change under the item.

---

## Part A — Spec defects (doc fixes, minutes each)

### A1. Missing token `--text--h6`
- **Context:** footer spec uses `--text--h6` (`01 §5.6`), but the type scale (`01 §3.2`) ends at `--text--h5: 1.2rem`. Doc 1 forbids engineering from improvising values.
- **Ask:** define `--text--h6`.
- **Engineering default:** `--text--h6: 1rem` (matches reference scale, research §3.2).
- **Blocks:** footer build (week 2–3).
- **Resolution:** `approved` — `--text--h6: 1rem`. Patch `01 §3.2`.

### A2. Preloader asset gate contradicts the performance budget
- **Context:** `M §6` gates the preloader on "fonts + hero Rive + gallery GLB preload". Five GLBs ≈ 7.5 MB — incompatible with LCP ≤ 2.5s / Lighthouse ≥ 90 (`M §10`), and the Three.js chunk is itself spec'd as lazy-loaded (`M §10`).
- **Ask:**
  1. Confirm the preloader gates **fonts + `logo.riv` + `page-transition.riv` + hero `vapor.riv` only**; GLBs stream with the lazy gallery chunk after first paint.
  2. Confirm that on a first (preloader) visit, the LCP element is the preloader counter text; "hero text is LCP" applies to non-preloader loads.
- **Engineering default:** both as stated, plus a preloader hard cap of ~3s on a median connection (progress never fakes, but we don't hold the site hostage to slow assets).
- **Blocks:** preloader build (week 2); perf thresholds in CI.
- **Resolution:** `approved`, both confirmations + the ~3s cap.
  1. Preloader gates: **Archivo woff2 + `logo.riv` + `page-transition.riv` + `vapor.riv` only**. GLBs stream with the lazy gallery chunk after first paint; Instrument Serif stays idle-loaded.
  2. Confirmed — on preloader visits the counter text is LCP; "hero text is LCP" applies to non-preloader loads. Patch `M §6` + `M §10`.

### A3. Amber exclusivity contradiction
- **Context:** Home acceptance says amber appears **only** on the campaign chip/badge (`03 §1.5`), but the global nav cart badge is amber (`01 §5.2`) and visible on every page.
- **Engineering default:** reword the acceptance box to "amber appears only on the `limited` chip and the global cart badge."
- **Blocks:** nothing (review-time consistency only).
- **Resolution:** `approved`, and make the underlying rule canonical in `01 §1.4`: **amber = scarcity/commerce-urgency signals** — `limited` chip, cart badge, sold-out states (B3), error states (C3). Never decorative. The `03 §1.5` box becomes "amber appears only in its A3 canonical roles."

### A4. Motion grammar dead-zone vs. its own recipes
- **Context:** `M §2` states nothing lives at 0.8–1.4s except the playful register, yet the headline reveal is 0.8s (`M §4.2`) and pyramid dividers are 0.8s (`M §4.6`).
- **Ask:** confirm **recipes are canonical** and the register rule applies only to new/unspecified tweens.
- **Engineering default:** as stated; grammar table gets a one-line footnote.
- **Blocks:** nothing; prevents churn in build reviews.
- **Resolution:** `approved` — §4 recipes are canonical; the §2 register table governs only tweens without a specified recipe. Add the footnote to `M §2`.

---

## Part B — P0 product decisions (block scoping & estimates)

### B1. Commerce platform & checkout flow — biggest unknown
- **Context:** primary conversion is add-to-cart/buy (brief §1); the cart drawer has a `checkout` CTA (`03 §7`) but the sitemap (`03`) has no checkout route and no doc names a commerce platform. This is the largest open scope variable in the project.
- **Ask:**
  1. Platform: Shopify (headless via Storefront API) / Stripe / other?
  2. Checkout UX: is a **hosted off-site checkout acceptable for v1** (fast to ship, visually off-brand), or is an on-brand custom checkout required (significant added scope)?
  3. Who owns transactional emails (order confirmation), refunds, and fulfillment tooling?
- **Engineering default:** Shopify + Storefront API cart; hosted Shopify checkout for v1 themed to nearest brand colors; custom checkout deferred to phase 2.
- **Blocks:** architecture ADR + estimate (need by kickoff +1w); cart/PDP wiring (week 3+).
- **Resolution:** `approved`.
  1. Shopify headless via Storefront API.
  2. Hosted checkout is an accepted phase-1 trade-off. Theme it: bg `#111013`, accent `#be29ff`, Archivo where checkout branding allows. Custom checkout = phase 2.
  3. Transactional emails: Shopify defaults + wordmark/black header (design supplies assets with the week-3 logo batch). Refunds/fulfillment: product/ops in Shopify admin — out of engineering scope.

### B2. Product & pricing data
- **Context:** cards and PDP display price + 50/100ml selector (`03 §3.1`, `01 §5.3`); no prices, currency, or SKUs exist anywhere.
- **Ask:** price per scent per size (×10 SKUs); currency & launch market(s); are all 5 scents purchasable at launch, including `fever` "limited batch 001" mechanics?
- **Blocks:** commerce setup, PDP/card content (week 3+); Product structured data (C4).
- **Resolution:** decided — **9 SKUs, not 10** (fever is single-size).
  - Currency/market: **EUR, EU launch**. UK/US phase 2 (pending B7 consent scope).
  - Pricing: volt / nocturne / static / halo — **50ml €110, 100ml €160**. fever — **50ml €135 only**, limited batch 001, numbered ×500, no restock of this batch.
  - SKU scheme: `OSV-<SCENT>-<SIZE>` (e.g. `OSV-VOLT-50`…`OSV-FEVER-50`).
  - All 5 purchasable at launch. Fever PDP renders a single 50ml chip + amber `limited` chip; sell-out is expected → B3 states are launch scope.

### B3. Inventory & scarcity states
- **Context:** "limited batch" implies sell-out is possible; no sold-out / low-stock state is specified for card, PDP, or cart anywhere in the docs.
- **Ask:** does v1 need sold-out states? If yes, design intent for card / PDP / cart line item.
- **Engineering default:** sold-out = PDP `btn-primary` disabled with label `sold out — next batch soon`; card gets an amber `sold out` chip. Needs your blessing because it extends amber usage rules (`01 §1.4`).
- **Blocks:** PDP build (week 3+).
- **Resolution:** `approved` — yes, v1 needs sold-out (fever guarantees it). Amber extension blessed (canonical per A3). Design intent:
  - **PDP:** `btn-primary` disabled, label `sold out — next batch soon`, **plus** the newsletter line-input variant beneath it labeled `get notified` (reuses `01 §5.5`; feeds secondary conversion — fires `sold_out_notify_signup`, see B7).
  - **Card:** amber `sold out` chip; bottle render dims to 60% opacity.
  - **Cart line gone-unavailable:** amber note `no longer available` + remove action.
  - No low-stock counters in v1 — binary in/out only.

### B4. Asset production plan & approved placeholders
- **Context:** the asset list (`03 §8`) has no owners or dates. Rive and GLB assets sit on the critical path of the signature moments: `page-transition.riv` gates **every** page navigation (`M §5`), GLBs gate the signature gallery (`M §4.4`).
- **Ask:**
  1. Owner + delivery date per asset class: Rive ×5 (`logo`, `page-transition`, `btn-ui`, `vapor`, `mob-landscape`), GLB ×5, turntable loops ×5, AVIF stills ×5, campaign photography, macro set.
  2. Approve the placeholder plan below so engineering is never asset-blocked.
  3. **Spec amendment needed:** transparent WebM (VP9 alpha) does not play on Safari/iOS — precisely the platform where the WebGL fallback fires most. Amend `03 §8` to require an **HEVC-alpha twin** (`.mov`/`.mp4`, hvc1) per turntable, or accept turntables composited on `--color--black` instead of transparent.
- **Engineering placeholder plan (needs approval):** primitive-geometry bottle GLB stand-in; CSS `clip-path` wipe behind the same JS API as `page-transition.riv`; duotone solid placeholders for photography; the already-spec'd CSS button fallback (`M §4.8`) until `btn-ui.riv` lands.
- **Requested deadlines:** `logo.riv` + `page-transition.riv` by end of week 3; first bottle GLB by week 4; full asset set by week 6. Late Rive = build reviews happen without page transitions.
- **Blocks:** signature-moment fidelity from week 4 onward.
- **Resolution:** `approved` on all three.
  1. **Owners:** all Rive, GLB, turntables, stills — design (via motion/3D contractor, managed by me); campaign + macro photography — design (photo producer). Deadlines as requested: `logo.riv` + `page-transition.riv` EOW3, first GLB w4, full set + photography w6.
  2. Placeholder plan approved in full. Requirement: the clip-path wipe must expose the **same JS API** (`in`/`out`/`speed`) as the Rive artboard so the swap is drop-in.
  3. Amendment approved: each turntable ships as **VP9-alpha WebM + HEVC-alpha twin (`hvc1` .mov)**. If clean HEVC alpha isn't achievable by w6, fallback ruling: composite turntables on `--color--black` with the `--scent-tint` glow **baked into the render** — layout unchanged. Patch `03 §8`.

### B5. Newsletter provider
- **Context:** spec says "Klaviyo-equivalent" (`01 §5.5`) — needs an actual vendor + account.
- **Engineering default:** Klaviyo (matches reference; native integration if B1 default is accepted).
- **Blocks:** newsletter wiring (week 4+).
- **Resolution:** `approved` — Klaviyo. Account owned by product (me); **double opt-in ON** (EU launch, see B7).

### B6. Journal CMS
- **Context:** `/journal` is marked CMS (`03` sitemap); no platform, content model, or authoring workflow defined.
- **Ask:** platform preference? Who authors/publishes? Article count at launch?
- **Engineering default:** headless CMS (Sanity or equivalent); model: `title`, `slug`, `date`, `lead image`, `body` (rich text + pull-quote block), `og override`; 3 articles at launch.
- **Blocks:** journal build (week 5+).
- **Resolution:** `approved` — Sanity. Product/design authors and publishes; engineering owns schema + preview. **Add one field:** optional `scent` reference (links articles to PDPs; also the target the hero `next drop` chip deep-links to). 3 articles at launch — titles arrive with the week-4 copy batch (C1).

### B7. Analytics & consent
- **Context:** unspecified. Reference site ships Klaviyo + iubenda (research §2). Brief demands conversion ("converts fans into buyers") — that implies measurement.
- **Ask:** launch markets → is GDPR-grade cookie consent required? Analytics tool preference? KPI events beyond add_to_cart / begin_checkout / purchase / newsletter signup?
- **Engineering default:** GA4 with Consent Mode + lightweight CMP; full tracking plan to follow as an engineering doc.
- **Blocks:** launch checklist only, not build.
- **Resolution:** `approved`. EU launch → GDPR-grade consent **required**; GA4 + Consent Mode + lightweight CMP. KPI events beyond the standard four: `gallery_bottle_engaged` (a bottle stays resolved ≥2s in the gallery), `scent_discover_click` (gallery → PDP), `next_drop_click`, `sold_out_notify_signup` (B3), `webgl_fallback` (C7). Engineering drafts the tracking plan; design reviews event naming.

---

## Part C — P1 content & spec completions (block specific sections)

### C1. Copy completion inventory
- **Items marked `[draft]`:** PDP one-line characters ×5 (`03 §3.1`); formula story rows ×5 pages (`03 §3.3`); house manifesto lead + 3 pinned statements (`03 §4`); campaign band lead (`03 §1.5`).
- **Need by:** week 4 (PDP set), week 5 (house).
- **Resolution:** PDP one-liners are **final now**; the rest ships on your schedule (formula stories + journal titles w4, manifesto w5). Campaign lead confirmed final — drop its `[draft]` marker.
  - volt — `the jolt. citrus wired to a live current.`
  - nocturne — `the night. oud with the lights off.`
  - static — `the white noise. clean until it hums.`
  - fever — `the heat. saffron running a temperature.`
  - halo — `the glow. iris in soft focus.`

### C2. Legal pages content
- **Context:** `/legal/*` privacy + terms exist in the sitemap with no content source named.
- **Ask:** who supplies copy (counsel/product)? Engineering only lays it out.
- **Need by:** launch −2 weeks.
- **Resolution:** product owns — counsel-reviewed templates, delivered launch −2w. Engineering lays out at `--text--body` scale per `01 §3`; no bespoke design.

### C3. Contact form backend & error states
- **Context:** contact form spec'd (`03 §6`) with no submit destination; line-style inputs (`01 §5.5`) have a success state but **no error/validation state** anywhere.
- **Ask:** destination (inbox? ticketing?); validation copy; and a color ruling — is amber permitted for error states (fits "error-adjacent warmth", `01 §1.4`), or should errors use UV?
- **Engineering default:** relay to `business@osvant.com` via transactional-email service; error = input line + message in amber.
- **Need by:** week 5.
- **Resolution:** `approved`. **Color ruling: amber for all error/validation states** — errors are "heat" semantically; UV remains interactive/live-state only. Validation copy (eyebrow size, below field): empty required → `required`; malformed email → `check your email`; submit failure → `didn't send — try again.`; success → `sent. we'll be in touch.` Patch `01 §5.5` with the error state.

### C4. SEO / meta / sharing spec
- **Ask:** page titles + meta descriptions (does the lowercase voice apply to `<title>`?); OG image per page (confirm reuse of bottle stills from `03 §8`); Product JSON-LD for PDPs (needs B2 data); favicon/app-icon set (none spec'd).
- **Need by:** week 5–6.
- **Resolution:** decided.
  - Lowercase applies to `<title>` — yes. Formats: home `osvant — scent beyond the visible`; PDP `<scent> — eau de parfum — osvant`; others `<page> — osvant`.
  - Meta descriptions: design supplies with the week-4 copy batch.
  - OG: bottle stills composited on `--color--black`, 1200×630, wordmark bottom-left — one per scent + one house default. Reuse of `03 §8` stills confirmed.
  - Product JSON-LD approved with B2 data; fever carries `offers.availability` for sold-out.
  - Favicon/app icons: UV `o` glyph on black — SVG + PNG set delivered with the week-3 logo batch.

### C5. Mobile layout intent per section
- **Context:** mobile is "a designed experience, not a collapsed desktop" (`01 §4.2`), but only the gallery and PDP carry explicit mobile behavior.
- **Ask:** either supply mobile references for hero, two-door split, PLP asymmetric grid, and campaign band — **or** formally delegate mobile layout to engineering within the token system, reviewed in the weekly build review.
- **Engineering default:** delegation + weekly review.
- **Need by:** week 3.
- **Resolution:** delegation `approved`, bounded by four intent guardrails:
  1. **Hero:** single column; `osvant` stays one line at the clamp floor; `next drop` chip docks below the subline.
  2. **Doors:** stacked full-width ~60vh; title + arrow always visible — no hover-dependent affordance, tap navigates.
  3. **PLP:** single column with alternating horizontal offsets — keep the asymmetry, don't flatten to a uniform list.
  4. **Campaign band:** marquee stays on top, then still → copy → CTA stack.
  Mobile screenshots are mandatory in the weekly build review.

### C6. Browser/device support matrix
- **Proposal to sign off:** evergreen last-2 (Chrome/Edge/Firefox), Safari ≥ 16.4 (AVIF floor), Android Chrome ≥ 110; no legacy fallback encodes (AVIF-only stays viable at this floor). Note the Safari alpha-video exception in B4.3.
- **Also:** name the reference device for the "mid-tier mobile" Lighthouse budgets (brief §6) — we propose Pixel 7a / iPhone 12 class as the CI/QA baseline.
- **Need by:** week 2 (drives QA plan + CI device lab).
- **Resolution:** `approved` — matrix and Pixel 7a / iPhone 12 baseline as proposed. Noting the Safari ≥16.4 floor also covers HEVC-alpha playback (B4.3).

### C7. Remaining system/error states
- **Context:** 404 is spec'd (`01 §5.7`); missing: 500 page, newsletter failure state (success only in `01 §5.5`), WebGL slow-connection behavior.
- **Engineering default:** 500 mirrors the 404 pattern with copy `something spilled.`; newsletter failure = line pulses amber + `try again` (pending C3 color ruling); GLB fetch timeout 8s → swap to turntable fallback.
- **Need by:** week 4.
- **Resolution:** `approved` — all three. `something spilled.` is on-voice, keep it; pair with `btn-primary` `back to the current` (mirror 404). Newsletter failure amber per the C3 ruling. GLB timeout 8s → turntable swap, firing `webgl_fallback` (B7).

---

## Response summary table

| ID | Item | Priority | Need by | Status |
|---|---|---|---|---|
| A1 | `--text--h6` token | P0-fix | week 2 | closed |
| A2 | Preloader gate vs perf budget | P0-fix | week 2 | closed |
| A3 | Amber exclusivity wording | P0-fix | anytime | closed |
| A4 | Grammar dead-zone footnote | P0-fix | anytime | closed |
| B1 | Commerce platform & checkout | **P0** | kickoff +1w | closed |
| B2 | Pricing / currency / SKUs | **P0** | week 3 | closed |
| B3 | Sold-out states | **P0** | week 3 | closed |
| B4 | Asset plan + placeholders + alpha-video amendment | **P0** | kickoff +1w | closed |
| B5 | Newsletter vendor | P0 | week 4 | closed |
| B6 | Journal CMS | P0 | week 5 | closed |
| B7 | Analytics & consent | P0 | launch −3w | closed |
| C1 | Draft copy completion | P1 | weeks 4–5 | closed |
| C2 | Legal content | P1 | launch −2w | closed |
| C3 | Contact backend + error color ruling | P1 | week 5 | closed |
| C4 | SEO / meta / OG / favicon | P1 | weeks 5–6 | closed |
| C5 | Mobile layout intent | P1 | week 3 | closed |
| C6 | Browser/device matrix | P1 | week 2 | closed |
| C7 | 500 / newsletter-error / GLB timeout | P1 | week 4 | closed |

## What we are NOT asking for

- **No Figma/visual mockups** beyond the C5 mobile question — the text specs + token system are sufficient and preferred.
- **No new scope** — the v1 sitemap and non-goals (brief §8) stand as written.
- **No originality/branding work** — explicitly phase 2 (brief §6.6); this RFC only closes gaps in the phase-1 contract.
