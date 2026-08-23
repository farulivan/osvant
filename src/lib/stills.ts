// lib/stills.ts — the one place a scent maps to its bottle still.
//
// Every consumer of a bottle image (PDP hero, gallery procession, and the
// /dev/light harness) resolves through here, so delivering the remaining
// masters is a one-line change per scent rather than a hunt through
// components. Prepared masters come out of `pnpm stills` (06 §2).
//
// Until the other four land (06 §1 ledger), they fall back to volt. That
// is deliberately visible rather than hidden: with the fallback in place
// the five differ only by `--scent-tint`, which is exactly the argument
// for producing the recolours — the tint drives four of the six light-
// study layers but it cannot recolour the liquid.
import type { ImageMetadata } from "astro";
import bottleVolt from "../assets/img/stills/bottle-volt.png";

const DELIVERED: Partial<Record<string, ImageMetadata>> = {
  volt: bottleVolt,
};

/** The still for a scent, falling back to volt while masters are pending. */
export function stillFor(scent: string): ImageMetadata {
  return DELIVERED[scent] ?? bottleVolt;
}

/** True once this scent has its own master — for flagging placeholders. */
export function hasOwnStill(scent: string): boolean {
  return scent in DELIVERED;
}
