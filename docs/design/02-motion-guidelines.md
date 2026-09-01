# OSVANT — Motion Guidelines

> **Doc 2 of 4.** The animation contract. These values are non-negotiable defaults — deviations require design sign-off.
> Grammar is adopted from measured values in the reference build (research §4.1, shipped-code frequency analysis).

## 0. Fidelity Mandate (phase 1)

**Animation is the product.** In this phase we deliberately imitate the reference build's animation density and patterns — a static-but-pretty build is a FAILED build. Rules:

1. Every section must have at least one motion behavior from §4 — no section ships as plain markup.
2. If a pattern here maps to a reference moment (see §11 Parity Map), match the reference's *feel* first; originality comes in a later phase.
3. Cutting an animation for time/perf is a design decision, not an engineering shortcut — flag it, don't silently drop it.

---

## 1. Stack (research §2, §4.2 — five layers, in build-priority order)

| # | Layer | Library | Owns |
|---|---|---|---|
| 1 | Smooth scroll | **Lenis** | all scroll normalization — foundation for everything below |
| 2 | Scroll storytelling | **GSAP + ScrollTrigger** | pins, scrubs, entrances |
| 3 | Type reveals | **GSAP SplitText** (or SplitType) | char/line cascades |
| 4 | Brand motion | **Rive** | logo, page transition wipe, button micro-UI, vapor motifs, landscape prompt |
| 5 | Depth & light | **CSS/Canvas compositing** (no library) | the collection gallery + PDP bottle — the light study, §8 |

> **Layer 5 changed 2026-08-21 (ADR-013).** It was Three.js. Real-time 3D is out of budget, so the bottle is a composited still under moving light rather than a mesh under a moving camera. The layer is still a required layer — a bottle presented as a flat image with no light behaviour fails `§0.1` exactly as a static section would.

Page routing: SPA-style transitions via **taxi.js** (matching reference) or the framework router's transition hooks — either way, the Rive wipe contract in §5 must hold. Register `ScrollTrigger`, `SplitText`, `CustomEase`, `CustomWiggle`, `CustomBounce`.

## 2. The House Grammar (memorize this table)

| Register | Ease | Duration | Used for |
|---|---|---|---|
| **Default** | `power2.out` | `0.5s` | any entrance/settle without a specified override |
| Micro | `power2.out` | `0.2–0.3s` | hovers, toggles, instant feedback |
| UI move | `power2.inOut` | `0.5–0.6s` | element repositioning, drawer, accordions |
| **Cinematic** | `expo.inOut` | `1.5–2s` | full-screen moves, page transitions, hero acts |
| Ambient | `power1.inOut` | `2–2.5s` | slow drifts, vapor, idle bottle rotation |
| Playful | `elastic.out(1, 0.75)` | `0.8–1.2s` | cart badge pop, easter-egg UI toys — sparingly (≤1 per view) |
| Scrubbed | `ease: "none"` | n/a — `scrub: true` | ALL scroll-tied tweens; smoothness comes from Lenis, never from scrub smoothing |

```js
gsap.defaults({ ease: "power2.out", duration: 0.5 });
```

**Two speed registers only** (research §4.1): UI at 0.2–0.6s, cinematic at 1.5–2.5s. The gap between them is intentional — nothing lives at 0.8–1.4s except the playful elastic register.

> **Precedence (RFC-001 A4):** the §4 recipes are canonical; this register table governs only tweens without a specified recipe.

## 3. Stagger Vocabulary

| Value | Use |
|---|---|
| `0.015–0.02s` | character-level text ripples (the "slipstream" feel — never typewriter) |
| `0.03s` | word/line-level |
| `0.05–0.08s` | card grids, list items |
| `{ amount: 0.5 }` | any group larger than ~10 items |

## 4. Pattern Recipes (implementation contracts)

### 4.1 Lenis foundation

```js
const lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1 });
lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add((t) => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);
```

Anchor links and cart-drawer opening must go through `lenis.scrollTo` / `lenis.stop()`+`lenis.start()` — never raw `window.scroll`.

### 4.2 Headline reveal (every h1/h2, and impact fragments)

Contract: headings arrive as masked char cascades. Markup: heading fragments are separate elements (`01 §3.3`).

```js
const split = new SplitText(el, { type: "chars,lines", linesClass: "line-mask" });
gsap.from(split.chars, {
  yPercent: 110,
  duration: 0.8,
  ease: "power3.out",
  stagger: 0.02,
  scrollTrigger: { trigger: el, start: "top 85%", once: true },
});
```

`.line-mask { overflow: hidden; }`. Eyebrow fades in 0.4s, delayed 0.2s after chars start. Re-split on resize (debounced 200ms).

