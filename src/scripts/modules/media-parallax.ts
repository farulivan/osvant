// modules/media-parallax.ts — media parallax, the default for imagery
// (M §4.5, `data-anim="parallax"`).
//
// Recipe: the image inside a --radius--media mask scrubs
// yPercent -12 → 0, scale 1.15 → 1, ease "none" (scrubbed register, M §2).
// Marker placement: on the mask container (animates its img/video child) or
// directly on the media element. Spec gap: §4.5 names no trigger bounds —
// chose start "top bottom" / end "bottom top" (full traversal), flagged in
// the PR.
//
// Reduced motion (M §9): scrub triggers are never created — media sits in
// its natural (final) state. Lifecycle: tween + ScrollTrigger killed in
// destroy().

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { registry, type PageContext, type PageModule } from "../core/registry";

gsap.registerPlugin(ScrollTrigger);

const SELECTOR = '[data-anim="parallax"]';

interface ParallaxState {
  tween: gsap.core.Tween;
}

export function createMediaParallax(): PageModule {
  const states: ParallaxState[] = [];

  return {
    selector: SELECTOR,

    mount(el: HTMLElement, ctx: PageContext): void {
      if (ctx.reducedMotion) return; // no scrub triggers (M §9)

      const target = el.matches("img, video")
        ? el
        : el.querySelector<HTMLElement>("img, video");
      if (!target) return;

      const tween = gsap.fromTo(
        target,
        { yPercent: -12, scale: 1.15 },
        {
          yPercent: 0,
          scale: 1,
          ease: "none",
          scrollTrigger: {
            trigger: el,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        },
      );
      states.push({ tween });
    },

    destroy(): void {
      const state = states.pop();
      if (!state) return;
      state.tween.scrollTrigger?.kill();
      state.tween.kill();
    },
  };
}

export const mediaParallax: PageModule = createMediaParallax();
registry.registerModule(mediaParallax);
