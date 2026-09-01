# OSVANT — Design Brief & Creative Direction

> **Doc 0 of 4.** The "why" behind every decision. Read once before building; return here whenever a spec is ambiguous.
> Downstream docs: `01-design-system.md` (tokens/components) → `02-motion-guidelines.md` (animation contract) → `03-page-specs.md` (per-page acceptance).
> Upstream reference: `landonorris-design-research.md` — the methodology source. When these docs are silent, that research is the tiebreaker.

---

## 1. The Brief

- **Brand:** Osvant — an independent perfume house.
- **Product:** A collection of 5 eaux de parfum, sold direct (e-commerce).
- **The big question:** *How do we make scent — something invisible — feel electric on a screen, and convert fans into buyers?*
- **Primary conversion:** Add-to-cart / buy. **Secondary:** newsletter signup ("join the current").
- **Audience:** 20–35, fragrance-curious, streetwear-and-design literate, buys from brands with a point of view. They have seen Byredo, they follow Awwwards sites, they will not tolerate a generic Shopify theme.

## 2. Positioning & Concept

**Concept: "Scent beyond the visible."**
Scent is invisible, and the only way to see one is on an instrument. Osvant's entire visual identity is built on that reading: a signal-green trace burning on near-black — the colour a chromatograph, an oscilloscope or a night optic uses to draw what the eye cannot — so the site reads as the *readout* of a scent rather than a picture of a bottle.

## 3. The Personality Tension

Per the research methodology (one tension, two axes):

| Axis | Expression | Where it lives |
|---|---|---|
| **Precision** (the lab) | Structure, grid, near-black surfaces, expanded grotesk type, technical eyebrow labels, note pyramids, batch numbers | Layout, typography, information design |
| **Provocation** (the cult) | Signal-green accent, oversized lowercase display type, tonal whispers, fast motion ripples, elastic UI toys, drifting vapor and raking light | Color accents, motion, light, copy voice |

> **Amended 2026-08-31 (owner sign-off) — the tension is carried by one face, not two.**
> The Provocation axis read *"serif-italic whispers"*, and the site paired Archivo
> Expanded Black against Instrument Serif Italic: two typefaces carrying two moods.
> The house now sets in a single family (Mosvita, `01 §3.1`), and the whisper is a
> **tonal** move instead of a second face — the same cut dropped to `--color--haze-3`,
> or lifted to the scent tint for a peak.
>
> This is a correction, not a concession. §2 asks the site to read as *"the readout of
> a scent"*, and the instruments it names — a chromatograph, an oscilloscope, a night
> optic — all draw in **one colour at varying intensity**. A second typeface was the
> one element of the identity arguing against its own concept. One face at varying
> weight and luminance *is* the instrument.
>
> The Precision axis is untouched and now reads more literally than before: *"expanded
> grotesk type"* was a `wdth` axis on a variable font; it is now Mosvita's drawn
> Expanded cut at `usWidthClass` 7 (= `font-stretch: 125%`). Everything else on the
> Provocation axis — oversized lowercase display type, the signal-green accent,
> ripples, vapor, raking light — is unchanged.

**Rule of thumb for any undefined decision:** structure decides *where* things go (precision); motion and accent decide *how* they feel (provocation). Every animated moment must resolve into a CTA (research §1).

## 4. Brand Voice

- **Register:** lowercase-leaning, terse, confident, faintly chemical. Never cute, never luxury-pompous.
- **Tagline (footer):** `provocation, bottled.`
- **Loader line:** `decanting…`
- **Hero:** `Osvant` + subline `scent beyond the visible`
- **Newsletter:** `join the current`
- **Social band:** `@osvant everywhere`
- Microcopy uses lab vocabulary: *batch, formula, concentration, diffusion, voltage*.
- **No `text-transform: uppercase` anywhere** — lowercase display type is a signature (verified trait of the reference build; research §3.2).

## 5. The Collection — "five currents"

Five scents. Each has a scent-scoped accent tint (used ONLY on its detail page and card hover; the house accent stays signal green everywhere else — see `01-design-system.md §2.3`).

| # | Name | Olfactive sketch | Character | Scent tint |
|---|---|---|---|---|
| 01 | **volt** | neroli, yuzu, mint spark | the jolt | `#008D57` (house phosphor) |
| 02 | **nocturne** | oud, black plum, amber | the night | `#3A2FBF` |
| 03 | **static** | aldehydes, white musk, iris | the white noise | `#BAD2C3` |
| 04 | **fever** | saffron, chili-rose, benzoin | the heat | `#FFB000` |
| 05 | **halo** | iris, cashmeran, pale musk | the glow | `#BE29FF` (the retired house UV) |

**Bottle design (settled 2026-08-21):** a **heavy squat rectangular flacon** — roughly 1:1.2 width-to-height, thick pressed-glass walls with a visible glass floor, sharp square shoulders, no neck taper, and a solid machined cap flush with the body width, so the silhouette is one unbroken block. Label: a small silk-screened rectangle, lowercase, batch number in mono.

Identical silhouette across all five, differentiated by liquid and label colour only. The shape reads laboratory rather than boutique, matches the square-corner / no-shadow rules of `01 §4.3`, and holds up as a still — which matters, because the bottle is now presented as a composited image rather than a 3D model (ADR-013, `M §8`).

## 6. Success Criteria (what "done" means)

1. A first-time visitor understands *this is a perfume house with attitude* within 3 seconds (hero).
2. The collection gallery is the memorable moment — the thing people screen-record (our "helmet hall of fame").
3. **Every page scores ≥ 90 Lighthouse Performance on mid-tier mobile.** The former ≥75 carve-out for WebGL pages is withdrawn with ADR-013 — there are no WebGL pages, so there is no exemption to hide behind.
4. All five motion layers (Lenis / ScrollTrigger / SplitText / Rive / **composited light**, `M §8`) ship as specified in `02-motion-guidelines.md` — no silent downgrades. Layer 5 changed medium, not status: a bottle shown as a flat unlit image is a missing layer.
5. Add-to-cart reachable within 2 clicks from any point on the site.
6. **Animation parity (phase 1):** all 13 reference beats in `02-motion-guidelines.md §11` are present and recognizable next to landonorris.com — beat 5 assessed as *equivalent*, not literal (ADR-013). Reading like a "lite" version of the reference is acceptable now; reading like a static site is not. Differentiation is a later-phase goal, density is not negotiable.

## 7. References

- **Method & motion:** `landonorris-design-research.md` (this repo) — token structure, motion grammar, layer architecture, performance standard.
- **Tone adjacency (not to copy):** Byredo (restraint), Off-White (type attitude), Aesop (product information design).

## 8. Non-Goals

- No scent quiz / finder tools in v1.
- No account system in v1 — guest checkout only.
- No ambient full-page WebGL background (research §8 anti-pattern) — and since ADR-013, no WebGL at all.
- No real-time 3D. The bottle is a composited still under moving light (`M §8`); revisit only if the asset budget changes.
- No dark/light theme toggle — the near-black world IS the brand.
