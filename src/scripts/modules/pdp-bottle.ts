// modules/pdp-bottle.ts — PDP scent hero, drag-to-light (03 §3.1, M §4.4b).
//
// Replaces drag-to-rotate (ADR-013): the object is fixed and the light
// moves. A horizontal drag across one bottle-width maps `--light-angle`
// 0 → 1, clamped at both ends — no wrap, because there is no back of the
// bottle to reach.
//
// On release the angle settles to the nearest of 0.25 / 0.5 / 0.75 (UI-move
// register, 0.6s power2.inOut) so the bottle always rests in a composed
// lighting state rather than wherever the finger stopped. Untouched, the
// ambient oscillation from `light-study.ts` takes back over.
//
// Touch: `touch-action: pan-y` on the stage (CSS) keeps vertical page
// scroll native — the drag only ever claims the horizontal axis.
//
// Keyboard (required, M §9 / §4.4b): the stage is a tabbable group;
// ←/→ step 0.05 and Home/End jump to 0/1. It carries `role="slider"`
// rather than `role="img"` + tabindex, because that is what it actually
// is — a control that adjusts a value — and it lets assistive tech
// announce the light position instead of an untyped focusable div.
// Reduced motion stops the ambient drift but leaves drag and keys
// working: they are user-initiated controls, not decoration.

import gsap from "gsap";
import { registry, type PageModule } from "../core/registry";
import { createLightStudy, type LightStudy } from "./light-study";

const SELECTOR = "[data-pdp-bottle]";

/** M §4.4b — the composed states a release settles into. */
const REST_ANGLES = [0.25, 0.5, 0.75];
const SETTLE_DURATION = 0.6;
const SETTLE_EASE = "power2.inOut";
/** M §4.4b — one bottle-width of travel covers the full range. */
const KEY_STEP = 0.05;

function nearestRest(angle: number): number {
  return REST_ANGLES.reduce((best, candidate) =>
    Math.abs(candidate - angle) < Math.abs(best - angle) ? candidate : best,
  );
}

/** What a screen reader announces for the current light position. */
function describe(angle: number): string {
  if (angle < 0.25) return "raking from the left";
  if (angle < 0.45) return "left of centre";
  if (angle <= 0.55) return "centred";
  if (angle <= 0.75) return "right of centre";
  return "raking from the right";
}

interface BottleState {
  study: LightStudy;
  settle: gsap.core.Tween | null;
  teardown: Array<() => void>;
}

export function createPdpBottle(): PageModule {
  const states: BottleState[] = [];

  return {
    selector: SELECTOR,

    mount(stage: HTMLElement, ctx): void {
      const study = createLightStudy(stage, {
        reducedMotion: ctx.reducedMotion,
        pauseOffscreen: true,
      });
      const state: BottleState = { study, settle: null, teardown: [] };

      // Keep the slider's announced value in step with the light.
      const announce = (): void => {
        const angle = study.current();
        stage.setAttribute("aria-valuenow", String(Math.round(angle * 100)));
        stage.setAttribute("aria-valuetext", describe(angle));
      };

      let dragging = false;
      let startX = 0;
      let startAngle = study.current();

      const settleToRest = (): void => {
        state.settle?.kill();
        const carrier = { angle: study.current() };
        const target = nearestRest(carrier.angle);
        if (ctx.reducedMotion) {
          // No settle animation, but still resolve to a composed state.
          study.set(target);
          announce();
          return;
        }
        state.settle = gsap.to(carrier, {
          angle: target,
          duration: SETTLE_DURATION,
          ease: SETTLE_EASE,
          onUpdate: () => {
            study.set(carrier.angle);
            announce();
          },
          onComplete: () => study.resumeAmbient(),
        });
      };

      const onPointerDown = (event: PointerEvent): void => {
        dragging = true;
        startX = event.clientX;
        startAngle = study.current();
        state.settle?.kill();
        study.stopAmbient();
        stage.setPointerCapture(event.pointerId);
      };

      const onPointerMove = (event: PointerEvent): void => {
        if (!dragging) return;
        // One bottle-width of travel spans the whole range (M §4.4b).
        const width = stage.clientWidth || 1;
        study.set(startAngle + (event.clientX - startX) / width);
        announce();
      };

      const onPointerUp = (event: PointerEvent): void => {
        if (!dragging) return;
        dragging = false;
        if (stage.hasPointerCapture(event.pointerId)) {
          stage.releasePointerCapture(event.pointerId);
        }
        settleToRest();
      };

      const onKeyDown = (event: KeyboardEvent): void => {
        const step: Record<string, () => void> = {
          ArrowLeft: () => study.nudge(-KEY_STEP),
          ArrowRight: () => study.nudge(KEY_STEP),
          Home: () => study.set(0),
          End: () => study.set(1),
        };
        const action = step[event.key];
        if (!action) return;
        event.preventDefault();
        state.settle?.kill();
        action();
        announce();
      };

      stage.addEventListener("pointerdown", onPointerDown);
      stage.addEventListener("pointermove", onPointerMove);
      stage.addEventListener("pointerup", onPointerUp);
      stage.addEventListener("pointercancel", onPointerUp);
      stage.addEventListener("keydown", onKeyDown);
      state.teardown.push(() => {
        stage.removeEventListener("pointerdown", onPointerDown);
        stage.removeEventListener("pointermove", onPointerMove);
        stage.removeEventListener("pointerup", onPointerUp);
        stage.removeEventListener("pointercancel", onPointerUp);
        stage.removeEventListener("keydown", onKeyDown);
      });

      states.push(state);
    },

    destroy(): void {
      const state = states.pop();
      if (!state) return;
      state.settle?.kill();
      for (const off of state.teardown) off();
      state.study.destroy();
    },
  };
}

export const pdpBottle: PageModule = createPdpBottle();
registry.registerModule(pdpBottle);
