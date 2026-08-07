// core/scroll.ts — the ONLY place Lenis and the gsap ticker meet
// (00-implementation-guide.md §6.1, 01-architecture.md §3.1). Exposes
// stop/start/scrollTo; nothing else in the codebase may touch Lenis or
// gsap.ticker directly (M §10 INP guard, 03-eng §4.4).
//
// Reduced motion (M §9): "Lenis disabled (native scroll)" is a spec'd
// requirement, so the smooth-scroll instance is never created when
// `prefers-reduced-motion: reduce` — ScrollTrigger still reads native
// scroll for the non-scrub triggers that remain in that mode.

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);

const reducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

let lenis: Lenis | undefined;
let currentVelocity = 0;

type FrameCallback = (time: number, deltaMs: number) => void;
const frameCallbacks = new Set<FrameCallback>();

if (!reducedMotion) {
  lenis = new Lenis();
  lenis.on("scroll", ScrollTrigger.update);
  lenis.on("scroll", (e) => {
    currentVelocity = e.velocity;
  });
  gsap.ticker.add((time, deltaMs) => {
    lenis?.raf(time * 1000);
    frameCallbacks.forEach((cb) => cb(time, deltaMs));
  });
  gsap.ticker.lagSmoothing(0);
}

/**
 * Subscribe to the single gsap ticker (trap #10 pattern: marquees and
 * other per-frame loops batch here — never add your own ticker/rAF).
 * Returns an unsubscribe function; call it in `destroy()`.
 * No-op under reduced motion (M §9: loops/marquees are static there).
 */
export function onFrame(cb: FrameCallback): () => void {
  frameCallbacks.add(cb);
  return () => {
    frameCallbacks.delete(cb);
  };
}

/** Current scroll velocity in px/s (from Lenis; 0 under reduced motion). */
export function velocity(): number {
  return currentVelocity;
}

export function stop(): void {
  lenis?.stop();
}

export function start(): void {
  lenis?.start();
}

export function scrollTo(
  target: Parameters<Lenis["scrollTo"]>[0],
  options?: Parameters<Lenis["scrollTo"]>[1],
): void {
  if (lenis) {
    lenis.scrollTo(target, options);
    return;
  }

  if (target instanceof HTMLElement) {
    target.scrollIntoView({ behavior: "auto" });
    return;
  }

  window.scrollTo({ top: typeof target === "number" ? target : 0 });
}
