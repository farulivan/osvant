# OSVANT — Engineering Worklog

> One entry per PR: date, PR title, spec sections implemented, deviations/flags raised, notable judgment calls. 3–5 lines each, newest first. Required by `00-implementation-guide.md §9`.

## 2026-08-27 — perf: font subsetting closes the LCP miss (06 §1, 01 §3.1 amended, OSV-31)

- Implements `06 §1` ("Archivo Variable woff2 **(subset latin)**") and `06 §4` ("font subsetting → engineering"), specified since the first font commit and never done. Archivo shipped as the full 88KB Google delivery — the largest single resource on every page. `pnpm fonts` (`scripts/subset-fonts.mjs`) now emits subsets: **118KB → 56.3KB**, Archivo alone 88.0 → 35.8KB.
- **Result: every page clears the 2.5s LCP budget.** `/` 2630 → **2143ms**, `/collection/fever/` 2629 → **2068ms**, `/the-house/` 2400 → **1977ms**; perf 97/97/98 → **99** across the board, a11y/best-practices/SEO 100. Full 20-page LHCI sweep green against the repo's own assertions.
- **Two reductions, and the second is the one worth remembering.** Charset alone only bought 39% (88.0 → 53.5KB), because a variable font's weight is variation deltas per glyph rather than glyph count. The `wdth` axis is the expensive one — dropping its unused 62–100 range saved another 16.6KB, more than removing ~150 glyphs did.
- **`01 §3.1` amended with owner sign-off**: axes narrowed from `wdth` 62–125 / `wght` 100–900 to `wdth` 100–125 / `wght` 400–900. Nothing in the built site rendered outside the narrow range; the two apparent uses of the extremes were the `@font-face` descriptor lines, not usages. Zero rendered pixels change. The `@font-face` descriptors were narrowed to match the file, because a range declared in CSS that the woff2 does not carry fails silently — the browser synthesises it, so `font-weight: 100` would render a faked thin rather than Archivo Thin.
- **`check-glyphs.mjs` is the price of subsetting** and ships with it, not after it. A character outside the retained set renders as tofu, and would only surface when someone wrote a journal article containing an umlaut. It reads built output, shares one charset module with the subsetter so the two cannot drift, and names both fixes in its failure message. Verified by deliberate violation — three planted characters, each reported with its codepoint. Wired into `ci.yml` beside the copy guard.
- **Corrects the previous entry's diagnosis, which was wrong twice.** The bisect that settled it: removing the font moved LCP 2630 → 1986ms, removing all module JS moved it → 2180ms, and deferring script execution to `window.load` moved it **0ms** — which ruled out main-thread contention and pointed at the font. The photography was never implicated; observed LCP is 86ms on real hardware and the whole number is Lantern simulation (150ms RTT, 1.6Mbps, 4× CPU).
- **`subset-font` added as a build-only devDependency** (harfbuzz). Same class as `sharp`: ships nothing to the client, so no ADR under the runtime-dependency rule — flagged because it is a native binary. Font sources moved to `src/assets/fonts/` (never served); generated subsets live in `public/assets/fonts/`, which needs stable unhashed URLs for the preload. Both committed so a fresh clone builds correctly without running the script first.
- A 48KB ceiling on the Archivo subset is asserted inside `subset-fonts.mjs`: if a source drop or a `subset-font` upgrade ever stops shrinking it, the budget miss returns quietly and nothing else in CI watches that number.

## 2026-08-27 — feat: formula story + photography wiring (03 §3.3, 01 §6, review OSV-11/OSV-20)

- Implements `03 §3.3` — the formula story, which did not exist on any of the five PDPs (review OSV-11) and is the section that does the selling. Three alternating rows: row 1 is the bottle detail macro per the acceptance box (AST-03b, generated from each master by `pnpm stills` rather than shot separately), rows 2–3 are ingredient macros resolved from that scent's own note pyramid via `macroPair`, and the one permitted pull-quote closes row 3 in Instrument Serif italic at `--text--h3`.
- **New `Duotone.astro`** applies the `01 §6` grade at runtime — desaturate + contrast, then a `mix-blend-mode: color` tint layer so hue and saturation come from the token while luminosity stays with the photograph. Deviation from `06 §2` (which asks design for pre-graded masters), taken because photography here is sourced rather than commissioned: any plate that lands in the repo arrives in brand grade, and the grade stays a token. `strength={0}` opts a product shot out entirely — `01 §6` reserves the duotone for skin and vapor, and tinting the bottle detail turned the brushed-steel cap gold.
- **Astro scoped styles do not reach component roots.** `.door__media` compiles to `.door__media[data-astro-cid-HomeDoors]`, but the class lands on the Duotone root, which carries Duotone's id — so `position: absolute` never applied and each door grew to its photo's natural height (850px and 941px against a 60vh intent). Same latent bug in `HomeCampaign`, `FormulaStory` and the craft grid. Fixed by reaching through a scoped ancestor (`.door :global(.door__media)`) rather than a bare `:global()`, which would leak the class site-wide. Worth knowing: this fails silently and looks like a layout bug, not a scoping one.
- **Exposure is measured, then overridden by eye.** Each plate's mean luminance is corrected toward ~118 so ten photographers read as one set. Mean luminance says nothing about how much of the frame is lit, though: saffron measured 150 (0.78 to target) and still blew past two dark-field plates beside it, so it is pulled to 0.6. The craft grid's first tile was swapped bark → benzoin for the same reason — matched on field, not on subject.
- **Judgment call:** the third formula row originally carried a flat list of all nine notes, which the note pyramid higher up the same page already renders grouped. Nine note names twice on one page is padding, so the row now carries the pull-quote instead. `03 §3.3` allows 2–3 rows and only requires the bottle macro first and exactly one serif pull-quote — both still hold.
- **Flagged for PR 8 (OSV-31), not fixed here.** LCP is 2.6s against the 2.5s budget on `/` and the fever PDP (perf 97, a11y 100, best-practices 100, SEO 100, CLS ≤0.001, TBT 0ms; `/the-house` passes at 2.4s). **The photography is not the cause, and neither is anything I first guessed.** Observed LCP is **86ms** — identical to observed FCP and first paint. The 2630ms is entirely Lighthouse's Lantern simulation (150ms RTT, 1.6Mbps, 4× CPU slowdown). I bisected it on built output rather than reasoning about it: stripping the preloader moved LCP 0ms; stripping the hero's `data-anim="split"` so `headline-reveal` never hides the `h1` moved it 0ms; removing the webfont moved it 0ms. Stripping **all module JS** moved it 2630ms → 2180ms and FCP 1281ms → 905ms, which passes. So the binding constraint is main-thread JS boot under the 4× CPU multiplier — 1.1s of main-thread work, 659ms of it GSAP. The 88KB unsubset Archivo (`06 §1` requires "subset latin"; it never happened) only becomes the binding constraint *after* JS is fixed, which is why removing it alone changes nothing today. Not touched here: cutting critical-path JS is architecture, and review §9's one constraint is that asset work must not turn into architecture work.
- **Asset gap:** the craft grid borrows ingredient macros because the set has no process photography — it wants a bench, an organ and a batch sheet. `campaign/skin-textures.webp` and `macro/mint-leaf.webp` are in the repo but deliberately unimported: Astro emits an imported asset whether or not anything renders it, so an unused import ships its full-resolution original (skin-textures alone was 5.6MB).
- Owner re-delivered the fourteen photo masters as WebP mid-review: same dimensions, mean luminance matching to within 0.1, so every measured exposure survives and only the import extensions moved. Repo masters 38.4MB → 13.4MB. Deploy moved only 3.1MB → 2.9MB, because Astro re-encodes to AVIF from the master either way and the AVIF is what ships; LCP moved by noise (2629.9ms vs 2629.0ms). Recorded because the derivatives are now encoded from an already-lossy source — invisible at quality 48 under a duotone grade, but a one-way door.
- Bundle 69.89KB gzip against the 350KB budget; deploy 2.9MB; `pnpm verify` green (146 tests), copy and asset guards clean.

