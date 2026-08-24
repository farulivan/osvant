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
// On-screen cards never wait for a trigger (review OSV-06): the PLP's first
// card is the page's primary content and sat at 20% opacity until the user
// scrolled. Mounts are collected across one tick — via `gsap.delayedCall`,
// never a bare rAF (guide §3 rule 3) — so the whole grid resolves its
// on-screen/off-screen split once and the visible cards still stagger as a
// group rather than each playing alone.
//
// Reduced motion (M §9): no hiding, no batch — content renders statically
// in final state. Lifecycle: kill batch + scheduled flush in destroy().

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { registry, type PageContext, type PageModule } from "../core/registry";
import { isOnScreen } from "../core/viewport";

gsap.registerPlugin(ScrollTrigger);

const SELECTOR = '[data-anim="card"]';
const CARD_STAGGER = 0.06; // M §3 card-grid band 0.05–0.08s

export function createCardEntrance(): PageModule {
  const mounted: HTMLElement[] = [];
  const played = new Set<HTMLElement>();
  let batch: ScrollTrigger[] = [];
  let flush: gsap.core.Tween | null = null;

  function reveal(cards: HTMLElement[], stagger: number): void {
    for (const card of cards) played.add(card);
    gsap.to(cards, { opacity: 1, y: 0, stagger });
  }

  function build(): void {
    for (const trigger of batch) trigger.kill();
    batch = [];

    // Page-specific override: data-stagger on the first mounted card
    // (PLP specifies 0.05s — 03 §2; default stays 0.06s).
    const stagger = Number(mounted[0]?.dataset.stagger) || CARD_STAGGER;
    const pending = mounted.filter((card) => !played.has(card));
    if (pending.length === 0) return;

    const onScreen = pending.filter(isOnScreen);
    const offScreen = pending.filter((card) => !isOnScreen(card));

    if (onScreen.length > 0) reveal(onScreen, stagger);
    if (offScreen.length > 0) {
      batch = ScrollTrigger.batch(offScreen, {
        start: "top 85%",
        once: true,
        onEnter: (group) => reveal(group as HTMLElement[], stagger),
      });
    }
  }

  return {
    selector: SELECTOR,

    mount(el: HTMLElement, ctx: PageContext): void {
      if (ctx.reducedMotion) return; // static final state (M §9)

      mounted.push(el);
      gsap.set(el, { opacity: 0, y: 24 });

      // Coalesce every card's mount into one build on the next tick.
      flush?.kill();
      flush = gsap.delayedCall(0, build);
    },

    destroy(): void {
      const el = mounted.pop();
      flush?.kill();
      flush = null;
      for (const trigger of batch) trigger.kill();
      batch = [];
      if (el) {
        played.delete(el);
        gsap.set(el, { clearProps: "opacity,transform" });
      }
    },
  };
}

export const cardEntrance: PageModule = createCardEntrance();
registry.registerModule(cardEntrance);
