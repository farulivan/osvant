// sitemap.xml (launch QA — 04-qa §7). Hand-rolled endpoint: `@astrojs/
// sitemap` would be a new dependency and this site is 18 static routes.
// URLs come from `lib/routes.ts` and resolve against `site`, matching the
// canonical each page renders.
import type { APIRoute } from "astro";
import { absoluteUrl } from "../lib/seo";
import { indexableRoutes } from "../lib/routes";
import { withBase } from "../lib/url";

export const GET: APIRoute = async ({ site }) => {
  const routes = await indexableRoutes();
  const urls = routes
    .map(
      (route) =>
        `  <url><loc>${absoluteUrl(withBase(route), site)}</loc></url>`,
    )
    .join("\n");

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

  return new Response(body, {
    headers: { "content-type": "application/xml; charset=utf-8" },
  });
};
