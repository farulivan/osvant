// modules/btn-line.ts — btn-secondary label y-flip on hover
// (01 §5.1 motion hook `data-anim="btn-line"`).
//
// Recipe: GSAP label swap, 0.3s power2.out (micro register, M §2). The
// border → UV color change is pure CSS :hover; this module owns only the
// label flip. Markup contract (01 §5.1): label wrapped in
// <span data-btn-label>. The module clones that span (aria-hidden) and
// stacks the two copies so hover y-flips original out / clone in.
//
// Reduced motion (M §9): no flip — the CSS border hover still works.
// Lifecycle: clone removed, tweens killed, listeners unbound in destroy().

import gsap from "gsap";
import { registry, type PageContext, type PageModule } from "../core/registry";

const SELECTOR = '[data-anim="btn-line"]';

interface BtnState {
  clone: HTMLElement | null;
  tweens: gsap.core.Tween[];
  onEnter: () => void;
  onLeave: () => void;
  el: HTMLElement;
}

export function createBtnLine(): PageModule {
  const states: BtnState[] = [];

  return {
    selector: SELECTOR,

    mount(el: HTMLElement, ctx: PageContext): void {
      const state: BtnState = {
        clone: null,
        tweens: [],
        onEnter: () => {},
        onLeave: () => {},
        el,
      };

      const label = el.querySelector<HTMLElement>("[data-btn-label]");
      if (!ctx.reducedMotion && label) {
        const clone = label.cloneNode(true) as HTMLElement;
        clone.setAttribute("aria-hidden", "true");
        clone.classList.add("btn-line__label--clone");
        label.after(clone);
        el.classList.add("btn-line--ready");
        state.clone = clone;

        state.onEnter = () => {
          state.tweens.push(
            gsap.to([label, clone], {
              yPercent: -100,
              duration: 0.3,
              ease: "power2.out",
              overwrite: "auto",
            }),
          );
        };
        state.onLeave = () => {
          state.tweens.push(
            gsap.to([label, clone], {
              yPercent: 0,
              duration: 0.3,
              ease: "power2.out",
              overwrite: "auto",
            }),
          );
        };
        el.addEventListener("mouseenter", state.onEnter);
        el.addEventListener("mouseleave", state.onLeave);
      }

      states.push(state);
    },

    destroy(): void {
      const state = states.pop();
      if (!state) return;
      state.el.removeEventListener("mouseenter", state.onEnter);
      state.el.removeEventListener("mouseleave", state.onLeave);
      for (const tween of state.tweens) tween.kill();
      state.clone?.remove();
      state.el.classList.remove("btn-line--ready");
    },
  };
}

export const btnLine: PageModule = createBtnLine();
registry.registerModule(btnLine);
