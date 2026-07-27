// lib/url.ts — BASE_URL-aware internal links (guide §8 trap #2).
// Preview deploys serve under `/previews/pr-<n>/`; absolute-root paths
// (`/collection`, `/assets/...`) 404 there. Every internal link/asset
// reference goes through this helper instead.

export function withBase(path: string): string {
  const base = import.meta.env.BASE_URL;
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;

  return `${normalizedBase}${normalizedPath}`;
}
