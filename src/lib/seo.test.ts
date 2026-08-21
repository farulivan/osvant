import { describe, expect, it } from "vitest";
import type { Product } from "./commerce";
import {
  absoluteUrl,
  buildProductJsonLd,
  homeTitle,
  jsonLdScript,
  pageTitle,
  pdpTitle,
  SITE_PLACEHOLDER,
} from "./seo";

const volt: Product = {
  scent: "volt",
  name: "the volt",
  batch: "001",
  notes: ["neroli", "yuzu", "mint spark"],
  character: "the jolt. citrus wired to a live current.",
  variants: [
    {
      sku: "OSV-VOLT-50",
      scent: "volt",
      size: "50ml",
      price: 110,
      currency: "EUR",
      availableForSale: true,
      limited: false,
    },
    {
      sku: "OSV-VOLT-100",
      scent: "volt",
      size: "100ml",
      price: 160,
      currency: "EUR",
      availableForSale: false,
      limited: false,
    },
  ],
};

describe("lib/seo titles (RFC-001 C4 formats)", () => {
  it("formats the home title as brand — tagline", () => {
    expect(homeTitle()).toBe("osvant — scent beyond the visible");
  });

  it("formats a PDP title as scent — eau de parfum — osvant", () => {
    expect(pdpTitle("the volt")).toBe("the volt — eau de parfum — osvant");
  });

  it("formats every other page as page — osvant", () => {
    expect(pageTitle("collection")).toBe("collection — osvant");
  });

  it("keeps titles lowercase (brand voice, C4)", () => {
    for (const title of [homeTitle(), pdpTitle("the fever"), pageTitle("t")]) {
      expect(title).toBe(title.toLowerCase());
    }
  });
});

describe("lib/seo absoluteUrl", () => {
  it("resolves against the supplied site", () => {
    expect(absoluteUrl("/collection/", new URL("https://osvant.test"))).toBe(
      "https://osvant.test/collection/",
    );
  });

  it("falls back to the placeholder domain when site is unset", () => {
    expect(absoluteUrl("/collection/", undefined)).toBe(
      `${SITE_PLACEHOLDER}/collection/`,
    );
  });

  it("keeps a preview BASE_URL prefix intact (guide §8 trap #2)", () => {
    expect(
      absoluteUrl("/previews/pr-42/collection/", "https://staging.osvant.test"),
    ).toBe("https://staging.osvant.test/previews/pr-42/collection/");
  });
});

describe("lib/seo Product JSON-LD (RFC-001 C4)", () => {
  const jsonLd = buildProductJsonLd(
    volt,
    "https://osvant.test/collection/volt/",
    "https://osvant.test/og.png",
  );

  it("describes the product from its catalog character copy", () => {
    expect(jsonLd["@type"]).toBe("Product");
    expect(jsonLd.name).toBe("the volt");
    expect(jsonLd.description).toBe(volt.character);
    expect(jsonLd.brand).toEqual({ "@type": "Brand", name: "osvant" });
  });

  it("emits one Offer per variant with schema.org availability", () => {
    const offers = jsonLd.offers as Array<Record<string, unknown>>;
    expect(offers).toHaveLength(2);
    expect(offers[0]).toMatchObject({
      sku: "OSV-VOLT-50",
      price: 110,
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
    });
    expect(offers[1]?.availability).toBe("https://schema.org/OutOfStock");
  });

  it("produces a valid one-item offers array for single-SKU fever (B2)", () => {
    const fever: Product = {
      ...volt,
      scent: "fever",
      name: "the fever",
      batch: "004",
      variants: [{ ...volt.variants[0]!, sku: "OSV-FEVER-50", limited: true }],
    };
    const offers = buildProductJsonLd(fever, "u", "i").offers as unknown[];
    expect(offers).toHaveLength(1);
  });
});

describe("lib/seo jsonLdScript", () => {
  it("escapes < so a value cannot close the surrounding script tag", () => {
    const serialized = jsonLdScript({ name: "</script><img src=x>" });
    expect(serialized).not.toContain("</script>");
    expect(serialized).toContain("\\u003c/script>");
  });

  it("round-trips to the original object", () => {
    expect(JSON.parse(jsonLdScript({ a: 1 }))).toEqual({ a: 1 });
  });
});
