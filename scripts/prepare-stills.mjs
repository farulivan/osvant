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
async function keyBackground(data, width, height, borrowedSilhouette) {
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

  /** How far from neutral a pixel is — glass is neutral, liquid is not. */
  const chroma = (i) =>
    Math.max(data[i], data[i + 1], data[i + 2]) -
    Math.min(data[i], data[i + 1], data[i + 2]);

  // Tight tolerance so the flood stops at the faintest glass contour;
  // anything it leaks through would take the whole silhouette with it.
  // Two tolerances, because one cannot do both jobs. A backdrop is never
  // perfectly flat — it drifts by several levels across the frame — so a
  // single global threshold either stops early and leaves unflooded
  // patches clinging to the bottle, or is loosened until it walks through
  // the glass contour and swallows the panel. Nocturne failed both ways.
  //
  // So the fill grows LOCALLY: a pixel joins the background when it
  // matches the neighbour it spread from, which follows a smooth gradient
  // indefinitely while still stopping dead at the step the glass edge
  // makes. The global bound only decides where the fill may start.
  const SEED_TOLERANCE = 12;
  const LOCAL_TOLERANCE = 2;
  /**
   * Colour similarity alone is not enough to contain the fill. The
   * silhouette's contour is strong everywhere it matters — measured at a
   * 59–150 level step across all five masters — but it only takes ONE
   * weak point for the fill to slip inside, and once in, the clear glass
   * is indistinguishable from the backdrop so it consumes the whole
   * panel. Nocturne failed exactly that way while its neighbours did not.
   *
   * So the contour is made an explicit wall: the fill may not enter any
   * pixel whose local gradient says an edge runs through it. Backdrop
   * gradient is 0–3, so the fill still moves freely across it.
   */
  const EDGE_WALL = 12;
  /** Colour distance at which the outer edge counts as fully opaque. */
  const SOLID_AT = 22;

  // Inside the silhouette the bottle is SOLID. Deriving per-pixel alpha
  // from a clear object photographed on white amplifies noise instead of
  // revealing glass — clear glass barely differs from the backdrop, so
  // any alpha computed from that difference is mostly grain, and the
  // panels came out blotchy and torn. The glass is handled in colour.
  //
  // The trick is that the matte inverts. On white, glass structure reads
  // DARK (edges bend light away from the lens); on near-black the same
  // structure would catch light and read BRIGHT. So for pixels sitting
  // just below the backdrop — that is, clear glass and its faint
  // detail — brightness is remapped: backdrop-white becomes page-dark,
  // and the further a pixel dips below the backdrop the brighter it is
  // drawn. Anything well below the backdrop (cap, label, liquid) is a
  // real object and keeps its own colour.
  const bgLuminance = 0.2126 * bg[0] + 0.7152 * bg[1] + 0.0722 * bg[2];
  /** How far below the backdrop still counts as clear glass. */
  const GLASS_WINDOW = 46;
  /** Ceiling on how bright re-lit glass structure may be drawn. */
  const GLASS_GAIN = 0.8;
  /** Floor, so a very clean master's glass still has body. Where the
   * glass sits at almost exactly backdrop luminance the re-lighting maps
   * it to zero, and the bottle loses its walls entirely — nocturne
   * rendered as a floating liquid with no glass around it. */
  const GLASS_BASE = 0.11;
  /** Above this chroma a pixel is liquid, not glass, and keeps its hue. */
  const CHROMA_SOLID = 11;

  const isBackground = new Uint8Array(width * height);
  const queue = [];

  const luminance = (i) =>
    0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];

  /** Sobel-lite gradient magnitude — where an edge runs, this is large. */
  const gradient = new Uint8Array(width * height);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = (y * width + x) * 4;
      const dx = Math.abs(luminance(i + 4) - luminance(i - 4));
      const dy = Math.abs(luminance(i + width * 4) - luminance(i - width * 4));
      gradient[y * width + x] = Math.min(255, Math.round(dx + dy));
    }
  }

  /** Per-channel difference between two pixels. */
  const step = (a, b) =>
    Math.max(
      Math.abs(data[a] - data[b]),
      Math.abs(data[a + 1] - data[b + 1]),
      Math.abs(data[a + 2] - data[b + 2]),
    );

  const seed = (x, y) => {
    const p = y * width + x;
    if (isBackground[p]) return;
    if (distance(p * 4) > SEED_TOLERANCE) return;
    isBackground[p] = 1;
    queue.push(p);
  };

  const grow = (x, y, from) => {
    const p = y * width + x;
    if (isBackground[p]) return;
    if (gradient[p] > EDGE_WALL) return; // the contour is a wall
    if (step(p * 4, from * 4) > LOCAL_TOLERANCE) return;
    isBackground[p] = 1;
    queue.push(p);
  };

  for (let x = 0; x < width; x++) {
    seed(x, 0);
    seed(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    seed(0, y);
    seed(width - 1, y);
  }

  for (let head = 0; head < queue.length; head++) {
    const p = queue[head];
    const x = p % width;
    const y = (p - x) / width;
    if (x > 0) grow(x - 1, y, p);
    if (x < width - 1) grow(x + 1, y, p);
    if (y > 0) grow(x, y - 1, p);
    if (y < height - 1) grow(x, y + 1, p);
  }

  // JPEG noise in a backdrop leaves specks the flood cannot reach, and
  // because the glass floor gives every un-flooded pixel a visible alpha,
  // a single stray pixel drags the bounding box — and therefore the whole
  // canvas — with it. Nocturne came out 1639px tall against ~1400 for its
  // siblings on exactly one such pixel.
  dropSpecks(isBackground, width, height);

  // The flood's silhouette cannot be trusted on its own. Where a master's
  // clear glass is especially bright, the contour separating it from the
  // backdrop falls inside the tolerance and the fill walks INTO the
  // bottle, hollowing the panels out and leaving a floating liquid blob
  // with torn edges — which is exactly how nocturne failed. Sealing the
  // mask (a morphological close, then filling anything the border cannot
  // reach) closes leak channels thinner than the seal radius and restores
  // the enclosed glass, without touching the nuanced interior alpha.
  await sealSilhouette(isBackground, width, height);

  if (borrowedSilhouette) isBackground.set(borrowedSilhouette);

  // And again afterwards. Making the contour a wall also stops the fill
  // crossing incidental edges in the BACKDROP — a faint reflection line
  // under the bottle, say — stranding strips of unflooded backdrop beside
  // the object. Sealing separates them from the body; this clears them.
  dropSpecks(isBackground, width, height);

  // Object pixels touching the background get a soft, colour-derived
  // alpha; everything deeper is solid. Two passes over a 2px band.
  const out = Buffer.alloc(width * height * 4);
  let relit = 0;

  /** Averages a per-pixel measure over the 3×3 neighbourhood, which keeps
   * JPEG ringing around label text from spiking into visible specks. */
  const smoothed = (measure) => (x, y) => {
    let sum = 0;
    let n = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        sum += measure((ny * width + nx) * 4);
        n++;
      }
    }
    return n === 0 ? 0 : sum / n;
  };
  const meanChroma = smoothed(chroma);

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

      // Solid inside; only the outer contour is feathered, so the
      // silhouette can never come out ragged.
      const contour = nearBackground(x, y);
      out[i + 3] = contour
        ? Math.round(255 * Math.min(1, distance(i) / SOLID_AT))
        : 255;

      if (contour) {
        const donor = nearestInterior(isBackground, width, height, x, y);
        if (donor !== null) {
          out[i] = data[donor];
          out[i + 1] = data[donor + 1];
          out[i + 2] = data[donor + 2];
        }
        continue;
      }

      const luminance =
        0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      const dip = bgLuminance - luminance;

      if (dip < GLASS_WINDOW && meanChroma(x, y) < CHROMA_SOLID) {
        // Clear glass: re-light it. Backdrop-level goes to page-dark,
        // and the faint dark structure becomes the bright edge it would
        // be against a dark ground.
        const structure = Math.max(
          0,
          Math.min(1, (dip / GLASS_WINDOW) * GLASS_GAIN),
        );
        const lit = Math.round(
          255 * (GLASS_BASE + (1 - GLASS_BASE) * structure),
        );
        out[i] = lit;
        out[i + 1] = lit;
        out[i + 2] = lit;
        relit++;
      }
    }
  }

  const keyed = isBackground.reduce((n, v) => n + v, 0);
  return {
    out,
    bg,
    keyedPixels: keyed,
    relitPixels: relit,
    silhouette: isBackground,
  };
}

