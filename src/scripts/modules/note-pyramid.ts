// modules/note-pyramid.ts — PDP note pyramid reveal (03 §3.2, M §4.6
// verbatim). Rows reveal top → heart → base: per row, divider line
// scaleX 0→1 (0.8s expo.out) THEN notes char-cascade (0.015 stagger,
// masked chars like M §4.2). Each row's ScrollTrigger chains at
// start "top 75%", once.
//
// A row already on screen when the module mounts plays immediately rather
// than waiting to be scrolled into (review OSV-06) — the eyebrows rendered
// while the note words stayed invisible mid-viewport. Off-screen rows keep
// the chained trigger, moved to "top 85%" so a row finishes revealing
// before it reaches the middle of the screen.
//
// aria: notes elements split with aria:"none" when the target can't hold
// aria-label (same rule as headline-reveal — axe aria-prohibited-attr).
//
// Reduced motion (M §9): no splits, no timeline — static final state.
// Lifecycle: splits + triggers + tweens all die in destroy().

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { registry, type PageContext, type PageModule } from "../core/registry";
import { isOnScreen } from "../core/viewport";

gsap.registerPlugin(ScrollTrigger, SplitText);

const SELECTOR = "[data-pyramid]";

interface PyramidState {
  timelines: gsap.core.Timeline[];
  splits: SplitText[];
}

export function createNotePyramid(): PageModule {
  const states: PyramidState[] = [];

  return {
    selector: SELECTOR,

    mount(el: HTMLElement, ctx: PageContext): void {
      if (ctx.reducedMotion) return; // static final state (M §9)

      const state: PyramidState = { timelines: [], splits: [] };
      const rows = el.querySelectorAll<HTMLElement>("[data-pyramid-row]");

      for (const row of rows) {
        const divider = row.querySelector<HTMLElement>(
          "[data-pyramid-divider]",
        );
        const notes = row.querySelector<HTMLElement>("[data-pyramid-notes]");

        const timeline = gsap.timeline(
          isOnScreen(row)
            ? {}
            : {
                scrollTrigger: { trigger: row, start: "top 85%", once: true },
              },
        );

        if (divider) {
          gsap.set(divider, { scaleX: 0, transformOrigin: "left center" });
          timeline.to(divider, { scaleX: 1, duration: 0.8, ease: "expo.out" });
        }

        if (notes) {
          const split = new SplitText(notes, {
            type: "words,chars,lines",
            linesClass: "line-mask",
            wordsClass: "split-word",
            ...(notes.matches("h1,h2,h3,h4,h5,h6,[role]")
              ? {}
              : { aria: "none" }),
          });
          state.splits.push(split);
          timeline.from(
            split.chars,
            {
              yPercent: 110,
              duration: 0.8,
              ease: "power3.out",
              stagger: 0.015,
            },
            divider ? ">" : 0, // chars follow the divider (M §4.6 order)
          );
        }

        state.timelines.push(timeline);
      }

      states.push(state);
    },

    destroy(): void {
      const state = states.pop();
      if (!state) return;
      for (const timeline of state.timelines) {
        timeline.scrollTrigger?.kill();
        timeline.kill();
      }
      for (const split of state.splits) split.revert();
    },
  };
}

export const notePyramid: PageModule = createNotePyramid();
registry.registerModule(notePyramid);
