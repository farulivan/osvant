/*
 * Font master inspector — `pnpm fonts:inspect`.
 *
 * Reads the raw `.otf`/`.ttf` masters in `src/assets/fonts/masters/` and
 * reports what each file actually IS, so the ladder in `01 §3.1` is chosen
 * from font metadata rather than from filenames. Filenames lie; `OS/2`
 * does not.
 *
 * Three questions it answers, all of which block the Astro `fonts` config:
 *
 *   1. `usWeightClass` → the `weight` for each variant. A file called
 *      "SemiBold" is only 600 if it says 600.
 *   2. `usWidthClass` → the `stretch` for each variant, as a percentage.
 *      This is what "Expanded" means: a width class of 7 = 125%, which is
 *      exactly the `font-stretch: 125%` that 19 files already ask for and
 *      that `01 §3.3` mandates for headlines. A separate static file
 *      standing in for what Archivo did with a `wdth` axis.
 *   3. Coverage of `retainedCharacters()`. A master missing one of the
 *      typographic extras (§ · — – ' ' " " … € ×) subsets silently, and
 *      the failure surfaces later as `check-glyphs` pointing at *copy*
 *      rather than at the font. Catching it here saves that hunt.
 *
 * Also reports outline flavour: `.otf` carries CFF outliness, which woff2
 * compresses less effectively than the glyf outlines in a `.ttf`. That is
 * the main uncertainty in the per-cut byte estimate, so it is worth
 * seeing before committing to a three-cut ladder.
 *
 * Zero dependencies — a minimal sfnt table reader, same constraint as the
 * other guards in this directory so it runs on bare Node in CI.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, extname, join } from "node:path";

import { retainedCharacters } from "./font-charset.mjs";

const ROOT = new URL("..", import.meta.url).pathname;
const MASTERS = join(ROOT, "src", "assets", "fonts", "masters");

/* ---- sfnt primitives ------------------------------------------------ */

const SIGNATURES = new Map([
  [0x774f4632, "woff2 — already subset; run this on the masters instead"],
  [0x774f4646, "woff — not a master format"],
  [0x74746366, "TrueType Collection (.ttc) — extract the faces first"],
]);

/** @returns {Map<string, {offset: number, length: number}>} */
function readTableDirectory(buf) {
  const signature = buf.readUInt32BE(0);
  const known = SIGNATURES.get(signature);
  if (known) throw new Error(known);

  const numTables = buf.readUInt16BE(4);
  const tables = new Map();
  for (let i = 0; i < numTables; i++) {
    const p = 12 + i * 16;
    tables.set(buf.toString("latin1", p, p + 4), {
      offset: buf.readUInt32BE(p + 8),
      length: buf.readUInt32BE(p + 12),
    });
  }
  return tables;
}

/**
 * The `name` table. Windows/English records win over Mac ones, and the
 * typographic IDs (16/17) win over the legacy family/subfamily (1/2) —
 * a four-plus-weight family puts its real name in 16, with 1 carrying a
 * RIBBI-style grouping the foundry invented to keep old apps happy.
 */
function readNames(buf, table) {
  if (!table) return {};

  const { offset } = table;
  const count = buf.readUInt16BE(offset + 2);
  const storage = offset + buf.readUInt16BE(offset + 4);

  const names = {};
  const scores = {};

  for (let i = 0; i < count; i++) {
    const p = offset + 6 + i * 12;
    const platformID = buf.readUInt16BE(p);
    const languageID = buf.readUInt16BE(p + 4);
    const nameID = buf.readUInt16BE(p + 6);
    const length = buf.readUInt16BE(p + 8);
    const start = storage + buf.readUInt16BE(p + 10);

    if (start + length > buf.length) continue;

    const raw = buf.subarray(start, start + length);
    let value;
    if (platformID === 3 || platformID === 0) {
      if (raw.length % 2 !== 0) continue;
      value = Buffer.from(raw).swap16().toString("utf16le");
    } else {
      value = raw.toString("latin1");
    }

    const score =
      (platformID === 3 ? 2 : 0) +
      (languageID === 0x409 || languageID === 0 ? 1 : 0);
    if (scores[nameID] === undefined || score > scores[nameID]) {
      names[nameID] = value.replace(/\0/g, "").trim();
      scores[nameID] = score;
    }
  }

  return names;
}

function readOS2(buf, table) {
  if (!table || table.length < 78) return null;
  const o = table.offset;
  return {
    weightClass: buf.readUInt16BE(o + 4),
    widthClass: buf.readUInt16BE(o + 6),
    typoAscender: buf.readInt16BE(o + 68),
    typoDescender: buf.readInt16BE(o + 70),
    typoLineGap: buf.readInt16BE(o + 72),
  };
}

