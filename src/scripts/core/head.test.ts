import { beforeEach, describe, expect, it } from "vitest";
import { syncHead } from "./head";

function incomingDocument(head: string): Document {
  return new DOMParser().parseFromString(
    `<!doctype html><html><head>${head}</head><body></body></html>`,
    "text/html",
  );
}

const LIVE_HEAD = `
  <meta name="description" content="home description" data-meta-description />
  <link rel="canonical" href="https://osvant.test/" data-canonical />
  <meta property="og:title" content="osvant — scent beyond the visible" data-og-title />
  <meta property="og:url" content="https://osvant.test/" data-og-url />
  <meta property="og:image" content="https://osvant.test/og-house.png" data-og-image />
  <meta name="twitter:title" content="osvant — scent beyond the visible" data-twitter-title />
`;

describe("core/head syncHead (guide §8 trap #1)", () => {
  beforeEach(() => {
    document.head.innerHTML = LIVE_HEAD;
  });

  it("copies marked meta and canonical values from the incoming page", () => {
    syncHead(
      incomingDocument(`
        <meta name="description" content="the volt — the jolt." data-meta-description />
        <link rel="canonical" href="https://osvant.test/collection/volt/" data-canonical />
        <meta property="og:title" content="the volt — eau de parfum — osvant" data-og-title />
        <meta property="og:url" content="https://osvant.test/collection/volt/" data-og-url />
      `),
    );

    expect(
      document.head
        .querySelector("[data-meta-description]")
        ?.getAttribute("content"),
    ).toBe("the volt — the jolt.");
    expect(
      document.head.querySelector("[data-canonical]")?.getAttribute("href"),
    ).toBe("https://osvant.test/collection/volt/");
    expect(
      document.head.querySelector("[data-og-title]")?.getAttribute("content"),
    ).toBe("the volt — eau de parfum — osvant");
  });

  it("leaves a marked node untouched when the incoming page lacks it", () => {
    syncHead(incomingDocument("<title>x</title>"));

    expect(
      document.head.querySelector("[data-og-image]")?.getAttribute("content"),
    ).toBe("https://osvant.test/og-house.png");
  });

  it("adds Product JSON-LD when entering a PDP", () => {
    syncHead(
      incomingDocument(
        '<script type="application/ld+json">{"@type":"Product"}</script>',
      ),
    );

    const scripts = document.head.querySelectorAll(
      'script[type="application/ld+json"]',
    );
    expect(scripts).toHaveLength(1);
    expect(scripts[0]?.textContent).toContain("Product");
  });

  it("removes stale JSON-LD when leaving a PDP", () => {
    document.head.insertAdjacentHTML(
      "beforeend",
      '<script type="application/ld+json">{"@type":"Product"}</script>',
    );

    syncHead(incomingDocument("<title>the house</title>"));

    expect(
      document.head.querySelectorAll('script[type="application/ld+json"]'),
    ).toHaveLength(0);
  });

  it("adds and removes the noindex robots meta with the error routes", () => {
    syncHead(
      incomingDocument('<meta name="robots" content="noindex, follow" />'),
    );
    expect(
      document.head
        .querySelector('meta[name="robots"]')
        ?.getAttribute("content"),
    ).toBe("noindex, follow");

    syncHead(incomingDocument("<title>home</title>"));
    expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
  });

  it("is a no-op when there is no incoming document", () => {
    expect(() => syncHead(undefined)).not.toThrow();
    expect(
      document.head
        .querySelector("[data-meta-description]")
        ?.getAttribute("content"),
    ).toBe("home description");
  });

  it("is a no-op when the incoming document has no head", () => {
    const headless = new DOMParser().parseFromString(
      "<root />",
      "application/xml",
    );
    expect(() => syncHead(headless)).not.toThrow();
    expect(
      document.head
        .querySelector("[data-meta-description]")
        ?.getAttribute("content"),
    ).toBe("home description");
  });
});
