# OSVANT — Risk Register

> **Eng doc 9 of 9.** Living document — reviewed in every weekly build review (`08 §3`). Scoring: likelihood × impact, 1–3 each.

| ID | Risk | L | I | Score | Mitigation | Trigger → contingency | Owner |
|---|---|---|---|---|---|---|---|
| R1 | Mid-tier mobile can't hold the perf budget (Lighthouse ≥90 every page, brief §6) | 1 | 3 | 3 | **downgraded 2026-08-21 (ADR-013)** — the WebGL runtime that drove this risk is gone; remaining exposure is bottle-still payload (≤180KB ea, ≤900KB on `/`) and composite paint cost. Test on Pixel 7a from the first real still (w4) | budget red 2 weeks running → drop to 3 parallax layers on mobile, then serve a single composed still per bottle (design sign-off; `M §0.3`) | eng |
| R2 | Critical-path assets late (`page-transition.riv`, bottle stills) | 2 | 2 | 4 | **downgraded 2026-08-21 (ADR-013)** — the bottle is now 10 AVIF instead of 5 GLB + 10 video files, a far shorter production chain. Placeholder-first (ADR-008); binding ledger dates (`06 §1`) | 2 consecutive weeks late → heads sync; parity beats marked "pending asset", launch date reassessed at M3 exit | design |
| R3 | Animation-parity churn — "recognizable" is subjective | 2 | 2 | 4 | single named reviewer (head of design); weekly protocol (`04 §3`); recipes canonical (RFC A4) | same beat contested 2 reviews → side-by-side recording decision, logged in review notes, closed | design |
| R4 | Transition lifecycle leaks (stale triggers, orphaned canvases) — genre's #1 bug source | 2 | 2 | 4 | PageModule contract + router sweep (`01 §3`); E2E navigates every route pair nightly (Sentry = optional seam, `07 §6`) | leak class found → add regression E2E + module audit before next merge | eng |
| R5 | RETIRED 2026-07-13 — hosted checkout dropped, no real checkout exists (ADR-009) | — | — | — | — | — | — |
| R6 | RETIRED 2026-07-13 — availability is static demo data (ADR-009); RFC B3 UI states remain built + E2E-covered | — | — | — | — | — | — |
| R7 | RETIRED 2026-07-13 — zero third-party scripts, no personal data processed (ADR-012); E2E asserts no external calls | — | — | — | — | — | — |
| R8 | RETIRED 2026-08-21 — no alpha video ships; the turntable path was withdrawn with ADR-013 | — | — | — | — | — | — |
| R9 | Scope creep vs. the 8-week plan (new sections, checkout ambitions) | 2 | 2 | 4 | non-goals fixed (brief §8); new scope requires RFC + plan re-baseline | any mid-phase addition → head of eng re-baselines M-dates in same week | both |
| R10 | Single-engineer bus factor on the motion layer | 1 | 2 | 2 | conventions + lifecycle contract documented (`03`, `01 §3`); harness pages for isolated repro | absence > 1w → docs suffice for takeover; parity recordings define expected behavior | eng |
| R11 | Reference site (landonorris.com) changes or goes offline before parity evidence captured | 2 | 2 | 4 | record all 13 beats (`M §11`) in week 1, archive with milestone recordings (`08 §1` M1) | reference unreachable → archived recordings become the parity source of truth | eng |
| R12 | Light study reads as a catalogue photo — the signature moment now rests entirely on five images (ADR-013) | 2 | 3 | 6 | flat-lit rule enforced at handoff (`06 §2`); three distinct parallax rates + visible angle sweep are acceptance boxes (`03 §1.4`), not polish; review the composite in `/dev/light` before the stills are signed off | beat 5 fails two consecutive reviews → escalate the `N=8` lit-state upgrade (`M §8.2`), which needs asset budget but no code change | design |

## Review log

| Date | Change |
|---|---|
| 2026-07-11 | Initial register (10 risks) at plan approval |
| 2026-07-13 | Portfolio re-scope (ADR-009–012): R5/R6/R7 retired; R11 (reference snapshot) added |
| 2026-08-21 | No-3D re-scope (ADR-013): R8 retired; R1 downgraded 6→3; R2 downgraded 6→4; **R12 added** (light study carries the signature moment on image quality alone) |
