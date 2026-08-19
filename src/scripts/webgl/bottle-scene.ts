// webgl/bottle-scene.ts — PDP scent hero bottle (03 §3.1).
// Lazy chunk, same contract as the gallery scene.
//
// Contained single-bottle scene: drag-to-rotate clamped to ±180°, idle
// ambient rotation additive to the drag position (stopped under reduced
// motion per M §9 — drag still works), --scent-tint rim glow. Placeholder
// mesh from webgl/bottle.ts (ADR-008; GLB swap point).
//
// Single RAF contract (guide §6.1): gsap.ticker drives rendering; the
// visibility observer in modules/pdp-bottle.ts owns start()/stop().
// dispose() frees renderer/geometry/materials (M §8, 01-arch §3).

import * as THREE from "three";
import gsap from "gsap";
import { buildBottle, disposeBottle } from "./bottle";

export interface BottleSceneConfig {
  canvas: HTMLCanvasElement;
  /** Resolved --scent-tint hex. */
  tint: string;
  /** Reduced motion (M §9): idle ambient rotation off, drag stays on. */
  idleRotation: boolean;
}

export interface BottleScene {
  /** Accumulate drag rotation (radians), clamped to ±180°. */
  drag(deltaRadians: number): void;
  /** True while a pointer is down — pauses the idle spin. */
  setDragging(dragging: boolean): void;
  start(): void;
  stop(): void;
  resize(width: number, height: number): void;
  dispose(): void;
}

const MAX_ROTATION = Math.PI; // ±180° (03 §3.1)
const IDLE_SPEED = 0.3; // rad/s ambient spin
const DRAG_EASE = 0.2; // lerp toward the drag target per frame

export function createBottleScene(config: BottleSceneConfig): BottleScene {
  const renderer = new THREE.WebGLRenderer({
    canvas: config.canvas,
    alpha: true,
    antialias: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // M §8

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 30);
  camera.position.set(0, 0.6, 4.6);
  camera.lookAt(0, 0.4, 0);

  const ambient = new THREE.AmbientLight(0xffffff, 0.45);
  const key = new THREE.DirectionalLight(0xffffff, 1.2);
  key.position.set(2, 3, 3);
  // --scent-tint rim glow (03 §3.1)
  const rim = new THREE.PointLight(config.tint, 5, 10);
  rim.position.set(0, 1, -2.5);
  scene.add(ambient, key, rim);

  const bottle = buildBottle(config.tint);
  scene.add(bottle);

  let dragTarget = 0; // clamped ±180°
  let dragCurrent = 0;
  let dragging = false;
  let running = false;

  function render(timeSeconds: number): void {
    dragCurrent += (dragTarget - dragCurrent) * DRAG_EASE;
    const idle =
      config.idleRotation && !dragging ? timeSeconds * IDLE_SPEED : 0;
    bottle.rotation.y = dragCurrent + idle;
    renderer.render(scene, camera);
  }

  const tick = (time: number) => render(time);

  return {
    drag(deltaRadians: number): void {
      dragTarget = Math.max(
        -MAX_ROTATION,
        Math.min(MAX_ROTATION, dragTarget + deltaRadians),
      );
    },
    setDragging(value: boolean): void {
      dragging = value;
    },
    start(): void {
      if (running) return;
      running = true;
      gsap.ticker.add(tick);
    },
    stop(): void {
      if (!running) return;
      running = false;
      gsap.ticker.remove(tick);
    },
    resize(width: number, height: number): void {
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    },
    dispose(): void {
      this.stop();
      disposeBottle(bottle);
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
