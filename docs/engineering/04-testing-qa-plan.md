# OSVANT — Testing & QA Plan

> **Eng doc 4 of 9.** What gets verified, how, and by what gate. Perf/a11y numbers inherit from `M §10` and brief §6 — this doc only operationalizes them.

## 1. Test pyramid

| Level | Tool | Scope | Gate |
|---|---|---|---|
| Static | ESLint, stylelint (token rules `03-eng §4.6`), `tsc` | all code | CI, every PR |
| Unit | Vitest | `lib/commerce.ts` adapter, cart state logic, content schema, module registry | CI, every PR |
| E2E | Playwright | user flows (§2), overlays, fallbacks | CI, every PR (smoke) + nightly (full) |
| Visual regression | Playwright screenshots | static states only — animations disabled via reduced-motion emulation | CI, every PR |
| Perf | Lighthouse CI + size-limit | budgets §4 | CI, every PR |
| Motion QA | human protocol §3 | animation parity + feel | weekly review + pre-launch |

## 2. E2E flows (Playwright)

Smoke (every PR): home renders → nav to PLP via transition → PDP volt → add to cart → drawer opens with correct line → checkout CTA reaches mock confirmation step (ADR-009). Plus: newsletter success state (mock); 404 page.

Nightly full adds:

- All 5 PDPs: size chips (fever = single 50ml + `limited` chip, RFC B2), scent-tint attribute applied.
- Sold-out (data flag): disabled CTA + `get notified` variant + card chip (RFC B3).
- Cart edge: line goes unavailable → amber note + remove (RFC B3).
- Fallback: WebGL blocked context → turntable layout renders, `webgl_fallback` event fires (RFC C7).
- Reduced-motion emulation: no pinned sections exist, content fully readable, transitions are crossfades (`M §9`).
- Keyboard: tab order, drawer/menu focus trap + ESC, skip link, visible focus (`03 §9`).
- Zero third-party requests: E2E asserts NO external network calls anywhere (ADR-012) — regression guard for the perf story.
- A11y scan: axe on all routes, zero critical violations.

## 3. Motion QA protocol (the parity gate)

Automated tests cannot judge feel. Weekly build review runs this manually:

1. **Parity walkthrough:** side-by-side screen recordings — each of the 13 beats (`M §11`) vs. landonorris.com. Reviewer marks: present / recognizable / off. "Off" items get a ticket; phase-1 exit requires all 13 present + recognizable (brief §6.6).
2. **Grammar spot-check:** reviewer picks 3 random animated elements; implementer shows the recipe (`M §4`) or register (`M §2`) each maps to. Unmapped values = churn flag (RFC A4 rule).
3. **Device pass:** Pixel 7a + iPhone 12 class (RFC C6) on the preview deploy — scroll feel, gallery scrub, drawer, landscape prompt.
4. **Recording archive:** parity recordings stored per milestone — this is the evidence trail for the phase-1 acceptance (`03 §9` final box).

## 4. Performance gates (CI-enforced)

| Gate | Threshold | Tool |
|---|---|---|
| `core + transitions` JS | ≤ 350KB gzip (`M §10`) | size-limit |
| Lighthouse perf, standard pages | ≥ 90 mobile (brief §6) | LHCI, throttled, Pixel-class emulation |
| Lighthouse perf, WebGL pages (home, PDP) | ≥ 75 mobile | LHCI |
| LCP / CLS / INP | ≤ 2.5s / < 0.1 / < 200ms (`M §10`) | LHCI assertions |
| A11y score | ≥ 95 all pages | LHCI |
| GLB size | ≤ 1.5MB each (`M §8`) | asset check script in CI |

LHCI runs against the preview deploy (real CDN), not localhost. Regressions block merge; overrides require a `perf:` label + head-of-eng approval.

Post-launch: no RUM by default (zero third-party, ADR-012); field CWV via CrUX/PageSpeed once traffic exists. CloudWatch RUM optional later if wanted.

## 5. Manual pre-merge checklist (in PR template)

- [ ] Reduced-motion pass (OS setting, not just emulation)
- [ ] Keyboard-only pass of touched flows
- [ ] Mobile screenshots attached (RFC C5)
- [ ] Section acceptance boxes from `03-page-specs.md` quoted & checked
- [ ] New animations mapped to a `M §4` recipe or `M §2` register

## 6. Device/browser matrix (RFC C6, signed off)

- **Desktop:** Chrome/Edge/Firefox last 2, Safari ≥ 16.4.
- **Mobile:** iOS Safari ≥ 16.4 (iPhone 12 baseline), Android Chrome ≥ 110 (Pixel 7a baseline).
- **CI emulation** covers the matrix; **physical devices** (the two baselines) used in weekly motion QA.
- Feature floors this buys: AVIF everywhere, `backdrop-filter`, WebGL2, HEVC-alpha on Safari — no legacy encode paths.

## 7. Launch QA (once, launch −1w)

Full nightly suite green on production build + all mock flows manually passed (cart → mock checkout, sold-out, newsletter/contact states) + zero-third-party assertion on prod + structured-data validation (Product JSON-LD, RFC C4) + 500/404 reachable + `robots.txt`/`sitemap.xml` present + cache headers verified (hashed assets immutable, HTML no-cache) via CloudFront.
