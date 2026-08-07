// modules/marquee.ts — marquee bands: tagline, campaign (M §4.7).
//
// Recipe: CSS-transform loop via GSAP xPercent, repeat -1, ease "none",
// 35s/loop desktop. Scroll-velocity multiplier: Lenis velocity scales
// timeScale between 1 and 2.5, lerped back to 1. Paused off-viewport
// (IntersectionObserver). Content is duplicated for a seamless loop; the
// clone is aria-hidden. Spec gap: velocity→timeScale mapping is
// unspecified — chose target = 1 + min(|v| / 1000, 1) * 1.5 (clamped
// 1–2.5), lerp 0.1/frame back toward it; flagged in the PR.
//
// Marker: `data-anim="marquee"` on the track element (its children are the
// loop content). Spec gap: M §4.7 names no marker; flagged in the PR.
//
// Reduced motion (M §9): static — no clone, no tween, no observer.
// Lifecycle: tween killed, clone removed, observer + frame subscription
// torn down in destroy().

import gsap from "gsap";
import { onFrame, velocity } from "../core/scroll";
import { registry, type PageContext, type PageModule } from "../core/registry";

const SELECTOR = '[data-anim="marquee"]';
const LOOP_SECONDS = 35; // M §4.7 desktop
const LERP = 0.1;

interface MarqueeState {
  el: HTMLElement;
  tween: gsap.core.Tween;
  appended: ChildNode[];
  observer: IntersectionObserver;
  unsubscribe: () => void;
}

export function createMarquee(): PageModule {
  const states: MarqueeState[] = [];

  return {
    selector: SELECTOR,

    mount(el: HTMLElement, ctx: PageContext): void {
      if (ctx.reducedMotion) return; // static marquees (M §9)

      // Duplicate content for the seamless -50% loop (trap #10 pattern);
      // every appended copy is aria-hidden and tracked for destroy().
      const appended: ChildNode[] = [];
      const clone = el.cloneNode(true) as HTMLElement;
      for (const child of [...clone.childNodes]) {
        if (child instanceof HTMLElement)
          child.setAttribute("aria-hidden", "true");
        el.append(child);
        appended.push(child);
      }

      const tween = gsap.to(el, {
        xPercent: -50,
        repeat: -1,
        ease: "none",
        duration: LOOP_SECONDS,
      });

      const observer = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) {
          tween.play();
        } else {
          tween.pause();
        }
      });
      observer.observe(el);

      let timeScale = 1;
      const unsubscribe = onFrame(() => {
        const boost = Math.min(Math.abs(velocity()) / 1000, 1) * 1.5;
        const target = 1 + boost; // 1–2.5 (M §4.7)
        timeScale += (target - timeScale) * LERP; // lerped back to 1 at rest
        tween.timeScale(timeScale);
      });

      states.push({ el, tween, appended, observer, unsubscribe });
    },

    destroy(): void {
      const state = states.pop();
      if (!state) return;
      state.unsubscribe();
      state.observer.disconnect();
      state.tween.kill();
      gsap.set(state.el, { clearProps: "transform" });
      for (const node of state.appended) node.remove();
    },
  };
}

export const marquee: PageModule = createMarquee();
registry.registerModule(marquee);
