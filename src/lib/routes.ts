// lib/routes.ts — the indexable route list, derived rather than hand-kept.
//
// Static routes come from the `src/pages` tree itself (so a new page can
// never silently miss the sitemap); the two dynamic routes expand from
// their own sources — the catalog and the journal collection. Excluded:
// error routes (`404`/`500`, both `noindex`) and the `/dev` harnesses
// (staging-only tooling, 06 §2).
import { getCollection } from "astro:content";
import { catalog as products } from "./commerce";

const EXCLUDED = /^(404|500|dev\/|robots\.txt$|sitemap\.xml$)/;

/** `src/pages/collection/index.astro` → `/collection/`, root → `/`. */
function toPathname(file: string): string {
  const route = file
    .replace(/^\.\//, "")
    .replace(/\.astro$/, "")
    .replace(/(^|\/)index$/, "");
  return route === "" ? "/" : `/${route}/`;
}

export async function indexableRoutes(): Promise<string[]> {
  const files = Object.keys(
    import.meta.glob("../pages/**/*.astro", { eager: false }),
  ).map((file) => file.replace("../pages/", "./"));

  const staticRoutes = files
    .filter((file) => !file.includes("["))
    .map(toPathname)
    .filter((route) => !EXCLUDED.test(route.slice(1)));

  const pdpRoutes = products.map((product) => `/collection/${product.scent}/`);

  const articles = await getCollection("journal");
  const journalRoutes = articles.map(
    (article) => `/journal/${article.id.replace(/\.md$/, "")}/`,
  );

  return [...staticRoutes, ...pdpRoutes, ...journalRoutes].sort();
}