## 2026-08-22 — docs: no-3D re-scope — Three.js out, bottle becomes a composited light study (ADR-013)

- Owner decision (budget): real-time 3D is unaffordable. Recorded as **ADR-013**, superseding the Three.js entry in ADR-006 and the primitive-GLB placeholder in ADR-008. Spec updates land across all 4 design LAW docs + 8 engineering docs + the CI asset guard; `rfc-001` and this worklog left untouched as historical record per the ADR doc's own supersede rule.
- **New mechanic — the light study (`M §8`).** The object is fixed, the light moves: one flat-lit transparent AVIF per scent under a 6-layer composite (tint wash / caustic / bottle / sheen / rim / vapor), all driven by a single `--light-angle` property. Scroll drives it in the gallery (`M §4.4`), drag drives it on the PDP (`M §4.4b`) — the existing interaction contracts survive, only the payload changes. Depth is differential parallax (`0.4× / 1× / 1.6×`), an acceptance box in `03 §1.4` rather than polish.
- **Design call flagged:** rotation was never the strongest expression of "scent beyond the visible" — illumination is. But losing it costs material intimacy, so `03 §3.3` now mandates a bottle detail macro (AST-03b) as formula-story row 1. Bottle silhouette settled in `00 §5` (squat rectangular flacon) since a still has to carry what a turntable used to.
- **Consequences:** `three` dropped (~150KB gzip); `M §10` budget carve-out withdrawn (flat 350KB); Lighthouse ≥75 WebGL exemption withdrawn — **≥90 everywhere** (brief §6.3); bottle assets 20 files → 10; R8 (HEVC-alpha) retired, R1 6→3, R2 6→4, **R12 added** (signature moment now rests on 5 images alone). Parity beat 5 explicitly downgraded to *equivalent, not literal* — we don't claim a 3D beat we no longer ship.
- `scripts/check-assets.mjs` now **rejects** `.glb`/`.gltf`/`.hdr` and anything under `assets/video/` outright (not a size limit — these classes must not exist), and enforces ≤180KB per bottle still. Verified: rejects all three cases, passes clean tree.
- **Not done here:** the code still contains `src/scripts/webgl/`, the `three` dependency and `/dev/glb` — deleting them is engineering work tracked as review OSV-02, not a docs change.

## 2026-08-27 — feat: copy pass — manifesto, doors, craft, 45 notes, 3 articles, legal, formula story (RFC-001 C1, review OSV-08/12/24/27/29)

- **`[draft]` is gone and cannot come back.** Twelve markers were shipping, one inside a `<title>` — which is what a tab, a search result and a shared link all show. `scripts/check-copy.mjs` reads the BUILT output (source may mention the marker; only what reaches a user counts), runs in CI beside the size budget, and was verified by planting a marker in a `<title>` and watching it fail.
- **OSV-12 taken properly, option (a):** 45 note names, nine per scent. `notes` restructured from a flat positional array to `{ top, heart, base }` — the pyramid renders each tier as its own row, so which tier a note belongs to is now data rather than an index the template has to remember. `summaryNotes()` gives cards and the gallery overlay one note per tier, so a three-note summary still describes the whole shape of a scent instead of just its opening. Rows now read `saffron · pink chili · blood orange` rather than one lonely word.
- **Formula-story copy written and stored as data** (`products.json.formula`), two paragraphs plus a pull-quote per scent, so PR 5 renders it rather than waiting on copy. Each block argues a specific formulation decision — why the saffron sits on benzoin, why halo diffuses instead of projecting — because "the section that does the actual selling" (03 §3.3) cannot be atmosphere.
- **House manifesto lead + 3 statements; door eyebrows and one-liners (OSV-24); three craft-grid captions.** The doors previously offered four words over a gradient and no reason to click.
- **Three journal articles (OSV-27)** replacing the pipeline fixture, and the hero's `next drop` chip now deep-links to the batch-002 article rather than the index — which is what RFC B6 asked for and the fixture could not satisfy.
- **Legal pages (OSV-29)** via a shared `LegalPage.astro`. The "portfolio demonstration, no real orders" statement is set at `--text--lead` rather than buried at eyebrow size, because it is the most load-bearing sentence on either page.
- **Copy approved by the owner 2026-08-27.** RFC C1 assigns copy to design; it was drafted here at the owner's request and signed off in review. The 45 note names extend the brief's five olfactive sketches — the sketched notes are kept as anchors in each tier. `iris` appears in both static and halo, which is in the brief and correct.
- 146 tests green. Build 69.89KB / 350KB; copy guard, asset guard and LHCI green.

## 2026-08-26 — feat: design-system corrections — tint as light, ink-4, four breakpoints, spacing scale (01 §6, design review §6)

