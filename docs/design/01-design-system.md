# OSVANT — Design System

> **Doc 1 of 4.** The single source of truth for tokens, typography, layout and components.
> Engineers: implement these as CSS custom properties verbatim. Do not invent values — if a value is missing, flag it, don't improvise.

---

## 1. Token Architecture Rules (inherited from research §3)

1. The identity must read as a **2-color system**: `--color--uv` on `--color--black`, even though the full ramp has ~16 tokens.
2. **No pure white (`#fff`), no pure black (`#000`), no neutral gray** anywhere. Every neutral is violet-tinted.
3. The accent has a **transparent twin** (`--color--uv-zero`) for gradient/fade animation endpoints and an **off state** (`--color--uv-off`).
4. One counter-accent (`--color--amber`) = scarcity/commerce-urgency and error signals ONLY: `limited` chips, cart badge, sold-out states, form error/validation states. Never decorative. (RFC-001 A3/C3)

## 2. Color

### 2.1 Core tokens

```css
:root {
  /* Core brand pair */
  --color--uv:        #be29ff;   /* ultraviolet — CTAs, highlights, live states */
  --color--black:     #111013;   /* near-black, violet-shifted — default page bg */

  /* Accent variants */
  --color--uv-off:    #8f4fb3;   /* desaturated UV — hover-off, visited, disabled-accent */
  --color--uv-zero:   #be29ff00; /* transparent UV — gradient/fade endpoints */
  --color--amber:     #ffb000;   /* counter-accent — heat, scarcity, cart badge */

  /* Light neutrals (violet-tinted, warm-to-cool) */
  --color--white:     #f5f3f7;   /* off-white — primary text on dark */
  --color--cream:     #efeaf2;
  --color--lilac-1:   #e9e4ee;   /* light section backgrounds */
  --color--lilac-2:   #cdc7de;
  --color--lilac-3:   #b3abbc;   /* muted text on dark */

  /* Dark neutrals (violet-tinted) */
  --color--ink-4:     #6b6575;   /* 3.38:1 — boundary of anything OPERABLE */
  --color--ink-3:     #524d59;   /* 2.32:1 — decorative rules only */
  --color--ink-2:     #3b3740;   /* raised surfaces, cards on black */
  --color--ink-1:     #201c24;   /* alt dark section bg */

  /* Label on a UV fill */
  --color--on-uv:     #0b0a0c;   /* 4.66:1 on --color--uv */
}
```

> **Amended 2026-08-26** (design review §6.2, signed off). `--color--ink-4`
> and `--color--on-uv` are new.
>
> `ink-3` measures **2.32:1** on `--color--black`, below the 3:1 that
> WCAG 1.4.11 requires of a control boundary, and it was bounding input
> underlines, size chips and the `next drop` chip. `ink-4` takes every
> boundary that is **operable**; `ink-3` keeps the decorative rules.
>
> `--color--on-uv` exists because black on UV measures **4.47:1** and
> misses AA — the one accessibility failure Lighthouse reported. Darkening
> the label clears it at 4.66:1 and leaves `--color--uv` untouched, so the
> brand accent is unchanged.

### 2.2 Usage matrix

| Context | Background | Text | Accent |
|---|---|---|---|
| Default page | `--color--black` | `--color--white` | `--color--uv` |
| Alt dark section | `--color--ink-1` | `--color--white` | `--color--uv` |
| Light interlude section (max 1–2 per page) | `--color--lilac-1` | `--color--black` | `--color--uv` |
| Card on dark | `--color--ink-2` | `--color--white` | scent tint |
| Muted/meta text | — | `--color--lilac-3` | — |

### 2.3 Scent-scoped theming

Each scent detail page (and its card hover state) swaps ONE variable, nothing else:

```css
[data-scent="volt"]     { --scent-tint: var(--color--uv); --scent-tint-text: #c33afe; }
[data-scent="nocturne"] { --scent-tint: #3a2fbf;          --scent-tint-text: #7d75d3; }
[data-scent="static"]   { --scent-tint: #cdc7de; }
[data-scent="fever"]    { --scent-tint: #ffb000; }
[data-scent="halo"]     { --scent-tint: #ebd9ff; }
```

Components reference `--scent-tint` (falls back to `--color--uv`). This mirrors the reference build's per-item theme classes (research: `hero-nav-theme.is-1/is-2` pattern, §3/S2).

