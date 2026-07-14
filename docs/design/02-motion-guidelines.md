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
| 5 | 3D spectacle | **Three.js** | the collection gallery + PDP bottle — contained scenes ONLY |

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

- Pinned full-viewport Three.js scene, 5 bottles in a horizontal procession.
- Scroll scrub (300% duration) drives: procession x-position, active bottle Y-rotation (±35°), scent name crossfade (SplitText swap), `--scent-tint` glow behind active bottle.
- Idle: active bottle slow-rotates (ambient register) via `gsap.ticker`, additive to scrub position.
- Pointer parallax: scene group tilts max 3° toward cursor, lerped `0.08`.
- Snap: `snap: 1/4` so a bottle is always resolved when scrolling stops.
- Each bottle resolves to a `discover ->` btn-text → PDP.

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

1. Black screen, `decanting…` (Archivo, `--text--h5`) + percent counter (`--text--eyebrow`, tabular numerals).
2. Real asset progress — gates **Archivo woff2 + `logo.riv` + `page-transition.riv` + `vapor.riv` only**; GLBs stream with the lazy gallery chunk after first paint, Instrument Serif stays idle-loaded. Never faked below 90%; ~3s hard cap on a median connection (RFC-001 A2).
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

## 8. 3D / WebGL Rules (research §6, §8)

- **Contained scenes only** — canvas mounts inside gallery/PDP sections, never a persistent page-wide canvas.
- Budget: ≤ 1.5MB per bottle GLB (Draco), one 2K HDR environment shared across scenes, `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))`.
- Scene pauses (`renderer.setAnimationLoop(null)`) when off-viewport.
- **Fallback:** no WebGL / `navigator.deviceMemory < 4` → pre-rendered WebM turntable loops in identical layout. The page must work with zero WebGL.

## 9. Accessibility & Reduced Motion (non-negotiable)

`prefers-reduced-motion: reduce` →

- Lenis disabled (native scroll); all `scrub`/`pin` ScrollTriggers not created — content lays out statically in final-state
- SplitText reveals → simple 0.3s opacity fades; marquees static; bottle idle-rotation stopped (drag-to-rotate still works)
- Page transitions → 0.3s opacity crossfade; preloader → counter only, no wipe

Focus states: 2px `--color--uv` outline, `outline-offset: 3px` — never removed. All Rive/WebGL interactive elements need keyboard-reachable DOM equivalents.

## 10. Performance Budget (research §6)

- JS per page ≤ 350KB gzip excluding Three.js chunk (lazy-loaded with gallery via dynamic import)
- Code-split: transitions chunk, WebGL chunk, Rive runtime — all separate; `defer` everything; SRI on CDN assets
- LCP ≤ 2.5s (hero text is LCP — never an image/canvas; on preloader first visits the counter text is the accepted LCP element, RFC-001 A2); CLS < 0.1 (reserve canvas/media space); INP < 200ms (no long tasks from scroll handlers — all rAF-batched via the single gsap.ticker)
- Lighthouse mobile: ≥ 90 standard pages, ≥ 75 WebGL pages (brief §6)

## 11. Reference Parity Map (Lando moment → Osvant equivalent)

Phase-1 target: someone who knows landonorris.com should recognize every one of these beats. Check off during build review.

| # | Reference moment (research §4.4) | Osvant equivalent | Spec |
|---|---|---|---|
| 1 | "Load Norris" pun preloader + counter | `decanting…` + percent | §6 |
| 2 | Viewport-filling name, split-char reveal | `osvant` impact hero | §4.2, pages §1.2 |
| 3 | Hero next-race chip ("Spagp") | `next drop` chip → journal | pages §1.2 |
| 4 | Stacked-fragment titles ("ON / TRACK") line reveals | `the / lab`, `five / currents` etc. | §4.2 |
| 5 | Scroll-scrubbed 3D helmet gallery, per-item themes | bottle procession + `--scent-tint` swap | §4.4 |
| 6 | Per-section nav theme swap (`hero-nav-theme.is-N`) | `data-nav-theme` ScrollTriggers | §4.9 |
| 7 | Marquee impact bands ("World Drivers' Champion") | `fever — limited batch 001`, footer tagline | §4.7 |
| 8 | Rive logo + signature flourishes | Rive `logo`, footer flourish | §7 |
| 9 | Rive button micro-UI (`btn-ui.riv`) | `btn-ui` artboard | §4.8 |
| 10 | Rive page-transition wipe (isolated chunk) | `page-transition` artboard | §5 |
| 11 | Rive rotate-phone prompt (`mob-landscape.riv`) | `mob-landscape` artboard | pages §7 |
| 12 | Scroll-velocity-reactive elements | vapor intensity, marquee timeScale | §4.7, pages §1.2 |
| 13 | Designed footer as destination | impact tagline marquee + cropped wordmark | pages §1.7 |
