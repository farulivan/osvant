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
- Full viewport, `--color--black`. Eyebrow: `eau de parfum — est. batch 001`. `osvant` at `--text--impact` (Archivo 900, wdth 125). Subline: `scent beyond the visible` — `beyond` in Instrument Serif italic. Rive `vapor` motif drifting behind type, `intensity` driven by scroll velocity.
- **`next drop` chip** (reference: hero next-race chip, `M §11.3`): small bordered chip top-right of hero — eyebrow `next drop` + `batch 002 — fall` → links to `/journal`. Enters last in the hero sequence (0.5s default register).
- Below-fold cue: `btn-text` `explore the collection ->` + scroll indicator line scrubbing scaleY.
- Motion: impact chars reveal per `M §4.2` (0.02 stagger, `power3.out`); vapor ambient register; **hero scroll-out per `M §4.10`** — type drifts/dims as the doors slide over it.

- [ ] h1 text is the LCP element
- [ ] hero headline is a masked char cascade, not a fade
- [ ] vapor intensity visibly responds to scroll velocity
- [ ] hero exit is scrubbed (`M §4.10`) — the hero never statically scrolls off
- [ ] `next drop` chip present and animated in sequence

### 1.3 Two-door split — `the lab` / `the cult`
Two stacked full-width doors (each ~70vh). Door A `the lab` → `/the-house` (craft: macro ingredient imagery, duotone violet). Door B `the cult` → `/journal` (culture: campaign photography). Titles at `--text--h1` as stacked fragments (`the` / `lab`), line-reveal on entry per `M §4.2`. Media parallax per `M §4.5`. Hover: media scale 1.05 (0.6s), title x-shifts 0.5em, arrow appears.

- [ ] each door's title fragments animate line-by-line independently
- [ ] both doors resolve to routes; entire door is the hit area

### 1.4 The collection gallery — SIGNATURE MOMENT
Per `M §4.4` (pinned Three.js procession, 5 bottles). Section eyebrow: `the collection`. Title fragments: `five` / `currents`. Per-bottle overlay: scent name (impact scale, serif-italic article), 3 notes, price, `discover ->`.

- [ ] scroll fully scrubs procession; snap resolves a bottle
- [ ] active scent swaps name (SplitText crossfade) + `--scent-tint` glow
- [ ] WebM fallback renders identical layout (`M §8`)
- [ ] max 1 pinned WebGL scene on Home (this one)

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
Split: left — eyebrow `batch 0N — eau de parfum`, name at impact scale (article in serif italic: `the *jolt*`), one-line character (final copy per RFC-001 C1); right — contained Three.js bottle (drag-to-rotate ±180°, idle ambient rotation, `--scent-tint` rim glow). Price + size selector (50/100ml chips) + `btn-primary` `add to cart` — sticky bottom bar ≤767px.

- [ ] `--scent-tint` applied via ONE attribute swap, nothing else recolored manually
- [ ] bottle drag works on touch; idle rotation stops under reduced-motion
- [ ] add-to-cart reachable without scrolling on all breakpoints

### 3.2 Note pyramid
Per `M §4.6`. Eyebrows: `top — the spark`, `heart — the current`, `base — the ground`.

- [ ] rows reveal sequentially, dividers scaleX before chars

### 3.3 The formula story
Alternating image/text rows (parallax per `M §4.5`), 2–3 rows, copy `[draft]`. One pull-quote line in Instrument Serif italic at `--text--h3`.

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

| Asset | Spec | Used in |
|---|---|---|
| Bottle GLB × 5 | ≤1.5MB each, Draco, shared silhouette, per-scent liquid/label material | gallery, PDP |
| Bottle turntable × 5 | 1080×1080, 6s loop; VP9-alpha WebM **+ HEVC-alpha `.mov` twin** (Safari); if clean HEVC alpha unachievable by w6 → black-composited with baked `--scent-tint` glow (RFC-001 B4.3) | WebGL fallback |
| Bottle still AVIF × 5 | 1200px transparent | cards, cart, OG |
| Rive files × 5 | `logo`, `page-transition`, `btn-ui`, `vapor`, `mob-landscape` (`M §7`) | global |
| Campaign photography | fever campaign, duotone-violet grade | home §1.5, PDP |
| Macro ingredient set | ≥8 images | the house, doors |
| Fonts | Archivo Variable woff2 (preload), Instrument Serif woff2 (idle-load) | global |

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
- [ ] every animated section resolves to a visible CTA (brief §3)
- [ ] **every section has at least one motion behavior** (`M §0` fidelity mandate) — no static sections
- [ ] **every section declares `data-nav-theme`**; nav visibly re-themes while scrolling (`M §4.9`)
- [ ] **all 13 parity beats present** on their respective pages (`M §11`) — reviewed against landonorris.com side-by-side