- **§6.1 tint is a light source.** Measured, not asserted: volt 4.47:1, nocturne **2.11:1**, static 11.58:1, fever 10.35:1, halo 14.36:1 against `--color--black`. Four of five fail as text — nocturne unreadable, static and halo too near-neutral for tinting a word to do anything, fever's amber colliding with its reserved scarcity role. `--scent-tint` now has stated permitted surfaces (liquid, rim, hover border, marker, ambient wash); `--scent-tint-text` covers the rare tinted word, clamped ≥4.5:1, and only volt and nocturne get one — the rest resolve to white per 01 §2.4.
- **§6.2 contrast.** `--color--ink-4` (#6b6575, 3.38:1) takes every *operable* boundary — input underlines, size chips, steppers, btn-secondary, the `next drop` chip — while `ink-3` keeps the decorative rules. `--color--on-uv` (#0b0a0c, 4.66:1) replaces black on the UV fill. Nav links stay white under a `scent` theme; the scent moves to the wordmark plus a new underline marker. **Lighthouse a11y 95/96 → 100 on both audited routes, `color-contrast` PASS** — the one failure the review named is gone.
- **§6.3 breakpoints.** Eleven media queries were written as `48rem`, `47.9375rem` and `767px`, so a 767.5px viewport got different rules from different components. All normalised, four `--bp--*` tokens documented, and stylelint's `media-feature-name-value-allowed-list` now rejects any other width — verified by deliberately reintroducing `48rem` and watching it fail.
- **§6.4 spacing.** Six-step scale plus the section-opening cluster rule (eyebrow→headline→lede), applied across every cluster. Eyebrow bottom margins had drifted to 0.75/1/2rem depending on the component.
- **Defect found in the visual pass, from PR #27:** the light study's sheen was blowing the bottle out. At the resting angle (0.5) its band sits dead centre on the glass; every screenshot I had checked was at an off-centre angle, so it never showed. Peak opacity and band width both pulled back.
- **Judgment calls flagged:** the six spacing values and the three cluster gaps are unspecified in LAW — chosen, documented in 01 §4.4, flagged here. `--color--on-uv` is a new token name (semantic rather than another neutral in the ramp). Custom properties cannot be read inside `@media`, so the breakpoint tokens are documentation and the literal values are the enforced contract.
- 146 tests green. Build 68.42KB / 350KB; asset guard green; LHCI perf 97–98, a11y 100.

## 2026-08-24 — feat: the light study — six-layer bottle, PDP drag-to-light, gallery procession, five stills (M §8, ADR-013)

- `LightStudy.astro` + `modules/light-study.ts`: the six binding layers (M §8.1) driven by one `--light-angle` (M §8.2). Layers 3 and 4 mask to the bottle's OWN alpha — no separate mask file. The mask sits on a wrapper that never transforms; the beam inside it travels, because moving a masked element moves its mask and drags a bottle-shaped ghost across the stage.
- PDP (03 §3.1, M §4.4b): drag-to-light over one bottle-width, release settles to the nearest of 0.25/0.5/0.75, arrows step it. The stage is `role="slider"` announcing the light position — it adjusts a value, so typing it as an image with a tabindex was a lie a11y lint was right to flag. **OSV-05 closed:** hero now measures exactly one viewport (829 = 829); it was 149vh with `align-items: center`, centring content out of view and putting the bottle 291px below the fold.
- Gallery (03 §1.4, M §4.4): pin, 300% scrub, snap, theming and CTA all survive from the 3D version — only the drawing layer changed, camera to CSS track. Differential parallax nets the binding 0.4/1/1.6 rates; pointer tilt is differential too (1°/3°/5°). Overlay gains the `h2` the section never had plus notes and price, so the home page shows a price somewhere at last (OSV-09/20). Track is inset to the overlay width, making the type safe zone structural rather than a scrim (OSV-10).
- `scripts/prepare-stills.mjs` (`pnpm stills`): keys masters shot on a flat backdrop — the preferred handoff, since keying a uniform backdrop beats repairing someone else's cutout. Background found by connectivity so enclosed glass is not punched through; the contour made an explicit wall via a gradient map; the fill grows locally so it follows a backdrop gradient but stops at a step.
- **Judgment calls flagged:** the bottle is a SOLID cutout with the glass re-lit in colour, not per-pixel alpha — alpha derived from a clear object shot on white is mostly grain, and every threshold that spared one master wrecked another. Nocturne defeated the keyer regardless and borrows volt's silhouette (`BORROWED_SILHOUETTE`): same bottle, same framing, registers within a pixel, so a clean sibling's mask is valid. Entry removable when a replacement master keys on its own.
- **Process note:** several rounds of "fixed" were called on a 300px thumbnail strip that hid the breakage. Bottle work gets judged at full size.
- All five register within 1px horizontally, 0px vertically at 600px (06 §2). Largest shipped derivative 24.9KB against the 180KB cap (M §10). 146 tests green; 68.42KB / 350KB gzip.

## 2026-08-23 — fix: phase-1 defects + strip Three.js (design review OSV-01/03/04/06/07/16/17/19, ADR-013)

- **OSV-01 / OSV-04 share a root cause: CSS that was written correctly and silently never applied.** `[hidden]` loses to any class setting `display`, so all three cart-drawer states rendered stacked — one global guard in `base.css` closes the class. The PLP's `> :nth-child()` rules compile with the *page's* scope attribute while the children are `ScentCard` roots carrying the *component's*, so the asymmetric grid AND the `03 §2` row-hover dim were both dead: the card now owns its `span` prop, and the hover rules take `:global()`. Bounding the card media height came with it — once the 2/3 rows actually applied, a span-2 card was 950px wide and its `aspect-ratio: 3/4` placeholder became a 1266px slab.
- **OSV-06 was an ordering race, not a trigger-value problem.** `card-entrance` already had `start: "top 85%"` + `once: true`; the bug was that `mountModules` is async while taxi calls `onEnter`/`onEnterCompleted` synchronously, so `ScrollTrigger.refresh()` measured a page whose triggers did not exist yet. Refresh now rides the mount promise (guide §6.2). Added the review's rule 1 on top: `core/viewport.ts` `isOnScreen()`, and entrance groups play immediately for anything already on screen. Mounts coalesce onto one `gsap.delayedCall(0)` — never a bare rAF (guide §3 rule 3) — so the visible cards still stagger as a group instead of each playing alone.
- **OSV-07:** cart drawer `z-index: 30 → 1500` (above nav 100, below scrim 2000). `nav--solid` keyed off an absolute 100vh offset, which is only meaningful on Home — every other route stayed transparent over its first screenful and the bar dropped back to transparent over the footer. Solid is now the default and the hero opts out via `data-nav-transparent`. Added `--nav-height` + `scroll-margin-top` on `[id]`.
- **OSV-03 / 16 / 17 / 19:** `{" "}` restores the space Astro strips between `<em>{article}</em>` and the name — every impact headline on the site read `thevolt`. Dropped the literal arrow duplicating `.btn-text::after`. Char splits now group into `.split-word` (nowrap) so a line can never break mid-word, plus `text-wrap: balance` on h1/h2. `data-nav-theme` moved onto `<section class="doors">` itself, and the journal article's cross-sell is now its own themed section so the nav re-themes on an article page.
- **ADR-013:** deleted `src/scripts/webgl/`, both WebGL modules and the `/dev/glb` harness; dropped `three` + `@types/three`. Gallery and PDP hero fall back to the honest duotone placeholder — the light study (`M §8`) rebuilds both next. Asset guard rewritten: `.glb`/`.gltf`/`.hdr` and any video are now rejected outright rather than size-capped, bottle stills capped at 180KB (`M §10`), and it walks `src/assets/img/` too.
- **Judgment calls flagged:** blanket section top-padding (review OSV-07 bullet 2) deferred to the §6.4 spacing-scale PR rather than inventing values that pass would immediately overwrite — the solid nav already occludes the reported collisions. Card media height `clamp(11rem, 18vw, 18rem)` is unspecified; flagged.
- 146 tests green (24 files). **Bundle 199.06KB → 65.56KB gzip** — Three.js removal.

## 2026-08-21 — feat: SEO — canonical/OG/Twitter, C4 titles, Product JSON-LD, robots + sitemap (RFC-001 C4, 04-qa §7)

- `lib/seo.ts`: the three RFC C4 title formats as functions (`homeTitle`/`pdpTitle`/`pageTitle`) so the format lives in one testable place — BaseLayout now renders `<title>` verbatim instead of appending the brand. Head gains canonical, full OG set (image = the 06 §1 house placeholder), Twitter `summary_large_image`, and a named `head` slot carrying Product JSON-LD on the 5 PDPs.
- `core/head.ts`: taxi swaps only the view, so meta/canonical/JSON-LD/robots were frozen at first load — router now syncs them from the incoming document (guide §8 trap #1). Marked nodes carry `data-*` hooks so layout and sync stay mechanically paired.
- `robots.txt` + `sitemap.xml` as static endpoints (not `public/` files) so both resolve against `site`; `lib/routes.ts` derives the 13 indexable routes from the pages tree + catalog + journal collection — a new page cannot silently miss the sitemap. `@astrojs/sitemap` deliberately not added (18 routes, ADR discipline).
- **Judgment calls flagged:** `site` is the placeholder `https://osvant.example` — C4 fixes formats, never a host; meta descriptions remain engineering placeholders pending the w4 copy batch; PDP `<scent>` reads as the full product name (`the volt`), matching every other surface; `og:type`/`og:locale`/`twitter:card`/`noindex` on 404+500 are conventional defaults, unstated in LAW. OG ships as a rasterized PNG (crawlers reject SVG, `astro:assets` cannot convert) — asset guard gained an `img/og/*.png` exception per 06 §3.
- Side effect: typing `Product` with its real `notes`/`character` fields exposed a latent JSON widening (`currency: string`), so `commerce.ts` now exports one typed `catalog` and every consumer reads through it instead of casting locally.
- 19 new unit tests (155 total). Build 199.06KB / 350KB; LHCI home + fever: perf 99, a11y 95/96, SEO 100, LCP 2.0s, CLS ≤0.001.

## 2026-08-20 — feat: the house — hero, pinned manifesto scrub, craft grid, CTA (03 §4)

- Page structure per 03 §4: `the lab` / `behind osvant` fragments (M §4.2 via shared headline-reveal), manifesto lead `[draft]` (copy w5, RFC C1), craft grid of 3 parallax washes (ADR-008), CTA band → collection.
- `modules/house-manifesto.ts`: pinned scrub, 3 statements char-highlight `--color--ink-3 → --color--white` — colors resolved from computed tokens at mount (no hardcoded values); `ease: "none"` children, reversible by construction (03 §4 acceptance). RM: no pin/scrub, statements sit statically lit (CSS default = final state, M §9).
- **Judgment calls flagged:** scrub distance `+=250%` unstated; statement drafts are placeholders awaiting w5 copy.
- 4 new unit tests (136 total). Build 198.82KB / 350KB; LHCI green.

## 2026-08-20 — feat: journal — collection schema + index + article template (03 §5, 07 §2, ADR-010)

- `src/content.config.ts`: zod-validated `journal` collection (title, date, leadImage{src,alt}, ogOverride?, scent? per RFC B6 deep-links). Authors = markdown commits through PR flow; zero content JS ships.
- Index `transmissions`: cards (media/date/title) with `data-anim="card"` stagger (M §4.3 reuse), per-card `data-scent` tinting. Article template: lead parallax (M §4.5), two-thirds `--text--body` column, blockquote pull-quotes in Instrument Serif italic, cross-sell band (scent PDP when tagged, else collection).
- One pipeline-fixture entry (`001-next-drop.md`, `[draft]`) exercises the schema→index→article path; replaced by the w4 copy batch (RFC C1). Lead images are ADR-008 washes until photography lands.
- Stylelint: allowed Astro's `:global()` in .astro styles (markdown body styling) — config-level allowance, scoped to .astro override.
- **Judgment calls flagged:** cross-sell band content unspecified in 03 §5 (chose scent PDP link / collection fallback); card date format `mon YYYY` unstated.
- 132 tests green. Build 198.67KB / 350KB; LHCI green (journal routes auto-covered by dist crawl).

## 2026-08-19 — feat: mobile guardrails — nav overlay menu + landscape prompt (01 §5.2/§5.7, 03 §7)

- **Registry fix (root cause, pre-existing):** `mountModules(root)` used `root.querySelectorAll`, which never matches root itself — the cart drawer boot-mount in main.ts was a silent no-op since PR #16 (drawer never opened from the nav chip in production). Root now included when it matches; regression test added.
- `modules/nav-menu.ts` (boot-mounted, replaces the Nav.astro inline fallback): full-screen ink-1 overlay with staggered SplitText char entrance (0.5s register, 0.02 char stagger, 0.06 per-link offset — judgment calls, spec says only "staggered SplitText entrance"); open = lenis stop + `[data-taxi]` inert + focus trap + ESC + focus-return; link click closes; auto-closes past 767px. RM: no split, panel fades per CSS. Closed menu now `visibility: hidden` — out of tab order/AT.
- Landscape prompt (03 §7): pure-CSS gate (`orientation: landscape` + `height <= 480px`), branded placeholder card pending `mob-landscape.riv` (06 §1). **Gap flagged:** prompt copy is unstated in LAW docs — shipped `rotate your phone`, needs design blessing.
- PDP formula story (03 §3.3) deliberately NOT built — copy blocked per RFC C1 (w4); the M3 list's "formula story pin" also conflicts with LAW §3.3 (unpinned parallax rows) — flagged.
- 8 new unit tests (132 total). Build 198.67KB / 350KB; LHCI green.

## 2026-08-19 — feat: PDP bottle hero — drag-to-rotate scene (03 §3.1, M §8/§9)

- `webgl/bottle-scene.ts` (lazy chunk): contained single-bottle scene — drag-to-rotate clamped ±180° with per-frame ease, idle ambient spin additive to drag position (off under reduced motion, drag stays on — M §9), `--scent-tint` rim glow, visibility-owned render loop, full dispose.
- `modules/pdp-bottle.ts`: probe/`deviceMemory < 4` → static wash fallback + `webgl_fallback` (RFC C7); pointer-event drag wiring (`touch-action: pan-y` keeps vertical scroll native); same loading contract as the gallery — lazy import on approach (200%), zero frames while unseen.
- Shared helpers extracted: `webgl/probe.ts` (gallery + PDP), `webgl/bottle.ts` (`buildBottle`/`disposeBottle` — the single GLB swap point for both scenes, ADR-008).
- Canvas carries `role="img"` + drag hint label; reduced-motion keeps WebGL active (drag works), only idle stops.
- **Perf finding:** the above-fold PDP render loop burned 6341ms TBT under CI's SwiftShader — the probe now rejects software rasterizers (SwiftShader/llvmpipe/softpipe via `WEBGL_debug_renderer_info`) as "no usable WebGL" (M §8's fallback exists precisely for no-GPU clients).
- 8 new unit tests (124 total). Build 198KB / 350KB; LHCI green.

## 2026-08-18 — feat: home collection gallery — WebGL procession (03 §1.4, M §4.4, M §8/§9)

- `webgl/gallery-scene.ts` (lazy chunk, 01-arch module table): 5 procedural placeholder bottles (ADR-008 — `buildBottle()` is the only GLB swap point), scrub-driven procession + active-bottle ±35° rotation, additive idle spin via `gsap.ticker`, 3° pointer parallax lerped 0.08, `--scent-tint` glow following the active bottle, `dispose()` frees renderer/geometry/materials.
- `modules/gallery.ts`: lazy import on approach (`rootMargin: 200%`), pinned 300% scrub with `snap: 1/4`, SplitText scent-name crossfade + discover-link/data-scent retarget per active bottle, visibility-pause via IntersectionObserver. Fallback path (probe fail / `deviceMemory < 4` / reduced motion) → static procession layout + `track("webgl_fallback")` (RFC C7); turntable WebMs pending GLB delivery (06 §1).
- HomeGallery component replaces the §1.4 placeholder; fallback list items carry `data-gallery-scent` so tints resolve from `--scent-tint` (tokens.css stays the single source of truth).
- Added missing global `btn-secondary`/`btn-text` base styles (01 §5.1 table — values were LAW, implementations were absent).
- **Deviations:** M §8's `setAnimationLoop(null)` pause maps to `gsap.ticker` removal — guide §6.1's single-loop contract wins. **Flag:** three.js (ADR-006) is now a real dependency; bundle 197KB/350KB gzip incl. the lazy webgl chunk.
- 5 new unit tests (116 total).

## 2026-08-17 — feat: contact page + 500 (03 §6, 01 §5.5, RFC-001 C3/C7)

- `contact.astro` rebuilt: split layout — `business enquiries -> business@osvant.com` btn-text at h3 scale (mailto), press + socials; form name/email/message per 01 §5.5 line style.
- `contact.ts` module: C3 validation verbatim (`required` / `check your email` per field, amber at eyebrow size below the field + amber input line), success swap `sent. we'll be in touch.`, failure `didn't send — try again.` (`?demo=fail`); mock relay with ~600ms latency + muted `demo — no message sent.` notice (mirrors the newsletter mock pattern).
- `500.astro` per RFC-001 C7: `something spilled.` + `btn-primary` `back to the current` — mirrors the 404 pattern.
- **Gaps flagged:** press email (`press@osvant.com`) and the demo-notice copy are unstated in LAW docs — both flagged in the PR.
- 5 new unit tests (111 total). Build 65.14KB / 350KB.

## 2026-08-14 — feat: cart drawer — global overlay, steppers, mock checkout (03 cart drawer, 01 §5.7, 07 §1.3)

- `CartDrawer.astro` global chrome (outside `[data-taxi]`, boot-mounted like the footer): ink-1 panel + dark scrim, right slide 0.6s `expo.inOut` (01 §5.7), empty state `nothing decanted yet.` + `btn-secondary` to collection, confirmation step per 07 §1.3 (`demo store — no real orders` + `back to the current`).
- `cart-drawer.ts`: lines render from the commerce port; qty steppers → new `cartUpdateQuantity(sku, qty)` port method (0 = remove; port extension flagged); remove action; re-renders on `osvant:cart-changed`. Open: background inert + `lenis.stop()`, focus trap, ESC closes + focus returns to trigger. Checkout tracks `begin_checkout` (B7) and advances to the confirmation step. B3: gone-unavailable lines get the amber `no longer available` note.
- Nav cart chip: `<a href="cart">` → `<button data-cart-open>` — the drawer is an overlay, not a route (03 sitemap); the old link 404'd.
- RM (M §9): open/close swap instantly, no tweens. 6 new unit tests (106 total). Build 64.81KB / 350KB.

## 2026-08-14 — feat: PDP ×5 — scent hero, note pyramid, purchase surface, cross-sell (03 §3)

- `[scent].astro` rebuilt: 3.1 hero (eyebrow, impact name with serif-italic article, final one-liner per RFC-001 C1 — `character` added to products.json verbatim) + bottle placeholder (Three.js is M3, ADR-008); purchase row (size chips single-select → price, `add to cart`, sticky bottom bar ≤767px); 3.2 note pyramid via new module (M §4.6 verbatim: divider scaleX 0→1 0.8s expo.out then char cascade 0.015 stagger, triggers at top 75% once); 3.4 cross-sell rail (native overflow-x + scroll-snap, no hijacking). Sold-out per RFC B3: disabled `sold out — next batch soon` + `get notified` → `sold_out_notify_signup` + success swap.
- `pdp.ts` module wires chips/add-to-cart/notify through the commerce port + `track` (add_to_cart, sold_out_notify_signup — B7). Cart badge elastic pop on add (M §4.8: elastic.out(1, 0.75), scale 0→1, 0.9s, RM-gated) in main.ts.
- **Deferred:** 3.3 formula story — copy `[draft]`, ships w4 per RFC-001 C1; section omitted until copy lands (not invented).
- **Gaps flagged:** pyramid maps 1 note per row (data has 3 notes; spec doesn't say how many per row); `data-nav-theme="scent"` per 01 §2.3; notify success copy reuses 01 §5.5 message.
- 7 new unit tests (100 total). Build 63.53KB / 350KB.

## 2026-08-12 — feat: collection PLP — scent card + asymmetric grid (03 §2, 01 §5.3)

- `ScentCard.astro` per 01 §5.3: ink-2 surface, radius xs, `batch 0N` eyebrow, name with serif-italic article, 3 notes (lilac-3), price, `discover ->`; hover = border → `--scent-tint` (via `data-scent`) + bottle −8px drift (0.5s, `no-preference`-gated). Bottle renders pending assets — scent-tinted duotone placeholder (ADR-008).
- PLP `collection/index.astro`: header (eyebrow `all formulas`, split fragments `five`/`currents`, count `05`), asymmetric 2/3-split editorial grid (cards 1+4 span 2 cols, 5th full-width — layout interpretation flagged), row-hover dims siblings to 60% (0.3s, `:focus-within` mirrors for keyboard).
- `products.json` gains `notes` — sourced verbatim from the brief's olfactive sketches (00 §5), no invented copy.
- card-entrance module: per-page stagger override via `data-stagger` (PLP specs 0.05s — 03 §2; default 0.06s unchanged).
- **Gaps flagged:** PLP nav-theme unspecified (dark); grid rhythm not fully specified (which cards span 2/3); price shows the 50ml variant.
- 1 new unit test (93 total). Build 62.79KB / 350KB.

## 2026-08-07 — feat: home campaign + social bands, footer wiring (03 §1.5–1.7)

- `HomeCampaign.astro` (marquee per M §4.7 wired via `data-anim="marquee"`, amber `limited` chip in its canonical scarcity role only — 01 §1 rule 4; campaign still is duotone placeholder pending photography) + `HomeSocial.astro` (split title fragments, 4 link cards, CSS hover tilt 1.5° within the spec'd 3° cap, micro register, `no-preference`-gated).
- Footer (persistent chrome, outside `[data-taxi]`) now mounts its modules once at boot in `main.ts` — marquee + newsletter were previously unreachable by the router's per-view scan.
- `newsletter.ts` mock per 01 §5.5 / 07 §3 verbatim: `required` / `check your email` / `didn't send — try again.` (amber, eyebrow-size, below field, amber line pulse), ~600ms latency, success = UV line pulse (0.6s) → form collapses (0.5s UI register) → `you're in the current.` + `demo — no list connected.`, `?demo=fail` force-state, `newsletter_signup {source: footer}` on the no-op emitter. RM: instant swap, no pulse/collapse.
- **Gaps flagged:** amber-pulse duration unspecified (matched to the 0.6s UV pulse); social band nav-theme unspecified (dark); ghost-type mix ratio (60% lilac-3) from the PR-13 a11y fix now lives in Footer.
- `btn-primary` promoted to base.css (01 §5.1) — shared by footer, campaign, later PDP. 6 new newsletter tests (92 total). Build 62.67KB / 350KB.

## 2026-08-07 — feat: home hero + two-door split (03 §1.2–1.3)

- `HomeHero.astro` + `HomeDoors.astro` replace the home stub; gallery (03 §1.4) stays a placeholder section — M3 WebGL moment pending GLBs (R2/ADR-008). `home-hero.ts` module: M §4.10 scroll-out verbatim (scrubbed, no pin, title yPercent 30/opacity 0.4, eyebrow+subline exit early by 40%, cue line scaleY scrub — all ease "none"), `next drop` chip enters last (0.5s default register), cue button routes through `scroll.scrollTo` (M §4.1).
- Vapor placeholder-first (ADR-008): `[data-vapor]` duotone gradient wash, opacity = intensity channel driven by Lenis velocity via `onFrame` — `vapor.riv` drops in M3 without touching the module. Door imagery likewise duotone placeholders pending photography; `data-anim="parallax"` wires when real media lands.
- **Gaps flagged:** chip delay unspecified (chose 1.1s, after the cascade settles); cue-line scrub interpretation (scaleY 1→0 over the scroll-out); vapor baseline/range are placeholder values, not LAW.
- 6 new unit tests (86 total): scroll-out recipe + all-"none" eases, chip sequence, velocity→opacity, Lenis-only cue, RM branch, destroy lifecycle. Build + size + asset guard green.

## 2026-08-07 — feat: shared behaviors + marquee — card, parallax, btn-line, marquee modules

- Batched M2 steps 2–3 (owner-approved batching): four PageModules — `card-entrance.ts` (01 §5.3 `data-anim="card"`, ScrollTrigger.batch stagger group, 0.06s inside the M §3 0.05–0.08 card band, default register), `media-parallax.ts` (M §4.5 verbatim: yPercent -12→0, scale 1.15→1, ease none, scrub), `btn-line.ts` (01 §5.1: label y-flip via aria-hidden clone, 0.3s power2.out micro register; border → UV stays pure CSS), `marquee.ts` (M §4.7 verbatim: xPercent -50 loop, repeat -1, ease none, 35s desktop, timeScale 1–2.5 from Lenis velocity lerped back to 1, IntersectionObserver pause, aria-hidden duplication).
- Reduced-motion branches inline per M §9: no batch/scrub/clone/tween in any module — static final state everywhere.
- **Gaps flagged:** §4.5 names no trigger bounds (chose `top bottom`→`bottom top`); §4.7 names no marker or velocity→timeScale mapping (chose `data-anim="marquee"`, target = 1 + min(|v|/1000, 1)×1.5, lerp 0.1); card entrance offset unspecified (chose y 24px).
- 15 new unit tests (80 total): recipe values, velocity scaling/lerp, observer pause, RM branches, destroy lifecycle for all four. Build 61.65KB gzip / 350KB.

## 2026-08-07 — feat: headline reveal module — masked char cascade (M §4.2)

- First M2 module: `scripts/modules/headline-reveal.ts` — SplitText `chars,lines` with `line-mask`, recipe verbatim from M §4.2 (yPercent 110, 0.8s, `power3.out`, 0.02 stagger, `top 85%` once), paired `[data-eyebrow]` fade (0.4s, +0.2s), debounced (200ms) re-split on resize until the once-reveal has played.
- Reduced-motion branch inline (M §9): no SplitText, 0.3s opacity fade with the same trigger. Lifecycle per 03-eng §4.1: per-mount state stack, `destroy()` pops one mount and kills its tweens/ScrollTriggers/split/resize listener exactly.
- **Gap flagged:** M §4.2 names no `data-anim` marker for the split reveal (card/parallax/btn-line are named) — chose `data-anim="split"`; eyebrow pairing contract chose `[data-eyebrow]` sibling lookup (01 §3.3 mandates the pairing, names no selector).
- `gsap.defaults({ ease: "power2.out", duration: 0.5 })` now set once in core (`scroll.ts`, 03-eng §4.2) — was missing since scaffold. `.line-mask { overflow: hidden }` added to base.css. StubSection headings opt in (`data-anim="split"` + `data-eyebrow`) so every stub route exercises the module.
- 7 new unit tests (recipe values, eyebrow fade, reduced-motion branch, resize re-split gating, destroy lifecycle, multi-heading pages); 65 tests total. Build 60.84KB gzip / 350KB.

## 2026-08-07 — chore: parity recordings — 13 reference-build beats captured + archived locally

- Implements guide task 1.10 (R11, M §11): all 13 reference beats recorded as short webm clips into `docs/parity-recordings/`. Owner call: clips **and** the capture script are **local-only** (both gitignored, repo stays lean) — the committed README is the beat map + review tracker. Motion PRs compare side-by-side against the local clips (guide §5 "Every PR").
- Local Playwright capture script (one fresh context per beat — cold load so beat 1's preloader shows, best-effort consent dismissal, scripted scroll/hover/click; `PARITY_BEATS` env var recaptures a subset). `playwright` added as devDependency — pre-approved E2E tooling per `04 §1`, also the runner for the upcoming `04 §2` E2E suite.
- First run captured 12/13; beat 01 timed out on the very first cold navigation (DNS/TLS warmup) — fixed with a 60s goto timeout and recaptured via the subset filter.
- **Flag:** scenarios are best-effort against a live third-party site — every clip is marked `captured, needs review` in the README until a human confirms the beat is actually visible (R3 single-reviewer protocol applies).

## 2026-08-07 — feat: /dev harnesses — rive/glb handoff probes, motion playground

- Implements guide task 1.9 (`06-assets §2`): `/dev/rive` (M §7 artboard inventory + file-presence probe against the contracted `public/assets/rive/` paths), `/dev/glb` (binding acceptance checklist + probe for the 5 bottle GLBs and shared HDR), `/dev/motion` (live playground: reduced-motion/Lenis state, scroll-velocity readout, trap-#10 marquee reference implementation).
- All three render through `layouts/DevHarness.astro`: `noindex,nofollow` always; content only in `astro dev` or builds with `PUBLIC_DEV_HARNESS=true` (production builds render a disabled notice). `.env.example` documents the flag + `PUBLIC_SITE_URL` per `05 §1`; staging/preview CI should set it when that env config lands.
- **Judgment call:** `@rive-app/canvas` and `three.js` are NOT installed yet — zero `.riv`/`.glb` assets exist to smoke-test (placeholders until EOW3/w4 per `06 §1`), and the repo-wide size-limit glob (350KB) would absorb ~250KB of runtimes prematurely (M §10 excludes the Three.js chunk from the per-page budget, but the current gate measures all of `dist/**/*.js`). Both deps are pre-approved (ADR-006) and land with the first real assets; the harness pages are written as acceptance checklists + presence probes so handoff readiness is visible today.
- Extended the `scroll.ts` core singleton with `onFrame(cb)` (single-ticker subscription, returns unsubscribe for `destroy()`) and `velocity()` (Lenis px/s) — trap #10 requires marquees driven by gsap.ticker with Lenis velocity, and `03-eng §4.4` forbids touching the ticker anywhere else. Existing behavior unchanged: no ticker under reduced motion (M §9), so harness marquees are automatically static there.
- 2 new unit tests (`scroll.test.ts` — onFrame dispatch/unsubscribe, velocity wiring); `pnpm build` size 57.44KB gzip / 350KB.

## 2026-08-07 — feat: commerce port — products.json, local adapter, cart chip wiring

- Implements guide task 1.8 (`07 §1`): `src/data/products.json` (all 5 scents, batch 001–005 by collection order per §6.4 disambiguation; fever single €135 `limited` variant per RFC B2), `src/lib/commerce.ts` (port interface + local adapter resolving from the JSON catalog + `localStorage`), and 15 unit tests.
- Port signatures per §1.2 (`getProducts`/`getProduct`/`cartCreate`/`cartAddLine`/`cartRemoveLine`/`checkout`), async like a real backend client. `createAdapter(catalog)` is exported separately so a Shopify Storefront adapter stays a one-file swap (§6) and tests can inject fixture catalogs (e.g. a sold-out variant).
- **Judgment call:** added `getCart()` (read accessor, not in §1.2's list) — the nav cart chip needs to read cart state without creating one. Also added `osvant:cart-changed` `CustomEvent` on mutations so persistent chrome updates without polling; chip wiring lives in `scripts/main.ts`.
- `checkout()` per §1.3: returns a confirmation snapshot (`orderNumber`, lines, subtotal, LAW notice `demo store — no real orders`) and clears the cart; rejects empty carts. The confirmation-step drawer UI is M2 scope.
- `[scent].astro`'s `getStaticPaths` now sources from `getProducts()` instead of a hardcoded scent list — the hardcoding comment from task 1.6 is discharged.
- Instrumentation (`07 §5` `add_to_cart` etc.) intentionally NOT emitted from the port — §5 spec's the trigger as the PDP/cart CTA (UI layer), keeping the port pure.

## 2026-07-27 — feat: preloader — decanting counter, sessionStorage gate, reduced-motion branch

- Implements guide task 1.7 (`M §6`, RFC A2): `core/preloader.ts`, a core singleton (`guide §6.3`) mounted from `layouts/BaseLayout.astro`'s `[data-preloader]` markup and run once from `scripts/main.ts`.
- Gates on `document.fonts.ready` today; `logo.riv`/`page-transition.riv`/`vapor.riv` are still CSS/SVG placeholders with no network load of their own (`06-asset-pipeline §1`), so the `GATES` array is deliberately a single entry with a comment marking where each real Rive-load promise gets added later — no other code changes needed when those assets land.
- 3s hard cap (`M §6.2`) via `Promise.race` against the real gates — forces completion to 100% if loading overruns rather than hanging.
- Exit sequence reuses `transition.out()`'s existing halfway-hook (built in task 1.5) to dispatch a `window` `osvant:hero-reveal` CustomEvent — this is the binding contract a future hero module listens to for its impact-reveal overlap (`M §6.3`/`§4.2`); documented in `preloader.ts` since no hero module exists yet to consume it.
- Reduced motion (`M §9`, "preloader → counter only, no wipe"): skips `transition.out()` entirely rather than falling into its built-in crossfade branch — the counter still fades 0.3s, but there's no wipe of any kind.
- Judgment call: sessionStorage guard lives inside `run()` and always removes stale `[data-preloader]` markup even when skipped (every full page load renders the static HTML fresh) — otherwise a same-session reload would leave a permanent black screen.
- 5 new unit tests (`preloader.test.ts`) mocking `./transition`; `pnpm build` size unaffected in any meaningful way — 55.21KB gzip / 350KB budget.

## 2026-07-27 — feat: base layout — nav/footer, transition scrim, skip link, stub routes

- Implements guide task 1.6 (`01 §5.2/§5.6`, `03 §sitemap`): `layouts/BaseLayout.astro` (head/meta, skip link, `[data-taxi]`/`[data-taxi-view]` container, transition scrim, `scripts/main.ts` bootstrap); `components/Nav.astro` + `components/Footer.astro`; every sitemap route stubbed (`/`, `/collection`, `/collection/[scent]` ×5, `/the-house`, `/journal`, `/contact`, `/legal/privacy`, `/legal/terms`, `/404`).
- `core/nav.ts` (named in `01-arch §3.1`) is the nav-theme `PageModule` — registered first per `01-arch §3.3` ("mount order: nav themes first") via `scripts/main.ts`'s import order. One `ScrollTrigger` per `data-nav-theme` section (`M §4.9`) plus the `nav--solid` toggle past 100vh (`01 §5.2`); applies the correct theme immediately on mount rather than waiting for the next scroll crossing, since a page can load already scrolled past a themed section. Cart chip renders a static `0` — count wiring is `lib/commerce.ts` scope (task 1.8).
- Moved the transition scrim from self-owned DOM (task 1.5's `transition.ts`) into layout markup per `01-arch §7`'s repo-structure note ("layouts: ... transition scrim"); `transition.ts` is unchanged — it still lazily creates its own node if the layout's isn't found, so its existing unit tests needed no changes.
- Added `lib/url.ts` (`withBase()`) — every internal `<a href>` and asset reference now resolves through `import.meta.env.BASE_URL`, closing guide trap #2 (preview deploys serve under `/previews/pr-<n>/`) before any real navigation exists to trip over it.
- Judgment call: the nav's mobile menu is a CSS-only disclosure (button + class toggle) — the spec'd SplitText staggered entrance (`01 §5.2`) is a motion-layer feature better built as its own `PageModule`/animation module once that pattern exists (M2), not hand-rolled into the persistent nav script.
- 10 new unit tests (`lib/url.ts`, `core/nav.ts`); `pnpm build` now emits real client JS — `core+transitions` sits at 54.85KB gzip against the 350KB budget.

## 2026-07-27 — feat: router — taxi.js wiring, clip-path transition API

- Implements guide task 1.5 (`01-arch §3.3`, `M §5`): `core/router.ts` wires `@unseenco/taxi`'s `Core`/`Renderer`/`Transition` to the exact lifecycle in `01-arch §3.3` — leave: `lenis.stop()` → `transition.in()` → destroy page modules → `ScrollTrigger` sweep; enter: mount modules → `transition.out()` (hero-overlap hook) → `lenis.start()`. `core/transition.ts` ships the clip-path placeholder for `{ in(), out(), speed(n) }` (guide §6.5, RFC B4.2) with a 0.3s opacity-crossfade branch under reduced motion (`M §9`).
- Traps closed (guide §8): `document.title` synced manually in `Renderer.onEnter` (#1); `ScrollTrigger.refresh()` once in `onEnterCompleted`, never per-module (#4); `history.scrollRestoration = "manual"` + a pathname→scrollY map restores position on `popstate`, resets to top otherwise (#5).
- Judgment call: `transition.out()`'s "hero reveal overlaps at 50%" hook (§6.5) is implemented as a fixed-delay `setTimeout` at half the tween duration rather than a live GSAP progress callback — the guide explicitly permits either, and a timer keeps the placeholder trivial to swap for the real Rive `speed`-driven timeline later.
- `@unseenco/taxi`'s `Renderer` is reconstructed per navigation (fresh instance per page) while `Transition` state (destroyers, last trigger, scroll positions) must survive across instances — both classes are defined as closures inside `initRouter()` over shared `Map`/`let` state, avoiding module-level mutable singletons that would leak between test runs.
- 13 new unit tests (5 in `transition.test.ts`, 8 in `router.test.ts`) mock `@unseenco/taxi`/`gsap`/`gsap/ScrollTrigger` to assert the wiring rather than the libraries themselves — consistent with the `scroll.ts` test pattern from task 1.4.
- Not wired into a real page yet — no `[data-taxi]` markup exists until the base layout (task 1.6) calls `initRouter()`.

## 2026-07-27 — feat: core singletons — scroll, track, PageModule registry

- Implements guide task 1.4 (`01-arch §3.1/§3.2`): `core/scroll.ts` (Lenis + `gsap.ticker`, the one scroll/RAF loop per §6.1), `core/track.ts` (no-op `dataLayer` emitter, ADR-012), `core/registry.ts` (`PageModule`/`PageContext` contract + `mountModules` per §6.2).
- Added `gsap` + `lenis` as runtime deps — already covered by ADR-006, no new ADR needed.
- Judgment call: `scroll.ts`'s binding-contract snippet is literal, but `M §9` separately mandates "Lenis disabled (native scroll)" under reduced motion — added that branch now per `03-eng §4.4` ("reduced-motion branches written with the feature, not retrofitted"), with `scrollTo` falling back to `scrollIntoView`/native `window.scrollTo`.
- `registry.ts` exports `createModuleRegistry()` (a factory) plus a `registry` singleton — the factory keeps the registry unit-testable without a reset-for-tests escape hatch; the router (task 1.5) will consume the singleton.
- Added `jsdom` + `environment: "jsdom"` in `vitest.config.ts`: these singletons are browser-only (`window`, `matchMedia`, DOM). 13 unit tests cover registration order, destroyer wiring, async mount, reduced-motion branching, and the dataLayer contract.
- Not yet wired into any page/script — `pnpm size` still reports no client JS; wiring lands with the router in task 1.5.

## 2026-07-26 — chore: CI pipeline (lint/types/unit/build + size-limit + LHCI + asset guard)

- Implements guide task 1.3 (`05-cicd §2`): GitHub Actions `ci.yml` — static (format/lint/typecheck) + unit + build jobs in parallel, asset guard, LHCI budgets gated on the build artifact.
- Deviation flagged (guide §7): preview-deploy-then-LHCI-against-CDN needs AWS (S3/CloudFront/OIDC), not yet provisioned. LHCI currently audits `dist/` via `@lhci/cli`'s local static server; swap to the preview URL once `05 §1` infra lands. Staging/prod deploy jobs deferred with it.
- `size-limit` budget (350KB gzip, `M §10`) wrapped in `scripts/check-size.mjs`: no client JS exists before task 1.4 (core runtime), and size-limit throws on a zero-file glob. Wrapper skips with a message until JS exists, then defers to the real check — avoids a fake budget or a permanently-green gate.
- `scripts/check-assets.mjs`: zero-dependency Node script enforcing GLB ≤ 1.5MB, AVIF-only raster images, WebM/MP4 video pairs, woff2-only fonts (`M §8`, `06-asset-pipeline`).
- INP has no lab equivalent; asserted TBT ≤ 200ms as the CI-time proxy (noted in the workflow header).
- Build artifact retained 90 days per `05 §4` (rollback source once promote exists).

## 2026-07-21 — feat: design tokens, base styles, self-hosted fonts

- Implements guide task 1.2 (`01` LAW): `tokens.css` verbatim (colors §2.1, scent tints §2.3, type scale §3.2, layout §4.1, radius §4.3), `fonts.css` (@font-face ×3), `base.css` (focus ring per `M §9`).
- Spec gap flagged + resolved: task 1.2 cites `01 §6` for selection/scrollbar styles, but `01 §6` is Iconography — no such values exist. Owner approved gap-fill: selection = UV bg/black text; scrollbar = thin, `ink-3` on `black` (standard `scrollbar-color` only, no webkit pseudos — Safari keeps native).
- Fonts: Google Fonts latin-subset woff2 (OFL) self-hosted — `archivo-var` 88KB (wdth 62–125 + wght 100–900), `instrument-serif` ±15KB ×2. Archivo preloaded; serif idle-loads on first use. Within guide §4 weight assumptions.
- Style imports + preload live in the temporary `index.astro` shell; they move to the base layout in task 1.6.
- Token guards proven: negative test confirms stylelint catches `#fff`, neutral-gray hex, `box-shadow`, `uppercase`.

## 2026-07-18 — chore: scaffold Astro app, toolchain, and pnpm verify

- Implements guide task 1.1 (`03-eng §1/§2`): Astro via `create-astro` (minimal), TS strict, ESLint 10 flat + Prettier + stylelint token guards, Vitest via `getViteConfig`, `pnpm verify`, PR template, repo layout per `01-arch §7`.
- Version call: Astro 7.1.1 installed — guide §4 declares doc versions as floors, not targets (ADR-001's "Astro 5" reading). Latest-at-install policy per owner instruction.
- TypeScript pinned 6.0.3 (not 7.x): `typescript-eslint` and `@astrojs/check` peer ranges cap at <6.1. Revisit when upstream moves.
- pnpm 11.15.1 pinned (11.13.0 is a known-broken release); build-script approvals + a jsx-a11y peer-range allowance recorded in `pnpm-workspace.yaml`.
- Stylelint mechanically enforces: no `#fff`/`#000`/neutral-gray hexes, no `box-shadow`, no `text-transform: uppercase`, hex colors only in `tokens.css`. ESLint bans native scroll listeners + bare rAF (`03-eng §4.4`).
