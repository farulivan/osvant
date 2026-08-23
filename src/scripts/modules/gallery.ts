// modules/gallery.ts — the home collection gallery (03 §1.4, M §4.4).
//
// Rebuilt on the light study (ADR-013). Everything except the drawing
// layer survives from the 3D version: the pin, the 300% scrub, the snap,
// the per-item theming and the CTA contract. What used to be a camera
// moving past meshes is now a CSS-transform track of composited stills.
//
// Depth is differential parallax, not geometry (M §4.4): the track moves
// at 1×, and each stage's wash lags it while its vapor leads, netting the
// binding 0.4× / 1× / 1.6× rates. Pointer tilt is differential too
// (1° / 3° / 5°) — a uniform tilt reads as a flat plane rocking.
//
// Reduced motion (M §9): no pin, no scrub, no ticker. The stage is
// replaced by the static row, which carries every scent's name, notes and
// price, so the section stays fully readable.
//
// Lifecycle: the ScrollTrigger, the ticker callback, the pointer listener
// and every per-item light study die in destroy().

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { registry, type PageModule } from "../core/registry";
import { createLightStudy, type LightStudy } from "./light-study";

gsap.registerPlugin(ScrollTrigger, SplitText);

const SELECTOR = '[data-module="gallery"]';

/** M §4.4 — scrub distance and the active bottle's light sweep. */
const SCRUB_DISTANCE = "+=300%";
const ANGLE_ENTER = 0.35;
const ANGLE_EXIT = 0.65;
/** M §4.4 — active vs. inactive presentation. */
const ACTIVE_SCALE = 1.08;
const INACTIVE_SCALE = 0.86;
const INACTIVE_OPACITY = 0.5;
/** M §4.4 — pointer tilt lerp. */
const TILT_LERP = 0.08;

interface Item {
  el: HTMLElement;
  study: LightStudy;
}

export function createGallery(): PageModule {
  const cleanup: Array<() => void> = [];

  return {
    selector: SELECTOR,

    mount(root: HTMLElement, ctx): void {
      const stage = root.querySelector<HTMLElement>("[data-gallery-stage]");
      const track = root.querySelector<HTMLElement>("[data-gallery-track]");
      const staticList = root.querySelector<HTMLElement>(
        "[data-gallery-static]",
      );
      const nameEl = root.querySelector<HTMLElement>("[data-gallery-name]");
      const notesEl = root.querySelector<HTMLElement>("[data-gallery-notes]");
      const priceEl = root.querySelector<HTMLElement>("[data-gallery-price]");
      const discover = root.querySelector<HTMLAnchorElement>(
        "[data-gallery-discover]",
      );
      if (!stage || !track || !staticList) return;

      const elements = [
        ...track.querySelectorAll<HTMLElement>("[data-gallery-item]"),
      ];
      if (elements.length === 0) return;

      // M §9 — the pinned procession does not exist under reduced motion;
      // the static row is the layout, not a degraded fallback.
      if (ctx.reducedMotion) {
        stage.hidden = true;
        staticList.hidden = false;
        cleanup.push(() => {
          stage.hidden = false;
          staticList.hidden = true;
        });
        return;
      }

      const items: Item[] = elements.map((el) => ({
        el,
        study: createLightStudy(el, { reducedMotion: false }),
      }));
      cleanup.push(() => {
        for (const item of items) item.study.destroy();
      });

      const last = items.length - 1;
      let active = -1;
      let split: SplitText | null = null;
      cleanup.push(() => split?.revert());

      /** Track offset that centres item `index` in the visible band. */
      function offsetFor(index: number): number {
        const item = items[index]?.el;
        if (!item) return 0;
        const visibleCentre = (stage!.clientWidth - track!.offsetLeft) / 2;
        return visibleCentre - (item.offsetLeft + item.offsetWidth / 2);
      }

      function showScent(index: number): void {
        const data = items[index]?.el.dataset;
        if (!data) return;
        root.dataset.scent = data.scent ?? "";
        if (discover && data.href) discover.href = data.href;
        if (priceEl && data.price) priceEl.textContent = data.price;
        if (notesEl && data.notes) {
          notesEl.replaceChildren(
            ...data.notes.split("|").map((note) => {
              const li = document.createElement("li");
              li.textContent = note;
              return li;
            }),
          );
        }
        if (nameEl && data.name) {
          // SplitText crossfade on the scent name (M §4.4).
          split?.revert();
          nameEl.textContent = data.name;
          split = new SplitText(nameEl, { type: "chars", aria: "none" });
          gsap.from(split.chars, {
            yPercent: 110,
            stagger: 0.02,
            overwrite: "auto",
          });
        }
      }

      function render(progress: number): void {
        const position = progress * last;
        const lower = Math.floor(position);
        const upper = Math.min(last, lower + 1);
        const blend = position - lower;
        const x = gsap.utils.interpolate(
          offsetFor(lower),
          offsetFor(upper),
          blend,
        );
        gsap.set(track!, { x });

        const nearest = Math.round(position);
        items.forEach((item, index) => {
          const isActive = index === nearest;
          // Every stage gets the track's travel so its wash can lag and
          // its vapor lead — the differential IS the depth (M §4.4).
          item.el.style.setProperty("--light-parallax", `${x}px`);
          item.el.style.setProperty("--light-bloom", isActive ? "1" : "0");
          gsap.set(item.el, {
            scale: isActive ? ACTIVE_SCALE : INACTIVE_SCALE,
            opacity: isActive ? 1 : INACTIVE_OPACITY,
            overwrite: "auto",
          });
          if (isActive) {
            // The active bottle's light sweeps across its dwell.
            item.study.stopAmbient();
            item.study.set(
              gsap.utils.interpolate(
                ANGLE_ENTER,
                ANGLE_EXIT,
                gsap.utils.clamp(0, 1, position - index + 0.5),
              ),
            );
          } else {
            item.study.set(0.5); // frozen, composed (M §4.4)
          }
        });

        if (nearest !== active) {
          active = nearest;
          showScent(active);
        }
      }

      const trigger = ScrollTrigger.create({
        trigger: root,
        start: "top top",
        end: SCRUB_DISTANCE,
        pin: true,
        scrub: true,
        snap: 1 / last,
        onUpdate: (self) => render(self.progress),
        onRefresh: () => render(0),
      });
      cleanup.push(() => trigger.kill());

      // Pointer tilt — lerped on the one ticker, never a bare rAF.
      let targetTilt = 0;
      let currentTilt = 0;
      const onPointerMove = (event: PointerEvent): void => {
        const rect = stage.getBoundingClientRect();
        targetTilt = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      };
      const tick = (): void => {
        currentTilt += (targetTilt - currentTilt) * TILT_LERP;
        stage.style.setProperty("--light-tilt", currentTilt.toFixed(4));
      };
      stage.addEventListener("pointermove", onPointerMove);
      gsap.ticker.add(tick);
      cleanup.push(() => {
        stage.removeEventListener("pointermove", onPointerMove);
        gsap.ticker.remove(tick);
      });

      render(0);
    },

    destroy(): void {
      for (const kill of cleanup.splice(0)) kill();
    },
  };
}

export const gallery: PageModule = createGallery();
registry.registerModule(gallery);
