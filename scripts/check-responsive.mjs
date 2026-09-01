/*
 * Responsive guard (03 §7, review OSV-13).
 *
 * Checks one thing, because it is the one thing that is objectively wrong
 * rather than a matter of taste: **no route may overflow horizontally**.
 *
 * Why that specific check earns a merge gate. When content is wider than
 * the viewport, a mobile browser does not simply show a scrollbar — it
 * widens the *layout viewport* to contain the overflow and scales the
 * whole page down to fit. One unbreakable word is enough. `/journal/` laid
 * out at 625px on a 390px iPhone because `transmissions` did not fit at
 * the old `--text--impact` floor, and the punishment was not a clipped
 * headline: every element on the page, body copy included, rendered at
 * ~62% of its designed size.
 *
 * That failure is invisible in a desktop browser, invisible in a
 * screenshot taken at the wrong emulation setting, and invisible to
 * Lighthouse. It needs a measurement.
 *
 * Column counts and tap-target sizes are deliberately NOT asserted here.
 * Both are design judgement, both have legitimate exceptions, and a gate
 * that fires on judgement calls gets disabled. Overflow has no legitimate
 * exception.
 *
 * Serves `dist/` from a throwaway `node:http` server rather than shelling
 * out to `astro preview`, so the check is self-contained and does not race
 * a background process.
 *
 * Requires the Playwright chromium binary (`pnpm exec playwright install
 * --with-deps chromium`). Skips with a clear message rather than failing
 * when the browser is absent, so a contributor without it is told what to
 * install instead of hitting an opaque crash.
 */

import { createServer } from "node:http";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { extname, join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const DIST = join(ROOT, "dist");

/** The four breakpoints `01 §4.2` defines, plus a real phone. */
const WIDTHS = [
  { label: "tiny", width: 320, height: 720 },
  { label: "mobile", width: 390, height: 844 },
  { label: "tablet", width: 834, height: 1112 },
  { label: "desktop", width: 1440, height: 900 },
];

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".avif": "image/avif",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".woff2": "font/woff2",
  ".xml": "application/xml",
  ".txt": "text/plain",
};

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

if (!existsSync(DIST)) {
  console.error("Responsive guard: no dist/ — run `pnpm build` first.");
  process.exit(1);
}

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.log(
    "Responsive guard: playwright not installed — skipping.\n" +
      "  Install with `pnpm exec playwright install --with-deps chromium`.",
  );
  process.exit(0);
}

// `/dev/*` are internal harnesses, not shipped surfaces.
const routes = walk(DIST)
  .filter((file) => extname(file) === ".html")
  .map((file) => "/" + relative(DIST, file).replace(/index\.html$/, ""))
  .filter((route) => !route.startsWith("/dev/"))
  .sort();

const server = createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  let file = join(DIST, url);
  if (url.endsWith("/")) file = join(file, "index.html");
  if (!existsSync(file)) {
    res.writeHead(404).end("not found");
    return;
  }
  res.writeHead(200, {
    "content-type": MIME[extname(file)] ?? "application/octet-stream",
  });
  res.end(readFileSync(file));
});

await new Promise((resolve) => server.listen(0, resolve));
const base = `http://localhost:${server.address().port}`;

let browser;
try {
  browser = await chromium.launch();
} catch (error) {
  server.close();
  console.log(
    `Responsive guard: could not launch chromium — skipping.\n  ${error.message.split("\n")[0]}\n` +
      "  Install with `pnpm exec playwright install --with-deps chromium`.",
  );
  process.exit(0);
}

const violations = [];

for (const { label, width, height } of WIDTHS) {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();

  for (const route of routes) {
    await page.goto(base + route, { waitUntil: "networkidle" });
    // The preloader is a full-viewport overlay; it hides the page it covers.
    await page.evaluate(() =>
      document.querySelector("[data-preloader]")?.remove(),
    );
    await page.waitForTimeout(250);

    const { scrollWidth, innerWidth, worst } = await page.evaluate(() => {
      const vw = window.innerWidth;
      let worst = null;
      for (const el of document.querySelectorAll("body *")) {
        const rect = el.getBoundingClientRect();
        if (rect.right <= vw + 1) continue;
        const style = getComputedStyle(el);
        if (style.position === "fixed" || style.visibility === "hidden")
          continue;
        // Skip anything an ancestor clips. The footer marquee track is
        // 4000px wide by design and sits inside `overflow: hidden`, so it
        // is never the cause — but it is always the widest box on the
        // page, and naming it sends the reader hunting the wrong element.
        let clipped = false;
        for (
          let a = el.parentElement;
          a && a !== document.body;
          a = a.parentElement
        ) {
          const ox = getComputedStyle(a).overflowX;
          if (ox !== "visible") {
            clipped = true;
            break;
          }
        }
        if (clipped) continue;
        // Report the outermost offender: an element whose parent fits.
        const parent = el.parentElement;
        if (parent && parent.getBoundingClientRect().right > vw + 1) continue;
        /*
         * Name the offender by something that identifies it.
         *
         * This used to take the first class name, which worked while
         * markup was BEM — `section.journal` told you where to look. Under
         * utility-first markup (ADR-016) the first class is whatever
         * Prettier sorted to the front, so it reported `ul.m-0` and sent
         * you nowhere.
         *
         * The stable identifiers are the id and the motion hooks ("markup
         * is the API", 03-eng §3). Plenty of elements carry neither, so
         * when the offender itself is anonymous we walk up to the nearest
         * ancestor that isn't and report the pair — `section[data-nav-theme
         * ="dark"] » ul` locates a thing that `ul.m-0` does not.
         */
        const describe = (node) => {
          const tag = node.tagName.toLowerCase();
          if (node.id) return `${tag}#${node.id}`;
          for (const attr of [
            "data-module",
            "data-anim",
            "data-nav-theme",
            "data-scent",
          ]) {
            const value = node.getAttribute(attr);
            if (value !== null) return `${tag}[${attr}="${value}"]`;
          }
          return null;
        };

        const own = describe(el);
        let name = own ?? el.tagName.toLowerCase();
        if (!own) {
          for (let a = el.parentElement; a; a = a.parentElement) {
            const parentDesc = describe(a);
            if (parentDesc) {
              name = `${parentDesc} » ${name}`;
              break;
            }
          }
        }
        if (!worst || rect.right > worst.right) {
          worst = {
            name,
            right: Math.round(rect.right),
            text: (el.textContent || "").trim().slice(0, 30),
          };
        }
      }
      return {
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: vw,
        worst,
      };
    });

    if (scrollWidth > innerWidth + 1) {
      violations.push(
        `${route} @ ${label} ${width}px — overflows by ${scrollWidth - innerWidth}px` +
          (worst
            ? `\n      widest: ${worst.name} reaches ${worst.right}px  "${worst.text}"`
            : ""),
      );
    }
  }

  await context.close();
}

await browser.close();
server.close();

if (violations.length > 0) {
  console.error(
    `Responsive guard: ${violations.length} overflow(s). On a phone this does not ` +
      `scroll — the browser shrinks the whole page to fit.\n`,
  );
  for (const violation of violations) console.error(`  ✖ ${violation}`);
  console.error(
    "\nUsually a long unbreakable word at a large clamp floor, a `1fr` grid track " +
      "(use `minmax(0, 1fr)`), or a negative-margin breakout whose parent has no gutter.",
  );
  process.exit(1);
}

console.log(
  `Responsive guard: ${routes.length} route(s) × ${WIDTHS.length} widths, no horizontal overflow.`,
);
