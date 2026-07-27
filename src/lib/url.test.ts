import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { withBase } from "./url";

describe("lib/url withBase", () => {
  beforeEach(() => {
    vi.stubEnv("BASE_URL", "/");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("joins a root BASE_URL with a leading-slash path", () => {
    expect(withBase("/collection")).toBe("/collection");
  });

  it("joins a root BASE_URL with a bare path", () => {
    expect(withBase("collection")).toBe("/collection");
  });

  it("prefixes a preview-deploy BASE_URL (guide §8 trap #2)", () => {
    vi.stubEnv("BASE_URL", "/previews/pr-42/");
    expect(withBase("/collection")).toBe("/previews/pr-42/collection");
  });

  it("normalizes a BASE_URL missing its trailing slash", () => {
    vi.stubEnv("BASE_URL", "/previews/pr-42");
    expect(withBase("collection")).toBe("/previews/pr-42/collection");
  });
});
