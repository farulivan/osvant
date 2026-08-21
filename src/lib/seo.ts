// lib/seo.ts — SEO/meta/JSON-LD helpers (RFC-001 C4).
//
// Kept out of BaseLayout markup so the head templating stays readable and
// the title/URL/JSON-LD logic is unit-testable without rendering Astro.
import type { Product, ProductVariant } from "./commerce";

/** RFC-001 C4 placeholder production domain — flagged, pending the real
 * launch domain. Every absolute URL (canonical, OG, JSON-LD) resolves
 * against this until it's replaced; `astro.config.mjs` sets the same
 * value as `site` so `Astro.site` and this fallback never disagree. */
export const SITE_PLACEHOLDER = "https://osvant.example";

/** Brand voice is lowercase everywhere, `<title>` included (RFC C4). */
const BRAND = "osvant";
const TAGLINE = "scent beyond the visible";

/** OG house default (06 §1 ledger) — the only OG image until the w6
 * per-scent composites land. Path is BASE_URL-relative; callers pass it
 * through `withBase()` + `absoluteUrl()`. */
export const OG_DEFAULT_PATH = "assets/img/og/og-house-default.png";
export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;
export const OG_ALT = `${BRAND} — ${TAGLINE}`;

// --- titles (RFC C4 formats, verbatim) ---------------------------------

/** Home: `osvant — scent beyond the visible`. */
export function homeTitle(): string {
  return `${BRAND} — ${TAGLINE}`;
}

/**
 * PDP: `<scent> — eau de parfum — osvant`.
 *
 * Judgment call: C4 writes `<scent>`; we pass the full product name
 * (`the volt`) rather than the bare slug, matching how the scent is named
 * in every other surface (PDP h1, cards, cart) and the PDP eyebrow's
 * `batch 0N — eau de parfum` phrasing (03 §3.1).
 */
export function pdpTitle(productName: string): string {
  return `${productName} — eau de parfum — ${BRAND}`;
}

/** Everything else: `<page> — osvant`. */
export function pageTitle(page: string): string {
  return `${page} — ${BRAND}`;
}

// --- URLs --------------------------------------------------------------

export function absoluteUrl(
  path: string,
  site: URL | string | undefined,
): string {
  return new URL(path, site ?? SITE_PLACEHOLDER).href;
}

// --- structured data ---------------------------------------------------

/** schema.org availability enum for an Offer (RFC B3/C4). */
function availability(variant: ProductVariant): string {
  return variant.availableForSale
    ? "https://schema.org/InStock"
    : "https://schema.org/OutOfStock";
}

/**
 * Product JSON-LD (RFC-001 C4, approved with B2 data). One Offer per
 * variant/SKU — fever's single 50ml SKU still produces a valid one-item
 * offers array. `image` reuses the OG house-default placeholder until
 * per-scent bottle stills land (06 §1) — flagged in the PR.
 */
export function buildProductJsonLd(
  product: Product,
  pdpUrl: string,
  imageUrl: string,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.character,
    sku: product.variants[0]?.sku,
    brand: { "@type": "Brand", name: BRAND },
    image: imageUrl,
    offers: product.variants.map((variant) => ({
      "@type": "Offer",
      sku: variant.sku,
      url: pdpUrl,
      priceCurrency: variant.currency,
      price: variant.price,
      availability: availability(variant),
    })),
  };
}

/** Serializes JSON-LD for inline embedding — escapes `<` so a value can
 * never prematurely close the surrounding <script> tag (standard JSON-LD
 * XSS mitigation; harmless no-op on today's copy). */
export function jsonLdScript(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
