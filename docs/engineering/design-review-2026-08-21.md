# OSVANT — Design & Product Review

> **Point-in-time review.** Not a LAW doc. Reviewed against `docs/design/00–03` as LAW; where this document and a design doc disagree, the design doc wins until the change in §6 is signed off.
>
> | | |
> |---|---|
> | **Reviewed** | 2026-08-21 |
> | **Build** | `main` @ `969e033` |
> | **Environment** | `pnpm dev` — localhost:4321, viewport 1470 × 725, DPR 2 |
> | **Findings** | 31 (8 blocker · 12 major · 11 polish) |
> | **Method** | Measured from the served DOM and computed styles, not from source. Contrast ratios computed per WCAG 2.1 relative luminance against `--color--black #111013`. Lighthouse figures from `.lighthouseci`, most recent run. |
>
> Visual version of this document: <https://claude.ai/code/artifact/53be006d-51ca-4c49-957b-6d519cf51fca>
>
> **Revised 2026-08-21 — no-3D re-scope (ADR-013).** Real-time 3D is out of budget. The bottle is now presented as a composited **light study** (`M §8`) rather than a GLB. OSV-02 and the whole of §8 are rewritten below; findings, IDs and severities are otherwise unchanged.

---

## Contents

1. [Verdict](#1-verdict)
2. [State of the build](#2-state-of-the-build)
3. [Root causes](#3-root-causes)
4. [Findings — triage table](#4-findings--triage-table)
5. [Findings — detail](#5-findings--detail)
6. [Design-system corrections (needs sign-off)](#6-design-system-corrections-needs-sign-off)
7. [Page-level direction](#7-page-level-direction)
8. [Asset production brief](#8-asset-production-brief)
9. [Implementation sequence](#9-implementation-sequence)

---

## 1. Verdict

**This is not a design problem pretending to be an engineering problem. It is an engineering-complete product with no photography, no bottle renders, no Rive files, and draft copy still in the DOM.**

The motion architecture is genuinely good and should not be disturbed: the pinned manifesto scrub, the `data-nav-theme` re-theming, the marquee/scroll-velocity coupling, the reduced-motion branches written per-feature, and the focus management in the cart drawer. Lighthouse is 99 / 95 / 100 / 100 with LCP 2.0s, CLS 0.001, TBT 10ms — every budget in `M §10` is met.

What is missing is the entire art-direction layer, plus a short list of real defects that make finished work read as broken.

| Metric | Value |
|---|---|
| Images across all 9 routes | **0** |
| Bottle stills (of 5 required, ADR-013) | **0** |
| Rive artboards (of 5 required) | **0** |
| `[draft]` markers in served HTML | **12** (one inside a `<title>`) |
| Width breakpoints implemented (of 4 specified) | **1**, written 3 different ways |
| Scent tints that work as headline colour | **1 of 5** |
| Parity beats present (`M §11`) | **9 of 13** |
| Lighthouse performance | 99 |

Fix the eight blockers in §5 and commission the asset list in §8, and this moves from "impressive scaffold" to "portfolio piece" without touching the architecture.

---

## 2. State of the build

### 2.1 Route audit

Measured from the served DOM. "Sections" counts `<section>` elements; a section without `data-nav-theme` fails `03 §9` outright.

| Route | H1 | Sections | Media | Words | Spec gaps |
|---|---|---|---|---|---|
| `/` | `osvant` | 5 — **`doors` has no theme** | **0** | — | Gallery has no `h2`; no `five`/`currents` fragments; overlay missing notes + price; campaign band has no heading |
| `/collection` | `fivecurrents` | 1 | **0** | — | Asymmetric grid rule never matches (OSV-04); cards 437×737 with an empty blur where the bottle goes |
| `/collection/[scent]` | `thevolt` | 3 | **0** | — | **`03 §3.3` formula story missing entirely**; pyramid has no heading; cross-sell is a static grid, not drag-scroll |
| `/the-house` | `the labbehind osvant` | 4 | **0** | 30 | 4× `[draft]`; craft grid is 3 unlabelled gradients; CTA band is a naked button |
| `/journal` | `transmissions` | 1 | **0** | 6 | No `h2` at all; 1 article in a 3-col grid; no index lede |
| `/journal/001-next-drop` | `batch 002 — fall [draft]` | **0** | **0** | 62 | 7× `[draft]` incl. the `<title>`; no sections ⇒ no nav theming; no lead image; no pull-quote; no cross-sell band |
| `/contact` | **none** | 1 | **0** | 18 | No heading on the page; placeholders used as labels |
| `/legal/privacy` · `/legal/terms` | `privacy` / `terms` | 1 (stub) | 0 | 12 | Empty stubs, linked from every page footer |

### 2.2 Parity map — 9 of 13 beats present

Beats **8, 9, 10, 11** (Rive logo, Rive button micro-UI, Rive page-transition wipe, rotate-phone prompt) cannot be present: `@rive-app/canvas` is not a dependency and `public/assets/rive/` contains only a `.gitkeep`. The page transition is the CSS clip-path placeholder from task 1.5.

Beat **5** (the pinned procession) is present in mechanism but not in craft — see OSV-02. Since ADR-013 it is scoped as *equivalent*, not literal: no 3D, but it must still read as pinned, scrubbed, per-item themed and spatial.

### 2.3 What is working and must not regress

- Module lifecycle / `destroy()` discipline — no leaks observed across navigations.
- Reduced-motion branches — present in every page module. (The raw WebGL scene files that lacked them are deleted under ADR-013.)
- Cart drawer a11y — `role="dialog"`, `aria-modal="true"`, focus moves to close on open. Only the visual state machine is broken (OSV-01).
- Focus rings — 2px UV, offset 3px, visible everywhere tested.
- `withBase()` on every internal href — base-path handling is clean.

---

## 3. Root causes

Three causes explain most of the 31 findings. Fixing symptoms without these will not hold.

### A. Art direction never started, so every composition is 60% empty

Every media slot is a CSS gradient. That was the right placeholder strategy (ADR-008), but it has a second-order effect: **the layouts were composed around boxes that have no content, so they read as dead space rather than as images-not-yet-loaded.** The hero has ~900px of empty black to the right of the wordmark. The PDP hero puts the `h1` at y=488 of a 725px viewport. The doors are 140vh of gradient carrying four words.

Photography resolves some of this. Not all of it — the compositions themselves need rework, because they were never designed as a relationship between type and image.

### B. Placeholder content is being treated as shippable

`[draft]` appears 12 times in served HTML, including `<title>batch 002 — fall [draft] — osvant</title>`. The journal has one article. `/the-house` has 30 words. Legal pages are stubs. This is the difference between "unfinished" and "abandoned", and it is the cheapest thing on the list to fix.

### C. Three spec-mandated behaviours are written correctly but silently not applying

The PLP asymmetric grid (Astro scope mismatch), the cart drawer state machine (CSS specificity beats `[hidden]`), and the scroll-entrance triggers (firing after the element is already on screen). These are not design problems — they are *why* the design reads as wrong. All three are in §5.

---

## 4. Findings — triage table

| ID | Sev | Area | Summary | Est. |
|---|---|---|---|---|
| [OSV-01](#osv-01) | 🔴 Blocker | Cart | Drawer renders all three states stacked | 5 min |
| [OSV-02](#osv-02) | 🔴 Blocker | Gallery | Signature moment renders five shampoo bottles | Asset-blocked |
| [OSV-03](#osv-03) | 🔴 Blocker | Type | Scent names render with no space — `thevolt` | 5 min |
| [OSV-04](#osv-04) | 🔴 Blocker | PLP | Asymmetric editorial grid is dead code | 15 min |
| [OSV-05](#osv-05) | 🔴 Blocker | PDP | No product, price or add-to-cart above the fold | 3–4 h |
| [OSV-06](#osv-06) | 🔴 Blocker | Motion | Entrance triggers fire late — content invisible on screen | 1 h |
| [OSV-07](#osv-07) | 🔴 Blocker | Nav | Fixed nav collides with content on 6 of 9 routes | 1–2 h |
| [OSV-08](#osv-08) | 🔴 Blocker | Copy | `[draft]` shipped to users, incl. inside a `<title>` | Copy-blocked |
| [OSV-09](#osv-09) | 🟠 Major | Gallery | No heading, no notes, no price in the signature section | 2 h |
| [OSV-10](#osv-10) | 🟠 Major | Gallery | Overlay name collides with bottles, unreadable | 1 h |
| [OSV-11](#osv-11) | 🟠 Major | PDP | `03 §3.3` formula story does not exist | 1 d |
| [OSV-12](#osv-12) | 🟠 Major | PDP | Note pyramid is three lonely words in 780px | 4 h + data |
| [OSV-13](#osv-13) | 🟠 Major | Responsive | One breakpoint exists; spec defines four | 2 d |
| [OSV-14](#osv-14) | 🟠 Major | System | 4 of 5 scent tints fail as headline colour | 3 h + sign-off |
| [OSV-15](#osv-15) | 🟠 Major | A11y | Primary CTA fails AA — Lighthouse already flags it | 2 h + sign-off |
| [OSV-16](#osv-16) | 🟠 Major | Type | Double arrow — `explore the collection -> ->` | 2 min |
| [OSV-17](#osv-17) | 🟠 Major | Type | Manifesto headlines break mid-word — `nothing el / se.` | 1 h |
| [OSV-18](#osv-18) | 🟠 Major | Contact | No heading on the page; placeholders used as labels | 1 h |
| [OSV-19](#osv-19) | 🟠 Major | Nav | `doors` and journal article carry no `data-nav-theme` | 30 min |
| [OSV-20](#osv-20) | 🟠 Major | Commerce | Home page shows no price or product info anywhere | 2 h |
| [OSV-21](#osv-21) | 🟡 Polish | System | Footer tagline + wordmark read as neutral grey | 15 min |
| [OSV-22](#osv-22) | 🟡 Polish | Footer | 60% empty, no legal row, newsletter under-weighted | 3 h |
| [OSV-23](#osv-23) | 🟡 Polish | House | CTA band is a naked button | 30 min |
| [OSV-24](#osv-24) | 🟡 Polish | Home | The two doors carry no supporting copy | 1 h |
| [OSV-25](#osv-25) | 🟡 Polish | PDP | Cross-sell cards carry name and price only | 2 h |
| [OSV-26](#osv-26) | 🟡 Polish | PDP | `50ml` chip and `limited` badge look identical | 1 h |
| [OSV-27](#osv-27) | 🟡 Polish | Journal | One article, no lede, no headings | Content-blocked |
| [OSV-28](#osv-28) | 🟡 Polish | Cart | Line item missing qty stepper and thumbnail | 1 h |
| [OSV-29](#osv-29) | 🟡 Polish | Legal | 12-word stubs linked from every page | Copy-blocked |
| [OSV-30](#osv-30) | 🟡 Polish | Contact | `send` is the only full-width button on the site | 10 min |
| [OSV-31](#osv-31) | 🟡 Polish | Perf | Lighthouse's green is not predictive | Process |

---

## 5. Findings — detail

### 🔴 Blockers

<a id="osv-01"></a>
#### OSV-01 — The cart drawer renders all three states stacked on top of each other

**Files:** `src/components/CartDrawer.astro:120,224` · `src/scripts/modules/cart-drawer.ts:84,172,280`
**Spec:** `03 §7`

Open the cart with items in it and you see, in one panel, top to bottom: *nothing decanted yet.* + "the collection →", then the line items and subtotal and checkout, then *decanted.* + "demo store — no real orders" + "back to the current". The empty state, the filled state and the post-checkout confirmation all display simultaneously.

**Cause.** `cart-drawer.ts` correctly sets `.hidden = true` on all three blocks. But `.cart-drawer__empty` and `.cart-drawer__confirmation` declare `display: flex` in a class selector, which outranks the UA stylesheet's `[hidden] { display: none }`. The attribute is set and has no visual effect.

**Fix.** Add the standard global guard to `src/styles/base.css`. This closes the whole class of bug, not just these two blocks:

```css
[hidden] {
  display: none !important;
}
```

---

<a id="osv-02"></a>
#### OSV-02 — The signature moment renders five shampoo bottles

**Files:** `src/scripts/webgl/bottle.ts` · `src/scripts/webgl/gallery-scene.ts` *(both deleted under ADR-013)*
**Spec:** `03 §1.4` · brief `§6.2`

The home gallery is defined in the brief as the memorable moment — "the thing people screen-record". What renders is five identical rounded-shoulder cylinders with a flat cap and a single specular dot: the silhouette of a supermarket body wash. No glass, no refraction, no liquid volume, no label, no cap detail, no ground plane, no atmosphere.

This is a placeholder doing its job (`public/assets/models/` is empty), but it is currently the **single most damaging thing on the site** — it actively contradicts the positioning in a way no amount of typography recovers.

**Fix (revised per ADR-013).** Three.js is removed. Rebuild both bottle moments on the light study (`M §8`):

1. Commission the bottle still — [AST-03a](#ast-03a). The silhouette is now settled in `00-design-brief.md §5` (squat rectangular flacon).
2. Delete `src/scripts/webgl/` and the `three` dependency. The gallery keeps its pin, scrub, snap, theming and CTA — only the drawing layer changes (`M §4.4`).
3. Until the stills land, the placeholder is a **duotone silhouette block behind the same `--light-angle` contract** — not a mesh. A flat placeholder reads as "art direction in progress"; a bad 3D model reads as "this is the product".

---

<a id="osv-03"></a>
#### OSV-03 — Scent names render with no space: `thevolt`, `thefever`, `thelab`

**Files:** `src/components/ScentCard.astro:30` · `src/pages/collection/[scent].astro:61`

Every scent name on the site is missing the space between the serif-italic article and the Archivo name. It affects the PDP `h1`, all five PLP `h2`s, both home door titles and the social band heading — i.e. every impact-scale headline on the site except the hero.

**Cause.** Astro strips the whitespace between a closing tag and a following expression.

```astro
<!-- renders "thevolt" -->
<em>{article}</em>
{rest.join(" ")}
```

**Fix.**

```astro
<em>{article}</em>{" "}
{rest.join(" ")}
```

Apply in both files. While you are there: these components should expose a `title`-safe plain-text name so `<title>` and OG tags do not inherit the split.

---

<a id="osv-04"></a>
#### OSV-04 — The PLP's asymmetric editorial grid is dead code

**File:** `src/pages/collection/index.astro:94–101`
**Spec:** `03 §2` — "asymmetric editorial layout (2/3 split rows, not uniform grid)"

The rule was written correctly. It matches nothing. All five cards render `grid-column: auto` at 437×737, in a plain 3+2 grid with a hole in the bottom-right corner.

**Cause.** Astro's style scoping. The rule compiles to require the *page's* scope attribute on the child, but the children are `<ScentCard>` roots carrying the *component's* scope:

```css
/* compiled — the child selector can never match */
.plp__grid[data-astro-cid-7tvvtef4] > [data-astro-cid-7tvvtef4]:first-child

/* children actually carry: */
/* <article data-astro-cid-rdfboonz> */
```

**Fix.** Wrap the child selectors in `:global()`, or better, have `ScentCard` accept a `span` prop and set its own `grid-column` — that keeps the layout intent inside the component and survives reuse on the home page.

```css
.plp__grid > :global(:nth-child(1)),
.plp__grid > :global(:nth-child(4)) { grid-column: span 2; }
.plp__grid > :global(:nth-child(5)) { grid-column: 1 / -1; }
```

**Follow-up:** audit the codebase for the same pattern — any `>` selector targeting a child component root has this problem. Worth an ESLint/stylelint rule if one can be expressed.

---

<a id="osv-05"></a>
#### OSV-05 — PDP fails its own acceptance box: no product, no price, no add-to-cart above the fold

**File:** `src/pages/collection/[scent].astro:204–213`
**Spec:** `03 §3.1` — "add-to-cart reachable without scrolling on all breakpoints" · brief `§6.5`

At 1470×725 the first screen of `/collection/volt/` shows: the nav, **488px of empty black**, the name, and the character line. The bottle canvas is 888px tall and mostly below the fold, so on `volt` the product is not visible at all; on `fever` you get the bottom third of a cylinder clipped by the nav.

**Measurements.**

| | |
|---|---|
| `.pdp-hero` computed height | 1080px = **149vh** |
| `h1` top | y = 488 |
| Canvas rect | y 128 → 1016 (291px below fold) |
| Declared | `min-height: 100vh`, `padding: 8rem … 4rem`, `align-items: center` |

The two-column grid is `align-items: center` against a container taller than the viewport, which centres the content out of view.

**Fix.** Rebuild the PDP hero as a two-column layout that fits one viewport at 725px and above:

- **Left column:** eyebrow / name / character / notes summary / price / size / **add-to-cart**.
- **Right column:** bottle canvas at `height: min(72vh, 640px)`.
- Move `.pdp-buy` out of the full-bleed band into the left column at desktop. Keep the fixed bottom bar for ≤767px only — which is what the spec asked for; it is currently `position: static` and rendering as a mid-page band at all widths.

---

<a id="osv-06"></a>
#### OSV-06 — Scroll-entrance triggers fire late; content sits invisible while fully on screen

**Files:** `src/scripts/modules/card-entrance.ts` · `src/scripts/modules/note-pyramid.ts`
**Spec:** `M §3`

On the PLP, the first card is fully in the viewport at ~20% opacity and only resolves after further scrolling. Same on the journal index card, and on the PDP note pyramid — the row eyebrows render but the note words stay invisible while their row occupies the middle of the screen.

An element that is on screen and unreadable is not a reveal; it reads as a rendering failure. It is also an SEO/UX risk on the PLP, where the first card is the page's primary content.

**Fix — two rules for every entrance group.**

1. Anything above the fold on load plays its entrance immediately, not on a scroll trigger.
2. For below-fold groups set `start: "top 85%"` so the tween completes before the element reaches the middle of the viewport.
3. Add `once: true` so scrolling up never re-hides content.

---

<a id="osv-07"></a>
#### OSV-07 — Fixed nav collides with content on six of nine routes

**Files:** `src/components/Nav.astro:72` (`z-index: 100`) · `src/components/CartDrawer.astro:70` (`z-index: 30`)
**Spec:** `01 §5.2`

The nav is transparent until 100vh, then 80% black + blur. But the marquee bands, the social band heading, the cross-sell heading and the footer tagline all pass *through* it. Observed: "collection / the house / journal" reading through the letters of *provocation, bottled.*, and the `osvant` logo sitting on top of the word "the lab".

The cart drawer also opens **under** the nav — `z-index: 30` vs the nav's `100` — so the drawer's "cart" header and "close" button overlap the nav links and the cart badge.

**Fix.**

- Cart drawer → `z-index: 1500`. Above the nav (100), below the transition scrim (2000, `BaseLayout.astro:154`).
- Add `scroll-margin-top` / top padding equal to nav height on every section whose first element is a headline or a marquee.
- Make `nav--solid` switch on section-boundary crossing, not only past 100vh — the current rule leaves the nav transparent over the footer.

---

<a id="osv-08"></a>
#### OSV-08 — `[draft]` is shipped to users, including inside a page title

**Files:** `src/pages/the-house.astro` · `src/content/journal/001-next-drop.md`
**Spec:** RFC-001 C1

12 occurrences across served HTML. The journal article's `<title>` is `batch 002 — fall [draft] — osvant`, which is what appears in browser tabs, search results and social cards. `/the-house` renders four `[draft]` strings at impact scale as its manifesto.

**Fix.** Write the copy — roughly 400 words total, itemised in [§8.11](#811-not-images--but-on-the-critical-path). Then add a CI merge gate so this cannot ship again:

```bash
# fails the build if any draft marker reaches dist
! grep -rl '\[draft\]' dist --include='*.html'
```

---

### 🟠 Major

<a id="osv-09"></a>
#### OSV-09 — The gallery has no heading and no product information

**File:** `src/components/HomeGallery.astro:22–34` · **Spec:** `03 §1.4`

`03 §1.4` specifies an eyebrow, title fragments *five* / *currents*, and a per-bottle overlay carrying **scent name, three notes, price and "discover →"**. What renders is an eyebrow, a name, and a button.

No heading element exists in the section at all, so the home page's signature moment is invisible to search and to screen readers, and a visitor never learns what any of the five scents smells like or costs.

**Fix.** Add the `h2` with stacked fragments (this also restores parity beat 4). Add the notes list and price to the overlay — both are already in `products.json`.

---

<a id="osv-10"></a>
#### OSV-10 — The overlay name collides with the bottles and is unreadable

**File:** `src/components/HomeGallery.astro`

*the fever* renders directly on top of a light grey bottle; *the static* sits half-over a purple one. There is no scrim, no safe zone, no contrast protection between the bottle layer and the type layer.

**Fix.** Reserve the left third of the stage for the overlay and offset the camera so no bottle enters it, or add a left-edge gradient scrim from `--color--black` to transparent at 38% width. The scrim is cheaper and survives any future camera change.

---

<a id="osv-11"></a>
#### OSV-11 — The PDP "formula story" section does not exist

**File:** `src/pages/collection/[scent].astro` · **Spec:** `03 §3.3`

`03 §3.3` specifies 2–3 alternating image/text rows with parallax and one serif-italic pull-quote at `--text--h3`. The PDP has exactly three sections: `pdp-hero`, `pyramid`, `xsell`.

This is the section that does the actual selling — the reason to spend €110 rather than €40 — and it is absent from all five product pages.

---

<a id="osv-12"></a>
#### OSV-12 — The note pyramid is three lonely words in 780px

**Files:** `src/data/products.json` · `src/scripts/modules/note-pyramid.ts` · **Spec:** `01 §5.4`

Each product has exactly three notes, distributed one per pyramid row. The result is three ~210px-tall rows each containing a single word, separated by hairlines. It reads as a broken list, not as an information-design moment — and it is one of the few places where the "Aesop / product information design" reference in the brief could pay off.

**Fix — pick one:**

- **(a) Recommended.** Extend the data to 2–3 notes per tier (9 notes per scent). Correct for a real fragrance, and gives the pyramid something to do. Copy task, 45 note names.
- **(b)** Redesign the row as a two-column band — eyebrow + note name left, one-line olfactive description right — and cut row height to ~120px.

---

<a id="osv-13"></a>
#### OSV-13 — Only one width breakpoint exists; the spec defines four

**Spec:** `01 §4.2` · brief `§5` ("mobile is a designed experience, not collapsed desktop")

`01 §4.2` defines `desktop ≥992`, `tablet 768–991`, `mobile 480–767`, `tiny ≤479`. The build has **one** width breakpoint, written three different ways — `48rem`, `47.9375rem` and `767px` — so a 767.5px viewport gets different rules in different components.

**Six components have no width media query at all:**

| Component | Consequence |
|---|---|
| `HomeHero.astro` | Impact type + chip never reflow |
| `HomeDoors.astro` | 140vh of gradient at every width |
| `HomeGallery.astro` | Signature section has no tablet or mobile layout |
| `ScentCard.astro` | 437×737 card shape at all widths |
| `Footer.astro` | Left-third cram at all widths |
| `CartDrawer.astro` | Fixed panel width on small screens |

**Fix.** Define the four breakpoints as tokens in `tokens.css` and use only those. Then design — not collapse — the six components above. The tablet case for the gallery ("light study kept, pins simplified") is its own layout, not a fallback.

---

<a id="osv-14"></a>
#### OSV-14 — Two scent tints fail as headline colour; two more are indistinguishable from white

**Files:** `src/styles/tokens.css` · **Spec:** `01 §2.3`, `01 §2.4`, `01 §1` rule 4
**⚠️ Requires sign-off — see [§6.1](#61-scent-tint-is-a-light-source-not-a-text-colour)**

The per-scent theming applies `--scent-tint` to the display name. Measured against `--color--black` `#111013`:

| Scent | Tint | Ratio | Verdict |
|---|---|---|---|
| volt | `#be29ff` | 4.47:1 | ⚠️ Display sizes ≥24px only |
| **nocturne** | `#3a2fbf` | **2.11:1** | ❌ **Fails even the 3:1 large-text floor — genuinely unreadable** |
| **static** | `#cdc7de` | 11.58:1 | ❌ Banned for text by `01 §2.4`; visually identical to `--color--white` |
| **fever** | `#ffb000` | 10.35:1 | ❌ Amber is reserved for scarcity/error by `01 §1` rule 4 |
| **halo** | `#ebd9ff` | 14.36:1 | ⚠️ Reads as white — theming does nothing |

On the fever PDP this compounds: the product name, the `limited` chip and the `50ml` size selector are all the same colour with three different meanings.

**Fix.** Stop using `--scent-tint` as a text colour. Express the tint where it is unambiguous and where it actually looks like the scent:

- bottle liquid and rim glow
- a 2px underline or marker beside the name
- card border on hover
- the section's ambient wash

That is still one attribute swap, still satisfies `03 §3.1`, and works for all five scents. Add a second token, `--scent-tint-text`, a lightened variant clamped to ≥4.5:1, for the rare place a tinted word is genuinely wanted.

---

<a id="osv-15"></a>
#### OSV-15 — The primary CTA fails AA, and Lighthouse already flags it

**Spec:** `01 §2.4` · **⚠️ Requires sign-off — see [§6.2](#62-add-ink-4-for-control-boundaries)**

`color-contrast` is the **only** accessibility failure Lighthouse reports, on both audited routes.

| Pair | Where | Ratio | Needs | Result |
|---|---|---|---|---|
| black on UV | `btn-primary` label, 16px — every CTA on the site | 4.47 | 4.50 | ❌ FAIL |
| UV on black | nav links, 16px, while a `scent`-themed section is in view | 4.47 | 4.50 | ❌ FAIL |
| `ink-3` on black | chip borders, dividers, input underlines | 2.32 | 3.00 | ❌ FAIL (SC 1.4.11) |
| UV on black | display type ≥24px | 4.47 | 3.00 | ✅ PASS |
| `lilac-3` on black | all eyebrows and muted text | 8.55 | 4.50 | ✅ PASS |

The design system is right — `01 §2.4` already says UV is for display sizes only. The build breaks its own rule in two places, and the `ink-3` border is a non-text-contrast failure nobody has looked at.

**Fix.**

- **`btn-primary`** — darken the label to `#0b0a0c`, or lighten the fill to `#c944ff`. Either clears 4.5:1 without changing the design.
- **Nav under `scent` theme** — keep links `--color--white`; re-theme the logo, the cart badge and an underline marker instead. This also fixes the fact that UV nav links currently look like unvisited default links.
- **Borders** — introduce `--color--ink-4: #6b6575` (3.2:1) for anything that is a control boundary. Keep `ink-3` for decorative dividers.

---

<a id="osv-16"></a>
#### OSV-16 — Double arrow: `explore the collection -> ->`

**Files:** `src/components/HomeHero.astro:31` · `src/styles/base.css:104`

`.btn-text::after { content: "->" }` appends an arrow to every `.btn-text`, and the hero cue's label already contains a literal `-&gt;`.

**Fix.** Remove the literal arrow from the markup — the pseudo-element is the one that animates on hover, so it must be the one that survives. Audit every `.btn-text` for the same duplication.

---

<a id="osv-17"></a>
#### OSV-17 — Manifesto headlines break mid-word: `nothing el` / `se.`

**Files:** `src/scripts/modules/headline-reveal.ts` · `src/scripts/modules/house-manifesto.ts`

On `/the-house`, the char-split manifesto wraps inside words because each character is its own inline element with no word grouping.

**Fix.** Wrap words as well as chars in the split, and set `white-space: nowrap` on the word wrapper. Add `text-wrap: balance` to every impact-scale headline while in there.

---

<a id="osv-18"></a>
#### OSV-18 — The contact page has no heading; form labels are placeholders

**File:** `src/pages/contact.astro` · **Spec:** `03 §6`

`/contact` renders zero `h1`–`h3` elements. The three fields use placeholder text as their only label, so the label disappears the moment the user types — a usability failure and an `aria` gap.

**Fix.** Add `h1` *get in touch* (the eyebrow is already there — promote it). Add real `<label>` elements; visually they can sit above the line at `--text--eyebrow` in `lilac-3`, which matches the rest of the system and adds information-design texture the page currently lacks.

---

<a id="osv-19"></a>
#### OSV-19 — The `doors` section and the journal article carry no nav theme

**Files:** `src/components/HomeDoors.astro:15` · `src/pages/journal/[...slug].astro`
**Spec:** `03 §9` — "every section declares `data-nav-theme`; a page with an unthemed section fails review"

`<section class="doors">` declares none — the attribute sits on the two child anchors instead. `/journal/[slug]` contains **no `<section>` elements at all**, so the nav never re-themes on an article page.

---

<a id="osv-20"></a>
#### OSV-20 — Home page shows no price and no product information anywhere

**File:** `src/components/HomeCampaign.astro` · **Spec:** brief `§1`

Scroll the entire home page and you will not see a single price, note list, or size. For a direct-to-consumer store whose primary conversion is add-to-cart, the home page currently functions as a brand teaser with a "discover" link.

The campaign band is the one commercial moment and it has no heading, no price, and an empty image.

**Fix.** Add notes + price to the gallery overlay (OSV-09). Give the campaign band a real headline, the €135 price, and the fever bottle. Note: the `limited` chip is doing good work — it is the only correct amber use on the site.

---

### 🟡 Polish

<a id="osv-21"></a>
#### OSV-21 — Footer tagline and wordmark read as neutral grey

Both compute to `oklab(0.522 0.011 −0.014)` — technically violet-tinted, but at ~1.5% chroma it is perceptually the neutral grey the system bans. On a page whose identity is "every neutral is violet-tinted", the two largest footer elements are the ones that don't read that way.

**Fix.** Push chroma to ~4%, or drop them to `ink-2` and let the wordmark be a surface rather than a text colour.

<a id="osv-22"></a>
#### OSV-22 — Footer is 60% empty and has no legal row

`01 §5.6` calls the footer "a designed destination". All four rows are crammed into the left third with a void to the right; there is no copyright or "demo store" line; and *join the current* — the site's secondary conversion — is set at ~1.5rem serif italic, **smaller than the sitemap links beneath it**.

**Fix.** Give the newsletter block full width and real hierarchy. Move the sitemap into three labelled columns. Add the legal row.

<a id="osv-23"></a>
#### OSV-23 — The-house CTA band is a naked button

A single centred `shop the collection` button floating in a 300px `ink-1` band with no eyebrow and no headline. `03 §9` requires every animated section to resolve to a CTA — this resolves to *only* a CTA. Add an eyebrow and one impact line above it.

<a id="osv-24"></a>
#### OSV-24 — The two doors carry no supporting copy

*the lab* and *the cult* over an empty gradient give a visitor no reason to click and no idea where they lead. Add the eyebrow (`craft` / `culture`) and a one-line description to each, per the intent of `03 §1.3`.

<a id="osv-25"></a>
#### OSV-25 — Cross-sell cards carry name and price only

275×100px boxes with no image, no eyebrow, no notes. `03 §3.4` also asks for horizontal drag-scroll with native snap; four cards in a static grid never overflow, so the interaction does not exist. It will once cards carry a bottle render and real height.

<a id="osv-26"></a>
#### OSV-26 — The `50ml` size chip and the `limited` badge look identical

On the fever PDP they sit adjacent, both amber-bordered, both chip-shaped — one is a selectable control, one is a static state badge.

**Fix.** Give controls a border + selected fill; give badges a tinted background with no border, so form encodes function. Also: fever ships a single size, so the "selector" is one chip — render it as a spec line (`50ml · limited`) rather than a control that cannot be operated.

<a id="osv-27"></a>
#### OSV-27 — Journal index has one article, no lede, no headings

One card in a three-column grid with two empty cells, no `h2` on the card, and no intro copy under *transmissions*. Three articles minimum for the index to read as an archive; make the first a full-width feature card.

<a id="osv-28"></a>
#### OSV-28 — Cart line item is missing its quantity stepper and thumbnail

The DOM contains `− 2 +` and `remove` but neither renders visibly in the panel. Likely collateral from OSV-01 — re-verify after that fix. Line items should also carry the bottle still; `03 §8` lists cart as a consumer of the transparent AVIF.

<a id="osv-29"></a>
#### OSV-29 — Legal pages are 12-word stubs linked from every page

For a demo store, short is fine — empty is not. 150 words each, plus a prominent "this is a portfolio demonstration, no real orders are processed" statement. That line should also appear on `/contact` at more than eyebrow size.

<a id="osv-30"></a>
#### OSV-30 — Contact's `send` is the only full-width button on the site

Every other primary CTA is hug-width. Match them, and align the button to the form's left edge.

<a id="osv-31"></a>
#### OSV-31 — Lighthouse's green is not predictive

99 performance / LCP 2.0s / CLS 0.001 is measured on a site with **zero images**. Every one of those numbers moves when the asset list lands. Note ADR-013 cuts both ways here: dropping `three` removes ~150KB of JS, but the bottle stills add real image payload — and the ≥75 WebGL carve-out is gone, so every page must now clear ≥90 on its own merits.

**Action.** Establish the budget gates against a route carrying real assets *before* treating the current scores as a baseline — otherwise the first photography PR will look like a regression when it is actually the first honest measurement. Also: `valid-source-maps` is the one remaining best-practices miss.

---

## 6. Design-system corrections (needs sign-off)

These are changes to `docs/design/01-design-system.md`, not just to code. Per the escalation rule in `AGENTS.md` ("anything touching `docs/design/*` content"), **this section is that escalation** — please review before the Phase 2 work in §9 starts.

### 6.1 Scent tint is a light source, not a text colour

Covered in OSV-14. The system asks one token to do a job it cannot do for four of five scents.

- Redefine `--scent-tint`'s permitted surfaces: liquid, rim glow, hover border, marker/underline, ambient wash.
- Add `--scent-tint-text` as a separate, contrast-clamped token for the rare tinted word.

### 6.2 Add `ink-4` for control boundaries

`ink-3 #524d59` at 2.32:1 cannot legally bound an interactive control (WCAG 1.4.11 needs 3:1). It is currently used for input underlines, chip borders and the `next drop` chip.

- Add `--color--ink-4: #6b6575` (3.2:1).
- Split usage: `ink-4` for anything operable, `ink-3` for decorative rules.

### 6.3 Breakpoints must be tokens, and there must be four

Covered in OSV-13. Three spellings of one breakpoint across nine files is a bug factory. Put them in `tokens.css` as documented constants and let the linter enforce it.

### 6.4 Vertical rhythm is under-specified, and the pages show it

`01 §4.1` gives one value: section padding `10rem` / `6rem`. Everything between — eyebrow→headline, headline→lede, lede→content, grid row gaps — is being invented per component. The result is the inconsistent density visible across the site: 780px for three words on the PDP pyramid, 210px of nothing between the social cards and the footer, 488px of nothing above the PDP `h1`.

**Add a six-step spacing scale to the system, plus a stated rule for the eyebrow/headline/lede cluster** so every section opens with the same rhythm.

> This is the highest-leverage typographic fix on the list. It will do more for perceived quality than any individual layout change.

### 6.5 Explicitly not proposed for change

The colour tokens themselves, the two-face pairing, the lowercase rule, the no-shadow rule, the square-corner rule, and the motion grammar. They are working, they are distinctive, and the build honours them. **The identity is sound — the problem is execution density and missing assets, not direction.**

---

## 7. Page-level direction

Layout-level direction, assuming the blockers are fixed and the §8 assets exist.

### Home — hero

The wordmark sits left with ~900px of empty black to its right, and the `next drop` chip floats unanchored in the top-right corner.

- Let the vapor become a real presence. It is currently a 0.35-opacity gradient that is effectively invisible. It should fill the right half and visibly react to scroll velocity — that is parity beat 12, and the wiring already exists.
- Anchor the chip to the same grid as the headline instead of the viewport corner, so the two read as one composition.
- Keep the `h1` as LCP. Do **not** put an image behind the hero — the near-black void is correct here; it just needs the vapor doing visible work.

### Home — the two doors

140vh of gradient carrying four words. With real photography these become the strongest thing above the gallery.

- Add the eyebrow and one-line description per door (OSV-24).
- Reduce each to 60vh.
- Full-bleed media with a duotone violet grade and a bottom-up scrim so the type always has a ground.
- The hover already does the right things — scale 1.05, title x-shift, arrow reveal. It just has nothing to scale.

### Home — the gallery

Make-or-break section; needs the most work. Beyond OSV-02 / 09 / 10:

- **Give the scene a ground.** The bottles float in a void with no plinth, no reflection, no depth cue, no atmosphere — so the procession reads as a slideshow of PNGs rather than a camera moving through a space. A dark reflective floor plane plus a soft volumetric wash in the active scent's tint will do more for the "helmet hall of fame" feeling than any additional scroll mechanic.
- Put the price in the overlay. Someone screen-recording this section should be recording something that sells.

### Collection (PLP)

Once OSV-04 lands, the 2/3 rhythm appears. Then:

- Reduce card height — 737px per card means only one row is ever visible.
- Rebuild the card interior: eyebrow, name, **bottle render at ~55% of card height**, notes, then a footer row of price + discover.
- Notes currently render as untreated grey text at 10px and read as debug output. Set them at `--text--h6` with a `·` separator in `lilac-2`.
- Add the row-hover dim (non-hovered cards → 60%) that `03 §2` specifies — not currently observable.

### Scent detail (PDP)

- Rebuild the hero per OSV-05 so product, price and CTA are all on the first screen.
- Insert the formula story (OSV-11) between the pyramid and the cross-sell: two alternating rows plus one serif-italic pull-quote.

That gives the page the shape it was specified to have — *identify → understand → be persuaded → keep browsing* — instead of the current *identify → three words → leave*.

### The house

The pinned manifesto scrub is the best-executed thing on the site; it just needs real sentences. The craft grid needs captions — three unlabelled images say nothing about craft. Give each a short eyebrow (`maceration`, `the organ`, `batch record`) and a one-line caption, which also turns it into the "Aesop information design" reference the brief calls for.

### Journal + contact

Journal needs three articles and a feature card. Contact is the best-composed page on the site and needs only the heading, real labels, and a use for the empty lower half — a press-kit download or a studio address block would earn it.

---

## 8. Asset production brief

**Owner: product (Farul).** Formats follow `06-asset-pipeline.md`. Since ADR-013 the list is **AVIF only** — no GLB, no HDR, no video. `scripts/check-assets.mjs` enforces this and will fail the build on any `.glb`/`.gltf`/`.hdr` or anything under `assets/video/`.

**The bottle asset count dropped from 20 files to 10** (was 5 GLB + 5 WebM + 5 MOV + 5 AVIF; now 5 stills + 5 detail macros).

> ### ✅ Settled 2026-08-21
>
> **The bottle silhouette is decided** and recorded in `00-design-brief.md §5`: a **heavy squat rectangular flacon** — roughly 1:1.2 width:height, thick pressed-glass walls with a visible glass floor, sharp square shoulders, no neck taper, solid machined cap flush with the body width, small silk-screened lowercase label with a mono batch number.
>
> It reads laboratory rather than boutique, matches the square-corner / no-shadow rules of `01 §4.3`, and — critically — **holds up as a still**, which is now the only way it is ever seen (ADR-013).


<a id="ast-03a"></a>
### AST-03a — Bottle still ×5 · **the whole ball game**

> **Colour superseded 2026-08-31.** This review is a dated record and its
> prompts are left as they were written, but the house colour has since moved
> from ultraviolet to signal green (`01 §2.1`, amended 2026-08-31). **Before
> reusing any prompt below, substitute the hue**: "violet" → "green" and the
> per-scent liquid list → volt `#008d57` · nocturne `#3a2fbf` · static
> `#bad2c3` · fever `#ffb000` · halo `#c5edd4`. The measured contrast table in
> §6 is likewise superseded by `01 §2.1`. Volt's master was re-shot green and
> delivered; nocturne and fever are unaffected; static and halo are re-hued
> programmatically by `pnpm stills` (`LIQUID_REHUE` in `scripts/prepare-stills.mjs`).


| | |
|---|---|
| **Format** | AVIF with alpha |
| **Spec** | 2000px long edge · **flat-lit** · identical camera/framing/scale across all five · ≥12% transparent margin every side · ≤180KB at 1× (CI-enforced) |
| **Consumers** | Home gallery, all 5 PDP heroes, PLP cards, cross-sell, cart, OG |
| **Blocks** | OSV-02, OSV-09, OSV-20, OSV-25, OSV-28, AST-10 |

Since ADR-013 this is the *only* produced bottle asset — five images now carry the signature moment on their own. Everything else in the presentation (highlight, rim, caustic, bloom) is CSS driven by `--light-angle`.

> **Flat-lit is the constraint that makes or breaks this.** Even frontal illumination. **No baked specular, no baked rim light, no cast shadow.** The composite supplies all of that. A dramatically-lit master double-lights and reads as a compositing error — it will be rejected at handoff (`06 §2`).

```text
product photograph of a perfume bottle, heavy squat rectangular flacon, thick
pressed glass with a visible glass floor, sharp square shoulders, no neck taper,
solid brushed-metal cap flush with the body width, small silk-screened lowercase
label, filled with translucent violet liquid, FLAT even frontal studio lighting,
large soft frontal softbox only, no hard specular highlights, no rim light, no
cast shadow, isolated on pure transparent background, dead-on front elevation,
centered, product catalogue reference shot, sharp throughout, 100mm
```

**Per-scent liquid colours:** volt `#be29ff` · nocturne `#3a2fbf` · static `#cdc7de` · fever `#ffb000` · halo `#ebd9ff`

**Keywords:** flacon · pressed glass · squat rectangular perfume bottle · flat lighting · shadowless product shot · front elevation · packshot · transparent background · e-commerce cutout

**Production tip:** generate **one** bottle at high quality, then produce the other four by recolouring the liquid and label — do not regenerate the silhouette five times, or the five will not register to within 2px and the procession will jitter. Cut the alpha carefully: the same alpha channel is reused as the mask for the sheen and rim layers, so edge fringing shows up as a glowing outline.

<a id="ast-03b"></a>
### AST-03b — Bottle detail macro ×5

| | |
|---|---|
| **Format** | AVIF |
| **Spec** | 1600px, close crop of cap / label edge / liquid meniscus, same lighting family as AST-03a |
| **Consumers** | PDP formula story, row 1 (`03 §3.3`) |

**This is the compensating move for losing rotation.** Without it the PDP never shows the object closer than the hero framing, and the page loses all material intimacy. Not optional.

```text
extreme macro photograph of a perfume bottle cap and shoulder, brushed aluminium
against thick pressed glass, a sliver of silk-screened lowercase label in focus,
violet liquid refracting behind the glass edge, single soft key from the left,
near-black background, shallow depth of field, product detail photography, 100mm
macro, no hands
```

**Keywords:** perfume cap macro · brushed metal detail · glass edge refraction · label macro · liquid meniscus · product detail crop

### AST-04 — Rive artboards ×5 files

| | |
|---|---|
| **Format** | `.riv` |
| **Files** | `logo` · `page-transition` · `btn-ui` · `vapor` · `mob-landscape` |
| **Recovers** | Parity beats 8, 9, 10, 11 |

Authored in the Rive editor, not generated. `vapor` matters more than before: it is now layer 5 of the light study (`M §8.1`) as well as the hero motif, so it carries depth work the 3D scene used to do. `page-transition` replaces the CSS clip-path placeholder.

**Engineering note:** `@rive-app/canvas` still needs installing — pre-approved under ADR-006, no new ADR required.

### AST-05 — Fever campaign photography ×3 (1 hero, 2 supporting)

| | |
|---|---|
| **Format** | AVIF, duotone violet grade |
| **Spec** | 2400px hero, 1600px supporting |
| **Consumers** | Home campaign band, fever PDP formula story |

The one place the brand shows a person. Skin and heat, not lifestyle.

```text
editorial beauty photograph, close crop on a shoulder and jawline, skin lit by a
single hard amber source from below-left, deep violet shadow filling the rest of
the frame, fine grain, sweat sheen, no visible eyes, high contrast, duotone
violet and amber, shot on medium format, 90mm, dark background falling to
near-black, austere fashion editorial, no smiling, no product visible
```

**Keywords:** duotone editorial portrait · hard raking light · chiaroscuro beauty · violet and amber duotone · skin texture macro · dark fashion editorial · anonymous crop

### AST-06 — Macro ingredient set ×10 (≥8 required)

| | |
|---|---|
| **Format** | AVIF, duotone violet |
| **Spec** | 1600px, square + 4:5 crops |
| **Consumers** | The-house craft grid, the "lab" door, formula-story rows 2–3 on all 5 PDPs |

Must cover the notes across the collection: neroli, yuzu, mint, oud, black plum, amber, aldehydes, white musk, iris, saffron, chili-rose, benzoin, cashmeran, pale musk.

```text
extreme macro photograph of {saffron threads / a split yuzu / raw oud resin /
crushed iris root / benzoin crystal}, isolated on near-black seamless, single
hard key light from the left, deep violet ambient fill, shallow depth of field,
dust particles catching the light, scientific specimen photography, 100mm macro,
no hands, no styling props, laboratory not kitchen
```

**Keywords:** botanical specimen macro · raw perfume material · resin macro · laboratory still life · dark field macro photography · scientific specimen plate

### AST-07 — Door media ×2

| | |
|---|---|
| **Format** | AVIF |
| **Spec** | 2400×1000, full-bleed, bottom scrim safe |
| **Consumers** | Home two-door split |

Two wide plates that must read as opposites at a glance, since they are stacked.

```text
A — the lab: wide shot of a perfumer's organ, rows of amber sample vials on dark
steel, single overhead violet light, clinical, deep shadow, no people, shallow
focus falling off to the right, near-black background

B — the cult: wide shot of a night crowd from behind, backlit by violet stage
light, motion blur, silhouettes only, no faces, grain, deep black foreground
```

**Keywords:** perfumer's organ · sample vial rack · laboratory glassware dark · violet stage backlight · night crowd silhouette · motion blur crowd

### AST-08 — Journal lead images ×3

| | |
|---|---|
| **Format** | AVIF |
| **Spec** | 2000×1250 lead, 1200×750 card |
| **Blocked on** | Journal having three articles (OSV-27) |

Mix registers — one product-adjacent, one campaign outtake, one abstract vapor plate — so the index does not read as one repeated image.

```text
abstract photograph of violet smoke against near-black, single hard side light,
dense volumetric texture, no visible source, no objects, fills frame, fine
grain, high contrast, editorial
```

**Keywords:** violet smoke plate · volumetric vapour · ink in water macro · abstract dark texture

### AST-09 — Social band card imagery ×4

| | |
|---|---|
| **Format** | AVIF |
| **Spec** | 800×500 — tiktok · instagram · youtube · twitch |

Currently empty `ink-2` rectangles. Each needs a plate that reads as a post from that platform **without using platform logos**. Use outtakes from AST-05 and AST-06 rather than commissioning new material.

### AST-10 — Open Graph images ×9 routes

| | |
|---|---|
| **Format** | PNG or AVIF |
| **Spec** | 1200×630 |
| **Status** | Only `og-house-default` exists |

Per-scent cards composite AST-03a on near-black with the name and price. **Engineering note:** generate at build time from the stills rather than hand-making five.

<a id="811-not-images--but-on-the-critical-path"></a>
### 8.11 Not images — but on the critical path

**Copy (~400 words).** Blocks eight findings:

- [ ] House manifesto lead + three statements (unblocks OSV-08)
- [ ] Three journal articles (unblocks OSV-27, AST-08)
- [ ] Five formula-story blocks — 2 short paragraphs + 1 pull-quote each (unblocks OSV-11)
- [ ] Two door descriptions (unblocks OSV-24)
- [ ] Three craft-grid captions
- [ ] Two legal pages at ~150 words each (unblocks OSV-29)

**Note data.** If option (a) is taken on OSV-12, the pyramid needs 9 notes per scent instead of 3 — 45 note names total. Copy task, not design.

---

## 9. Implementation sequence

Sequenced so each phase makes the next phase's work visible. **Phase 1 is roughly one engineering day and changes the perceived state of the project more than anything else on the list.**

### Phase 1 — Stop the bleeding (~1 day)

- [ ] **OSV-01** — one line in `base.css`; fixes the cart drawer entirely
- [ ] **OSV-03** — two `{" "}` insertions; fixes every headline on the site
- [ ] **OSV-04** — `:global()`; the PLP layout appears
- [ ] **OSV-16** — delete one literal arrow
- [ ] **OSV-06** — trigger start values; content stops being invisible
- [ ] **OSV-07** — z-index + section padding; collisions gone
- [ ] **OSV-19** — add the two missing `data-nav-theme` declarations
- [ ] **OSV-08** — land the copy, add the CI grep gate
- [ ] **OSV-05** — PDP hero rebuild (the one item here that is more than an hour)

### Phase 2 — System corrections (~2 days) · **sign-off on §6 required first**

- [ ] **§6.1 / OSV-14** — scent tint stops being a text colour
- [ ] **§6.2 / OSV-15** — contrast fixes; clears the last Lighthouse a11y failure
- [ ] **§6.4** — spacing scale in `tokens.css`, applied to the eyebrow/headline/lede cluster site-wide
- [ ] **§6.3 / OSV-13** — four real breakpoints as tokens

### Phase 3 — Assets (parallel, starts now)

- [x] ~~Decide the bottle silhouette~~ — settled 2026-08-21, `00-design-brief.md §5`
- [ ] **AST-03a ×5** — the whole ball game; blocks the gallery, every PDP, every card and every OG image. Generate one bottle well, then recolour for the other four
- [ ] AST-03b ×5 — bottle detail macros; unblocks OSV-11 row 1
- [ ] AST-05 / 06 / 07 — can start immediately, no dependency on the bottle
- [ ] AST-04 (Rive) — independent; recovers 4 parity beats, and `vapor` is now layer 5 of the light study

### Phase 4 — Missing sections and composition rework (~3 days)

- [ ] **OSV-11** — PDP formula story ×5; the biggest missing piece of the spec
- [ ] **OSV-09 / 10 / 20** — gallery heading, overlay content, scrim; campaign band gets a headline and a price
- [ ] **OSV-12** — note pyramid redesign
- [ ] **OSV-18 / 22 / 23 / 24 / 25 / 26 / 27** — doors, craft grid, footer, cross-sell, journal index, contact, per §7, as assets arrive

### Phase 5 — Mobile as a designed experience (~2 days)

- [ ] The six components with no width media query — designed, not collapsed
- [ ] Tablet layout for the gallery — "light study kept, pins simplified"
- [ ] **OSV-31** — re-baseline all performance budgets against routes carrying real assets
- [ ] Full keyboard and reduced-motion pass on every new section

---

> ### One thing to protect
>
> Do not let the asset work turn into architecture work. The module system, the lifecycle contracts, the reduced-motion branches and the core singletons are the strongest part of this project and should not be touched to accommodate a photograph. **Every fix above is a component-level or token-level change.**
