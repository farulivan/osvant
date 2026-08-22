/*
 * Asset guard (05-cicd §2, budgets from M §10 / 06-asset-pipeline):
 *   - raster images must be AVIF (SVG allowed for vectors)
 *   - bottle stills ≤ 180KB each (M §10)
 *   - no 3D models and no video ship in v1 (ADR-013)
 *   - fonts must be woff2
 * Zero dependencies — runs on bare Node in CI.
 */

import { readdirSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const ASSETS = join(ROOT, "public", "assets");
const BOTTLE_LIMIT_BYTES = 180 * 1024;
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

  // ADR-013 withdrew real-time 3D and the alpha-turntable path. These asset
  // classes are not "too big" — they must not exist at all.
  if (ext === ".glb" || ext === ".gltf" || ext === ".hdr") {
    violations.push(
      `${rel(file)} — 3D assets were withdrawn by ADR-013; the bottle ships as AVIF (M §8)`,
    );
  }

  if (topDir === "video") {
    violations.push(
      `${rel(file)} — no video asset class ships in v1 (ADR-013, 06 §1)`,
    );
  }

  // Bottle stills carry the signature moment and load with the section, not
  // the preloader — the budget keeps `/` under 900KB across the five (M §10).
  if (within.startsWith("img/stills/") && ext === ".avif") {
    const { size } = statSync(file);
    if (size > BOTTLE_LIMIT_BYTES) {
      violations.push(
        `${rel(file)} — bottle still is ${(size / 1024).toFixed(0)}KB, limit 180KB (M §10)`,
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

  if (topDir === "fonts" && ext !== ".woff2") {
    violations.push(`${rel(file)} — fonts must be woff2 (06 §1)`);
  }
}

if (violations.length > 0) {
  console.error(`Asset guard: ${violations.length} violation(s)\n`);
  for (const v of violations) console.error(`  ✖ ${v}`);
  process.exit(1);
}

console.log(`Asset guard: ${files.length} file(s) checked, all within budget.`);
