// @ts-check
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  // Canonical/OG/JSON-LD absolute URLs and sitemap.xml all resolve against
  // this. The real launch domain is unspecified in the LAW docs (RFC-001 C4
  // names formats, not a host) — flagged; kept in sync with
  // `SITE_PLACEHOLDER` in `src/lib/seo.ts` until the domain lands.
  site: "https://osvant.example",
});