> **Amended 2026-08-26** (design review §6.1, signed off).
>
> **`--scent-tint` is a light source, not a text colour.** Measured against
> `--color--black`: volt 4.47:1, nocturne **2.11:1**, static 11.58:1,
> fever 10.35:1, halo 14.36:1. Nocturne is unreadable at any size; static
> and halo are so near-neutral that tinting a word changes nothing; fever's
> amber collides with its reserved scarcity role (§1 rule 4). Four of five
> fail as text — so the token stops being asked to do that job.
>
> **Permitted surfaces:** bottle liquid and rim glow · hover border ·
> underline or marker beside a name · the section's ambient wash. That is
> still ONE attribute swap and still satisfies `03 §3.1`.
>
> **`--scent-tint-text`** covers the rare genuinely-tinted word, clamped to
> ≥4.5:1. Only volt and nocturne have a usable tinted text identity; static,
> fever and halo resolve to `--color--white`, per §2.4.

### 2.4 Accessibility guardrails

- Body text is always `--color--white` or `--color--black` — never UV, never a tint.
- UV and amber on black: **display sizes (≥24px) only.** For small text, verify AA (4.5:1) with tooling before shipping; if it fails, use `--color--white` and reserve the accent for an underline/marker element.
- `static` and `halo` tints are near-neutral: never use them for text — surfaces and liquid renders only.
- Any boundary the user can operate — input underline, chip, stepper, secondary button — uses `--color--ink-4` (3:1, WCAG 1.4.11). `--color--ink-3` is for decorative rules only.
- Nav links never take the scent tint. Under a `scent`-themed section the links stay `--color--white`; the scent shows in the wordmark and an underline marker.

## 3. Typography

### 3.1 Faces

| Role | Face | Loading |
|---|---|---|
| Workhorse — all UI, headings, body | **Archivo Variable** (`wdth` 100–125, `wght` 400–900) | self-hosted `woff2` subset, `font-display: swap`, preload |
| Display — emotional peaks only | **Instrument Serif** (regular + italic) | self-hosted `woff2`, load on idle |

> **Amended 2026-08-27 (owner sign-off).** The workhorse axis ranges were
> `wdth` 62–125 / `wght` 100–900. Nothing in the built site ever rendered
> outside `wdth` 100–125 / `wght` 400–900, and shipping the unused ranges
> cost 16.6KB — the `wdth` axis is expensive, and dropping its lower half
> saved more than removing ~150 glyphs did. Archivo now ships at 35.8KB
> instead of 88KB, which is what brings `/` and the PDPs back under the
> 2.5s LCP budget (`M §10`): measured 2630ms → 2136ms.
>
> The narrowed ranges are the contract now. A thin weight or the 62%
> condensed width needs `scripts/subset-fonts.mjs` widened and `pnpm fonts`
> re-run first — otherwise the browser synthesises the missing range and
> renders a faked weight rather than the real one, silently.

**Pairing logic (the tension, brief §3):** Archivo Expanded Black = precision/loud. Instrument Serif Italic = provocation/liquid whisper. The italic serif appears ONLY in: scent names inline, pull-quote lines, one word inside impact headlines (e.g. `the *cult*`). Never for UI, never for paragraphs.

### 3.2 Scale tokens

```css
:root {
  --text--impact: clamp(2rem, 10vw, 8rem);    /* viewport-filling name moments */
  --text--h1:     clamp(2rem, 6vw, 4.5rem);
  --text--h2:     clamp(2.5rem, 5vw, 4rem);
  --text--med:    2.75rem;   /* stat numbers, prices on PDP */
  --text--h3:     2rem;
  --text--h4:     1.5rem;
  --text--h5:     1.2rem;
  --text--h6:     1rem;      /* footer sitemap/legal rows (RFC-001 A1) */
  --text--lead:   1.6rem;    /* section intro paragraphs — generous, editorial */
  --text--body:   1.125rem;  /* long-form, product info */
  --text--btn:    1rem;
  --text--eyebrow: .625rem;  /* micro-labels: batch no., nav meta */
}
```

Note: the reference build sizes its `h2` token above `h1` (research §3.2). We normalize (h1 > h2) to avoid engineering confusion — the *extreme jump* to `--text--impact` is what must be preserved.

