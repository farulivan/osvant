/*
 * size-limit wrapper (05-cicd §2, budget from M §10 / 04-qa §4: 350KB gzip).
 *
 * No client JS exists yet — the core runtime lands in M1 task 1.4
 * (00-implementation-guide.md §5). size-limit's glob throws on zero
 * matches, so until then this guard reports the gap instead of failing
 * CI on an absent budget. Once dist contains built JS, this defers to
 * size-limit and the real gate is enforced.
 */

import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const DIST = new URL("../dist", import.meta.url).pathname;

function hasJs(dir) {
  if (!existsSync(dir)) return false;
  return readdirSync(dir, { withFileTypes: true }).some((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return hasJs(path);
    return entry.name.endsWith(".js");
  });
}

if (!hasJs(DIST)) {
  console.log(
    "size-limit: no client JS in dist/ yet (core runtime lands in M1 task 1.4) — skipping budget check.",
  );
  process.exit(0);
}

const result = spawnSync("pnpm", ["exec", "size-limit"], { stdio: "inherit" });
process.exit(result.status ?? 1);
