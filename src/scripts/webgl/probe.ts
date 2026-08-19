// webgl/probe.ts — shared WebGL capability probe (M §8).
// False → turntable/static fallback layout; the page must work with
// zero WebGL. Low-memory devices (< 4GB) also fall back, and so do
// software rasterizers (SwiftShader/llvmpipe — no GPU acceleration):
// a 60fps ticker-driven scene on a software rasterizer produces
// multi-second main-thread blocking, which is exactly the failure mode
// M §8's fallback exists to prevent.

const SOFTWARE_RENDERER_RE = /swiftshader|llvmpipe|softpipe|software/i;

export function webglAvailable(): boolean {
  const memory = (navigator as Navigator & { deviceMemory?: number })
    .deviceMemory;
  if (typeof memory === "number" && memory < 4) return false;
  try {
    const probe = document.createElement("canvas");
    const context =
      window.WebGLRenderingContext &&
      (probe.getContext("webgl2") ?? probe.getContext("webgl"));
    if (!context) return false;

    const debugInfo = context.getExtension("WEBGL_debug_renderer_info");
    if (debugInfo) {
      const renderer = String(
        context.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL),
      );
      if (SOFTWARE_RENDERER_RE.test(renderer)) return false;
    }
    return true;
  } catch {
    return false;
  }
}
