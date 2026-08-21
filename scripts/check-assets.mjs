/*
 * Asset guard (05-cicd §2, budgets from M §8 / 06-asset-pipeline):
 *   - GLB models ≤ 1.5MB each
 *   - raster images must be AVIF (SVG allowed for vectors)
 *   - every video ships as a WebM/MP4(HEVC) pair
 *   - fonts must be woff2
 * Zero dependencies — runs on bare Node in CI.
 */

import { readdirSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const ASSETS = join(ROOT, "public", "assets");
const GLB_LIMIT_BYTES = 1.5 * 1024 * 1024;
const RASTER_BANNED = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);

/** @returns {string[]} all file paths under dir, recursively */
function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

const files = walk(ASSETS).filter((f) => !f.endsWith(".gitkeep"));
const violations = [];

const rel = (f) => relative(ROOT, f);

for (const file of files) {
  const ext = extname(file).toLowerCase();
  const within = relative(ASSETS, file);
  const topDir = within.split("/")[0];

  if (ext === ".glb") {
    const { size } = statSync(file);
    if (size > GLB_LIMIT_BYTES) {
      violations.push(
        `${rel(file)} — GLB is ${(size / 1024 / 1024).toFixed(2)}MB, limit 1.5MB (M §8)`,
      );
    }
  }

  // OG images are the one raster exception: social crawlers do not decode
  // AVIF, and 06 §3 names the delivery as `img/og/og-<scent|house>.avif→png`
  // — the PNG is the shipped artifact, the AVIF its master.
  const isOgImage = topDir === "img" && within.startsWith("img/og/");

  if (
    topDir === "img" &&
    RASTER_BANNED.has(ext) &&
    !(isOgImage && ext === ".png")
  ) {
    violations.push(
      isOgImage
        ? `${rel(file)} — OG images must be PNG or AVIF (06 §3, RFC-001 C4)`
        : `${rel(file)} — raster images must be AVIF (06 §2)`,
    );
  }

  if (isOgImage && ![".png", ".avif"].includes(ext)) {
    violations.push(
      `${rel(file)} — OG images must be PNG or AVIF (06 §3, RFC-001 C4)`,
    );
  }

  if (topDir === "video" && ![".webm", ".mp4"].includes(ext)) {
    violations.push(`${rel(file)} — videos must be WebM or MP4/HEVC (06 §2)`);
  }

  if (topDir === "fonts" && ext !== ".woff2") {
    violations.push(`${rel(file)} — fonts must be woff2 (06 §1)`);
  }
}

// Pair rule: each video basename must exist as BOTH .webm and .mp4 (05 §2).
const videoFiles = files.filter((f) =>
  relative(ASSETS, f).startsWith("video/"),
);
const videoBases = new Map();
for (const file of videoFiles) {
  const ext = extname(file).toLowerCase();
  if (![".webm", ".mp4"].includes(ext)) continue;
  const base = file.slice(0, -ext.length);
  videoBases.set(base, [...(videoBases.get(base) ?? []), ext]);
}
for (const [base, exts] of videoBases) {
  for (const missing of [".webm", ".mp4"].filter((e) => !exts.includes(e))) {
    violations.push(
      `${rel(base)}${missing} — missing half of the WebM/HEVC pair (05 §2)`,
    );
  }
}

if (violations.length > 0) {
  console.error(`Asset guard: ${violations.length} violation(s)\n`);
  for (const v of violations) console.error(`  ✖ ${v}`);
  process.exit(1);
}

console.log(`Asset guard: ${files.length} file(s) checked, all within budget.`);
