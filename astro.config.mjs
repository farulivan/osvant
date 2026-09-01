// @ts-check
import { defineConfig, fontProviders } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  /*
   * Tailwind v4 (ADR-015). The Vite plugin, NOT the @astrojs/tailwind
   * integration — that one is a v3-era package and is deprecated.
   *
   * Build-time only: Tailwind emits CSS and ships no runtime and no
   * network request, so ADR-012 is untouched.
   */
  vite: {
    plugins: [tailwindcss()],
  },

  // Placeholder origin — kept in sync with SITE_PLACEHOLDER in src/lib/seo.ts.
  // Swap both together when a real domain lands.
  site: "https://osvant.example",

  build: {
    /*
     * Astro's default. It inlines a stylesheet only while it is small
     * enough to be worth the bytes, and links it once it is not.
     *
     * This was "always" from the day the whole stylesheet was 462 lines,
     * and the comment then read: "the stylesheet is small enough that a
     * separate request cost more than the bytes did — this was an LCP fix,
     * not a preference." That premise stopped being true here. Under
     * utility-first authoring the CSS is one bundle shared by every route
     * rather than per-page scoped blocks, so "always" pays for it 20 times
     * over: converting five components added 2.75KB of utilities and
     * therefore 51KB to the site, because every one of the 20 documents
     * carried the new bytes whether or not it used them.
     *
     * Linked, that bundle is fetched once, hashed, immutable-cached, and
     * reused across every route — and taxi.js navigations never re-parse
     * it at all. Measured, not assumed: LCP moved 1811-2132ms -> see the
     * worklog for the table.
     */
    inlineStylesheets: "auto",
  },

  /*
   * Typography (01 §3.1, ADR-014). One family, three static cuts.
   *
   * Astro does NOT subset and does NOT convert .otf → .woff2 — `pnpm fonts`
   * (scripts/subset-fonts.mjs) does both, upstream of this config, and these
   * paths point at its committed output. What Astro adds is metric-matched
   * fallback generation, content-hashed URLs and preload filtering.
   *
   * `stretch` is load-bearing: Mosvita's Expanded is a separate drawn master,
   * not a `wdth` axis, so this descriptor is the only thing that makes
   * `font-stretch: 125%` select the 900 file instead of synthesising a
   * stretch of the 400 one.
   *
   * `fallbacks` must END in a generic family or Astro's fallback-metric
   * optimisation silently no-ops — the one failure here that raises no error.
   */
  fonts: [
    {
      provider: fontProviders.local(),
      name: "Mosvita",
      cssVariable: "--font--mosvita",
      fallbacks: ["sans-serif"],
      options: {
        variants: [
          {
            src: ["./src/assets/fonts/mosvita-regular.woff2"],
            weight: 400,
            style: "normal",
            stretch: "100%",
            display: "swap",
          },
          {
            src: ["./src/assets/fonts/mosvita-semibold.woff2"],
            weight: 600,
            style: "normal",
            stretch: "100%",
            display: "swap",
          },
          {
            src: ["./src/assets/fonts/mosvita-black-expanded.woff2"],
            weight: 900,
            style: "normal",
            stretch: "125%",
            display: "swap",
          },
        ],
      },
    },
  ],
});
