// modules/home-hero.ts — home hero orchestration (03 §1.2).
//
// - Hero scroll-out per M §4.10 (verbatim): scrubbed timeline
//   start "top top", end "+=100%", no pin — impact type drifts
//   yPercent 30 + fades to 0.4, vapor intensity ramps to 1, eyebrow and
//   subline exit early (yPercent -40, opacity 0 by 40% progress). All
//   child tweens ease "none" (M §4.3 scrubbed rule). The cue line
//   scrubs scaleY 1 → 0 with the same timeline ("scroll indicator line
//   scrubbing scaleY" — interpretation flagged in the PR).
// - `next drop` chip enters last in the hero sequence, 0.5s default
//   register. Spec gap: the delay is unspecified — chose 1.1s (after
//   the 0.8s char cascade settles), flagged in the PR.
// - Vapor placeholder (ADR-008, vapor.riv lands M3): [data-vapor]
//   opacity IS the intensity channel — baseline drift + scroll-velocity
//   response via scroll.onFrame (single-ticker rule, 03-eng §4.4).
// - Below-fold cue goes through scroll.scrollTo (Lenis) — never raw
//   window.scroll (M §4.1).
//
// Reduced motion (M §9): no scrub timeline, no chip entrance tween, no
// velocity loop — static final state; the cue button still scrolls via
// the reduced-motion fallback in core/scroll.
// Lifecycle: timeline, tweens, listeners, frame subscription all die in
// destroy() (03-eng §4.1).

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { onFrame, velocity, scrollTo } from "../core/scroll";
import { registry, type PageContext, type PageModule } from "../core/registry";

gsap.registerPlugin(ScrollTrigger);

const SELECTOR = "[data-hero]";
const CHIP_DELAY = 1.1; // after the 0.8s char cascade settles — gap, flagged
const VAPOR_BASELINE = 0.35; // placeholder intensity floor
const VAPOR_VELOCITY_RANGE = 0.65; // placeholder: velocity tops intensity at 1

interface HeroState {
  timeline: gsap.core.Timeline | null;
  tweens: gsap.core.Tween[];
  unsubscribe: (() => void) | null;
  onCue: (() => void) | null;
  cue: HTMLElement | null;
}

export function createHomeHero(): PageModule {
  const states: HeroState[] = [];

  return {
    selector: SELECTOR,

    mount(el: HTMLElement, ctx: PageContext): void {
      const state: HeroState = {
        timeline: null,
        tweens: [],
        unsubscribe: null,
        onCue: null,
        cue: null,
      };

      const vapor = el.querySelector<HTMLElement>("[data-vapor]");
      const cue = el.querySelector<HTMLElement>("[data-hero-cue]");
      state.cue = cue;

      if (!ctx.reducedMotion) {
        const eyebrow = el.querySelector<HTMLElement>("[data-eyebrow]");
        const subline = el.querySelector<HTMLElement>("[data-hero-subline]");
        const title = el.querySelector<HTMLElement>('[data-anim="split"]');
        const cueLine = el.querySelector<HTMLElement>("[data-hero-cue-line]");
        const chip = el.querySelector<HTMLElement>("[data-hero-chip]");

        // M §4.10 hero scroll-out
        state.timeline = gsap.timeline({
          scrollTrigger: {
            trigger: el,
            start: "top top",
            end: "+=100%",
            scrub: true,
          },
        });
        if (title) {
          state.timeline.to(
            title,
            { yPercent: 30, opacity: 0.4, ease: "none" },
            0,
          );
        }
        if (eyebrow) {
          state.timeline.to(
            eyebrow,
            { yPercent: -40, opacity: 0, ease: "none", duration: 0.4 },
            0,
          );
        }
        if (subline) {
          state.timeline.to(
            subline,
            { yPercent: -40, opacity: 0, ease: "none", duration: 0.4 },
            0,
          );
        }
        if (vapor) {
          state.timeline.to(vapor, { opacity: 1, ease: "none" }, 0);
        }
        if (cueLine) {
          state.timeline.to(
            cueLine,
            { scaleY: 0, ease: "none", duration: 0.4 },
            0,
          );
        }

        // next drop chip — last in the hero sequence (03 §1.2)
        if (chip) {
          state.tweens.push(
            gsap.from(chip, {
              opacity: 0,
              y: 8,
              duration: 0.5,
              delay: CHIP_DELAY,
            }),
          );
        }

        // vapor placeholder: velocity → intensity (03 §1.2 acceptance)
        if (vapor) {
          state.unsubscribe = onFrame(() => {
            const intensity =
              VAPOR_BASELINE +
              Math.min(Math.abs(velocity()) / 1500, 1) * VAPOR_VELOCITY_RANGE;
            vapor.style.opacity = intensity.toFixed(3);
          });
        }
      }

      // Anchor cue — Lenis scrollTo in both modes (M §4.1)
      if (cue) {
        state.onCue = () => {
          const doors = document.querySelector("#doors");
          if (doors) scrollTo(doors as HTMLElement);
        };
        cue.addEventListener("click", state.onCue);
      }

      states.push(state);
    },

    destroy(): void {
      const state = states.pop();
      if (!state) return;
      state.timeline?.scrollTrigger?.kill();
      state.timeline?.kill();
      for (const tween of state.tweens) tween.kill();
      state.unsubscribe?.();
      if (state.cue && state.onCue) {
        state.cue.removeEventListener("click", state.onCue);
      }
    },
  };
}

export const homeHero: PageModule = createHomeHero();
registry.registerModule(homeHero);
