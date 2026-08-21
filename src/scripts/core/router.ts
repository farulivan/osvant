// core/router.ts — taxi.js wiring, the router orchestration contract
// (01-architecture.md §3.3, M §5). Owns the ONLY @unseenco/taxi Core
// instance. Call `initRouter()` once from the base layout, after
// `[data-taxi]`/`[data-taxi-view]` exist in the DOM (task 1.6).
//
// leave:  Transition.onLeave  — lenis.stop() → transition.in() → destroy
//         all page modules → sweep stale ScrollTriggers (M §5 / 01-arch §3.3).
// enter:  Renderer.onEnter    — [DOM already swapped by taxi] → reset/
//         restore scroll → mount modules (registration order — nav-theme
//         observer registers first, 01-arch §3.3).
//         Transition.onEnter — transition.out() (hero overlap at 50%,
//         guide §6.5) → lenis.start().

import { Core, Renderer, Transition } from "@unseenco/taxi";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { syncHead } from "./head";
import { registry, type PageContext } from "./registry";
import * as scroll from "./scroll";
import { transition } from "./transition";

function reducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function initRouter(): Core {
  // Trap #5 (guide §8): router owns scroll restoration, not the browser.
  history.scrollRestoration = "manual";

  const scrollPositions = new Map<string, number>();
  let lastTrigger: string | HTMLElement | false = false;
  let previousUrl: URL | undefined;
  let destroyers: Array<() => void> = [];

  class OsvantRenderer extends Renderer {
    onEnter(): void {
      // Trap #1 (guide §8): taxi never touches document.title itself, and
      // nothing else in <head> swaps either — sync both by hand.
      document.title = this.title;
      syncHead(this.page as Document);

      const url = new URL(window.location.href);

      if (lastTrigger === "popstate") {
        window.scrollTo({ top: scrollPositions.get(url.pathname) ?? 0 });
      } else {
        window.scrollTo({ top: 0 });
      }

      const ctx: PageContext = {
        url,
        fromUrl: previousUrl,
        firstLoad: previousUrl === undefined,
        reducedMotion: reducedMotion(),
      };
      previousUrl = url;

      void registry.mountModules(this.content, ctx).then((mounted) => {
        destroyers = mounted;
      });
    }

    onEnterCompleted(): void {
      // Trap #4 (guide §8): one refresh after mount, not per-module.
      ScrollTrigger.refresh();
    }

    initialLoad(): void {
      // Taxi does not call onEnter/onEnterCompleted for the first visit.
      this.onEnter();
      this.onEnterCompleted();
    }
  }

  class OsvantTransition extends Transition {
    onLeave({
      trigger,
      done,
    }: {
      from: HTMLElement | Element;
      trigger: string | HTMLElement | false;
      done: () => void;
    }): void {
      lastTrigger = trigger;
      scrollPositions.set(window.location.pathname, window.scrollY);

      scroll.stop();

      void transition.in().then(() => {
        destroyers.forEach((destroy) => destroy());
        destroyers = [];
        // Router-level safety net — modules already killed only what they
        // created (01-arch §3.2); this is the sweep, not the mechanism.
        ScrollTrigger.getAll().forEach((st) => st.kill());
        done();
      });
    }

    onEnter({
      done,
    }: {
      to: HTMLElement | Element;
      trigger: string | HTMLElement | false;
      done: () => void;
    }): void {
      void transition
        .out(() => {
          // Hero reveal overlap hook — consumed by the hero module (M2).
        })
        .then(() => {
          scroll.start();
          done();
        });
    }
  }

  return new Core({
    renderers: { default: OsvantRenderer },
    transitions: { default: OsvantTransition },
  });
}
