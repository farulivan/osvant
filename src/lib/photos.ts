// lib/photos.ts — the one place a section maps to its photography.
//
// Same shape as `stills.ts`: every consumer resolves through here, so
// swapping a plate is one line rather than a hunt through components.
//
// `exposure` and `tint` travel with the image rather than living in the
// component that happens to render it. Sourced photography is not
// exposure-matched, and a frame that grades to a pale block reads as a
// hole on a near-black page — so the correction belongs to the asset, not
// to the layout.
import type { ImageMetadata } from "astro";

import theLab from "../assets/img/photo/doors/the-lab.jpg";
import theCult from "../assets/img/photo/doors/the-cult.jpg";
import embers from "../assets/img/photo/campaign/embers.jpg";

import saffron from "../assets/img/photo/macro/saffron.jpg";
import oud from "../assets/img/photo/macro/oud.jpg";
import iris from "../assets/img/photo/macro/iris.jpg";
import benzoin from "../assets/img/photo/macro/benzoin.jpg";
import yuzu from "../assets/img/photo/macro/yuzu.jpg";
import neroli from "../assets/img/photo/macro/neroli.jpg";
import blackPlum from "../assets/img/photo/macro/black-plum.jpg";
import chiliRose from "../assets/img/photo/macro/chili-rose.jpg";
import abstract from "../assets/img/photo/macro/abstract.jpg";

export interface Photo {
  image: ImageMetadata;
  alt: string;
  /** <1 darkens. Brings a bright frame down to the rest of the set. */
  exposure?: number;
  /** Overrides the house violet — the fever band grades to its own tint. */
  tint?: string;
}

export const doors: Record<"lab" | "cult", Photo> = {
  lab: {
    image: theLab,
    alt: "",
    exposure: 0.92,
  },
  cult: {
    image: theCult,
    alt: "",
  },
};

// Astro emits an imported asset whether or not it is ever rendered, so an
// unused import ships its full-resolution original into the deploy —
// skin-textures alone was 5.6MB of dead weight. Import a photo when a
// section actually renders it.
//
// Delivered but not yet imported, for exactly that reason:
// campaign/skin-textures.jpg and macro/mint-leaf.jpg. Both are in the
// repo and both get an import the moment something renders them.
export const campaign: Record<"hero", Photo> = {
  /** The fever band grades to amber, not violet — an ember plate pushed
   * violet throws away the only reason it works. */
  hero: {
    image: embers,
    alt: "",
    tint: "var(--scent-tint)",
    exposure: 1.05,
  },
};

/**
 * Macro ingredients, keyed by the note they depict. The formula story
 * looks these up by note name, so a scent's rows come from its own
 * pyramid rather than from a hand-kept list per PDP.
 */
// Exposure starts from measurement — each source's mean luminance against
// a target of ~118, so the ten read as one set rather than as ten
// photographers. Anything already at or below target is left alone.
//
// Mean luminance is the starting point, not the answer. It says nothing
// about how much of the frame is lit, and a plate that fills the frame
// with mid-tone texture still reads as the brightest thing on a near-black
// page even when its mean sits below one that doesn't. Saffron measured
// 150 (0.78 to target) and still blew past two dark-field plates beside it
// in the craft grid, so it is pulled further by eye. Where a measured
// value and a plate's lit area disagree, the eye wins.
export const macro: Record<string, Photo> = {
  saffron: { image: saffron, alt: "saffron threads", exposure: 0.6 },
  oud: { image: oud, alt: "raw oud resin" },
  iris: { image: iris, alt: "dried orris root" },
  benzoin: { image: benzoin, alt: "benzoin resin" },
  yuzu: { image: yuzu, alt: "split citrus", exposure: 0.52 },
  neroli: { image: neroli, alt: "orange blossom" },
  "black plum": { image: blackPlum, alt: "split black plum" },
  "chili-rose": {
    image: chiliRose,
    alt: "dried chili and rose",
    exposure: 0.86,
  },
  aldehydes: { image: abstract, alt: "violet smoke" },
};

/**
 * Two DISTINCT macro plates for a scent, walked from its own note list.
 *
 * Distinct matters: resolving each row independently returned the same
 * plate twice for volt, because the first matching note won both times
 * and the page showed one image in two rows.
 */
export function macroPair(notes: string[]): [Photo, Photo] {
  const picked: Photo[] = [];
  for (const note of notes) {
    const found = macro[note];
    if (found && !picked.includes(found)) picked.push(found);
    if (picked.length === 2) break;
  }
  while (picked.length < 2) {
    const filler = Object.values(macro).find((p) => !picked.includes(p));
    picked.push(filler ?? macro.aldehydes!);
  }
  return [picked[0]!, picked[1]!];
}
