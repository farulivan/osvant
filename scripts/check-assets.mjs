/*
 * Asset guard (05-cicd §2, budgets from M §10 / 06-asset-pipeline).
 *
 * Revised for ADR-013 (no-3D re-scope): there is no 3D and no video asset
 * class in v1, so `.glb`/`.gltf`/`.hdr` and anything under `assets/video/`
 * are rejected outright rather than merely size-capped — a stray one means
 * someone is rebuilding a withdrawn pipeline.
 *
 * Rules:
 *   - no 3D or environment assets at all (ADR-013)
 *   - no video asset class at all (ADR-013)
 *   - raster images must be AVIF; OG images may also be PNG (06 §3)
 *   - bottle stills ≤ 180KB each at 1× (M §10)
 *   - fonts must be woff2, and the whole shipped font payload is capped
 *     (scripts/font-budget.mjs) — Mosvita is a static family, so the
 *     number that matters is the sum, not any one file
 *
 * Walks both trees: `public/assets/` (served verbatim) and
 * `src/assets/img/` (masters that Astro converts at build).
 * Zero dependencies — runs on bare Node in CI.
 */

import { existsSync, readdirSync, statSync } from "node:fs";
import { basename, extname, join, relative } from "node:path";

import { FONT_PAYLOAD_LIMIT_BYTES } from "./font-budget.mjs";

const ROOT = new URL("..", import.meta.url).pathname;
const PUBLIC_ASSETS = join(ROOT, "public", "assets");
const SRC_ASSETS = join(ROOT, "src", "assets");

const BOTTLE_STILL_LIMIT_BYTES = 180 * 1024; // M §10
const RASTER_BANNED = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);
const WITHDRAWN_EXTENSIONS = new Set([".glb", ".gltf", ".hdr", ".exr"]);
const VIDEO_EXTENSIONS = new Set([".webm", ".mp4", ".mov", ".m4v"]);

/** @returns {string[]} all file paths under dir, recursively */
function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

const files = [...walk(PUBLIC_ASSETS), ...walk(SRC_ASSETS)].filter(
  (f) => !f.endsWith(".gitkeep"),
);
const violations = [];
let fontPayloadBytes = 0;

const rel = (f) => relative(ROOT, f);

for (const file of files) {
  const ext = extname(file).toLowerCase();
  const path = rel(file).replaceAll("\\", "/");

  if (WITHDRAWN_EXTENSIONS.has(ext)) {
    violations.push(
      `${path} — 3D and HDR assets are withdrawn; the bottle ships as a composited still (ADR-013, M §8)`,
    );
    continue;
  }

  if (VIDEO_EXTENSIONS.has(ext) || path.includes("/assets/video/")) {
    violations.push(
      `${path} — no video asset class exists in v1 (ADR-013, 01 §6)`,
    );
    continue;
  }

  // OG images are the one raster exception: social crawlers do not decode
  // AVIF, and 06 §3 names the delivery as `og-<scent|house>.avif→png`.
  const isOgImage = path.includes("/og/");

  if (RASTER_BANNED.has(ext) && !isOgImage) {
    // Masters under src/ are converted to AVIF at build (06 §4), so their
    // source format is the author's business — only shipped rasters bind.
    if (!path.startsWith("src/assets/")) {
      violations.push(`${path} — raster images must be AVIF (06 §2)`);
    }
  }

  if (isOgImage && ![".png", ".avif", ".svg"].includes(ext)) {
    violations.push(
      `${path} — OG images must be PNG or AVIF (06 §3, RFC-001 C4)`,
    );
  }

  // Bottle stills carry the signature moment on five images — the payload
  // cap is what keeps `/` inside the ≤900KB total (M §10).
  if (path.includes("/stills/") && ext === ".avif") {
    const { size } = statSync(file);
    if (size > BOTTLE_STILL_LIMIT_BYTES) {
      violations.push(
        `${path} — bottle still is ${(size / 1024).toFixed(0)}KB, limit 180KB at 1× (M §10)`,
      );
    }
  }

  // The licensed .otf originals under `masters/` are what `pnpm fonts`
  // subsets. They are gitignored and never served, so their format is the
  // author's business — the same reasoning as the raster masters above.
  // Only what ships binds.
  if (
    path.includes("/fonts/") &&
    !path.startsWith("src/assets/fonts/masters/")
  ) {
    if (ext !== ".woff2") {
      violations.push(`${basename(file)} — fonts must be woff2 (06 §1)`);
    } else {
      fontPayloadBytes += statSync(file).size;
    }
  }
}

// Checked as a total rather than per-file: a static family's payload is a
// sum, and a per-file cap would happily wave through a fifth cut. `pnpm fonts`
// runs the same check at generation time; this is the half that runs in CI.
if (fontPayloadBytes > FONT_PAYLOAD_LIMIT_BYTES) {
  violations.push(
    `font payload is ${(fontPayloadBytes / 1024).toFixed(1)}KB, cap ` +
      `${FONT_PAYLOAD_LIMIT_BYTES / 1024}KB — this is what holds LCP under 2.5s (M §10)`,
  );
}

if (violations.length > 0) {
  console.error(`Asset guard: ${violations.length} violation(s)\n`);
  for (const v of violations) console.error(`  ✖ ${v}`);
  process.exit(1);
}

console.log(
  `Asset guard: ${files.length} file(s) checked, all within budget ` +
    `(fonts ${(fontPayloadBytes / 1024).toFixed(1)}KB / ${FONT_PAYLOAD_LIMIT_BYTES / 1024}KB).`,
);
