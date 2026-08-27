/*
 * Font subsetting (06 §1 "subset latin", 06 §4 "font subsetting →
 * engineering").
 *
 * This was specified from the start and never done. Archivo shipped as the
 * full 88KB Google delivery, and it was the single largest resource on
 * every page — measurably the reason `/` and the PDPs missed the 2.5s LCP
 * budget (M §10). Bisected on built output: removing the font moved LCP
 * 2630ms → 1986ms, more than removing ALL the JavaScript did (2180ms).
 *
 * Two reductions, and the second is the surprising one:
 *
 *   1. Charset. The site renders 74 unique glyphs. We keep printable
 *      ASCII plus a fixed set of typographic extras — deliberately wider
 *      than what is currently used, so ordinary new copy cannot produce
 *      tofu. `check-glyphs.mjs` fails the build if it ever does.
 *
 *   2. Variation axes. A variable font's weight is variation deltas per
 *      glyph, not glyph count, so charset alone only bought 39%
 *      (88.0 → 53.5KB). The `wdth` axis is the expensive one: nothing in
 *      the codebase renders below `wdth 100` or `wght 400`, and dropping
 *      those unused ranges saved another 16.6KB — more than removing
 *      ~150 glyphs did. Final: 88.0 → 35.8KB, and LCP 2630 → 2136ms.
 *
 * Axis narrowing is a deviation from `01 §2` (which declares the family as
 * `wdth 62–125, wght 100–900`); the doc is amended to match, owner signed
 * off 2026-08-27. It changes zero rendered pixels today, but it does mean
 * a thin weight or the 62% condensed width needs this range widened and
 * the fonts regenerated first — the browser will otherwise synthesise
 * rather than render what you asked for.
 *
 * Sources live in `src/assets/fonts/` (never served). Output goes to
 * `public/assets/fonts/`, which needs stable unhashed URLs for the
 * preload in BaseLayout. Both are committed: a fresh clone builds a
 * correct site without anyone remembering to run this first.
 *
 * Regenerate with `pnpm fonts`.
 */

import { readFileSync, writeFileSync, mkdirSync, statSync } from "node:fs";
import { join } from "node:path";

import subsetFont from "subset-font";

import { retainedCharacters } from "./font-charset.mjs";

const ROOT = new URL("..", import.meta.url).pathname;
const SRC = join(ROOT, "src", "assets", "fonts");
const OUT = join(ROOT, "public", "assets", "fonts");

/**
 * `wght` stops at 400 and `wdth` at 100 because nothing renders outside
 * that. Verified by grep across `src/` excluding the `@font-face`
 * descriptors themselves, which is where an earlier pass fooled itself
 * into thinking the extremes were in use.
 */
const FONTS = [
  {
    file: "archivo-var.woff2",
    variationAxes: {
      wght: { min: 400, max: 900 },
      wdth: { min: 100, max: 125 },
    },
  },
  // Instrument Serif is a static family — one weight, no axes. Its win is
  // small in absolute terms but it is on the same critical path.
  { file: "instrument-serif.woff2" },
  { file: "instrument-serif-italic.woff2" },
];

const chars = retainedCharacters();
mkdirSync(OUT, { recursive: true });

let before = 0;
let after = 0;

for (const { file, variationAxes } of FONTS) {
  const source = readFileSync(join(SRC, file));
  const subset = await subsetFont(source, chars, {
    targetFormat: "woff2",
    ...(variationAxes ? { variationAxes } : {}),
  });

  writeFileSync(join(OUT, file), subset);

  const from = source.length;
  const to = subset.length;
  before += from;
  after += to;

  console.log(
    `  ${file.padEnd(30)} ${(from / 1024).toFixed(1).padStart(6)}KB → ` +
      `${(to / 1024).toFixed(1).padStart(6)}KB  (-${Math.round(100 - (to / from) * 100)}%)`,
  );
}

console.log(
  `\nFonts: ${[...new Set(chars)].length} glyphs retained, ` +
    `${(before / 1024).toFixed(1)}KB → ${(after / 1024).toFixed(1)}KB ` +
    `(-${Math.round(100 - (after / before) * 100)}%).`,
);

// Guard against a silent regression: if a future source drop or a
// subset-font upgrade stops shrinking the font, the budget miss comes
// back quietly and nothing else in CI is watching this number.
const ARCHIVO_LIMIT_BYTES = 48 * 1024;
const archivo = statSync(join(OUT, "archivo-var.woff2")).size;
if (archivo > ARCHIVO_LIMIT_BYTES) {
  console.error(
    `\nArchivo subset is ${(archivo / 1024).toFixed(1)}KB, limit 48KB — ` +
      `this is what holds LCP under the 2.5s budget (M §10).`,
  );
  process.exit(1);
}