> **Amended 2026-08-27 (owner sign-off) — the clamp floors.** `--text--impact`
> was `clamp(4.5rem, 12vw, 8rem)` and `--text--h1` was `clamp(3rem, 6vw, 4.5rem)`.
> A 4.5rem *floor* means "never smaller than 72px", and a single long word at
> 72px — `transmissions` on `/journal/`, `provocation,` in the manifesto —
> cannot fit a 320px screen. The word overflowed the document, and a mobile
> browser's response to that is **shrink-to-fit**: it widens the layout
> viewport to contain the overflow and scales the whole page down. `/journal/`
> laid out at 625px on a 390px iPhone, so *every element on the page*,
> body copy included, rendered at ~62% of its designed size.
>
> The floors now sit low enough that the fluid term governs on small screens.
> Measured across `/`, `/collection/`, a PDP, `/the-house/`, `/journal/`, an
> article, `/contact/`, `/legal/` and `/404` at 320 / 390 / iPhone 13 / 834 /
> 1440: **zero horizontal overflow at every width.**
>
> Desktop is untouched — at ≥1280px both the old and new middle terms hit the
> 8rem cap, so `--text--impact` computes to the same 128px it always did. The
> change is visible only between roughly 768px and 1280px, where impact type
> now sets about 17% smaller (1024px: 123px → 102px). The *extreme jump* the
> note above protects is preserved: impact is still 2.8× `--text--h1` at the cap.
>
> `scripts/check-responsive.mjs` fails the build if any route overflows again.

### 3.3 Setting rules

- Headlines: Archivo, `wght` 800–900, `wdth` 115–125 (expanded), `line-height: 1.05–1.2`, **lowercase**.
- `--text--impact` moments: single word or name only, broken into stacked fragments for line-level animation (e.g. `the` / `collection`). Each fragment is its own element — this is an animation contract (see `02-motion-guidelines.md §4.2`).
- Eyebrows: Archivo, `wght` 500, `wdth` 100, `letter-spacing: 0.12em`, color `--color--lilac-3`, paired with every h1/h2. Extreme size contrast (eyebrow ↔ impact) is THE typographic move.
- Body/lead: Archivo `wght` 400, `wdth` 100, `line-height: 1.5`.
- No `text-transform: uppercase` anywhere (brief §4).

## 4. Layout

### 4.1 Grid & container

```css
:root {
  --container-max: 90rem;                        /* 1440px design canvas */
  --gutter: clamp(1.25rem, 4vw, 5rem);           /* page side padding */
  --grid-gap: 1.25rem;
}
```

- 12-column fluid grid inside the container. Full-bleed allowed for: hero, collection gallery, marquee bands, footer.
- Section vertical padding: `10rem` desktop / `6rem` ≤767px. Everything *inside* a section uses the §4.4 scale.

### 4.2 Breakpoints

| Token | Range | Notes |
|---|---|---|
| `desktop` | ≥ 992px | full motion; light study at full layer count |
| `tablet` | 768–991px | light study kept, pins simplified |
| `mobile` | 480–767px | designed experience, not collapsed desktop (research §5) |
| `tiny` | ≤ 479px | single column, impact type at clamp floor |

> **Amended 2026-08-26** (design review §6.3, signed off). Four breakpoints,
> **one spelling each**. Custom properties cannot be read inside a media
> query, so the literal values below are the contract and stylelint
> (`media-feature-name-value-allowed-list`) is what enforces it — the build
> previously carried a single breakpoint written as `48rem`, `47.9375rem`
> AND `767px`, so a 767.5px viewport got different rules from different
> components.
>
> ```css
> @media (width <= 29.9375rem) { /* tiny    ≤ 479px */ }
> @media (width <= 47.9375rem) { /* mobile  ≤ 767px */ }
> @media (width <= 61.9375rem) { /* tablet  ≤ 991px */ }
> @media (width >= 62rem)      { /* desktop ≥ 992px */ }
> ```
>
> `tokens.css` also carries them as `--bp--*` custom properties. Those are
> the single source of the numbers and are usable in `calc()` and container
> queries; they are **not** readable by `@media`.

### 4.3 Radius & elevation

```css
:root {
  --radius--xs: 3px;      /* chips, tags, inputs */
  --radius--media: 1vw;   /* imagery, fluid */
  /* circles: 50%; no other radii exist */
}
```

Predominantly square-cornered (research §3.3). **No drop shadows** — depth comes from surface color steps (`ink-2` on `ink-1` on `black`) and motion parallax, never from `box-shadow`.

### 4.4 Spacing scale

> **Added 2026-08-26** (design review §6.4, signed off).

Six steps. Section padding stays §4.1; this governs everything inside a section.

```css
--space--2xs: 0.5rem;
--space--xs:  1rem;
--space--s:   1.5rem;
--space--m:   2.5rem;
--space--l:   4rem;
--space--xl:  6rem;
```

**The section-opening cluster is a rule, not a preference.** Every section
opens on the same rhythm:

| Gap | Token |
|---|---|
| eyebrow → headline | `--space--eyebrow-headline` (`xs`) |
| headline → lede | `--space--headline-lede` (`s`) |
| lede → content | `--space--lede-content` (`m`) |

