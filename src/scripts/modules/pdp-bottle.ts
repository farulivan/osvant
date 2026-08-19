// modules/pdp-bottle.ts — PDP scent hero bottle (03 §3.1, M §8/§9).
//
// Contained Three.js bottle with drag-to-rotate (±180°), idle ambient
// rotation and a --scent-tint rim glow. Under reduced motion the idle
// spin stops but drag still works (M §9). Probe fail / deviceMemory < 4
// → static wash fallback ([data-bottle-fallback]) + track("webgl_fallback")
// (RFC C7); turntable WebMs ship with the GLBs (06 §1).
//
// Same loading contract as the gallery: lazy chunk on approach
// (rootMargin 200%), render loop owned by a visibility observer — zero
// frames while unseen (M §8). Everything dies in destroy().

import { registry, type PageModule } from "../core/registry";
import { track } from "../core/track";
import { webglAvailable } from "../webgl/probe";

const RADIANS_PER_PIXEL = 0.01; // drag sensitivity

const cleanup: Array<() => void> = [];

export const pdpBottle: PageModule = {
  selector: "[data-pdp-bottle]",

  mount(root: HTMLElement, ctx): void {
    const canvas = root.querySelector<HTMLCanvasElement>(
      "[data-bottle-canvas]",
    );
    const fallback = root.querySelector<HTMLElement>("[data-bottle-fallback]");
    if (!canvas || !fallback) return;

    // Fallback path — no WebGL / low memory (M §8). Reduced motion is NOT
    // a fallback here: drag-to-rotate stays available, only the idle
    // spin stops (M §9).
    if (!webglAvailable()) {
      fallback.hidden = false;
      canvas.hidden = true;
      track("webgl_fallback", { reason: "probe", page: "pdp" });
      cleanup.push(() => {
        fallback.hidden = true;
        canvas.hidden = false;
      });
      return;
    }

    const tint = getComputedStyle(root).getPropertyValue("--scent-tint").trim();

    let disposed = false;
    cleanup.push(() => {
      disposed = true;
    });

    type BottleScene = import("../webgl/bottle-scene").BottleScene;
    let scene: BottleScene | null = null;
    cleanup.push(() => {
      scene?.dispose();
      scene = null;
    });

    // Drag-to-rotate ±180° (03 §3.1) — pointer events cover touch.
    let lastX = 0;
    const onPointerDown = (event: PointerEvent): void => {
      lastX = event.clientX;
      scene?.setDragging(true);
      canvas.setPointerCapture(event.pointerId);
    };
    const onPointerMove = (event: PointerEvent): void => {
      if (!canvas.hasPointerCapture(event.pointerId)) return;
      scene?.drag((event.clientX - lastX) * RADIANS_PER_PIXEL);
      lastX = event.clientX;
    };
    const onPointerUp = (event: PointerEvent): void => {
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
      scene?.setDragging(false);
    };
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    cleanup.push(() => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
    });

    const onResize = (): void => {
      scene?.resize(root.clientWidth, root.clientHeight);
    };
    window.addEventListener("resize", onResize);
    cleanup.push(() => window.removeEventListener("resize", onResize));

    const boot = async (): Promise<void> => {
      if (disposed || scene) return;
      const { createBottleScene } = await import("../webgl/bottle-scene");
      if (disposed) return; // destroyed while the chunk was loading
      scene = createBottleScene({
        canvas,
        tint: tint || "#ffffff",
        idleRotation: !ctx.reducedMotion, // M §9
      });
      scene.resize(root.clientWidth, root.clientHeight);

      // Render loop starts only when the hero scrolls into view (M §8)
      const visibilityObserver = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) scene?.start();
        else scene?.stop();
      });
      visibilityObserver.observe(root);
      cleanup.push(() => visibilityObserver.disconnect());
    };

    const approachObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          approachObserver.disconnect();
          void boot();
        }
      },
      { rootMargin: "200%" },
    );
    approachObserver.observe(root);
    cleanup.push(() => approachObserver.disconnect());
  },

  destroy(): void {
    for (const kill of cleanup.splice(0)) kill();
  },
};

registry.registerModule(pdpBottle);
