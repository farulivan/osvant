# OSVANT — Asset Pipeline & Handoff Contract

> **Eng doc 6 of 9.** Binding contract with design for every external asset (owners/dates per RFC B4). An asset that violates its spec bounces back — the CI asset guard (`05 §2`) enforces the measurable parts.

## 1. Delivery & placeholder ledger

| Asset | Spec (binding) | Due | Placeholder until then (ADR-008) |
|---|---|---|---|
| `logo.riv` | inputs `hover` (bool), `scrolled` (bool) — `M §7` | EOW3 | static SVG wordmark |
| `page-transition.riv` | inputs `in`, `out` (triggers), `speed` (number); covers viewport ≤0.9s per leg | EOW3 | CSS clip-path wipe, same JS API |
| `btn-ui.riv` | inputs `hover` (bool), `press` (trigger) | w4–6 | CSS label y-flip (`M §4.8`) |
| `vapor.riv` | input `intensity` (number 0–1) | w4–6 | UV radial-gradient drift (CSS) |
| `mob-landscape.riv` | autoplay loop | w4–6 | static branded card |
| Bottle GLB ×5 | ≤1.5MB, Draco, shared silhouette, per-scent material, origin at base center, +Y up, real-world scale | first w4, all w6 | primitive bottle (capsule + neck) |
| Turntable ×5 | 1080×1080 6s loop: **VP9-alpha WebM + HEVC-alpha `.mov` (hvc1)** twin (RFC B4.3); fallback ruling: black-composited with baked tint glow | w6 | slow-rotating placeholder GLB render |
| Bottle stills ×5 | 1200px transparent AVIF | w6 | duotone silhouette block |
| OG images | 1200×630, bottle on `--color--black`, wordmark bottom-left, ×5 + 1 house (RFC C4) | w6 | house-default only |
| Campaign + macro photography | duotone-violet grade, AVIF masters ≥2000px | w6 | duotone solid blocks |
| Favicon/app icons | UV `o` glyph on black, SVG + PNG set (RFC C4) | w3 (with logo batch) | plain `o` text SVG |
| Fonts | Archivo Variable woff2 (subset latin), Instrument Serif regular+italic woff2 | have (OFL) | — |
| Email header assets | wordmark/black for Shopify notifications (RFC B1.3) | w3 | Shopify default |

## 2. Handoff acceptance (per asset class)

- **Rive:** artboard + state machine names EXACTLY as `M §7`; inputs verified in Rive editor preview before handoff; `.riv` exported for web runtime ≥2.7. Engineering smoke-tests inputs in an isolated harness page (`/dev/rive`, staging only) before integration.
- **GLB:** validated with `gltf-validator` (zero errors); textures ≤2K, KTX2 where material allows; draco-compressed; loads in `/dev/glb` harness with the shared HDR environment (`M §8` — ONE 2K HDR for all scenes, engineering supplies it to the 3D contractor).
- **Video:** both encodes per turntable; alpha verified on Safari 16.4 + Chrome; loop point seamless (first/last frame identical).
- **Images:** AVIF, no color-profile surprises (sRGB); transparent where spec'd; engineering generates responsive sizes at build (Astro image pipeline) — design ships one master per asset.

## 3. Naming & location

```
public/assets/
  rive/       logo.riv, page-transition.riv, btn-ui.riv, vapor.riv, mob-landscape.riv
  models/     bottle-volt.glb … bottle-halo.glb, env-studio.hdr
  video/      turntable-volt.webm + turntable-volt.mov … (×5 pairs)
  img/        stills/bottle-<scent>.avif, og/og-<scent|house>.avif→png, photo/<set>/<slug>.avif
  fonts/      archivo-var.woff2, instrument-serif[-italic].woff2
```

- kebab-case, scent names as in brief §5, no version suffixes in filenames — versioning via git; replacing an asset = one-file PR (placeholder swaps are drop-in, ADR-008).

## 4. Optimization ownership

| Step | Owner |
|---|---|
| Creative masters (Rive, GLB, photography, video) | design/contractors |
| Draco/KTX2 compression verify, AVIF responsive derivatives, font subsetting | engineering (build scripts, documented in repo) |
| CI asset guard thresholds | engineering (`05 §2`) |

## 5. Escalation

Asset late or failing acceptance → flagged in weekly review → placeholder ships and the milestone proceeds (never blocks); the parity beat it affects is marked "pending asset" in the `M §11` checklist rather than failed. Two consecutive weeks late on a critical-path asset (Rive transition, first GLB) → escalate to heads sync (risk R2, `09-risk-register.md`).
