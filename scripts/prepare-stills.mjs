/*
 * Bottle-still preparation (06 §2 handoff acceptance, M §8.3).
 *
 * Design ships one flat-lit master per scent. Two things reliably need
 * correcting before a master can go under the light study, and both are
 * mechanical, so they live here rather than in a handoff note:
 *
 *   1. De-matte. Cutouts carry their old backdrop in the soft alpha edge —
 *      a white-background cut leaves a near-white halo. That matters more
 *      here than usual: the same alpha channel is reused as the mask for
 *      layers 3 and 4 (M §8.1), so a contaminated edge shows up as a
 *      glowing outline around the bottle rather than a subtle fringe.
 *      Every semi-transparent pixel borrows its colour from the nearest
 *      fully-opaque neighbour, leaving the alpha shape itself untouched.
 *
 *   2. Re-canvas. 06 §1 requires ≥12% transparent margin on every side —
 *      the sheen and rim layers draw into that space. Masters commonly
 *      land a point or two short.
 *
 * A master delivered on a flat backdrop (JPEG, no alpha) is keyed here
 * too, and that is the preferred handoff: keying a uniform backdrop
 * programmatically beats repairing a cutout someone else made, because
 * the alpha ramp stays under our control. See `keyBackground`.
 *
 * Reads  src/assets/img/stills/<name>-raw.{png,jpg,jpeg}
 * Writes src/assets/img/stills/<name>.png   (the master Astro converts)
 *
 * Idempotent: re-running overwrites the output from the raw each time.
 * Run via `pnpm stills`.
 */

import { readdirSync } from "node:fs";
import { basename, join } from "node:path";
import sharp from "sharp";

const STILLS = new URL("../src/assets/img/stills/", import.meta.url).pathname;

/** 06 §1 — the sheen and rim layers need this much room outside the glass. */
const MIN_MARGIN = 0.12;
/** Alpha below this is background; above it is solid object. */
const TRANSPARENT = 8;
const OPAQUE = 250;
/** How far to search for a clean colour donor before giving up. */
const DONOR_RADIUS = 6;

/**
 * Replaces the colour of every partially-transparent pixel with its
 * nearest opaque neighbour's, so the edge carries the object's colour
 * instead of whatever it was cut out from. Alpha is never modified.
 */
function deMatte(data, width, height) {
  const out = Buffer.from(data);
  const at = (x, y) => (y * width + x) * 4;
  let corrected = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = at(x, y);
      const alpha = data[i + 3];
      if (alpha < TRANSPARENT || alpha > OPAQUE) continue;

      let donor = null;
      for (let r = 1; r <= DONOR_RADIUS && donor === null; r++) {
        // Walk the ring at distance r, nearest first.
        for (let dy = -r; dy <= r && donor === null; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
            const j = at(nx, ny);
            if (data[j + 3] > OPAQUE) {
              donor = j;
              break;
            }
          }
        }
      }

      if (donor !== null) {
        out[i] = data[donor];
        out[i + 1] = data[donor + 1];
        out[i + 2] = data[donor + 2];
        corrected++;
      }
    }
  }

  return { out, corrected };
}

/**
 * Builds an alpha channel for a master shot on a flat backdrop.
 *
 * A plain colour-distance key cannot work here: the bottle is glass, so
 * pixels inside the silhouette come within a few levels of the backdrop
 * and a threshold would punch holes straight through the clear panels.
 * So the background is found by CONNECTIVITY instead — flood from the
 * border, and treat everything the flood cannot reach as object, which
 * reclaims the enclosed clear glass automatically.
 *
 * The edge is then softened over a two-pixel band using colour distance,
 * so the cutout is anti-aliased rather than stair-stepped.
 */