### 4.3 Scroll-scrubbed section (pinned storytelling)

```js
gsap.timeline({
  scrollTrigger: { trigger: section, start: "top top", end: "+=200%", scrub: true, pin: true },
})
```

All child tweens inside scrubbed timelines: `ease: "none"`. Pin budget: **max 3 pinned sections per page**.

### 4.4 The collection gallery (signature moment — "helmet hall of fame" equivalent)

> Rebuilt on the light study (§8) 2026-08-21, ADR-013. Everything below except the drawing layer is unchanged from the 3D version — the pin, the scrub, the snap, the theming and the CTA contract all survive.

- Pinned full-viewport section, 5 bottle stills in a horizontal procession track (CSS transform on one track element — no canvas, no camera).
- Scroll scrub (300% duration) drives: track x-position, the active bottle's `--light-angle` (0.35 → 0.65 across its dwell), scent name crossfade (SplitText swap), `--scent-tint` bloom behind the active bottle.
- **Depth is differential parallax, not geometry.** Three rates, back to front: tint wash `0.4×`, bottle track `1×`, vapor plate `1.6×`. This ratio is the contract — matching rates collapse the illusion.
- Active bottle: `scale: 1.08`, full opacity, light study live. Inactive: `scale: 0.86`, `opacity: 0.5`, light frozen at `0.5`.
- Idle: active bottle's `--light-angle` oscillates `0.45 ↔ 0.55` (ambient register, `power1.inOut`, 2.5s) via `gsap.ticker` — replaces the old idle rotation, additive to scrub position.
- Pointer parallax: layers tilt toward cursor at `1° / 3° / 5°` (wash / track / vapor), lerped `0.08`. Differential again — a uniform tilt reads as a flat plane rocking.
- Snap: `snap: 1/4` so a bottle is always resolved when scrolling stops.
- Each bottle resolves to a `discover ->` btn-text → PDP.
- **Type safe zone:** the overlay occupies the left 38% of the stage; the track's x-range must keep every bottle out of it. Enforced by layout, not by a scrim.

### 4.4b PDP bottle — drag-to-light (replaces drag-to-rotate)

- The same `--light-angle` parameter, driven by horizontal pointer/touch drag across the bottle instead of by scroll. Range `0 → 1` over a drag of one bottle-width; no wrap, clamped at both ends.
- Release: settles to the nearest of `0.25 / 0.5 / 0.75` (UI-move register, 0.6s `power2.inOut`) so the bottle always rests in a composed lighting state.
- Idle when untouched: the same `0.45 ↔ 0.55` ambient oscillation as §4.4.
- Touch: `touch-action: pan-y` on the drag surface so vertical page scroll is never captured.
- Keyboard equivalent (required, §9): the bottle is a `tabindex="0"` group; `←`/`→` step `--light-angle` by `0.05`, `Home`/`End` jump to `0`/`1`.

### 4.5 Media parallax (default for imagery)

Images inside `--radius--media` masks scrub `yPercent: -12 → 0`, `scale: 1.15 → 1`. Applied via `data-anim="parallax"`.

### 4.6 Note pyramid reveal (PDP)

Rows reveal top→heart→base: divider line `scaleX 0→1` (0.8s `expo.out`), then notes char-cascade (0.015 stagger). Row triggers chained at `start: "top 75%"` each.

### 4.7 Marquee bands (tagline, campaign)

CSS-transform loop via GSAP `xPercent` with `repeat: -1`, `ease: "none"`, ~35s/loop desktop. Scroll-velocity multiplier: Lenis velocity scales `timeScale` between 1 and 2.5 (lerped back to 1). Pause when off-viewport (`IntersectionObserver`).

### 4.8 Buttons

- `btn-primary`: Rive artboard `btn-ui`, state machine inputs `hover` (bool), `press` (trigger). CSS fallback: label y-flip (both `data-btn-label` spans, 0.3s `power2.out`).
- Cart badge on add: `elastic.out(1, 0.75)`, scale 0→1, 0.9s (playful register).

### 4.9 Per-section nav theming (verified reference pattern: `hero-nav-theme.is-1/is-2` classes, research S2)

The nav is *live* — it re-themes as sections pass under it. Each section carries `data-nav-theme="dark|light|scent"`; a ScrollTrigger per section (`start: "top 4rem", end: "bottom 4rem"`) toggles a class on the nav that swaps logo/link/cart colors (0.3s micro register). Over the gallery, nav links pick up the active `--scent-tint`.

### 4.10 Hero scroll-out (cinematic exit)

The hero never just scrolls away. Scrubbed timeline (`start: "top top", end: "+=100%"`, no pin): impact type drifts `yPercent: 30` and fades to 0.4 opacity, vapor `intensity` ramps to 1, eyebrow/subline exit early (`yPercent: -40`, opacity 0 by 40% progress). The next section visually slides over the dimming hero.

