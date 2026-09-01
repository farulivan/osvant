# OSVANT — Page Specifications & Acceptance Criteria

> **Doc 3 of 4.** Section-by-section build contract. Copy is final unless marked `[draft]`.
> Tokens → `01-design-system.md`. Motion recipes → `02-motion-guidelines.md` (referenced as `M §n`).
> A section is "done" only when its acceptance boxes check.
>
> **Phase-1 fidelity note:** the build must *feel* like the reference (landonorris.com) — imitating its animation beats is explicitly OK now; differentiation comes later. The full beat list is `M §11` (Parity Map); it is part of acceptance.

---

## Site Map

```
/                     Home
/collection           Collection (PLP)
/collection/[scent]   Scent detail (PDP) × 5  (volt, nocturne, static, fever, halo)
/the-house            Brand story
/journal              Editorial index + articles (CMS)
/contact              Contact + business enquiries
Cart drawer           (global overlay, not a route)
/legal/*              Privacy, Terms
```

Nav (5 flat items + cart — research §5: depth from motion, not IA): `collection`, `the house`, `journal`, `contact`, cart chip.
**Nav is live on every page:** per-section re-theming via `data-nav-theme` (`M §4.9`) — every section on every page declares its theme attribute; a page with an unthemed section fails review.

---

## 1. Home

### 1.1 Preloader
Per `M §6`. Copy: `decanting…`

- [ ] real progress; shown once per session; exit overlaps hero reveal at 50%

### 1.2 Hero — the name
- Full viewport, `--color--black`. Eyebrow: `eau de parfum — est. batch 001`. `osvant` at `--text--impact` (Mosvita 900, `font-stretch: 125%`). Subline: `scent beyond the visible` on the muted rung — `beyond` steps up to `--color--white` (`01 §3.3`). Rive `vapor` motif drifting behind type, `intensity` driven by scroll velocity.
- **`next drop` chip** (reference: hero next-race chip, `M §11.3`): small bordered chip top-right of hero — eyebrow `next drop` + `batch 002 — fall` → links to `/journal`. Enters last in the hero sequence (0.5s default register).
- Below-fold cue: `btn-text` `explore the collection ->` + scroll indicator line scrubbing scaleY.
- Motion: impact chars reveal per `M §4.2` (0.02 stagger, `power3.out`); vapor ambient register; **hero scroll-out per `M §4.10`** — type drifts/dims as the doors slide over it.

- [ ] h1 text is the LCP element
- [ ] hero headline is a masked char cascade, not a fade
- [ ] vapor intensity visibly responds to scroll velocity
- [ ] hero exit is scrubbed (`M §4.10`) — the hero never statically scrolls off
- [ ] `next drop` chip present and animated in sequence

### 1.3 Two-door split — `the lab` / `the cult`
Two stacked full-width doors (each ~70vh). Door A `the lab` → `/the-house` (craft: macro ingredient imagery, duotone green). Door B `the cult` → `/journal` (culture: campaign photography). Titles at `--text--h1` as stacked fragments (`the` / `lab`), line-reveal on entry per `M §4.2`. Media parallax per `M §4.5`. Hover: media scale 1.05 (0.6s), title x-shifts 0.5em, arrow appears.

- [ ] each door's title fragments animate line-by-line independently
- [ ] both doors resolve to routes; entire door is the hit area

### 1.4 The collection gallery — SIGNATURE MOMENT
Per `M §4.4` (pinned procession of 5 bottle stills under the light study, `M §8`). Section eyebrow: `the collection`. Title fragments: `five` / `currents` — **an `h2`, masked-reveal like every other heading** (`§9`). Per-bottle overlay: scent name (impact scale, serif-italic article), 3 notes, price, `discover ->`.

- [ ] scroll fully scrubs procession; snap resolves a bottle
- [ ] active scent swaps name (SplitText crossfade) + `--scent-tint` bloom
- [ ] three parallax rates present and distinct (`0.4× / 1× / 1.6×`) — a single rate fails this box
- [ ] active bottle's `--light-angle` visibly sweeps as it crosses centre
- [ ] every bottle stays clear of the left-38% type safe zone at every scrub position
- [ ] overlay carries notes **and price**, not just the name
- [ ] max 1 pinned section on Home (this one)

