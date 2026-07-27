// core/transition.ts — Rive `page-transition` state machine behind the API
// `{ in(), out(), speed(n) }` (00-implementation-guide.md §6.5, RFC B4.2).
// This CSS clip-path placeholder implements that same interface; a future
// Rive swap replaces only the internals below, never the call sites.
//
// Reduced motion (M §9): the wipe becomes a 0.3s opacity crossfade — same
// API, same hooks, no Rive/clip-path wipe.

import gsap from "gsap";

// §6.5: in() covers the viewport in ≤0.9s; M §5 budgets ~1.6s total for
// in() + out() combined, so 0.8s each lands inside that budget.
const BASE_DURATION = 0.8;
const REDUCED_MOTION_DURATION = 0.3;

let speedFactor = 1;

function reducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function duration(): number {
  return reducedMotion()
    ? REDUCED_MOTION_DURATION
    : BASE_DURATION / speedFactor;
}

let scrim: HTMLDivElement | undefined;

// Lazily creates the one full-viewport scrim element — task 1.6 hasn't
// landed the base layout's transition-scrim markup yet, so this owns its
// own DOM node rather than depending on it.
function getScrim(): HTMLDivElement {
  if (scrim) return scrim;

  scrim = document.createElement("div");
  scrim.dataset.transitionScrim = "";
  scrim.setAttribute("aria-hidden", "true");
  Object.assign(scrim.style, {
    position: "fixed",
    inset: "0",
    zIndex: "999",
    background: "var(--color--black)",
    pointerEvents: "none",
    clipPath: "inset(0 0 100% 0)",
    opacity: "0",
  });
  document.body.append(scrim);

  return scrim;
}

export const transition = {
  /** Covers the viewport. Resolves once the incoming page can be swapped in behind it. */
  in(): Promise<void> {
    const el = getScrim();
    const dur = duration();

    if (reducedMotion()) {
      return new Promise((resolve) => {
        gsap.set(el, { clipPath: "inset(0 0 0 0)" });
        gsap.fromTo(
          el,
          { opacity: 0 },
          { opacity: 1, duration: dur, onComplete: () => resolve() },
        );
      });
    }

    return new Promise((resolve) => {
      gsap.set(el, { opacity: 1 });
      gsap.fromTo(
        el,
        { clipPath: "inset(0 0 100% 0)" },
        {
          clipPath: "inset(0 0 0% 0)",
          duration: dur,
          ease: "power2.inOut",
          onComplete: () => resolve(),
        },
      );
    });
  },

  /**
   * Reveals the (already swapped-in) new page.
   * `onHalfway` fires at ~50% progress — the hero reveal overlap hook
   * (guide §6.5: "expose a progress callback or fixed-delay hook").
   */
  out(onHalfway?: () => void): Promise<void> {
    const el = getScrim();
    const dur = duration();

    if (onHalfway) {
      setTimeout(onHalfway, (dur / 2) * 1000);
    }

    if (reducedMotion()) {
      return new Promise((resolve) => {
        gsap.to(el, {
          opacity: 0,
          duration: dur,
          onComplete: () => {
            gsap.set(el, { clipPath: "inset(0 0 100% 0)" });
            resolve();
          },
        });
      });
    }

    return new Promise((resolve) => {
      gsap.fromTo(
        el,
        { clipPath: "inset(0% 0 0 0)" },
        {
          clipPath: "inset(100% 0 0 0)",
          duration: dur,
          ease: "power2.inOut",
          onComplete: () => {
            gsap.set(el, { clipPath: "inset(0 0 100% 0)" });
            resolve();
          },
        },
      );
    });
  },

  /** Numeric speed multiplier — repeat navigations may shorten the wipe (M §5). */
  speed(n: number): void {
    speedFactor = n;
  },
};
