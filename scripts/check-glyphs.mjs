/*
 * Glyph guard (06 §1, companion to `subset-fonts.mjs`).
 *
 * Subsetting the fonts traded a performance miss for a latent content
 * bug: a character outside the retained set renders as tofu, or as a
 * synthesised fallback glyph that silently breaks the typography. It
 * would not show up until someone wrote a journal article containing a
 * "ü" or pasted a curly apostrophe variant we did not keep.
 *
 * So this looks. Same shape as `check-copy.mjs`: it reads the BUILT
 * output rather than the source, because only what reaches a user counts,
 * and it imports the character set from `font-charset.mjs` — the same
 * module the subsetter bakes into the woff2 — rather than keeping a
 * second copy that can drift out of sync with the actual font.
 *
 * Fixing a failure is a choice, not a chore: either change the copy, or
 * widen `retainedCharacters()` and re-run `pnpm fonts`.
 *
 * Zero dependencies beyond the sibling script — runs on bare Node in CI.
 */

import { readdirSync, readFileSync } from "node:fs";
import { extname, join, relative } from "node:path";

import { retainedCharacters } from "./font-charset.mjs";

const ROOT = new URL("..", import.meta.url).pathname;
const DIST = join(ROOT, "dist");

const retained = new Set(retainedCharacters());
// Whitespace never reaches a glyph, and the HTML parser produces plenty
// of it that no font is asked to render.
const IGNORED = new Set([" ", "\n", "\r", "\t", " "]);

/** @returns {string[]} every file under dir, recursively */
function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

/**
 * Visible text only. Script and style bodies are not rendered, and
 * attribute values inside tags are mostly machine-facing — but `alt`,
 * `title`, `aria-label` and `content` ARE shown or spoken, so they are
 * pulled back in explicitly rather than dropped with the rest of the tag.
 */
function visibleText(html) {
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ");

  const spoken = [
    ...stripped.matchAll(
      /\s(?:alt|title|aria-label|aria-valuetext|content)="([^"]*)"/gi,
    ),
  ]
    .map((match) => match[1])
    .join(" ");

  return `${stripped.replace(/<[^>]+>/g, " ")} ${spoken}`;
}

/** Named and numeric entities resolve to real glyphs — decode before checking. */
function decodeEntities(text) {
  const named = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
    mdash: "—",
    ndash: "–",
    hellip: "…",
    rsquo: "’",
    lsquo: "‘",
    ldquo: "“",
    rdquo: "”",
    middot: "·",
    sect: "§",
    euro: "€",
    times: "×",
  };
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(
      /&([a-z]+);/gi,
      (match, name) => named[name.toLowerCase()] ?? match,
    );
}

const pages = walk(DIST).filter((file) => extname(file) === ".html");
/** @type {Map<string, Set<string>>} character → pages it appears on */
const offenders = new Map();

for (const file of pages) {
  const text = decodeEntities(visibleText(readFileSync(file, "utf8")));
  for (const char of text) {
    if (retained.has(char) || IGNORED.has(char)) continue;
    if (!offenders.has(char)) offenders.set(char, new Set());
    offenders.get(char).add(relative(ROOT, file));
  }
}

if (offenders.size > 0) {
  console.error(
    `Glyph guard: ${offenders.size} character(s) are rendered but not in the font subset\n`,
  );
  for (const [char, files] of offenders) {
    const code = char
      .codePointAt(0)
      .toString(16)
      .padStart(4, "0")
      .toUpperCase();
    const where = [...files].slice(0, 3).join(", ");
    const more = files.size > 3 ? ` (+${files.size - 3} more)` : "";
    console.error(`  ✖ "${char}" U+${code} — ${where}${more}`);
  }
  console.error(
    `\nEither change the copy, or add the character to retainedCharacters()` +
      ` in scripts/subset-fonts.mjs and re-run \`pnpm fonts\`.`,
  );
  process.exit(1);
}

console.log(
  `Glyph guard: ${pages.length} page(s) checked, all glyphs in the subset.`,
);