## 5. Page Transitions (research §4.3)

- Transitions are a **branded graphic moment** — the Rive `page-transition` artboard (vapor/current wipe sweeping the viewport), never a CSS fade.
- Contract with router (taxi.js `NavigationEvents` or equivalent):
  1. intercept navigation → `lenis.stop()`
  2. play Rive state machine `page-transition` input `in` (~0.9s, covers viewport)
  3. swap DOM, reset scroll, kill stale ScrollTriggers (`ScrollTrigger.getAll().forEach(t => t.kill())`), re-init page modules
  4. play input `out` (~0.9s, reveals new page), `lenis.start()`
  5. new page's hero headline reveal starts at `out` 50% — overlap, never sequential dead air
- Ship transition logic as an **isolated chunk** (reference isolates `transitions-rive-isolate.js`, research §2).
- Total perceived transition ≤ 1.6s. Repeat navigations may shorten to 1.2s via state machine `speed` input.

## 6. Preloader

1. Black screen, `decanting…` (Mosvita, `--text--h5`) + percent counter (`--text--eyebrow`, tabular numerals).
2. Real asset progress — gates **the Mosvita woff2 cuts + `logo.riv` + `page-transition.riv` + `vapor.riv` only**; bottle stills load with their sections after first paint (the gallery's first bottle at `fetchpriority="high"`, never a preloader gate). Never faked below 90%; ~3s hard cap on a median connection (RFC-001 A2).
3. Exit: counter fades 0.3s → viewport wipe with same `page-transition` artboard (1.2s) → hero impact reveal overlaps at 50%.
4. Shown once per session (`sessionStorage`), skipped on internal navigations.

## 7. Rive Artboard Inventory (build checklist — research §4.2 layer 4)

| Artboard | State machine inputs | Where |
|---|---|---|
| `logo` | `hover` (bool), `scrolled` (bool) | nav, footer |
| `page-transition` | `in`, `out` (triggers), `speed` (number) | router + preloader |
| `btn-ui` | `hover` (bool), `press` (trigger) | primary buttons |
| `vapor` | `intensity` (number 0–1, driven by scroll velocity) | hero + PDP decorative motif |
| `mob-landscape` | autoplay loop | landscape orientation prompt |

All `.riv` files lazy-loaded except `logo` and `page-transition` (preloaded — they gate first paint and first navigation).

## 8. The Light Study — bottle presentation contract (ADR-013)

> Replaces the former "3D / WebGL Rules". Read this before building anything that shows a bottle.

**The principle: the object is fixed, the light moves.** Depth comes from differential motion between layers, never from geometry. This is not a downgrade dressed as a concept — it is the more literal expression of `brief §2` ("scent beyond the visible"): illumination is what makes an invisible thing legible, and a rotating bottle never said that.

### 8.1 The layer stack (binding — exactly six layers, back to front)

| z | Layer | Asset | Blend | Motion |
|---|---|---|---|---|
| 0 | `tint-wash` | none — CSS radial gradient in `--scent-tint` | normal | slowest parallax (`0.4×`); blooms on active |
| 1 | `caustic` | none — blurred ellipse, `--scent-tint` | `screen` | slides **inverse** to `--light-angle` |
| 2 | `bottle` | **AVIF, alpha, flat-lit** — the only produced asset | normal | `1×` parallax; scale on active |
| 3 | `sheen` | none — linear gradient, masked to layer 2's alpha | `overlay` | x-position + angle track `--light-angle` |
| 4 | `rim` | none — same alpha mask, offset, `--scent-tint` | `screen` | opposite the sheen |
| 5 | `vapor` | Rive `vapor` (or AVIF plate) | `screen` | fastest parallax (`1.6×`) |

Layers 3 and 4 clip to the bottle silhouette via `mask-image` reading layer 2's own alpha channel — one asset, reused as its own mask. Do not ship a separate mask file.

### 8.2 The parameter

One custom property, `--light-angle`, range `0 → 1`, is the entire interface. Scroll drives it in the gallery (§4.4); drag drives it on the PDP (§4.4b); an ambient oscillation drives it at rest. Nothing else in the system may write to it.

Because there is exactly one parameter, the mechanic is **source-agnostic**: it reads an N-frame bottle source. `N=1` (CSS-composited, ships now) → `N=8` (a lit-state sequence) → `N=24–36` (sprite-sheet turntable, restores true rotation) are asset-only upgrades requiring **no code change**. Do not design anything that would break that property.

### 8.3 Asset rule that everything depends on

**The bottle master must be flat-lit** — even frontal illumination, no baked specular, no baked rim, no cast shadow. Layers 1/3/4 supply all lighting. A dramatically-lit master double-lights and reads as a compositing error. This is the single most important line in `03 §8`.

### 8.4 Performance

- Images `decoding="async"`; the gallery's first bottle `fetchpriority="high"`, the rest lazy.
- Reserve space with `aspect-ratio` on every bottle slot — CLS budget is unchanged (`§10`).
- Animate `transform`/`opacity`/`--light-angle` only. No layout-triggering properties inside a scrub.
- `content-visibility: auto` on off-screen procession items; the ambient ticker unsubscribes when the section leaves the viewport (`IntersectionObserver`).
- No fallback tier exists, because the primary *is* the image. There is nothing to probe and nothing to degrade to.

## 9. Accessibility & Reduced Motion (non-negotiable)

`prefers-reduced-motion: reduce` →

- Lenis disabled (native scroll); all `scrub`/`pin` ScrollTriggers not created — content lays out statically in final-state
- SplitText reveals → simple 0.3s opacity fades; marquees static
- **Light study:** ambient oscillation stopped and `--light-angle` frozen at `0.5`; parallax rates all collapse to `1×`. **Drag still works** — it is a user-initiated control, not decoration (unchanged intent from the drag-to-rotate ruling). The gallery becomes a static 5-up row of composed bottles with the overlay resolved to the first scent.
- Page transitions → 0.3s opacity crossfade; preloader → counter only, no wipe

Focus states: 2px `--color--phosphor` outline, `outline-offset: 3px` — never removed. Every Rive and light-study control needs a keyboard-reachable DOM equivalent (§4.4b defines the bottle's).

## 10. Performance Budget (research §6)

- JS per page ≤ 350KB gzip — **flat, no carve-out.** The former "excluding the Three.js chunk" exemption is withdrawn (ADR-013); the light study adds no runtime library.
- Code-split: transitions chunk, Rive runtime — separate; `defer` everything; SRI on CDN assets
- LCP ≤ 2.5s (hero text is LCP — never an image; on preloader first visits the counter text is the accepted LCP element, RFC-001 A2); CLS < 0.1 (reserve every media slot with `aspect-ratio`); INP < 200ms (no long tasks from scroll handlers — all rAF-batched via the single gsap.ticker)
- Lighthouse mobile: **≥ 90 on every page** (brief §6.3). The ≥75 WebGL carve-out is withdrawn with ADR-013 — there are no WebGL pages.
- Bottle stills ≤ 180KB each at 1×; total bottle payload on `/` ≤ 900KB across the five.

## 11. Reference Parity Map (Lando moment → Osvant equivalent)

Phase-1 target: someone who knows landonorris.com should recognize every one of these beats. Check off during build review.

> **Beat 5 is scoped as *equivalent* since ADR-013.** It must read as the same kind of moment — pinned, scrubbed, per-item themed, spatial — but it is not a 3D scene and reviewers must not fail it for lacking rotation. Every other beat is unchanged and still assessed literally.

| # | Reference moment (research §4.4) | Osvant equivalent | Spec |
|---|---|---|---|
| 1 | "Load Norris" pun preloader + counter | `decanting…` + percent | §6 |
| 2 | Viewport-filling name, split-char reveal | `osvant` impact hero | §4.2, pages §1.2 |
| 3 | Hero next-race chip ("Spagp") | `next drop` chip → journal | pages §1.2 |
| 4 | Stacked-fragment titles ("ON / TRACK") line reveals | `the / lab`, `five / currents` etc. | §4.2 |
| 5 | Scroll-scrubbed 3D helmet gallery, per-item themes | pinned bottle procession + `--scent-tint` swap + layered parallax depth — **equivalent, not literal: no real-time 3D (ADR-013)** | §4.4, §8 |
| 6 | Per-section nav theme swap (`hero-nav-theme.is-N`) | `data-nav-theme` ScrollTriggers | §4.9 |
| 7 | Marquee impact bands ("World Drivers' Champion") | `fever — limited batch 001`, footer tagline | §4.7 |
| 8 | Rive logo + signature flourishes | Rive `logo`, footer flourish | §7 |
| 9 | Rive button micro-UI (`btn-ui.riv`) | `btn-ui` artboard | §4.8 |
| 10 | Rive page-transition wipe (isolated chunk) | `page-transition` artboard | §5 |
| 11 | Rive rotate-phone prompt (`mob-landscape.riv`) | `mob-landscape` artboard | pages §7 |
| 12 | Scroll-velocity-reactive elements | vapor intensity, marquee timeScale | §4.7, pages §1.2 |
| 13 | Designed footer as destination | impact tagline marquee + cropped wordmark | pages §1.7 |
