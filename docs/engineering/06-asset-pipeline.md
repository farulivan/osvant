# OSVANT — Asset Pipeline & Handoff Contract

> **Eng doc 6 of 9.** Binding contract with design for every external asset (owners/dates per RFC B4). An asset that violates its spec bounces back — the CI asset guard (`05 §2`) enforces the measurable parts.
>
> **Revised 2026-08-21 (ADR-013).** GLBs, the shared HDR and the alpha-turntable video pair are withdrawn; the bottle ships as two AVIF sets. No video asset class remains in v1.

## 1. Delivery & placeholder ledger

| Asset | Spec (binding) | Due | Placeholder until then (ADR-008) |
|---|---|---|---|
| `logo.riv` | inputs `hover` (bool), `scrolled` (bool) — `M §7` | EOW3 | static SVG wordmark |
| `page-transition.riv` | inputs `in`, `out` (triggers), `speed` (number); covers viewport ≤0.9s per leg | EOW3 | CSS clip-path wipe, same JS API |
| `btn-ui.riv` | inputs `hover` (bool), `press` (trigger) | w4–6 | CSS label y-flip (`M §4.8`) |
| `vapor.riv` | input `intensity` (number 0–1) | w4–6 | UV radial-gradient drift (CSS) |
| `mob-landscape.riv` | autoplay loop | w4–6 | static branded card |
| **Bottle stills ×5** (AST-03a) | 2000px long edge, transparent AVIF, **flat-lit** — no baked specular/rim/shadow (`M §8.3`); identical camera, framing and scale across all five; ≥12% transparent margin every side; ≤180KB at 1× | w6 | duotone silhouette block behind the same `--light-angle` contract |
| **Bottle detail macro ×5** (AST-03b) | 1600px AVIF, close crop of cap / label edge / liquid meniscus, same lighting family as AST-03a | w6 | duotone block |
| OG images | 1200×630, bottle on `--color--black`, wordmark bottom-left, ×5 + 1 house (RFC C4) | w6 | house-default only |
| Campaign + macro photography | duotone-violet grade, AVIF masters ≥2000px | w6 | duotone solid blocks |
| Favicon/app icons | UV `o` glyph on black, SVG + PNG set (RFC C4) | w3 (with logo batch) | plain `o` text SVG |
| Fonts | Archivo Variable woff2 (subset latin), Instrument Serif regular+italic woff2 | have (OFL) | — |
| Email header assets | wordmark/black for Shopify notifications (RFC B1.3) | w3 | Shopify default |

## 2. Handoff acceptance (per asset class)

- **Rive:** artboard + state machine names EXACTLY as `M §7`; inputs verified in Rive editor preview before handoff; `.riv` exported for web runtime ≥2.7. Engineering smoke-tests inputs in an isolated harness page (`/dev/rive`, staging only) before integration.
- **Bottle stills:** the flat-lit rule is a **hard reject at handoff** — a master carrying its own dramatic lighting double-lights against layers 1/3/4 of the light study and cannot be used (`M §8.3`). Checked in the `/dev/light` harness: composite the candidate under the sheen/rim layers and sweep `--light-angle` 0→1; highlights must appear to move. Alpha must be clean at the silhouette edge (no white/black fringing) — it is reused as the mask for layers 3 and 4, so fringing shows up as a glowing outline. All five overlaid must register to within 2px.
- **Images:** AVIF, no color-profile surprises (sRGB); transparent where spec'd; engineering generates responsive sizes at build (Astro image pipeline) — design ships one master per asset.

## 3. Naming & location

```
public/assets/
  rive/       logo.riv, page-transition.riv, btn-ui.riv, vapor.riv, mob-landscape.riv
  img/        stills/bottle-<scent>.avif, stills/bottle-<scent>-detail.avif,
              og/og-<scent|house>.avif→png, photo/<set>/<slug>.avif
  fonts/      archivo-var.woff2, instrument-serif[-italic].woff2
```

- kebab-case, scent names as in brief §5, no version suffixes in filenames — versioning via git; replacing an asset = one-file PR (placeholder swaps are drop-in, ADR-008).

## 4. Optimization ownership

| Step | Owner |
|---|---|
| Creative masters (Rive, bottle stills, photography) | design/contractors |
| AVIF responsive derivatives, OG composites, font subsetting | engineering (build scripts, documented in repo) |
| CI asset guard thresholds | engineering (`05 §2`) |

## 5. Escalation

Asset late or failing acceptance → flagged in weekly review → placeholder ships and the milestone proceeds (never blocks); the parity beat it affects is marked "pending asset" in the `M §11` checklist rather than failed. Two consecutive weeks late on a critical-path asset (`page-transition.riv`, first bottle still) → escalate to heads sync (risk R2, `09-risk-register.md`).
