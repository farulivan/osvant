// webgl/gallery-scene.ts — home collection gallery scene (M §4.4).
// Lazy chunk: imported on section approach (01-arch § module table).
//
// ADR-008 placeholder bottles come from webgl/bottle.ts (the single GLB
// swap point when assets land, 06 §1) — the scene interface below stays
// identical either way.
//
// Single RAF contract (guide §6.1): rendering is driven by gsap.ticker
// via start()/stop() — never setAnimationLoop. M §8's "pause via
// setAnimationLoop(null)" maps to ticker removal here (guide §6.1 is
// the binding contract; deviation flagged in the PR).
//
// dispose() kills renderer/geometry/materials and removes the ticker
// callback (M §8, 01-arch §3).

import * as THREE from "three";
import gsap from "gsap";
import { buildBottle, disposeBottle } from "./bottle";

export interface GallerySceneConfig {
  canvas: HTMLCanvasElement;
  /** Per-scent tint hex strings, resolved from --scent-tint. */
  tints: string[];
  /** Called when the scrub settles on a new bottle. */
  onActiveChange?: (index: number) => void;
}

export interface GalleryScene {
  /** Scrub progress 0..1 across the whole procession. */
  setProgress(progress: number): void;
  /** Normalized pointer -1..1 (scene tilts max 3°, lerped 0.08). */
  setPointer(x: number, y: number): void;
  /** Start/stop the ticker-driven render loop (visibility pause). */
  start(): void;
  stop(): void;
  resize(width: number, height: number): void;
  dispose(): void;
}

const SPACING = 2.4; // world units between bottles
const MAX_TILT = THREE.MathUtils.degToRad(3); // pointer parallax cap (M §4.4)
const POINTER_LERP = 0.08;
const IDLE_SPEED = 0.15; // rad/s ambient rotation on the active bottle
const SCRUB_ROT = THREE.MathUtils.degToRad(35); // ±35° during scrub

export function createGalleryScene(config: GallerySceneConfig): GalleryScene {
  const renderer = new THREE.WebGLRenderer({
    canvas: config.canvas,
    alpha: true,
    antialias: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // M §8

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50);
  camera.position.set(0, 0.4, 6);

  const ambient = new THREE.AmbientLight(0xffffff, 0.5);
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(3, 4, 4);
  // --scent-tint glow behind the active bottle (M §4.4)
  const glow = new THREE.PointLight(config.tints[0] ?? "#ffffff", 4, 8);
  glow.position.set(0, 0.4, -1.5);
  scene.add(ambient, key, glow);

  const group = new THREE.Group();
  scene.add(group);

  const bottles = config.tints.map((tint, i) => {
    const bottle = buildBottle(tint);
    bottle.position.x = i * SPACING;
    group.add(bottle);
    return bottle;
  });

  const count = bottles.length;
  let progress = 0;
  let activeIndex = 0;
  let pointer = { x: 0, y: 0 };
  const tilt = { x: 0, y: 0 };
  let running = false;

  function render(timeSeconds: number): void {
    // Procession x-position from scrub progress (M §4.4)
    group.position.x = -progress * (count - 1) * SPACING;

    const exact = progress * (count - 1);
    const nextIndex = Math.max(0, Math.min(count - 1, Math.round(exact)));
    if (nextIndex !== activeIndex) {
      activeIndex = nextIndex;
      glow.color.set(config.tints[activeIndex]);
      config.onActiveChange?.(activeIndex);
    }

    bottles.forEach((bottle, i) => {
      const offset = Math.max(-1, Math.min(1, exact - i)); // -1..1 around center
      if (i === activeIndex) {
        // Active: scrub rotation (±35°) + additive idle ambient spin
        bottle.rotation.y = -offset * SCRUB_ROT + timeSeconds * IDLE_SPEED;
      } else {
        bottle.rotation.y = -offset * SCRUB_ROT;
      }
    });

    // Pointer parallax: group tilts max 3° toward cursor, lerped 0.08
    tilt.x += (pointer.y * MAX_TILT - tilt.x) * POINTER_LERP;
    tilt.y += (pointer.x * MAX_TILT - tilt.y) * POINTER_LERP;
    group.rotation.x = -tilt.x;
    group.rotation.y = tilt.y;

    // Tinted glow follows the active bottle
    glow.position.x = bottles[activeIndex].position.x + group.position.x;

    renderer.render(scene, camera);
  }

  const tick = (time: number) => render(time);

  return {
    setProgress(value: number): void {
      progress = Math.max(0, Math.min(1, value));
    },
    setPointer(x: number, y: number): void {
      pointer = { x, y };
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
      for (const bottle of bottles) {
        disposeBottle(bottle);
      }
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