### 1.5 Campaign band — featured drop
Full-bleed `--color--ink-1`. Marquee (`M §4.7`): `fever — limited batch 001`. Content: campaign still (parallax), lead: `saffron, chili-rose, benzoin. the heat, bottled.` (final, RFC-001 C1), `btn-primary` `shop fever`, amber `limited` chip.

- [ ] marquee velocity reacts to scroll; pauses off-viewport
- [ ] amber appears only in its canonical roles (`01 §1` rule 4 — RFC-001 A3)

### 1.6 Social band
Eyebrow `what's diffusing`. Title `@osvant` / `everywhere` (stacked fragments). 4 link cards (tiktok, instagram, youtube, twitch-equivalent) with hover tilt (micro register, max 3°).

### 1.7 Footer
Per `01 §5.6`. Tagline marquee `provocation, bottled.`; newsletter `join the current` (success: `you're in the current.`); cropped `osvant` wordmark.

- [ ] newsletter success state matches `01 §5.5` exactly

---

## 2. Collection (PLP)

- Header: eyebrow `all formulas`, title `five` / `currents`, count `05`.
- Grid: 5 scent cards (`01 §5.3`) — asymmetric editorial layout (2/3 split rows, not uniform grid), entrance stagger 0.05 (`M §3`).
- Row hover: non-hovered cards dim to 60% opacity (0.3s micro).
- No filters/sort in v1 (5 items).

- [ ] card hover swaps border to `--scent-tint` per scent
- [ ] grid entrance is one stagger group, triggered once

---

## 3. Scent Detail (PDP) × 5

Template with `data-scent` theming (`01 §2.3`). Order: volt, nocturne, static, fever, halo.

### 3.1 Scent hero
Split, **fitting one viewport at ≥725px tall**: left — eyebrow `batch 0N — eau de parfum`, name at impact scale (article in serif italic: `the *jolt*`), one-line character (final copy per RFC-001 C1), then price + size selector (50/100ml chips) + `btn-primary` `add to cart` **inline in this column at desktop**; right — the bottle light study (`M §8`), drag-to-light per `M §4.4b`, `--scent-tint` rim on layer 4. The buy row becomes a fixed bottom bar **only** ≤767px.

- [ ] hero fits one viewport — product, price and add-to-cart all visible without scrolling, every breakpoint
- [ ] `--scent-tint` applied via ONE attribute swap, nothing else recolored manually
- [ ] drag works on touch and does not capture vertical scroll (`touch-action: pan-y`)
- [ ] keyboard equivalent present (`M §4.4b`); ambient oscillation stops under reduced-motion, drag still works
- [ ] a single size variant renders as a spec line (`50ml · limited`), never as a one-option "selector"

### 3.2 Note pyramid
Per `M §4.6`. Eyebrows: `top — the spark`, `heart — the current`, `base — the ground`.

- [ ] rows reveal sequentially, dividers scaleX before chars

### 3.3 The formula story
Alternating image/text rows (parallax per `M §4.5`), 2–3 rows, copy `[draft]`. One pull-quote line in Instrument Serif italic at `--text--h3`.

**Row 1 is the bottle detail macro** (`§8` AST-03b) — a close crop of cap, label edge or liquid meniscus. This row carries the material intimacy that drag-to-rotate used to provide (ADR-013) and is not optional: without it the PDP never shows the object closer than the hero framing.

- [ ] row 1 is a bottle macro, not an ingredient macro
- [ ] exactly one pull-quote per page, serif italic, `--text--h3`

### 3.4 Cross-sell
`also in the current` — remaining 4 scents as compact cards, horizontal drag-scroll (Lenis-friendly: native overflow-x + scroll-snap).

- [ ] no nested smooth-scroll hijacking; native snap only

---

## 4. The House

- Hero: `the lab` / `behind osvant` fragments; manifesto lead `[draft]`.
- Pinned manifesto scrub: 3 statements char-highlight from `--color--ink-3` → `--color--white` as scrolled (scrub, `ease: none`).
- Craft grid: macro photography, parallax.
- Ends: CTA band → collection.

- [ ] manifesto highlight is scrubbed (reversible), not triggered-once

## 5. Journal

Index: title `transmissions`, article cards (image, eyebrow date, title h3), stagger entrance. Article template: lead image parallax, `--text--body` two-thirds column, pull-quotes serif italic. Ends with cross-sell band.

## 6. Contact

Split: `business enquiries -> business@osvant.com` (btn-text at h3 scale) / press + socials. Form: name, email, message — inputs per `01 §5.5` line style.

