// modules/card-entrance.ts — scroll-entrance stagger group for cards
// (01 §5.3 motion hook `data-anim="card"`).
//
// Register: entrance = default register (M §2 — `power2.out`, 0.5s; §4 has
// no card-specific recipe, so the register governs). Stagger 0.06s — inside
// the spec'd 0.05–0.08s card-grid band (M §3). Spec gap: the entrance
// offset is unspecified — chose y 24px, flagged in the PR.
//
// Grouping: all [data-anim="card"] elements share one ScrollTrigger.batch
// so cards entering together stagger as a group, matching 01 §5.3's
// "stagger group" hook. Elements are set to the hidden state on mount.
//
// Reduced motion (M §9): no hiding, no batch — content renders statically
// in final state. Lifecycle: kill batch + set calls in destroy().

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { registry, type PageContext, type PageModule } from "../core/registry";

gsap.registerPlugin(ScrollTrigger);

const SELECTOR = '[data-anim="card"]';
const CARD_STAGGER = 0.06; // M §3 card-grid band 0.05–0.08s

export function createCardEntrance(): PageModule {
  const mounted: HTMLElement[] = [];
  let batch: ScrollTrigger[] = [];

  return {
    selector: SELECTOR,

    mount(el: HTMLElement, ctx: PageContext): void {
      if (ctx.reducedMotion) return; // static final state (M §9)

      mounted.push(el);
      gsap.set(el, { opacity: 0, y: 24 });

      // (Re)create the group batch whenever the mounted set changes.
      for (const trigger of batch) trigger.kill();
      batch = ScrollTrigger.batch(mounted, {
        start: "top 85%",
        once: true,
        onEnter: (group) =>
          gsap.to(group, { opacity: 1, y: 0, stagger: CARD_STAGGER }),
      });
    },

    destroy(): void {
      const el = mounted.pop();
      for (const trigger of batch) trigger.kill();
      batch = [];
      if (el) gsap.set(el, { clearProps: "opacity,transform" });
    },
  };
}

export const cardEntrance: PageModule = createCardEntrance();
registry.registerModule(cardEntrance);
