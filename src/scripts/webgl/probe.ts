// webgl/probe.ts — shared WebGL capability probe (M §8).
// False → turntable/static fallback layout; the page must work with
// zero WebGL. Low-memory devices (< 4GB) also fall back.

export function webglAvailable(): boolean {
  const memory = (navigator as Navigator & { deviceMemory?: number })
    .deviceMemory;
  if (typeof memory === "number" && memory < 4) return false;
  try {
    const probe = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (probe.getContext("webgl2") ?? probe.getContext("webgl"))
    );
  } catch {
    return false;
  }
}