/** Variable-font axes, if any. A master with `fvar` collapses the ladder. */
function readFvar(buf, table) {
  if (!table) return null;
  const o = table.offset;
  const axesOffset = o + buf.readUInt16BE(o + 4);
  const axisCount = buf.readUInt16BE(o + 8);
  const axisSize = buf.readUInt16BE(o + 10);

  const axes = [];
  for (let i = 0; i < axisCount; i++) {
    const p = axesOffset + i * axisSize;
    axes.push({
      tag: buf.toString("latin1", p, p + 4),
      min: buf.readInt32BE(p + 4) / 65536,
      max: buf.readInt32BE(p + 12) / 65536,
    });
  }
  return axes;
}

/* ---- cmap ----------------------------------------------------------- */

function parseFormat4(buf, o) {
  const segCount = buf.readUInt16BE(o + 6) / 2;
  const endBase = o + 14;
  const startBase = endBase + segCount * 2 + 2;
  const deltaBase = startBase + segCount * 2;
  const rangeBase = deltaBase + segCount * 2;

  const covered = new Set();
  for (let s = 0; s < segCount; s++) {
    const end = buf.readUInt16BE(endBase + s * 2);
    const start = buf.readUInt16BE(startBase + s * 2);
    const delta = buf.readInt16BE(deltaBase + s * 2);
    const rangeOffset = buf.readUInt16BE(rangeBase + s * 2);
    if (start === 0xffff) continue;

    for (let c = start; c <= end; c++) {
      let gid;
      if (rangeOffset === 0) {
        gid = (c + delta) & 0xffff;
      } else {
        const gp = rangeBase + s * 2 + rangeOffset + (c - start) * 2;
        if (gp + 1 >= buf.length) continue;
        gid = buf.readUInt16BE(gp);
        if (gid !== 0) gid = (gid + delta) & 0xffff;
      }
      if (gid !== 0) covered.add(c);
    }
  }
  return { has: (cp) => covered.has(cp) };
}

function parseFormat12(buf, o) {
  const numGroups = buf.readUInt32BE(o + 12);
  const groups = [];
  for (let g = 0; g < numGroups; g++) {
    const p = o + 16 + g * 12;
    groups.push({ start: buf.readUInt32BE(p), end: buf.readUInt32BE(p + 4) });
  }
  return { has: (cp) => groups.some((g) => cp >= g.start && cp <= g.end) };
}

function readCmap(buf, table) {
  if (!table) return null;

  const o = table.offset;
  const numTables = buf.readUInt16BE(o + 2);

  let best = null;
  let bestScore = -1;
  for (let i = 0; i < numTables; i++) {
    const p = o + 4 + i * 8;
    const platformID = buf.readUInt16BE(p);
    const encodingID = buf.readUInt16BE(p + 2);
    const subtable = o + buf.readUInt32BE(p + 4);

    // Prefer full-Unicode subtables over BMP-only ones.
    let score = -1;
    if (platformID === 3 && encodingID === 10) score = 4;
    else if (platformID === 0 && encodingID >= 4) score = 3;
    else if (platformID === 3 && encodingID === 1) score = 2;
    else if (platformID === 0) score = 1;

    if (score > bestScore) {
      bestScore = score;
      best = subtable;
    }
  }
  if (best === null) return null;

  const format = buf.readUInt16BE(best);
  if (format === 4) return parseFormat4(buf, best);
  if (format === 12) return parseFormat12(buf, best);
  return null;
}

/* ---- CSS mapping ---------------------------------------------------- */

// OS/2 usWidthClass → the `font-stretch` percentage CSS understands.
// Class 7 ("Expanded") is 125% — the value 01 §3.3 already mandates for
// headlines and that 19 components already declare.
const WIDTH_CLASS = [
  null,
  { percent: 50, name: "ultra-condensed" },
  { percent: 62.5, name: "extra-condensed" },
  { percent: 75, name: "condensed" },
  { percent: 87.5, name: "semi-condensed" },
  { percent: 100, name: "normal" },
  { percent: 112.5, name: "semi-expanded" },
  { percent: 125, name: "expanded" },
  { percent: 150, name: "extra-expanded" },
  { percent: 200, name: "ultra-expanded" },
];

/* ---- report --------------------------------------------------------- */