/**
 * Flood-labels every run of object pixels and marks the specks as
 * background, in place. Keeping only the single LARGEST component is too
 * blunt — a bottle is not necessarily one blob (a cap can meet the body
 * through glass transmissive enough to separate them), and dropping a
 * real part shrinks the silhouette. Anything above a small fraction of
 * the biggest component survives.
 */
function dropSpecks(isBackground, width, height) {
  const seen = new Uint8Array(width * height);
  const components = [];
  let biggest = 0;

  for (let start = 0; start < seen.length; start++) {
    if (isBackground[start] || seen[start]) continue;
    const stack = [start];
    const members = [];
    seen[start] = 1;
    while (stack.length > 0) {
      const p = stack.pop();
      members.push(p);
      const x = p % width;
      const y = (p - x) / width;
      const push = (nx, ny) => {
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) return;
        const q = ny * width + nx;
        if (isBackground[q] || seen[q]) return;
        seen[q] = 1;
        stack.push(q);
      };
      push(x - 1, y);
      push(x + 1, y);
      push(x, y - 1);
      push(x, y + 1);
    }
    components.push(members);
    if (members.length > biggest) biggest = members.length;
  }

  const minimum = Math.max(64, biggest * 0.002);
  for (const members of components) {
    if (members.length >= minimum) continue;
    for (const p of members) isBackground[p] = 1;
  }
}

