// robots.txt (launch QA — 04-qa §7). A static endpoint rather than a file
// in `public/` so the Sitemap line resolves against `site`
// (astro.config.mjs) instead of hardcoding a host.
//
// `/dev/` harnesses are staging-only tooling (06 §2) and already carry
// `noindex` in DevHarness.astro — this keeps crawlers off them entirely.
import type { APIRoute } from "astro";
import { absoluteUrl } from "../lib/seo";
import { withBase } from "../lib/url";

export const GET: APIRoute = ({ site }) => {
  const body = [
    "User-agent: *",
    `Disallow: ${withBase("dev/")}`,
    "Allow: /",
    "",
    `Sitemap: ${absoluteUrl(withBase("sitemap.xml"), site)}`,
    "",
  ].join("\n");

  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
};