function inspect(file) {
  const buf = readFileSync(file);
  const tables = readTableDirectory(buf);

  const names = readNames(buf, tables.get("name"));
  const os2 = readOS2(buf, tables.get("OS/2"));
  const head = tables.get("head");
  const cmap = readCmap(buf, tables.get("cmap"));

  const width = os2 ? WIDTH_CLASS[os2.widthClass] : null;

  const missing = [];
  if (cmap) {
    for (const ch of new Set([...retainedCharacters()])) {
      if (!cmap.has(ch.codePointAt(0))) missing.push(ch);
    }
  }

  return {
    file: basename(file),
    family: names[16] || names[1] || "?",
    subfamily: names[17] || names[2] || "?",
    postScriptName: names[6] || "?",
    weight: os2?.weightClass ?? null,
    widthClass: os2?.widthClass ?? null,
    stretch: width ? `${width.percent}%` : "?",
    widthName: width ? width.name : "?",
    outlines: tables.has("CFF ")
      ? "CFF (.otf)"
      : tables.has("glyf")
        ? "glyf (.ttf)"
        : "?",
    unitsPerEm: head ? buf.readUInt16BE(head.offset + 18) : null,
    axes: readFvar(buf, tables.get("fvar")),
    bytes: buf.length,
    coverage: cmap ? { missing } : null,
  };
}

if (!existsSync(MASTERS)) {
  console.error(
    `No masters directory.\n\n  Create ${MASTERS}\n  and drop the .otf files in it, then re-run \`pnpm fonts:inspect\`.\n`,
  );
  process.exit(1);
}

const files = readdirSync(MASTERS)
  .filter((f) => [".otf", ".ttf"].includes(extname(f).toLowerCase()))
  .sort()
  .map((f) => join(MASTERS, f));

if (files.length === 0) {
  console.error(
    `No .otf/.ttf files in src/assets/fonts/masters/.\n\n` +
      `Drop the font masters there — every weight and every Expanded cut.\n` +
      `The directory is gitignored, so extra files cost nothing.\n`,
  );
  process.exit(1);
}

const rows = [];
const failures = [];

for (const file of files) {
  try {
    rows.push(inspect(file));
  } catch (error) {
    failures.push(`${basename(file)} — ${error.message}`);
  }
}

// Sorted by weight then width so the ladder reads top-to-bottom.
rows.sort(
  (a, b) =>
    (a.weight ?? 0) - (b.weight ?? 0) ||
    (a.widthClass ?? 0) - (b.widthClass ?? 0),
);

const col = (s, n) => String(s).padEnd(n);
console.log(
  `\n${col("file", 46)}${col("family", 24)}${col("subfamily", 20)}` +
    `${col("wght", 6)}${col("stretch", 9)}${col("width", 16)}${col("outlines", 12)}upem`,
);
console.log("-".repeat(140));

for (const r of rows) {
  console.log(
    col(r.file, 46) +
      col(r.family, 24) +
      col(r.subfamily, 20) +
      col(r.weight ?? "?", 6) +
      col(r.stretch, 9) +
      col(r.widthName, 16) +
      col(r.outlines, 12) +
      (r.unitsPerEm ?? "?"),
  );
}

const variable = rows.filter((r) => r.axes?.length);
if (variable.length > 0) {
  console.log(`\nVariable masters — one file covers a whole range:`);
  for (const r of variable) {
    const axes = r.axes.map((a) => `${a.tag} ${a.min}–${a.max}`).join(", ");
    console.log(`  ${col(r.file, 46)}${axes}`);
  }
}

const short = rows.filter((r) => r.coverage && r.coverage.missing.length > 0);
if (short.length > 0) {
  console.log(
    `\nCharset gaps — these masters cannot render the retained set ` +
      `(scripts/font-charset.mjs). Subsetting drops them silently and ` +
      `\`pnpm check:glyphs\` then fails pointing at copy, not at the font:`,
  );
  for (const r of short) {
    console.log(`  ${col(r.file, 46)}missing ${r.coverage.missing.join(" ")}`);
  }
} else if (rows.some((r) => r.coverage)) {
  console.log(`\nCharset: all masters cover the full retained set.`);
}

if (failures.length > 0) {
  console.log(`\nUnreadable:`);
  for (const f of failures) console.log(`  ✖ ${f}`);
}

const cff = rows.filter((r) => r.outlines.startsWith("CFF")).length;
console.log(
  `\n${rows.length} master(s). ` +
    (cff > 0
      ? `${cff} carry CFF outlines — woff2 compresses these less well than glyf, ` +
        `so measure with \`pnpm fonts\` before fixing the ladder (01 §3.1).`
      : `All glyf outlines — woff2 compresses these well.`) +
    `\n\nMap each cut you want to ship into astro.config.mjs as:\n` +
    `  { src: ["./src/assets/fonts/<name>.woff2"], weight: <wght>, ` +
    `style: "normal", stretch: "<stretch>", display: "swap" }\n`,
);
