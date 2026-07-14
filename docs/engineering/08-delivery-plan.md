# OSVANT — Delivery Plan

> **Eng doc 8 of 9.** 8-week build to launch-ready, phased per the research playbook (§7). Weeks are relative to kickoff. Asset dates from RFC B4; content dates from RFC C1/C2.

## 1. Milestones

### M1 — Foundation (w1–2)
Repo, CI/CD, environments, tokens.css verbatim, base layout (nav/footer markup), Lenis + router + PageModule registry + transition API (clip-path placeholder), preloader (RFC A2 scope), `products.json` + commerce port/adapter, capture landonorris.com parity recordings (13 beats, archived — R11), `/dev` harnesses.
**Exit:** S3/CloudFront preview navigating between stub pages with wipe + smooth scroll; CI gates live; budgets green.

### M2 — Motion system + core pages (w3–4)
Headline reveal, parallax, marquee, nav theming, buttons; Home (hero, doors, campaign band, social, footer), PLP; cart drawer + local cart adapter; `logo.riv` + `page-transition.riv` land EOW3 (swap placeholders); mobile guardrails (RFC C5) implemented.
**Exit:** Home + PLP at parity beats 1–4, 6–9, 12–13 recognizable; add-to-cart → mock checkout confirmation works on staging.

### M3 — Signature moments (w5–6)
WebGL gallery (first GLB w4, all w6), PDP ×5 (scent hero + drag bottle, pyramid, formula story, cross-sell, sold-out states), turntable fallbacks, remaining Rive artboards, journal (content collections) + the-house + contact.
**Exit:** all 13 parity beats present; full sitemap navigable; nightly E2E green.

### M4 — Conversion, content & hardening (w7–8)
Final copy/photography in (w4–6 batches), form mock states + `track()` instrumentation polish, SEO/meta/JSON-LD/OG, legal pages (launch −2w), perf tuning to budgets on device, full a11y pass, launch QA (`04 §7`), content freeze, launch.
**Exit:** launch checklist signed; production promoted.

## 2. Critical path & dependencies

```
w3: logo.riv + page-transition.riv ──► M2 exit (real transitions)
w4: first GLB ──► gallery build start (M3)   w4: copy batch ──► PDP content
w6: full assets + photography ──► M4 content pass
launch−2w: legal copy        launch−1w: QA + freeze
```

Slack: gallery is buildable against the placeholder GLB from w3 — first real GLB slipping to w5 costs polish time, not the milestone (escalation rule in `06 §5`).

## 3. Cadence & rituals

- **Weekly build review** (heads of eng + product/design): preview walkthrough on the two baseline devices, motion QA protocol (`04 §3`), asset ledger check (`06 §1`), risk register scan.
- Parity recordings archived per milestone (evidence for phase-1 acceptance).
- RFC-style async decisions for anything new — no verbal spec changes; design-doc patches follow sign-off (RFC process now established).

## 4. RACI (condensed)

| Workstream | R | A | C/I |
|---|---|---|---|
| Front-end build, motion, WebGL | engineering | head of eng | design (weekly review) |
| Design-doc patches | engineering | head of design | — |
| Rive/GLB/photo/video assets | design contractors | head of design | eng (acceptance, `06 §2`) |
| Copy, legal, pricing data (`products.json`) | product | head of product | eng (integration) |
| Launch go/no-go | — | both heads jointly | — |

## 5. Launch checklist (gate to promote)

- [ ] All 13 parity beats present + recognizable, recordings archived (brief §6.6)
- [ ] `03 §9` global acceptance green on every page
- [ ] Budgets green on real devices (`04 §4`); uptime ping live (`05 §5`)
- [ ] All mock flows pass manually + zero-third-party assertion on prod (`04 §7`)
- [ ] Legal pages live; JSON-LD validates; OG images per scent; sitemap/robots
- [ ] Rollback rehearsed once from staging (`05 §4`)
