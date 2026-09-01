/*
 * style-parity.mjs — proves a refactor did not change what renders.
 *
 * The Tailwind migration (ADR-015/016) rewrites 2,776 lines of scoped CSS
 * across 27 components. Screenshots are the wrong instrument for that: a
 * diff tells you a page moved but not which declaration moved it, and an
 * anti-aliased glyph edge fails a pixel compare for no reason at all.
 *
 * So this walks every element of every route and records the computed
 * value of 46 properties plus its box. Two snapshots diff into a list of
 * "this element, this property, this value -> that value". That is what
 * caught Tailwind Preflight zeroing the margins on 68 p/h1-h6 elements
 * and stripping the underline off 34 anchors — neither of which is
 * visible in a thumbnail, both of which are design changes.
 *
 *   node scripts/style-parity.mjs snapshot <dist> <out.json>
 *   node scripts/style-parity.mjs diff <before.json> <after.json>
 *
 * Typical use, around a change:
 *   git stash && pnpm build
 *   node scripts/style-parity.mjs snapshot dist /tmp/before.json
 *   git stash pop && pnpm build
 *   node scripts/style-parity.mjs snapshot dist /tmp/after.json
 *   node scripts/style-parity.mjs diff /tmp/before.json /tmp/after.json
 *
 * READ THE NOISE FLOOR BEFORE BELIEVING A RESULT. GSAP writes `transform`
 * and `opacity` inline as it tweens, and no two page loads land on the
 * same frame, so those two properties (and the `_box` they drag with
 * them) always differ by a sub-pixel amount. Snapshot the SAME build
 * twice to measure that floor: if the run-to-run control and the
 * before/after test show the same property profile at the same
 * magnitude, the difference is jitter, not a regression. Anything
 * appearing in colour, font-*, margin, padding, display, border or
 * text-decoration is real — those are never animated here.
 *
 * Not a CI gate: it needs two builds and a browser, and the animated
 * properties make a hard threshold meaningless. It is a review tool.
 */

import { createServer } from "node:http";
import {
  readFileSync,
  existsSync,
  writeFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { join, extname } from "node:path";
import { chromium } from "playwright";

const MIME = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".avif": "image/avif",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".json": "application/json",
  ".xml": "application/xml",
  ".txt": "text/plain",
};

/* The properties worth watching. Deliberately includes the three the
   guardrails ban outright (box-shadow, text-transform) so a rewrite that
   reintroduces one shows up here as well as in the output scan. */
const PROPS = [
  "display",
  "position",
  "color",
  "background-color",
  "font-family",
  "font-size",
  "font-weight",
  "font-stretch",
  "line-height",
  "letter-spacing",
  "text-transform",
  "text-decoration-line",
  "margin-top",
  "margin-right",
  "margin-bottom",
  "margin-left",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "border-top-width",
  "border-right-width",
  "border-bottom-width",
  "border-left-width",
  "border-top-color",
  "border-radius",
  "width",
  "height",
  "opacity",
  "overflow",
  "z-index",
  "flex-direction",
  "align-items",
  "justify-content",
  "gap",
  "transform",
  "outline-width",
  "outline-color",
  "white-space",
  "visibility",
  "min-width",
  "min-height",
  "box-shadow",
  "mix-blend-mode",
];

/* Written inline by gsap.ticker, so they differ run to run. Reported
   separately rather than dropped — a real layout change moves them too. */
const ANIMATED = new Set(["transform", "opacity", "_box"]);

const WIDTHS = [390, 1440];

function routesIn(dir, base = "") {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      out.push(...routesIn(join(dir, entry.name), `${base}/${entry.name}`));
    } else if (entry.name.endsWith(".html")) {
      out.push(
        entry.name === "index.html" ? `${base}/` : `${base}/${entry.name}`,
      );
    }
  }
  return out.sort();
}

function serve(dist) {
  const server = createServer((req, res) => {
    let file = join(dist, decodeURIComponent(req.url.split("?")[0]));
    if (existsSync(file) && statSync(file).isDirectory())
      file = join(file, "index.html");
    if (!existsSync(file)) {
      res.writeHead(404);
      return res.end("not found");
    }
    res.writeHead(200, {
      "content-type": MIME[extname(file)] ?? "application/octet-stream",
    });
    res.end(readFileSync(file));
  });
  return new Promise((resolve) =>
    server.listen(0, () => resolve({ server, port: server.address().port })),
  );
}

