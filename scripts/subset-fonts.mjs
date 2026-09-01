/*
 * Font subsetting (06 §1 "subset latin", 06 §4 "font subsetting →
 * engineering").
 *
 * Fonts are the tightest budget on this project. Archivo shipped as the
 * full 88KB Google delivery and was the single largest resource on every
 * page — measurably the reason `/` and the PDPs missed the 2.5s LCP
 * budget (M §10). Bisected on built output: removing the font moved LCP
 * 2630ms → 1986ms, more than removing ALL the JavaScript did (2180ms).
 * Subsetting is what bought that back, and it stays load-bearing.
 *
 * The site now runs on ONE face — Mosvita (01 §3.1, amended 2026-08-31).
 * Three static cuts, chosen to map exactly onto the three weight/width
 * combinations 01 §3.3 specifies and nothing else:
 *
 *   400 / 100%   body, lead, long-form            (§3.3 "Body/lead")
 *   600 / 100%   eyebrows, buttons, nav, UI       (§3.3 "Eyebrows")
 *   900 / 125%   every heading, impact, wordmark  (§3.3 "Headlines")
 *
 * Two notes on that table, both of which bite if forgotten:
 *
 *   1. Mosvita has no Medium. The family runs 300/400/600/700/800/900,
 *      so the eyebrow weight is 600 — 500 does not exist and asking for
 *      it gets a synthesised fake, silently.
 *   2. The 125% cut is a SEPARATE FILE, not a `wdth` axis. Archivo did
 *      expanded with a variable axis; Mosvita ships `Mosvita-BlackExpanded`
 *      as its own master with `usWidthClass` 7 (= 125%). That is why the
 *      variant in astro.config.mjs carries `stretch: "125%"` — it is the
 *      descriptor that makes `font-stretch: 125%` select this file rather
 *      than synthesise a stretch of the 100% one.
 *
 * Charset: the site renders 74 unique glyphs. We keep printable ASCII
 * plus a fixed set of typographic extras — deliberately wider than what
 * is used today, so ordinary new copy cannot produce tofu.
 * `check-glyphs.mjs` fails the build if it ever does. All four masters
 * cover the full retained set; `pnpm fonts:inspect` re-verifies that
 * before you trust a new drop.
 *
 * Mosvita is CFF-outlined (`.otf`), which woff2 compresses less well than
 * the glyf outlines in a `.ttf`. Measured anyway: 36.7KB → 11.5KB per cut,
 * -69%, so the three-cut payload is 34.7KB — less than Archivo ALONE cost
 * (35.8KB), and 22.1KB less than the two-face build (56.8KB).
 *
 * Masters live in `src/assets/fonts/masters/` and are gitignored (licensed
 * originals). Output goes to `src/assets/fonts/`, which is committed and
 * is what `astro.config.mjs` points its local font provider at — Astro
 * hashes and serves them from `_astro/fonts/`. A fresh clone therefore
 * builds a correct site without the masters present.
 *
 * Note Astro does NOT subset and does NOT convert `.otf` → `.woff2`
 * (ADR-014). This script is the only thing standing between the masters
 * and the wire.
 *
 * Regenerate with `pnpm fonts`. Inspect masters with `pnpm fonts:inspect`.
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";

import subsetFont from "subset-font";

import { retainedCharacters } from "./font-charset.mjs";
import { FONT_PAYLOAD_LIMIT_BYTES } from "./font-budget.mjs";

const ROOT = new URL("..", import.meta.url).pathname;
const MASTERS = join(ROOT, "src", "assets", "fonts", "masters");
const OUT = join(ROOT, "src", "assets", "fonts");

/**
 * Masters are matched by PREFIX, not by full filename: the foundry ships
 * a build hash in the name (`Mosvita-Regular-BF66e8fab212dc5.otf`) that
 * changes on every re-download. The trailing hyphen in each prefix is
 * what keeps `Mosvita-Black-` from also matching `Mosvita-BlackExpanded-`.
 */
const FONTS = [
  {
    prefix: "Mosvita-Regular-",
    out: "mosvita-regular.woff2",
    weight: 400,
    stretch: "100%",
  },
  {
    prefix: "Mosvita-SemiBold-",
    out: "mosvita-semibold.woff2",
    weight: 600,
    stretch: "100%",
  },
  {
    prefix: "Mosvita-BlackExpanded-",
    out: "mosvita-black-expanded.woff2",
    weight: 900,
    stretch: "125%",
  },
];

if (!existsSync(MASTERS)) {
  console.error(
    `No masters at src/assets/fonts/masters/.\n\n` +
      `The .otf originals are gitignored, so a fresh clone does not have them —\n` +
      `and does not need them: the subset woff2 files are committed and the site\n` +
      `builds fine. You only need the masters to re-run this script, e.g. after\n` +
      `widening retainedCharacters() in scripts/font-charset.mjs.\n\n` +
      `See src/assets/fonts/masters/README.md for what belongs there.\n`,
  );
  process.exit(1);
}

const available = readdirSync(MASTERS).filter(
  (f) => extname(f).toLowerCase() === ".otf",
);

/** @returns {string} the single master file matching `prefix` */
function resolveMaster(prefix) {
  const matches = available.filter((f) => f.startsWith(prefix));

  if (matches.length === 0) {
    throw new Error(
      `no master matching "${prefix}*.otf" — have: ${available.join(", ") || "(none)"}`,
    );
  }
  if (matches.length > 1) {
    throw new Error(
      `"${prefix}*.otf" is ambiguous, matched ${matches.length}: ${matches.join(", ")}. ` +
        `Delete the stale copy — two builds of the same cut differ only by hash.`,
    );
  }
  return matches[0];
}

const chars = retainedCharacters();

let before = 0;
let after = 0;

for (const { prefix, out, weight, stretch } of FONTS) {
  const master = resolveMaster(prefix);
  const source = readFileSync(join(MASTERS, master));
  const subset = await subsetFont(source, chars, { targetFormat: "woff2" });

  writeFileSync(join(OUT, out), subset);

  before += source.length;
  after += subset.length;

  console.log(
    `  ${out.padEnd(28)} ${String(weight).padStart(3)} / ${stretch.padEnd(5)} ` +
      `${(source.length / 1024).toFixed(1).padStart(6)}KB → ` +
      `${(subset.length / 1024).toFixed(1).padStart(6)}KB  ` +
      `(-${Math.round(100 - (subset.length / source.length) * 100)}%)`,
  );
}

console.log(
  `\nFonts: ${[...new Set(chars)].length} glyphs retained, ` +
    `${(before / 1024).toFixed(1)}KB → ${(after / 1024).toFixed(1)}KB ` +
    `(-${Math.round(100 - (after / before) * 100)}%).`,
);

// The same cap check-assets.mjs runs in CI. Duplicated here on purpose:
// this is where you find out immediately, rather than three commits later.
if (after > FONT_PAYLOAD_LIMIT_BYTES) {
  console.error(
    `\nFont payload is ${(after / 1024).toFixed(1)}KB, cap ${FONT_PAYLOAD_LIMIT_BYTES / 1024}KB — ` +
      `this is what holds LCP under the 2.5s budget (M §10). See scripts/font-budget.mjs.`,
  );
  process.exit(1);
}

console.log(
  `Payload ${(after / 1024).toFixed(1)}KB / ${FONT_PAYLOAD_LIMIT_BYTES / 1024}KB cap.`,
);
