/*
 * Copy guard (05-cicd §2, review OSV-08).
 *
 * Placeholder copy shipped to production once already — twelve `[draft]`
 * markers across the served HTML, including inside a `<title>`, which is
 * what a browser tab, a search result and a shared link all show. Nothing
 * caught it because nothing was looking.
 *
 * This looks. It reads the built output rather than the source, because
 * the source is allowed to mention the marker (this file does) — only
 * what reaches a user matters.
 *
 * Zero dependencies — runs on bare Node in CI.
 */

import { readdirSync, readFileSync } from "node:fs";
import { extname, join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const DIST = join(ROOT, "dist");

/** Markers that must never reach a user. */
const FORBIDDEN = [
  { pattern: /\[draft\]/gi, label: "draft marker" },
  { pattern: /\blorem ipsum\b/gi, label: "lorem ipsum" },
  { pattern: /\bTKTK\b/g, label: "TK placeholder" },
];

/** @returns {string[]} every file under dir, recursively */
function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

const pages = walk(DIST).filter((file) => extname(file) === ".html");
const violations = [];

for (const file of pages) {
  const html = readFileSync(file, "utf8");
  for (const { pattern, label } of FORBIDDEN) {
    const hits = html.match(pattern);
    if (!hits) continue;
    const inTitle = /<title>[^<]*\[draft\][^<]*<\/title>/i.test(html);
    violations.push(
      `${relative(ROOT, file)} — ${hits.length} × ${label}${
        inTitle ? " (one of them inside <title>)" : ""
      }`,
    );
  }
}

if (violations.length > 0) {
  console.error(
    `Copy guard: placeholder copy reached ${violations.length} page(s)\n`,
  );
  for (const v of violations) console.error(`  ✖ ${v}`);
  process.exit(1);
}

console.log(`Copy guard: ${pages.length} page(s) checked, no placeholders.`);
