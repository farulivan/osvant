// modules/headline-reveal.ts — masked char-cascade reveal for h1/h2 and
// impact fragments (M §4.2, markup contract 01 §3.3).
//
// Marker: `data-anim="split"` on the heading. Spec gap — M §4.2 names no
// data-anim value (card/parallax/btn-line are named, split is not); flagged
// in the PR. Paired eyebrow: `data-eyebrow` element in the same parent
// (01 §3.3 "eyebrow paired with every h1/h2"), fading in 0.4s, delayed 0.2s
// after the chars start.
//
// Reduced motion (M §9): no SplitText — 0.3s opacity fade, same trigger.
// Lifecycle (03-eng §4.1): every tween/ScrollTrigger/SplitText/listener a
// mount creates is killed/reverted by the matching destroy().

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { registry, type PageContext, type PageModule } from "../core/registry";

gsap.registerPlugin(ScrollTrigger, SplitText);

const SELECTOR = '[data-anim="split"]';
const RESIZE_DEBOUNCE_MS = 200; // M §4.2

interface RevealState {
  el: HTMLElement;
  split: SplitText | null;
  tweens: gsap.core.Tween[];
  played: boolean;
  onResize: () => void;
}

export function createHeadlineReveal(): PageModule {
  // The registry calls destroy() once per mounted element; states pop in
  // reverse order of mount so each destroy kills exactly one mount's work.
  const states: RevealState[] = [];

  function buildSplit(state: RevealState): void {
    // SplitText's default aria:"auto" writes aria-label onto the target —
    // legal on headings (naming-capable role), prohibited on plain spans
    // (axe aria-prohibited-attr; Lighthouse a11y gate). Non-heading targets
    // get aria:"none"; screen readers still read the concatenated text.
    const canHoldLabel = state.el.matches("h1,h2,h3,h4,h5,h6,[role]");
    state.split = new SplitText(state.el, {
      // words wrap the chars so a line break can never land mid-word
      // (review OSV-17) — .split-word is nowrap in base.css.
      type: "words,chars,lines",
      linesClass: "line-mask",
      wordsClass: "split-word",
      ...(canHoldLabel ? {} : { aria: "none" }),
    });
    const tween = gsap.from(state.split.chars, {
      yPercent: 110,
      duration: 0.8,
      ease: "power3.out",
      stagger: 0.02,
      scrollTrigger: { trigger: state.el, start: "top 85%", once: true },
      onComplete: () => {
        state.played = true;
      },
    });
    state.tweens.push(tween);
  }

  function fadeEyebrow(el: HTMLElement): gsap.core.Tween | null {
    const eyebrow =
      el.parentElement?.querySelector<HTMLElement>("[data-eyebrow]");
    if (!eyebrow) return null;
    return gsap.from(eyebrow, {
      opacity: 0,
      duration: 0.4,
      delay: 0.2, // after chars start (M §4.2)
      scrollTrigger: { trigger: el, start: "top 85%", once: true },
    });
  }

  return {
    selector: SELECTOR,

    mount(el: HTMLElement, ctx: PageContext): void {
      let resizeTimer: ReturnType<typeof setTimeout> | undefined;
      const state: RevealState = {
        el,
        split: null,
        tweens: [],
        played: false,
        onResize: () => {
          clearTimeout(resizeTimer);
          resizeTimer = setTimeout(() => {
            // Re-split on resize (debounced, M §4.2) — only before the
            // once:true reveal has played; after that a re-split would
            // re-run the entrance.
            if (state.played || ctx.reducedMotion) return;
            state.split?.revert();
            buildSplit(state);
          }, RESIZE_DEBOUNCE_MS);
        },
      };

      if (ctx.reducedMotion) {
        state.tweens.push(
          gsap.from(el, {
            opacity: 0,
            duration: 0.3,
            scrollTrigger: { trigger: el, start: "top 85%", once: true },
          }),
        );
      } else {
        buildSplit(state);
        const eyebrowTween = fadeEyebrow(el);
        if (eyebrowTween) state.tweens.push(eyebrowTween);
        window.addEventListener("resize", state.onResize);
      }

      states.push(state);
    },

    destroy(): void {
      const state = states.pop();
      if (!state) return;
      window.removeEventListener("resize", state.onResize);
      for (const tween of state.tweens) {
        tween.scrollTrigger?.kill();
        tween.kill();
      }
      state.split?.revert();
    },
  };
}

export const headlineReveal: PageModule = createHeadlineReveal();
registry.registerModule(headlineReveal);
