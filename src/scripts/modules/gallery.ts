// modules/gallery.ts — home collection gallery, the signature moment
// (M §4.4; fallback M §8; lazy chunk per 01-arch module table).
//
// Pinned full-viewport Three.js procession of the five scents: scrub
// (300%) drives x-position + active-bottle Y-rotation (±35°), the scent
// name crossfades via SplitText swap, --scent-tint re-themes the section
// per active bottle, snap 1/4 always resolves to a bottle. Idle ambient
// rotation and 3° pointer parallax (lerped 0.08) live inside the scene.
//
// WebGL never blocks the page (M §8):
//   - context probe fails or navigator.deviceMemory < 4 → static
//     procession layout ([data-gallery-fallback]) + track("webgl_fallback")
//     (RFC C7). Turntable WebMs land with the GLBs (06 §1); until then the
//     fallback carries the identical information architecture.
//   - reduced motion (M §9): same static layout, no pin, no scene.
// The three chunk loads lazily when the section approaches
// (IntersectionObserver rootMargin 200%), so non-home routes never pay
// for it.
//
// Lifecycle: ScrollTrigger, observers, listeners and the scene all die
// in destroy() (scene.dispose() frees renderer/geometry/materials, M §8).

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { registry, type PageModule } from "../core/registry";
import { track } from "../core/track";
import { webglAvailable } from "../webgl/probe";

const SCENT_RE = /volt|nocturne|static|fever|halo/;

interface ScentEntry {
  scent: string;
  name: string;
  href: string;
  tint: string;
}

function readScents(root: HTMLElement): ScentEntry[] {
  return Array.from(root.querySelectorAll<HTMLElement>("[data-gallery-scent]"))
    .map((el) => ({
      scent: el.dataset.scent ?? "",
      name: el.dataset.name ?? "",
      href: el.dataset.href ?? "#",
      // Tints resolve from tokens.css custom props — single source of truth.
      tint: getComputedStyle(el).getPropertyValue("--scent-tint").trim(),
    }))
    .filter((entry) => SCENT_RE.test(entry.scent));
}

// Everything mount() creates lands here; destroy() kills all of it
// (03-eng §4.1). Cleared after destroy so repeated destroys are no-ops.
const cleanup: Array<() => void> = [];

export const gallery: PageModule = {
  selector: '[data-module="gallery"]',

  mount(root: HTMLElement, ctx): void {
    const stage = root.querySelector<HTMLElement>("[data-gallery-stage]");
    const canvas = root.querySelector<HTMLCanvasElement>(
      "[data-gallery-canvas]",
    );
    const nameEl = root.querySelector<HTMLElement>("[data-gallery-name]");
    const discover = root.querySelector<HTMLAnchorElement>(
      "[data-gallery-discover]",
    );
    const fallback = root.querySelector<HTMLElement>("[data-gallery-fallback]");
    if (!stage || !canvas || !nameEl || !discover || !fallback) return;

    const scents = readScents(root);
    if (scents.length === 0) return;

    const showFallback = (): void => {
      fallback.hidden = false;
      canvas.hidden = true;
      discover.remove();
    };

    // Fallback path — no WebGL / low memory / reduced motion (M §8/§9)
    if (ctx.reducedMotion || !webglAvailable()) {
      showFallback();
      if (!ctx.reducedMotion) {
        track("webgl_fallback", { reason: "probe" });
      }
      cleanup.push(() => {
        fallback.hidden = true;
        canvas.hidden = false;
        stage.append(discover);
      });
      return;
    }

    // Lazy chunk on approach (01-arch module table, rootMargin 200%)
    let disposed = false;
    cleanup.push(() => {
      disposed = true;
    });

    type GalleryScene = import("../webgl/gallery-scene").GalleryScene;
    let scene: GalleryScene | null = null;
    let split: SplitText | null = null;
    cleanup.push(() => split?.revert());

    const swapName = (index: number): void => {
      const entry = scents[index];
      if (!entry) return;
      split?.revert();
      nameEl.textContent = entry.name;
      root.dataset.scent = entry.scent;
      discover.href = entry.href;
      split = new SplitText(nameEl, { type: "chars" });
      gsap.from(split.chars, {
        yPercent: 110,
        stagger: 0.02,
        overwrite: "auto",
      });
    };

    const onPointerMove = (event: PointerEvent): void => {
      const rect = stage.getBoundingClientRect();
      scene?.setPointer(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        ((event.clientY - rect.top) / rect.height) * 2 - 1,
      );
    };

    const onResize = (): void => {
      scene?.resize(stage.clientWidth, stage.clientHeight);
    };

    const boot = async (): Promise<void> => {
      if (disposed || scene) return;
      const { createGalleryScene } = await import("../webgl/gallery-scene");
      if (disposed) return; // destroyed while the chunk was loading
      scene = createGalleryScene({
        canvas,
        tints: scents.map((entry) => entry.tint || "#ffffff"),
        onActiveChange: swapName,
      });
      scene.resize(stage.clientWidth, stage.clientHeight);
      // The render loop starts only when the section scrolls into view —
      // the visibility observer below is the sole start/stop owner, so a
      // booted-but-unseen gallery costs zero frames (M §8).

      cleanup.push(() => {
        scene?.dispose();
        scene = null;
      });

      // Pause off-viewport (M §8)
      const visibilityObserver = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) scene?.start();
        else scene?.stop();
      });
      visibilityObserver.observe(stage);
      cleanup.push(() => visibilityObserver.disconnect());

      stage.addEventListener("pointermove", onPointerMove);
      window.addEventListener("resize", onResize);
      cleanup.push(() => {
        stage.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("resize", onResize);
      });

      // Pinned scrub, 300%, snap resolves to a bottle (M §4.4)
      const trigger = ScrollTrigger.create({
        trigger: root,
        start: "top top",
        end: "+=300%",
        pin: true,
        scrub: true,
        snap: 1 / (scents.length - 1),
        onUpdate: (self) => scene?.setProgress(self.progress),
      });
      cleanup.push(() => trigger.kill());
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

registry.registerModule(gallery);
