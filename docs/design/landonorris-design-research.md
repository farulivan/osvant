# Design Research: landonorris.com — A Replicable Design & Animation Standard

> **Purpose.** A deep teardown of [landonorris.com](https://landonorris.com/) (Awwwards Site of the Day, Nov 17 2025, score 8.18/10; built by OFF+BRAND) so we can reproduce the *same design and animation approach* for a different subject/brand. Every claim below is traced to a primary source: the live site's HTML/CSS/JS bundles, the agency's first-party case study, or the Awwwards jury page.

**Sources**

- **[S1]** Live site HTML — `https://landonorris.com/` (fetched 2026-07-11)
- **[S2]** Live site compiled CSS — `cdn.prod.website-files.com/67b5a02dc5d338960b17a7e9/css/lando-offbrand.shared.043b62fef.css`
- **[S3]** Live site main JS bundle — `assets.itsoffbrand.io/lando/dev-js/lando-by-OFF+BRAND.js` (~1.45 MB)
- **[S4]** Live site transition JS — `assets.itsoffbrand.io/lando/dev-js/transitions-rive-isolate.js`
- **[S5]** OFF+BRAND first-party case study — `itsoffbrand.com/our-work/lando-norris`
- **[S6]** Awwwards SOTD page — `awwwards.com/sites/lando-norris`

---

## 1. Design Philosophy (What Makes It Work)

From the agency's own words [S5]:

- **"Personality in motion"** — the site *moves* to reflect the subject's character. Speed-inspired animations echo racing intensity; sharp transitions, responsive interactions and cinematic scrolling create momentum.
- **Tension between two identities** — McLaren's racing heritage (dark, technical, fast) vs. Lando's youthful playful energy (lime, blobs, GIF helmets). The design system deliberately balances a serious base with playful accents.
- **"Built for speed, designed for fans"** — performance is a design feature, not an afterthought. Lazy-loading, optimized asset delivery, streamlined code so "every interaction feels immediate."
- **Conversion is the brief** — the founding question was "How do we create a high-impact, branded website experience for an athlete that converts?" The spectacle funnels into store visits, newsletter signup (Klaviyo [S1]) and partnership enquiries.

**Transferable principle:** pick *one* personality tension for your subject (e.g. precision vs. play), express the serious side through structure/typography and the playful side through motion/accent color, and make every animated moment resolve into a call to action.

---

## 2. Technology Stack (Verified in Shipped Code)

| Layer | Technology | Evidence |
|---|---|---|
| Platform / CMS | **Webflow** (Enterprise) | Webflow CDN asset URLs, `webflow-icons` font [S1][S2]; Awwwards tags [S6]; agency is a Webflow Enterprise partner [S5] |
| Custom code delivery | External JS bundles layered on top of Webflow | Three `itsoffbrand.io` script tags in `<head>` [S1] |
| Animation engine | **GSAP** + `ScrollTrigger`, `SplitText`, `CustomEase`, `CustomBounce`, `CustomWiggle`, `CSSRulePlugin` | `registerPlugin(...)` calls in bundle [S3]; Awwwards tag [S6] |
| Smooth scroll | **Lenis** | 12 `lenis` references in bundle [S3] |
| Page transitions | **@unseenco/taxi** (SPA-style transitions over Webflow pages) + `history.pushState` | `taxi` references in bundle [S3] |
| Vector motion graphics | **Rive** (`.riv` files, state machines) | 206 `rive` references [S1][S3]; artboards: `logo`, `signature`, `page-transition`, `circuits`, `phrases`, `btn-ui`, `mob-landscape` [S3][S4] |
| 3D | **Three.js / WebGL** (helmet showcase, hero) | `THREE.` and `WebGLRenderer` references [S3]; Awwwards WebGL/3D tags [S6] |
| Email capture | Klaviyo | `static.klaviyo.com` script [S1] |
| Consent | iubenda | `cdn.iubenda.com` scripts [S1] |

**Key architectural insight:** this is a *hybrid* — Webflow provides structure, CMS and responsive layout; a hand-written JS layer (~1.5 MB, non-Webflow) owns all motion: Lenis scroll → GSAP timelines → Rive state machines → Three.js scenes, orchestrated across taxi.js page transitions [S1][S3][S4].

---

## 3. Design Tokens

### 3.1 Color System (exact variables from shipped CSS [S2])

```css
/* Core brand pair (also Awwwards' listed 2-color palette [S6]) */
--color--lime:   #d2ff00;   /* signature accent — CTAs, highlights, energy */
--color--black:  #111112;   /* near-black base — not pure #000 */

/* Supporting accents */
--color--orange: #ff6b00;   /* secondary hot accent (papaya/McLaren nod) */
--color--lime-off:  #b2c73a; /* desaturated lime for hover/off states */
--color--lime-zero: #d2ff0000; /* transparent lime for fade endpoints */

/* Warm neutral ramp (green-tinted, NOT gray) */
--color--white:       #f4f4ed;  /* off-white, never pure white */
--color--cream:       #efefe5;
--color--green-light: #ebeee0;  /* aka --color--grey-1 */
--color--green-off-white-1: #dde1d2;
--color--grey-2:            #c8cbbd;
--color--grey-on-track:     #b9bbad;
--color--green-off-white-2: #b4b8a5;

/* Dark ramp (green-tinted darks) */
--color--dark-green:        #282c20;
--color--dark-green-tint-1: #3b3c38;
--color--dark-green-tint-2: #535450;
```

**Rules to replicate:**

1. **One electric accent + one near-black.** The whole identity reads as a 2-color system (#d2ff00 on #111112) even though ~16 tokens exist [S6][S2].
2. **No pure white, no pure black, no neutral gray.** Every neutral is tinted toward the brand hue (here: green). Build your neutral ramp by mixing a whisper of the accent hue into off-whites and darks.
3. **A "zero" (transparent) variant of the accent** exists as a token for gradient/fade animations (`--color--lime-zero`) [S2] — plan for animated color endpoints in the token set.
4. **One counter-accent** (#ff6b00) used sparingly for heat/urgency.

### 3.2 Typography (from shipped CSS + font files [S1][S2])

| Role | Typeface | Evidence |
|---|---|---|
| Display / expressive headlines | **Brier** (a rough, hand-drawn/brush display face) | `font-family: Brier, Arial, sans-serif` — 6 occurrences [S1][S2] |
| Everything else (body, UI, headings) | **Mona Sans Variable** (GitHub's open-source variable font, `wdth`+`wght` axes) | `MonaSans-VariableFont_wdth,wght.woff2` loaded [S1]; `font-family: Mona Sans Variable, Arial, sans-serif` [S2] |

Type scale is tokenized as CSS variables [S2]:

```css
--text--impact: 7.9375rem;  /* ~127px — hero "impact" size */
--text--h2:     4.5rem;
--text--h1:     4rem;       /* note: h2 token is LARGER than h1 */
--text--med:    2.76rem;
--text--h3:     2rem;
--text--reg:    1.6rem;     /* body */
--text--h4:     1.5rem;
--text--h5:     1.2rem;
--text--h6:     1rem;
--text--btn-nav:     1.25rem;  /* bumps to 1.7rem at some breakpoints */
--text--btn-primary: 1rem;
--text--eyebrow:     .578125rem; /* tiny all-caps labels */
```

Headline line-height is tight: `line-height: 1.2` on `.h1` [S2].

**Rules to replicate:**

1. **One variable workhorse + one expressive display face.** The variable font (width + weight axes) does all structural work; the display face appears only at emotional peaks (signatures, stamps, oversized words). Free equivalents to Brier's energy: a brush/marker display font matching your subject's personality.
2. **An "impact" size far above h1** (~2× h1) reserved for single-word/name moments — "Lando Norris" fills the viewport [S1].
3. **Eyebrow micro-labels** (~0.58rem token) pair with giant headlines — extreme size contrast is the core typographic move.
4. **Headlines are broken into stacked fragments** — "ON / TRACK", "OFF / TRACK", "partners / &campaigns", "what's up / On Socials" are separate heading elements [S1], designed to animate line-by-line and be split typographically.

### 3.3 Shape & Surface

- Minimal border-radius vocabulary: mostly square; small `.2rem`/`3px` radii for UI chips, `50%` for circular elements, occasional fluid `1vw` radius [S2].
- Density comes from imagery/3D, not from card decoration.

---

## 4. Animation System — The Replicable Grammar

### 4.1 Motion vocabulary (measured from shipped GSAP code [S3])

**Easing distribution** (frequency in bundle):

| Ease | Count | Use it for |
|---|---|---|
| `power2.out` | 36 | default entrance/settle — THE house ease |
| `none` (linear) | 21 | scroll-scrubbed tweens (progress maps 1:1 to scroll) |
| `power2.inOut` | 17 | element moves within the page |
| `expo.inOut` | 12 | dramatic full-screen moves, page transitions |
| `power1.inOut` | 11 | subtle drifts |
| `power3.out` | 10 | snappier entrances |
| `expo.out` / `expo.in` | 5+5 | fast-out reveals / exits |
| `elastic.out(1, 0.75)` | 5 | playful overshoot on UI toys |
| `back.inOut`, `power4.*`, custom `cubic-bezier(1, 0, 0.37, 1)` | rare | special moments |

**Duration distribution:**

| Duration | Count | Role |
|---|---|---|
| 0.5s | 24 | default UI transition |
| 2s | 18 | slow cinematic/ambient moves |
| 0.6s | 14 | slightly weightier UI |
| 0.3s | 12 | micro-interactions |
| 1–1.5s | 14 | section-level reveals |
| 0.2–0.4s | ~13 | hover/instant feedback |

**Stagger distribution** — all *very tight*:

| Stagger | Count |
|---|---|
| 0.02s | 7 |
| 0.015s | 5 |
| 0.03s | 3 |
| 0.04–0.08s | ~5 |
| `{amount: 0.5}` | 1 |

**House motion rules distilled:**

1. **Two speed registers:** UI feedback lives at 0.2–0.6s; cinematic moments at 1.5–2.5s. Nothing in between dominates — the contrast itself reads as "speed".
2. **Default recipe:** `power2.out`, 0.5s. Escalate to `expo.inOut` + 1.5–2s for full-screen drama.
3. **Character-level staggers are tiny (0.015–0.03s)** — text splits ripple like a slipstream, not a typewriter.
4. **Scroll-scrubbed = linear.** Anything tied to scroll uses `ease: "none"` with `scrub: true` (27 of 31 scrub instances are `scrub:!0`, i.e. `true` — direct, un-smoothed scrub; smoothing comes from Lenis instead) [S3].
5. **Elastic/bounce reserved for personality beats** (`elastic.out(1, 0.75)`, `CustomBounce`, `CustomWiggle` registered [S3]) — the "playful" half of the brand tension, used sparingly.

### 4.2 The five-layer motion architecture

Replicate these layers in this order of priority:

1. **Lenis smooth scroll (foundation).** All scroll-driven work sits on Lenis-normalized scrolling [S3]. This is why raw `scrub: true` feels smooth.
2. **GSAP ScrollTrigger scenes (storytelling).** 22 ScrollTrigger references [S1-bundle count]; sections pin and scrub as you pass — the "cinematic scrolling" the agency describes [S5]. Scroll-driven sequences include the helmet gallery and section header reveals.
3. **SplitText typographic reveals (texture).** SplitText registered [S3]; headings arrive as character/line cascades with 0.015–0.03s staggers.
4. **Rive state machines (brand motion).** Named artboards in shipped code: `logo`, `signature`, `page-transition`, `circuits`, `phrases`, `btn-ui`, `mob-landscape` [S3][S4]. Rive owns: the animated logo, a hand-drawn signature, page-transition wipe graphics, decorative circuit motifs, animated phrases, and button micro-UI. There is even a dedicated Rive artboard for the *rotate-your-phone* landscape prompt (`mob-landscape`) — motion design extends to system states.
5. **Three.js/WebGL 3D (hero spectacle).** 3D helmet showcase ("Helmets Hall of Fame", 16 helmet entries in the DOM [S1]) with rotation/interaction [S3][S6]. The 3D is *contained* to signature moments, not ambient everywhere — this is how performance stays acceptable.

### 4.3 Page transitions

- SPA-style navigation via **taxi.js** intercepting links and swapping page content [S3].
- The visual wipe is a **Rive `page-transition` artboard driven by a `page-transition` state machine**, isolated into its own script (`transitions-rive-isolate.js`) so it loads independently [S4].
- **Rule:** page transitions are a *branded graphic moment* (an animated illustration wipe), not a CSS fade. Build one dedicated transition artboard/animation, then reuse it everywhere.

### 4.4 Signature interaction patterns (observed on the live site [S1][S6])

- **Preloader with wordplay** — "Load Norris" loading text [S1]: the loader itself carries brand voice. Give your loader a pun/personality line.
- **Viewport-filling name reveal** — h1 at `--text--impact` scale with split-character entrance.
- **Stacked-fragment section titles** ("ON / TRACK") that animate per-line on scroll entry.
- **Horizontally-scrubbed 3D gallery** — the helmet Hall of Fame ties scroll progress to model rotation/procession.
- **Marquee/impact text bands** for "World Drivers' Champion" style announcements.
- **Buttons with Rive micro-animations** (`btn-ui.riv`) instead of CSS-only hovers.
- **Social/footer as a designed destination** — the footer is a full brand moment (indexed by footer.design as exemplary [S6-adjacent]).

---

## 5. UX & Content Architecture

Page structure of the home page [S1] — a pattern directly reusable for any personality/product site:

1. **Hero** — name at impact scale, role subtitle, next-event CTA ("Spagp" → calendar).
2. **Two-door split** — "ON TRACK" / "OFF TRACK": the professional world vs. the personal world. *Generalize: Work / Life, Product / Culture.*
3. **Collection showcase** — Helmets Hall of Fame (16 items, 3D). *Generalize: portfolio, product line, archive.*
4. **Hero moment / campaign** — "World Drivers' Champion" merch push with store CTA.
5. **Partners & campaigns** — commercial proof.
6. **Social aggregation** — "what's up On Socials" with live platform links.
7. **Footer** — newsletter signup, tagline ("Always bringing the fight."), sitemap, legal.

Navigation is flat and shallow: 5 items + external store [S1]. Depth comes from motion, not information architecture.

**Mobile:** dedicated Rive artboard for landscape orientation (`mob-landscape`) [S3] and a "responsive mobile treatment" the agency calls out explicitly [S5] — mobile is a designed experience, not a collapsed desktop.

---

## 6. Performance Standard

Explicit engineering practices [S5][S1][S3]:

- **Lazy-loading and optimized asset delivery** are named pillars of the build [S5].
- **Code-splitting:** Webflow chunked JS (`.schunk.` files) + isolated transition script loaded separately [S1][S4].
- **`defer`/`async` on all custom scripts** [S1].
- **Subresource integrity** on the CSS link (`integrity="sha384-…"`) [S1].
- **WebGL contained to specific scenes** rather than a persistent full-page canvas — heavy 3D only where it earns its cost [S3].
- Awwwards Dev score: 7.58/10 [S6] — spectacle with acceptable (not perfect) performance; the trade-off is conscious.

---

## 7. Replication Playbook (Checklist for Our Own Project)

### Phase 1 — Foundation
- [ ] Define the personality tension (serious axis + playful axis) and one-line brand voice.
- [ ] Tokens: 1 electric accent (+ transparent variant + off variant), 1 near-black, brand-tinted neutral ramp (no pure white/black/gray), 1 counter-accent.
- [ ] Type: 1 variable sans (wdth+wght) for everything + 1 expressive display face for peaks. Token scale including an `impact` size ≈ 2× h1 and a sub-0.6rem `eyebrow`.
- [ ] Webflow (or equivalent) for structure/CMS; custom JS layer for all motion.

### Phase 2 — Motion system
- [ ] Install Lenis; route all scroll work through it.
- [ ] GSAP + ScrollTrigger + SplitText; register CustomEase/CustomBounce/CustomWiggle.
- [ ] Codify the house grammar: default `power2.out`/0.5s; cinematic `expo.inOut`/1.5–2s; micro 0.2–0.3s; char staggers 0.015–0.03s; scrubbed tweens `ease:"none"` + `scrub:true`.
- [ ] Build Rive artboards: logo, page-transition (own state machine, isolated script), button micro-UI, 1–2 decorative motifs, mobile-landscape prompt.
- [ ] taxi.js (or equivalent) page transitions triggering the Rive wipe.

### Phase 3 — Signature moments (budget: 2–3 max)
- [ ] One WebGL/3D showcase tied to scroll (the "helmet gallery" equivalent).
- [ ] One viewport-filling split-text name/title reveal.
- [ ] One branded preloader with a voice line.

### Phase 4 — Conversion & polish
- [ ] Every animated section resolves to a CTA (store/contact/subscribe).
- [ ] Newsletter capture + consent tooling.
- [ ] Lazy-load all media; code-split transition logic; defer scripts; SRI on static assets.
- [ ] Design the footer and error/orientation states as brand moments.

---

## 8. Anti-patterns to Avoid (What This Site Does *Not* Do)

- No ambient full-page WebGL background — 3D is scoped to scenes [S3].
- No slow, syrupy staggers — everything ripples fast (≤0.08s) [S3].
- No pure grayscale neutrals — every neutral carries brand hue [S2].
- No generic CSS-fade page transitions — transitions are illustrated brand moments [S4].
- No deep nav hierarchy — 5 flat items; motion provides the depth [S1].
