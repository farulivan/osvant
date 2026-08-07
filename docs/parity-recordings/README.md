# Parity recordings — reference build (R11, M §11)

> Risk R11: the reference build can change or go offline before parity evidence is captured. These clips are the source of truth for the 13 parity beats. **Local-only dev reference** — `*.webm` clips and the capture script are gitignored (owner call: keep the repo lean); this README is the committed beat map + review tracker.

Captured with a local Playwright script (one fresh browser context per beat, scripted scroll/hover/click scenarios). Scenarios are best-effort against a live third-party site — every clip needs a one-time human review pass against its beat before being marked `verified`.

| # | Beat (M §11) | Clip | Status |
|---|---|---|---|
| 1 | Pun preloader + counter | `01-preloader.webm` | captured, needs review |
| 2 | Viewport-filling name, split-char reveal | `02-hero-name-reveal.webm` | captured, needs review |
| 3 | Hero next-race chip | `03-hero-next-race-chip.webm` | captured, needs review |
| 4 | Stacked-fragment titles, line reveals | `04-stacked-title-reveals.webm` | captured, needs review |
| 5 | Scroll-scrubbed 3D helmet gallery, per-item themes | `05-helmet-gallery-scrub.webm` | captured, needs review |
| 6 | Per-section nav theme swap | `06-nav-theme-swap.webm` | captured, needs review |
| 7 | Marquee impact bands | `07-marquee-bands.webm` | captured, needs review |
| 8 | Rive logo + signature flourishes | `08-rive-logo.webm` | captured, needs review |
| 9 | Rive button micro-UI | `09-rive-button-ui.webm` | captured, needs review |
| 10 | Rive page-transition wipe | `10-page-transition-wipe.webm` | captured, needs review |
| 11 | Rotate-phone prompt | `11-rotate-phone-prompt.webm` | captured, needs review |
| 12 | Scroll-velocity-reactive elements | `12-scroll-velocity-elements.webm` | captured, needs review |
| 13 | Designed footer as destination | `13-footer-destination.webm` | captured, needs review |

## Review protocol

1. Watch each clip; confirm the named beat is actually visible (the script logs per-beat pass/fail, but "captured" only means a file exists).
2. If a beat is missing/unclear: recapture manually (QuickTime/screen record is fine — same filename), keep the clip short (<15s) and 720p-ish.
3. Update this table to `verified` per beat. Motion PRs later attach side-by-side recordings against these clips (`00-implementation-guide.md` "Every PR").
