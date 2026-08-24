// modules/house-manifesto.ts — the-house pinned manifesto scrub (03 §4).
//
// Three statements char-highlight from --color--ink-3 → --color--white as
// the pinned section scrubs. Reversible by construction (scrub: true,
// ease "none" on every child tween per M §4.3) — never triggered-once
// (03 §4 acceptance box).
//
// Colors resolve from computed custom properties at mount — tokens.css
// stays the single source of truth (03-eng §2).
//
// Reduced motion (M §9): no pin, no scrub — statements lay out statically
// in their final lit state (CSS default). Lifecycle: timeline, trigger,
// splits all die in destroy().

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { registry, type PageModule } from "../core/registry";

gsap.registerPlugin(ScrollTrigger, SplitText);

const SCRUB_DISTANCE = "+=250%"; // judgment call — spec states pin + scrub, no distance

let timeline: gsap.core.Timeline | null = null;
const splits: SplitText[] = [];

export const houseManifesto: PageModule = {
  selector: "[data-manifesto]",

  mount(root: HTMLElement, ctx): void {
    if (ctx.reducedMotion) return; // M §9 — static final state per CSS

    const lines = Array.from(
      root.querySelectorAll<HTMLElement>("[data-manifesto-line]"),
    );
    if (lines.length === 0) return;

    const styles = getComputedStyle(document.documentElement);
    const dim = styles.getPropertyValue("--color--ink-3").trim();
    const lit = styles.getPropertyValue("--color--white").trim();

    timeline = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: root,
        start: "top top",
        end: SCRUB_DISTANCE,
        scrub: true,
        pin: true,
      },
    });

    lines.forEach((line) => {
      const split = new SplitText(line, {
        type: "words,chars",
        wordsClass: "split-word",
      });
      splits.push(split);
      gsap.set(split.chars, { color: dim });
      timeline!.to(split.chars, { color: lit, stagger: 0.5 });
    });
  },

  destroy(): void {
    // Everything this page's scrub created dies here (03-eng §4.1):
    // timeline.kill() cascades to its ScrollTrigger + pin; splits revert
    // their DOM; chars fall back to the CSS lit state.
    timeline?.kill();
    timeline = null;
    for (const split of splits.splice(0)) split.revert();
  },
};

registry.registerModule(houseManifesto);
