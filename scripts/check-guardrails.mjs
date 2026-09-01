/*
 * check-guardrails.mjs — the three brand bans, checked against what
 * actually ships (ADR-017).
 *
 *   no box-shadow          01 §4.3 — "depth comes from surface color
 *                          steps ... never from box-shadow"
 *   no uppercase           brief §4 — "lowercase display type is a
 *                          signature"
 *   no #fff/#000/neutral   01 §1 — "no pure white, no pure black, no
 *                          neutral gray anywhere. Every neutral is
 *                          green-tinted."
 *
 * These were stylelint rules, and stylelint could only ever see CSS a
 * human typed into a file it was pointed at. That gap is not theoretical:
 * on 2026-08-28 the cart lines were found to be built at runtime with
 * innerHTML, so every `.cart-line*` rule had compiled to
 * `.cart-line[data-astro-cid-…]` and matched nothing — "which is how
 * neutral grey and pure black reached a page whose stylelint config
 * forbids both." Tailwind widens the same gap in the other direction:
 * generated utilities are never linted either.
 *
 * So the check moves to the output. `build.inlineStylesheets: "always"`
 * puts every byte of CSS inside the documents, so one pass over
 * dist/**\/*.html sees authored CSS, generated utilities and inline style
 * attributes alike. The stylelint rules stay as the fast feedback loop;
 * this is the one that cannot be walked around.
 *
 * Run: pnpm check:guardrails   (CI: build job, after `pnpm build`)
 */

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const DIST = new URL("../dist", import.meta.url).pathname;
const ROOT = new URL("..", import.meta.url).pathname;

if (!existsSync(DIST)) {
  console.error("Guardrail scan: no dist/ — run `pnpm build` first.");
  process.exit(1);
}

function htmlFiles(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) htmlFiles(path, out);
    else if (entry.name.endsWith(".html")) out.push(path);
  }
  return out;
}

/* Every <style> body plus every inline style="" — the two places a
   declaration can reach the page. */
function declarationSources(html) {
  const out = [];
  for (const m of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) {
    out.push(m[1]);
  }
  for (const m of html.matchAll(/\sstyle="([^"]*)"/g)) {
    out.push(m[1].replace(/&quot;/g, '"'));
  }
  return out.join("\n;\n");
}

/*
 * A hex is neutral when r == g == b. #008d57 is fine; #888 is not.
 *
 * Fully transparent values are exempt whatever their channels: they paint
 * nothing, and the token system already ships one deliberately
 * (--color--phosphor-zero: #008d5700, "transparent phosphor — gradient
 * and fade endpoints"). This matters because Lightning CSS minifies an
 * authored `transparent` down to `#0000`, so the ban would otherwise fire
 * on a keyword nobody typed.
 */
function isNeutralHex(hex) {
  const h = hex.toLowerCase();
  let rgb;
  let alpha = "ff";
  if (h.length === 3 || h.length === 4) {
    rgb = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    if (h.length === 4) alpha = h[3] + h[3];
  } else if (h.length === 6 || h.length === 8) {
    rgb = h.slice(0, 6);
    if (h.length === 8) alpha = h.slice(6, 8);
  } else {
    return false;
  }
  if (alpha === "00") return false;
  return (
    rgb.slice(0, 2) === rgb.slice(2, 4) && rgb.slice(2, 4) === rgb.slice(4, 6)
  );
}

const violations = [];

for (const file of htmlFiles(DIST)) {
  const rel = relative(ROOT, file);
  const css = declarationSources(readFileSync(file, "utf8"));

  /*
   * Declaration-level, not a string match. `box-shadow` legitimately
   * appears as a NAME inside `transition-property: …,box-shadow,…` and
   * as `box-shadow: none` in a UA-invalid reset — neither paints
   * anything. Only a box-shadow declaration with a real value counts.
   */
  for (const m of css.matchAll(/(^|[;{])\s*box-shadow\s*:\s*([^;}]+)/gi)) {
    const value = m[2].trim();
    if (value === "none" || value === "0 0 #0000") continue;
    violations.push([rel, `box-shadow: ${value} (01 §4.3)`]);
  }

  for (const m of css.matchAll(/(^|[;{])\s*text-transform\s*:\s*uppercase/gi)) {
    void m;
    violations.push([rel, "text-transform: uppercase (brief §4)"]);
  }

  const seenHex = new Set();
  for (const m of css.matchAll(/#([0-9a-fA-F]{3,8})\b/g)) {
    if (!isNeutralHex(m[1]) || seenHex.has(m[1])) continue;
    seenHex.add(m[1]);
    violations.push([rel, `neutral/pure hex #${m[1]} (01 §1)`]);
  }

  /* The same ban written as rgb()/rgba(). An alpha channel is allowed to
     differ — `rgb(14 17 16 / 80%)` is the nav's translucent black and is
     green-shifted, so only the three colour channels are compared. */
  const seenRgb = new Set();
  for (const m of css.matchAll(
    /rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*(?:[,/]\s*([\d.]+%?))?/gi,
  )) {
    const [r, g, b] = [m[1], m[2], m[3]].map(Number);
    const a = m[4];
    if (a !== undefined && (a === "0" || a === "0%")) continue;
    if (!(r === g && g === b) || seenRgb.has(m[0])) continue;
    seenRgb.add(m[0]);
    violations.push([rel, `neutral rgb(${r} ${g} ${b}) (01 §1)`]);
  }
}

const pages = htmlFiles(DIST).length;

if (violations.length) {
  console.error(`Guardrail scan: ${violations.length} violation(s)`);
  for (const [file, message] of violations) {
    console.error(`  ✖ ${file} — ${message}`);
  }
  process.exit(1);
}

console.log(
  `Guardrail scan: ${pages} page(s) checked — no box-shadow, no uppercase, no neutral grays.`,
);
