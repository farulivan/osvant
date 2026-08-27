/*
 * The retained character set — the single source of truth shared by
 * `subset-fonts.mjs` (which bakes it into the woff2) and
 * `check-glyphs.mjs` (which fails the build if a page renders outside
 * it). It lives in its own module so importing the charset does not
 * execute the subsetter as a side effect.
 *
 * Printable ASCII covers any ordinary English copy. The extras are the
 * typography the brand actually uses: the section mark in legal pages,
 * the middot in note lists, em and en dashes, curly quotes, the ellipsis,
 * the euro, the multiplication sign.
 *
 * Deliberately wider than the 74 glyphs the site renders today — a
 * subset tuned to exactly the current copy would fail the moment anyone
 * wrote a new sentence.
 *
 * When new copy needs a character, widen this and re-run `pnpm fonts`.
 * Do not reach for the unsubset original.
 */

export function retainedCharacters() {
  let chars = "";
  for (let code = 0x20; code <= 0x7e; code++) {
    chars += String.fromCodePoint(code);
  }
  return chars + "§·—–’‘“”…€×";
}
