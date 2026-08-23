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

/** True once this scent has its own master — for flagging placeholders. */
export function hasOwnStill(scent: string): boolean {
  return scent in DELIVERED;
}
