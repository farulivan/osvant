import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { track } from "./track";

describe("core/track", () => {
  beforeEach(() => {
    window.dataLayer = undefined;
    vi.spyOn(console, "table").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("pushes the event and params onto window.dataLayer", () => {
    track("add_to_cart", { sku: "OSV-FEVER-50" });

    expect(window.dataLayer).toEqual([
      { event: "add_to_cart", sku: "OSV-FEVER-50" },
    ]);
  });

  it("appends to an existing dataLayer instead of replacing it", () => {
    window.dataLayer = [{ event: "page_view" }];

    track("begin_checkout");

    expect(window.dataLayer).toEqual([
      { event: "page_view" },
      { event: "begin_checkout" },
    ]);
  });

  it("defaults params to an empty object", () => {
    track("preloader_complete");

    expect(window.dataLayer).toEqual([{ event: "preloader_complete" }]);
  });
});
