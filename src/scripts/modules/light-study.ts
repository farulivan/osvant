// modules/light-study.ts — the `--light-angle` engine (M §8.2).
//
// This is not a PageModule. It is the shared mechanism the gallery
// (M §4.4, scroll-driven) and the PDP bottle (M §4.4b, drag-driven) both
// own an instance of, plus the /dev/light harness. `--light-angle` is the
// entire interface between the drivers and the six CSS layers, and this
// module is the only thing that writes it.
//
// At rest the angle oscillates 0.45 ↔ 0.55 — the ambient register
// (power1.inOut, 2.5s, M §4.4). That runs on `gsap.ticker` like everything
// else; there is no second loop.
//
// Reduced motion (M §9): ambient never starts and the angle is frozen at
// 0.5. Drag and keyboard still work — they are user-initiated controls,
// not decoration.
//
// Lifecycle (guide §8 trap #7, rewritten for ADR-013): WebGL context
// disposal is retired, but the leak class it guarded moved here — an
// orphaned ticker subscription across repeat navigation is just as easy to
// leave behind. `destroy()` kills the ambient tween and disconnects the
// visibility observer.

import gsap from "gsap";

const ANGLE = "--light-angle";

/** M §4.4 — the ambient oscillation bounds and register. */
const AMBIENT_MIN = 0.45;
const AMBIENT_MAX = 0.55;
const AMBIENT_DURATION = 2.5;
const AMBIENT_EASE = "power1.inOut";

/** M §9 — the frozen resting angle under reduced motion. */
export const NEUTRAL_ANGLE = 0.5;

export interface LightStudyOptions {
  /** Evaluated at mount (PageContext.reducedMotion). */
  reducedMotion: boolean;
  /** Pause the ambient tween while the stage is off-viewport (M §8.4). */
  pauseOffscreen?: boolean;
}

export interface LightStudy {
  /** Absolute angle, clamped to 0–1. Stops the ambient oscillation. */
  set(angle: number): void;
  /** Relative nudge — the keyboard equivalent uses this (M §4.4b). */
  nudge(delta: number): void;
  current(): number;
  /** Resume the resting oscillation from wherever the angle now sits. */
  resumeAmbient(): void;
  stopAmbient(): void;
  destroy(): void;
}

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function createLightStudy(
  stage: HTMLElement,
  options: LightStudyOptions,
): LightStudy {
  const state = { angle: NEUTRAL_ANGLE };
  let ambient: gsap.core.Tween | null = null;
  let observer: IntersectionObserver | null = null;
  let visible = true;

  function write(): void {
    stage.style.setProperty(ANGLE, String(state.angle));
  }

  function stopAmbient(): void {
    ambient?.kill();
    ambient = null;
  }

  function resumeAmbient(): void {
    if (options.reducedMotion) return; // frozen at rest (M §9)
    stopAmbient();
    if (!visible) return;
    // Oscillate around the neutral angle, starting from wherever the last
    // interaction left it so resuming never snaps.
    ambient = gsap.fromTo(
      state,
      { angle: AMBIENT_MIN },
      {
        angle: AMBIENT_MAX,
        duration: AMBIENT_DURATION,
        ease: AMBIENT_EASE,
        yoyo: true,
        repeat: -1,
        onUpdate: write,
      },
    );
  }

  function set(angle: number): void {
    stopAmbient();
    state.angle = clamp(angle);
    write();
  }

  function nudge(delta: number): void {
    set(state.angle + delta);
  }

  write();

  if (options.reducedMotion) {
    // Nothing to schedule — the layers sit at the neutral composition.
    state.angle = NEUTRAL_ANGLE;
    write();
  } else if (options.pauseOffscreen) {
    // A booted-but-unseen stage costs zero frames (M §8.4).
    observer = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? false;
      if (visible) resumeAmbient();
      else stopAmbient();
    });
    observer.observe(stage);
  } else {
    resumeAmbient();
  }

  return {
    set,
    nudge,
    current: () => state.angle,
    resumeAmbient,
    stopAmbient,
    destroy(): void {
      stopAmbient();
      observer?.disconnect();
      observer = null;
      stage.style.removeProperty(ANGLE);
    },
  };
}
