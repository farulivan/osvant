import { beforeEach, describe, expect, it, vi } from "vitest";
import { webglAvailable } from "./probe";

if (typeof window.WebGLRenderingContext === "undefined") {
  vi.stubGlobal("WebGLRenderingContext", function WebGLRenderingContext() {});
}

function stubContext(renderer: string | null): void {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
    () =>
      ({
        getExtension: (name: string) =>
          name === "WEBGL_debug_renderer_info"
            ? { UNMASKED_RENDERER_WEBGL: 0x9246 }
            : null,
        getParameter: () => renderer,
      }) as unknown as RenderingContext,
  );
}

describe("webgl/probe (M §8)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("falls back on software rasterizers (SwiftShader/llvmpipe)", () => {
    stubContext("WebKit WebGL SwiftShader");
    expect(webglAvailable()).toBe(false);

    stubContext("llvmpipe (LLVM 17, 256 bits)");
    expect(webglAvailable()).toBe(false);
  });

  it("accepts hardware renderers", () => {
    stubContext("ANGLE (Apple, ANGLE Metal Renderer: Apple M4, Unspecified)");
    expect(webglAvailable()).toBe(true);
  });

  it("falls back when the context cannot be created", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
      () => null,
    );
    expect(webglAvailable()).toBe(false);
  });
});
