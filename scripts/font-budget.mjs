/*
 * The shipped font payload cap — the single source of truth shared by
 * `subset-fonts.mjs` (which fails at generation time) and
 * `check-assets.mjs` (which fails in CI, where it actually matters).
 *
 * It lives in its own module for the same reason the charset does: so
 * importing the number does not execute a guard as a side effect.
 *
 * Why a TOTAL and not a per-file limit: the old guard capped Archivo at
 * 48KB because Archivo was the whole payload — one variable file carrying
 * every weight. Mosvita is a static family, so the payload is a sum, and
 * a per-file cap would happily wave through a fifth cut. What LCP cares
 * about is bytes on the wire, not how many files they arrive in.
 *
 * 50KB, against 34.7KB shipped today (3 × ~11.6KB). The headroom is
 * deliberate and sized to exactly one thing: the escape hatch in
 * `01 §3.1` — adding `Mosvita-Black` at 100% width for h3–h5 lands at
 * 46.3KB and still fits. A fifth cut does not, and that is the point:
 * widening the ladder past the documented hatch should require amending
 * the doc and this number together, not just dropping in a file.
 *
 * For scale: this replaced Archivo 35.8KB + Instrument Serif 21.0KB =
 * 56.8KB, so the cap also guarantees we never regress past what the two-
 * face build cost.
 */

export const FONT_PAYLOAD_LIMIT_BYTES = 50 * 1024;