/** Blur-and-threshold stands in for a morphological pass; sharp does the
 * heavy lifting natively, and the approximation is ample for sealing a
 * leak channel a few pixels wide. */
async function reshape(mask, width, height, sigma, cutoff) {
  // `toColourspace("b-w")` is load-bearing: without it sharp promotes the
  // single-channel mask to sRGB and hands back three bytes per pixel, so
  // every read lands on the wrong byte and the mask comes back empty.
  const blurred = await sharp(Buffer.from(mask), {
    raw: { width, height, channels: 1 },
  })
    .blur(sigma)
    .toColourspace("b-w")
    .raw()
    .toBuffer();
  const out = new Uint8Array(width * height);
  for (let p = 0; p < out.length; p++) out[p] = blurred[p] >= cutoff ? 255 : 0;
  return out;
}

/**
 * Masters whose silhouette is borrowed from another scent's.
 *
 * Every master is the same bottle at the same framing — identical source
 * dimensions, and they register within a pixel of each other once keyed.
 * So when one image defeats the keyer, the honest fix is not to keep
 * bending the algorithm around it: take the silhouette from a sibling
 * that keyed cleanly and let the difficult master supply only its colour.
 * Nocturne's clear glass gives the fill a way in that the others do not,
 * and chasing it was costing the four that already worked.
 *
 * A per-master escape hatch, not a default. Remove an entry when a
 * replacement master keys on its own.
 */
const BORROWED_SILHOUETTE = {
  nocturne: "volt",
};

/** Radius, in pixels, of the widest leak channel worth sealing. */
const SEAL_RADIUS = 5;

async function sealSilhouette(isBackground, width, height) {
  const object = new Uint8Array(width * height);
  for (let p = 0; p < object.length; p++) {
    object[p] = isBackground[p] ? 0 : 255;
  }

  // Order matters, and getting it wrong is what kept nocturne broken.
  // Where the fill has slipped inside a glass panel, what survives is the
  // panel's OUTLINE — a few pixels wide, but a complete one. Eroding
  // before filling destroys exactly those thin strips (a 3px line blurred
  // by this radius never climbs back over the erode threshold), and with
  // the outline gone the fill leaks everywhere. So: dilate to knit the
  // outline shut, FILL, and only then erode back — by which point the
  // interior is solid and has nothing left to lose.
  const grown = await reshape(object, width, height, SEAL_RADIUS, 40);

  // Fill: anything the border cannot reach through the outline is
  // interior — the enclosed clear glass the leak had carved out.
  const outside = new Uint8Array(width * height);
  const queue = [];
  const consider = (x, y) => {
    const p = y * width + x;
    if (outside[p] || grown[p]) return;
    outside[p] = 1;
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

  const filled = new Uint8Array(width * height);
  for (let p = 0; p < filled.length; p++) filled[p] = outside[p] ? 0 : 255;

  // Now shrink back to the true outline.
  const closed = await reshape(filled, width, height, SEAL_RADIUS, 215);
  for (let p = 0; p < isBackground.length; p++) {
    isBackground[p] = closed[p] ? 0 : 1;
  }
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

/** Scent slug from `bottle-<scent>-raw.<ext>`. */
function scentOf(rawName) {
  return rawName.replace(/^bottle-/, "").replace(/-raw\.(png|jpe?g)$/i, "");
}

async function prepare(rawPath, outPath, borrowFrom) {
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
    // A borrowed silhouette is keyed from ITS own master, in the shared
    // source frame, then applied here — same camera, same framing, so the
    // mask lands in register.
    let mask;
    if (borrowFrom) {
      const donor = await sharp(borrowFrom)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      if (donor.info.width !== width || donor.info.height !== height) {
        throw new Error(
          `${name}: cannot borrow a silhouette from a differently-sized master`,
        );
      }
      const donorKey = await keyBackground(donor.data, width, height);
      mask = donorKey.silhouette;
    }
    const result = await keyBackground(source, width, height, mask);
    out = result.out;
    report = `keyed ${result.keyedPixels} px background, ${result.relitPixels} px glass re-lit${
      borrowFrom ? " (silhouette borrowed)" : ""
    }`;
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
    const donor = BORROWED_SILHOUETTE[scentOf(raw)];
    const donorFile = donor
      ? raws.find((candidate) => scentOf(candidate) === donor)
      : undefined;
    await prepare(
      join(STILLS, raw),
      join(STILLS, out),
      donorFile ? join(STILLS, donorFile) : undefined,
    );
  }
}
