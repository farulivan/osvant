// @ts-check
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  // Canonical/OG/JSON-LD absolute URLs and sitemap.xml all resolve against
  // this. The real launch domain is unspecified in the LAW docs (RFC-001 C4
  // names formats, not a host) — flagged; kept in sync with
  // `SITE_PLACEHOLDER` in `src/lib/seo.ts` until the domain lands.
  site: "https://osvant.example",

  build: {
    // Two render-blocking stylesheet requests sat on the critical path of
    // every page — Lighthouse put them at ~150ms, which is the difference
    // between clearing the 2.5s LCP budget (M §10) and missing it. The
    // sheets are 7–10KB each, small enough that inlining them costs less
    // than the round trips did. Astro's default only inlines small ones.
    inlineStylesheets: "always",
  },
});
