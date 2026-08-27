// lib/stills.ts — the one place a scent maps to its bottle still.
//
// Every consumer of a bottle image (PDP hero, gallery procession, and the
// /dev/light harness) resolves through here, so delivering the remaining
// masters is a one-line change per scent rather than a hunt through
// components. Prepared masters come out of `pnpm stills` (06 §2).
//
// All five delivered 2026-08-23. They register within 3px of each other
// after the pipeline's re-canvas step, which normalises every master to
// the same proportional margin — so the procession does not jitter as it
// scrubs between them (06 §2 acceptance).
import type { ImageMetadata } from "astro";
import bottleVolt from "../assets/img/stills/bottle-volt.png";
import bottleNocturne from "../assets/img/stills/bottle-nocturne.png";
import bottleStatic from "../assets/img/stills/bottle-static.png";
import bottleFever from "../assets/img/stills/bottle-fever.png";
import bottleHalo from "../assets/img/stills/bottle-halo.png";

import detailVolt from "../assets/img/stills/bottle-volt-detail.png";
import detailNocturne from "../assets/img/stills/bottle-nocturne-detail.png";
import detailStatic from "../assets/img/stills/bottle-static-detail.png";
import detailFever from "../assets/img/stills/bottle-fever-detail.png";
import detailHalo from "../assets/img/stills/bottle-halo-detail.png";

const DELIVERED: Partial<Record<string, ImageMetadata>> = {
  volt: bottleVolt,
  nocturne: bottleNocturne,
  static: bottleStatic,
  fever: bottleFever,
  halo: bottleHalo,
};

/** The still for a scent, falling back to volt while masters are pending. */
export function stillFor(scent: string): ImageMetadata {
  return DELIVERED[scent] ?? bottleVolt;
}

/**
 * AST-03b — the bottle detail macro, row 1 of the formula story
 * (03 §3.3, not optional). Derived from each master by `pnpm stills`
 * rather than shot separately: a close crop gives cap, collar and liquid
 * meniscus at roughly 1:1 for the size the row renders at.
 */
const DETAILS: Partial<Record<string, ImageMetadata>> = {
  volt: detailVolt,
  nocturne: detailNocturne,
  static: detailStatic,
  fever: detailFever,
  halo: detailHalo,
};

export function detailFor(scent: string): ImageMetadata {
  return DETAILS[scent] ?? detailVolt;
}

/** True once this scent has its own master — for flagging placeholders. */
export function hasOwnStill(scent: string): boolean {
  return scent in DELIVERED;
}
