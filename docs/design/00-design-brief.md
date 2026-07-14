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
Scent is invisible — like ultraviolet light. Osvant's entire visual identity is built on this metaphor: an ultraviolet accent burning on near-black, as if the site renders what the eye can't normally see.

## 3. The Personality Tension

Per the research methodology (one tension, two axes):

| Axis | Expression | Where it lives |
|---|---|---|
| **Precision** (the lab) | Structure, grid, near-black surfaces, expanded grotesk type, technical eyebrow labels, note pyramids, batch numbers | Layout, typography, information design |
| **Provocation** (the cult) | Ultraviolet accent, oversized lowercase display type, serif-italic whispers, fast motion ripples, elastic UI toys, WebGL vapor | Color accents, motion, 3D, copy voice |

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

Five scents. Each has a scent-scoped accent tint (used ONLY on its detail page and card hover; the house accent stays ultraviolet everywhere else — see `01-design-system.md §2.3`).

| # | Name | Olfactive sketch | Character | Scent tint |
|---|---|---|---|---|
| 01 | **volt** | neroli, yuzu, mint spark | the jolt | `#BE29FF` (house UV) |
| 02 | **nocturne** | oud, black plum, amber | the night | `#3A2FBF` |
| 03 | **static** | aldehydes, white musk, iris | the white noise | `#CDC7DE` |
| 04 | **fever** | saffron, chili-rose, benzoin | the heat | `#FFB000` |
| 05 | **halo** | iris, cashmeran, pale musk | the glow | `#EBD9FF` |

Bottle design assumption for 3D: identical bottle silhouette across the five, differentiated by liquid/label color — keeps the WebGL gallery coherent and asset budget low.

## 6. Success Criteria (what "done" means)

1. A first-time visitor understands *this is a perfume house with attitude* within 3 seconds (hero).
2. The collection gallery is the memorable moment — the thing people screen-record (our "helmet hall of fame").
3. Every page scores ≥ 90 Lighthouse Performance on mid-tier mobile **except** pages with active WebGL scenes, which must stay ≥ 75 (conscious trade-off, research §6).
4. All five motion layers (Lenis / ScrollTrigger / SplitText / Rive / WebGL) ship as specified in `02-motion-guidelines.md` — no silent downgrades.
5. Add-to-cart reachable within 2 clicks from any point on the site.
6. **Animation parity (phase 1):** all 13 reference beats in `02-motion-guidelines.md §11` are present and recognizable next to landonorris.com. Reading like a "lite" version of the reference is acceptable now; reading like a static site is not. Differentiation is a later-phase goal, density is not negotiable.

## 7. References

- **Method & motion:** `landonorris-design-research.md` (this repo) — token structure, motion grammar, layer architecture, performance standard.
- **Tone adjacency (not to copy):** Byredo (restraint), Off-White (type attitude), Aesop (product information design).

## 8. Non-Goals

- No scent quiz / finder tools in v1.
- No account system in v1 — guest checkout only.
- No ambient full-page WebGL background (research §8 anti-pattern).
- No dark/light theme toggle — the near-black world IS the brand.