function keyBackground(data, width, height) {
  const at = (x, y) => (y * width + x) * 4;

  // Backdrop colour, averaged over the four corners.
  const corners = [
    [4, 4],
    [width - 5, 4],
    [4, height - 5],
    [width - 5, height - 5],
  ].map(([x, y]) => {
    const i = at(x, y);
    return [data[i], data[i + 1], data[i + 2]];
  });
  const bg = [0, 1, 2].map((c) =>
    Math.round(corners.reduce((sum, p) => sum + p[c], 0) / corners.length),
  );

  const distance = (i) =>
    Math.max(
      Math.abs(data[i] - bg[0]),
      Math.abs(data[i + 1] - bg[1]),
      Math.abs(data[i + 2] - bg[2]),
    );

  // Tight tolerance so the flood stops at the faintest glass contour;
  // anything it leaks through would take the whole silhouette with it.
  const FLOOD_TOLERANCE = 10;
  /** Colour distance at which the outer edge counts as fully opaque. */
  const SOLID_AT = 22;
  // Clear glass transmits whatever is behind it, so on a white backdrop
  // the panels photograph white — and a binary cut ships that white onto
  // a near-black page as frosted plastic. Alpha INSIDE the silhouette
  // therefore tracks colour distance too: backdrop-coloured glass becomes
  // transmissive while liquid, cap and label stay solid. That is also
  // what lets the tint wash and caustic (layers 0 and 1, behind the
  // bottle) glow through the glass, which is the point of the stack
  // (M §8.1).
  const GLASS_RAMP = 58;
  /** Glass never goes fully clear — its structure has to stay readable. */
  const GLASS_FLOOR = 0.16;

  const isBackground = new Uint8Array(width * height);
  const queue = [];

  const consider = (x, y) => {
    const p = y * width + x;
    if (isBackground[p]) return;
    if (distance(p * 4) > FLOOD_TOLERANCE) return;
    isBackground[p] = 1;
    queue.push(p);
  };

  for (let x = 0; x < width; x++) {
    consider(x, 0);
    consider(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    consider(0, y);
    consider(width - 1, y);
  }

  for (let head = 0; head < queue.length; head++) {
    const p = queue[head];
    const x = p % width;
    const y = (p - x) / width;
    if (x > 0) consider(x - 1, y);
    if (x < width - 1) consider(x + 1, y);
    if (y > 0) consider(x, y - 1);
    if (y < height - 1) consider(x, y + 1);
  }

  // Object pixels touching the background get a soft, colour-derived
  // alpha; everything deeper is solid. Two passes over a 2px band.
  const out = Buffer.alloc(width * height * 4);
  let transmissive = 0;
  const nearBackground = (x, y) => {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        if (isBackground[ny * width + nx]) return true;
      }
    }
    return false;
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = y * width + x;
      const i = p * 4;
      out[i] = data[i];
      out[i + 1] = data[i + 1];
      out[i + 2] = data[i + 2];
      if (isBackground[p]) {
        out[i + 3] = 0;
        continue;
      }

      const d = distance(i);

      if (nearBackground(x, y)) {
        // Outer contour: anti-alias out, and borrow colour from a clean
        // neighbour so no backdrop bleed survives in the edge.
        out[i + 3] = Math.round(255 * Math.min(1, d / SOLID_AT));
        const donor = nearestInterior(isBackground, width, height, x, y);
        if (donor !== null) {
          out[i] = data[donor];
          out[i + 1] = data[donor + 1];
          out[i + 2] = data[donor + 2];
        }
      } else {
        const alpha = Math.max(GLASS_FLOOR, Math.min(1, d / GLASS_RAMP));
        out[i + 3] = Math.round(255 * alpha);
        if (alpha < 0.95) transmissive++;
      }
    }
  }

  const keyed = isBackground.reduce((n, v) => n + v, 0);
  return { out, bg, keyedPixels: keyed, transmissivePixels: transmissive };
}

/** Index of the nearest pixel the flood did not mark as background. */
function nearestInterior(isBackground, width, height, x, y) {
  for (let r = 1; r <= 4; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const q = ny * width + nx;
        if (!isBackground[q]) return q * 4;
      }
    }
  }
  return null;
}

/** Tight bounds of everything that is not background. */
function alphaBounds(data, width, height) {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] < TRANSPARENT) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return { minX, minY, maxX, maxY };
}

/** True when every pixel is opaque — i.e. the master arrived without a cut. */
function isFullyOpaque(data) {
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] !== 255) return false;
  }
  return true;
}

async function prepare(rawPath, outPath) {
  const name = basename(outPath);
  const { data: source, info } = await sharp(rawPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;

  // A keyed master de-mattes its own contour; running the standalone
  // pass over it would flatten the transmissive glass back to solid.
  let out;
  let report;
  if (isFullyOpaque(source)) {
    const result = keyBackground(source, width, height);
    out = result.out;
    report = `keyed ${result.keyedPixels} px background, ${result.transmissivePixels} px transmissive glass`;
  } else {
    const result = deMatte(source, width, height);
    out = result.out;
    report = `de-matted ${result.corrected} px`;
  }
  const { minX, minY, maxX, maxY } = alphaBounds(out, width, height);
  const objectW = maxX - minX + 1;
  const objectH = maxY - minY + 1;

  // Square canvas sized so the tightest axis still clears MIN_MARGIN.
  const side =
    Math.ceil(Math.max(objectW, objectH) / (1 - MIN_MARGIN * 2) / 2) * 2;

  const cropped = await sharp(out, { raw: { width, height, channels: 4 } })
    .extract({ left: minX, top: minY, width: objectW, height: objectH })
    .toBuffer();

  await sharp({
    create: {
      width: side,
      height: side,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: cropped,
        raw: { width: objectW, height: objectH, channels: 4 },
        left: Math.round((side - objectW) / 2),
        top: Math.round((side - objectH) / 2),
      },
    ])
    .png({ compressionLevel: 9 })
    .toFile(outPath);

  const margin = (((side - objectH) / 2 / side) * 100).toFixed(1);
  console.log(
    `${name} — ${report}, canvas ${side}×${side}, object ${objectW}×${objectH}, tightest margin ${margin}%`,
  );
}

const raws = readdirSync(STILLS).filter((f) => /-raw\.(png|jpe?g)$/i.test(f));

if (raws.length === 0) {
  console.log(
    "No *-raw.{png,jpg,jpeg} masters in src/assets/img/stills/ — nothing to do.",
  );
} else {
  for (const raw of raws) {
    const out = raw.replace(/-raw\.(png|jpe?g)$/i, ".png");
    await prepare(join(STILLS, raw), join(STILLS, out));
  }
}