Before this, only section padding was specified and every gap inside a
section was invented per component. That is what produced 780px of height
for three words on the PDP note pyramid, 488px of nothing above its `h1`,
and 210px of dead space above the footer — the same inconsistency read as
low quality across the whole site.

## 5. Components

Every component below lists its motion hook — the class/attribute the animation layer binds to. Markup without these hooks is an incomplete implementation.

### 5.1 Buttons

| Variant | Style | Motion hook |
|---|---|---|
| `btn-primary` | UV fill, black text, `--radius--xs`, `--text--btn` Archivo 600 | `data-rive="btn-ui"` — Rive micro-animation on hover/press (research §4.4) |
| `btn-secondary` | 1px `--color--ink-3` border, white text; border → UV on hover | `data-anim="btn-line"` — GSAP border/label swap, 0.3s `power2.out` |
| `btn-text` | label + arrow `->`, no box | arrow shifts 0.4em right on hover, 0.3s |

All buttons: label wrapped in `<span data-btn-label>` (needed for the y-flip label swap animation).

### 5.2 Navigation

- Fixed top bar: logo (Rive artboard `logo`, left), links center-right: `collection`, `the house`, `journal`, `contact`, cart chip (amber count badge).
- Bar background: transparent over hero → `--color--black` at 80% opacity + `backdrop-filter: blur(12px)` after 100vh scroll (class toggle `nav--solid`).
- Mobile: full-screen overlay menu, background `--color--ink-1`, links at `--text--h2`, staggered SplitText entrance.

### 5.3 Scent card (collection grid + home showcase)

- Surface `--color--ink-2`, `--radius--xs`. Contents: eyebrow (`batch 0N`), scent name (Archivo 800 + Instrument Serif italic for the article, e.g. `the *jolt*`), bottle render (AVIF), note list (3 items, `--color--lilac-3`), price, `btn-text` ("discover").
- Hover: card border → `--scent-tint`, bottle render y-drifts −8px, 0.5s `power2.out`.
- Motion hook: `data-anim="card"` for scroll-entrance stagger group.

### 5.4 Note pyramid (PDP)

Three rows — `top / heart / base` — each: eyebrow label + note names at `--text--h4`. Rows reveal sequentially on scroll (see `02 §4.6`). Divider lines `--color--ink-3` 1px.

### 5.5 Newsletter block ("join the current")

- Input: transparent bg, 1px bottom border `--color--ink-3` → UV on focus, `--radius--xs` 0.
- Submit: `btn-primary`. Success state: input collapses, line pulses UV once (0.6s), message `you're in the current.` in Instrument Serif italic.
- Error/validation state (RFC-001 C3/C7): message at `--text--eyebrow` below the field in `--color--amber`, line pulses amber once. Copy: `required` · `check your email` · `didn't send — try again.`
- Wire to Klaviyo-equivalent provider (research §2 — Klaviyo verified in reference).

### 5.6 Footer (a designed destination, research §4.4)

Full-bleed `--color--black`. Rows: (1) marquee tagline `provocation, bottled.` at `--text--impact`; (2) newsletter block; (3) sitemap + socials + legal at `--text--h6`; (4) oversized `osvant` wordmark cropped at the baseline. Rive `signature`-equivalent flourish optional v1.1.

### 5.7 System states

- **Preloader:** black screen, `decanting…` + percentage counter, exits per `02 §5`.
- **Landscape prompt (mobile):** Rive artboard `mob-landscape` equivalent — branded rotate-your-phone card. System states are brand moments (research §4.2 layer 4).
- **404:** impact type `nothing to smell here.` + `btn-primary` back home.
- **Cart drawer:** slides from right over dark scrim, `--color--ink-1` panel, 0.6s `expo.inOut`.

## 6. Iconography & Imagery

- Icons: 1.5px stroke, square terminals, monochrome `--color--white` — Lucide with adjusted stroke works. No filled icons.
- Photography: high-contrast on-black studio product shots; skin/vapor imagery duotoned toward violet. No lifestyle-stock aesthetics.
- All media in AVIF with lazy-loading (research §6). No video ships in v1 — the alpha-turntable path was withdrawn with ADR-013.
- **Bottle renders: transparent AVIF, flat-lit.** The bottle is never shipped pre-lit: every highlight, rim and caustic is a composited layer driven by `--light-angle` (`02-motion-guidelines.md §8`). A dramatically-lit master double-lights and is rejected at handoff (`06 §2`). All five share one camera, one framing, one scale.
- Bottle silhouette per `00-design-brief.md §5` — squat rectangular flacon, square shoulders, cap flush to body width.