## 7. Global overlays

### Cart drawer
Per `01 §5.7`: right slide, 0.6s `expo.inOut`, `--color--ink-1`. Line items with qty steppers; subtotal; `btn-primary` `checkout`. Badge pop: elastic (`M §4.8`). Empty state: `nothing decanted yet.` + `btn-secondary` to collection.

- [ ] drawer traps focus; ESC closes; background inert + `lenis.stop()`

### 404
`nothing to smell here.` at impact scale + `btn-primary` `back to the current`.

### Landscape prompt (mobile)
Rive `mob-landscape` full-screen when `orientation: landscape` and viewport height < 480px.

---

## 8. Asset Production List

> **Revised 2026-08-21 (ADR-013).** GLBs, turntable videos and the shared HDR are withdrawn. The bottle ships as two AVIF sets. Twenty bottle files become ten.

| ID | Asset | Spec | Used in |
|---|---|---|---|
| AST-03a | **Bottle still × 5** | 2000px long edge, transparent AVIF, **flat-lit** (`M §8.3`), identical camera/framing/scale across all five, ≥12% transparent margin on every side for the sheen and rim layers, no baked shadow | gallery, PDP hero, cards, cart, OG |
| AST-03b | **Bottle detail macro × 5** | 1600px AVIF, close crop of cap / label edge / liquid meniscus, same lighting family as AST-03a | PDP formula story row 1 (`§3.3`) |
| AST-04 | Rive files × 5 | `logo`, `page-transition`, `btn-ui`, `vapor`, `mob-landscape` (`M §7`) | global |
| AST-05 | Campaign photography | fever campaign, duotone-green grade, ≥2400px master | home §1.5, PDP |
| AST-06 | Macro ingredient set | ≥8 images, duotone green, covering the collection's notes | the house, doors, PDP formula rows 2–3 |
| AST-07 | Door media × 2 | 2400×1000, `the lab` / `the cult`, bottom-scrim safe | home §1.3 |
| AST-08 | Journal lead images × 3 | 2000×1250 lead + 1200×750 card | journal |
| AST-09 | Social band plates × 4 | 800×500, no platform logos | home §1.6 |
| AST-10 | OG images × 9 | 1200×630; per-scent cards composite AST-03a on `--color--black` — generate at build, not by hand | global |
| — | Fonts | Mosvita woff2 — 3 static cuts; display + body preloaded, SemiBold swaps (`01 §3.1`, ADR-014) | global |

**Flat-lit is the load-bearing constraint.** Layers 1/3/4 of the light study supply every highlight, rim and caustic (`M §8.1`). A master that already carries dramatic lighting double-lights and reads as a compositing error — it will be rejected at handoff (`06 §2`).

**Upgrade path (`M §8.2`), asset-only, no code change:** AST-03a at `N=1` ships now. `N=8` (lit-state sequence) and `N=24–36` (sprite-sheet turntable, which restores true rotation) drop in later if budget returns.

## 9. Global Acceptance (every page, pre-merge)

- [ ] no pure `#fff`/`#000`/neutral gray anywhere (`01 §1`)
- [ ] no `text-transform: uppercase` (brief §4)
- [ ] no `box-shadow` (`01 §4.3`)
- [ ] every h1/h2 uses the masked reveal — zero plain fades on headlines
- [ ] scrubbed tweens all `ease: "none"`; non-scrub defaults `power2.out`/0.5s (`M §2`)
- [ ] page transition = Rive wipe, ≤1.6s perceived (`M §5`)
- [ ] reduced-motion pass: site fully usable, nothing pinned (`M §9`)
- [ ] keyboard pass: focus visible everywhere, drawer/menu trap focus
- [ ] perf: LCP ≤2.5s, CLS <0.1, budgets per `M §10`
- [ ] max 3 pins/page; max 1 playful-register animation per view
- [ ] every bottle presentation uses the light study (`M §8`) — a flat, unlit bottle image fails `M §0.1`
- [ ] every animated section resolves to a visible CTA (brief §3)
- [ ] **every section has at least one motion behavior** (`M §0` fidelity mandate) — no static sections
- [ ] **every section declares `data-nav-theme`**; nav visibly re-themes while scrolling (`M §4.9`)
- [ ] **all 13 parity beats present** on their respective pages (`M §11`) — reviewed against landonorris.com side-by-side; **beat 5 is assessed as equivalent, not literal** (ADR-013)