async function snapshot(dist, out) {
  if (!existsSync(dist)) {
    console.error(`style-parity: no build at ${dist} — run \`pnpm build\`.`);
    process.exit(1);
  }
  const { server, port } = await serve(dist);
  const browser = await chromium.launch();
  const result = {};

  for (const route of routesIn(dist)) {
    if (route.startsWith("/dev/")) continue; // harnesses, not the site
    for (const width of WIDTHS) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      await page.goto(`http://localhost:${port}${route}`, {
        waitUntil: "load",
      });
      /* CSS animation is frozen; GSAP's is not, hence the noise floor. */
      await page.addStyleTag({
        content:
          "*,*::before,*::after{animation:none!important;transition:none!important}",
      });
      await page.evaluate(() =>
        document.querySelector("[data-preloader]")?.remove(),
      );
      await page.waitForTimeout(300);

      result[`${route}@${width}`] = await page.evaluate((props) => {
        const rows = [];
        /* Body only. <head> children have computed styles but render
           nothing, and their COUNT is not stable across builds — flipping
           `inlineStylesheets` swaps one <style> for three <link>s, which
           read as a structural change on every page and drown the signal
           this tool exists to produce. */
        const all = document.body.querySelectorAll("*");
        for (let i = 0; i < all.length; i++) {
          const el = all[i];
          if (el.tagName === "SCRIPT" || el.tagName === "STYLE") continue;
          const cs = getComputedStyle(el);
          const rec = {};
          for (const p of props) rec[p] = cs.getPropertyValue(p);
          const r = el.getBoundingClientRect();
          rec._box = [
            Math.round(r.x),
            Math.round(r.y),
            Math.round(r.width),
            Math.round(r.height),
          ].join(",");
          rows.push([`${i}:${el.tagName}${el.id ? "#" + el.id : ""}`, rec]);
        }
        return rows;
      }, PROPS);

      await page.close();
    }
  }

  await browser.close();
  server.close();
  writeFileSync(out, JSON.stringify(result));
  const pairs = Object.keys(result).length;
  const elements = Object.values(result).reduce((n, r) => n + r.length, 0);
  console.log(
    `style-parity: ${pairs} route×width pairs, ${elements} elements → ${out}`,
  );
}

function diff(beforeFile, afterFile) {
  const before = JSON.parse(readFileSync(beforeFile, "utf8"));
  const after = JSON.parse(readFileSync(afterFile, "utf8"));
  const keys = [
    ...new Set([...Object.keys(before), ...Object.keys(after)]),
  ].sort();

  const counts = {};
  const samples = [];
  let structural = 0;
  let elements = 0;

  for (const key of keys) {
    const a = before[key];
    const b = after[key];
    if (!a || !b) {
      console.log(`  STRUCTURAL  ${key} — present in only one snapshot`);
      structural++;
      continue;
    }
    if (a.length !== b.length) {
      console.log(`  STRUCTURAL  ${key} — ${a.length} elements -> ${b.length}`);
      structural++;
      continue;
    }
    for (let i = 0; i < a.length; i++) {
      elements++;
      const [id, ra] = a[i];
      const rb = b[i][1];
      for (const p of Object.keys(ra)) {
        if (ra[p] === rb[p]) continue;
        counts[p] = (counts[p] || 0) + 1;
        if (!ANIMATED.has(p) && samples.length < 30) {
          samples.push(`  ${key} | ${id} | ${p} | ${ra[p]} -> ${rb[p]}`);
        }
      }
    }
  }

  const animated = Object.entries(counts).filter(([p]) => ANIMATED.has(p));
  const stat = Object.entries(counts).filter(([p]) => !ANIMATED.has(p));
  const statTotal = stat.reduce((n, [, c]) => n + c, 0);

  console.log(`\nstyle-parity: ${keys.length} pairs, ${elements} elements`);
  console.log(
    `  animated (noise floor — compare against a same-build control):`,
  );
  console.log(
    animated.length
      ? "    " + animated.map(([p, n]) => `${p}:${n}`).join("  ")
      : "    none",
  );
  console.log(`  static properties: ${statTotal} difference(s)`);
  if (stat.length) {
    for (const [p, n] of stat.sort((x, y) => y[1] - x[1])) {
      console.log(`    ${p.padEnd(24)} ${n}`);
    }
    console.log("\n  samples:");
    samples.forEach((s) => console.log(s));
  }

  if (structural === 0 && statTotal === 0) {
    console.log(
      "\n  ✅ no static-style differences — the refactor is visually neutral.",
    );
  }
  return structural === 0 && statTotal === 0 ? 0 : 1;
}

const [mode, ...rest] = process.argv.slice(2);
if (mode === "snapshot") {
  await snapshot(rest[0] ?? "dist", rest[1] ?? "style-snapshot.json");
} else if (mode === "diff") {
  process.exitCode = diff(rest[0], rest[1]);
} else {
  console.error(
    "usage:\n" +
      "  node scripts/style-parity.mjs snapshot <distDir> <out.json>\n" +
      "  node scripts/style-parity.mjs diff <before.json> <after.json>",
  );
  process.exit(1);
}
