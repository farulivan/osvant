// webgl/bottle.ts — shared placeholder bottle builder (ADR-008).
// Procedural cylinder/shoulder/neck/cap with per-scent tinted glass.
// When the real GLBs land (06 §1: shared silhouette, per-scent
// liquid/label material), this function is the single swap point for
// both the gallery procession and the PDP hero — a GLTFLoader path
// returning the same Group shape.

import * as THREE from "three";

export function buildBottle(tint: string): THREE.Group {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#1a1820"),
    roughness: 0.35,
    metalness: 0.6,
    emissive: new THREE.Color(tint),
    emissiveIntensity: 0.18,
  });
  const glass = new THREE.MeshStandardMaterial({
    color: new THREE.Color(tint),
    roughness: 0.1,
    metalness: 0.2,
    transparent: true,
    opacity: 0.85,
  });

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.42, 1.7, 48),
    glass,
  );
  const shoulder = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    glass,
  );
  shoulder.position.y = 0.85;
  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.14, 0.35, 24),
    material,
  );
  neck.position.y = 1.05;
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.18, 0.28, 24),
    material,
  );
  cap.position.y = 1.35;

  group.add(body, shoulder, neck, cap);
  return group;
}

/** Dispose every mesh geometry/material in a bottle subtree (M §8). */
export function disposeBottle(root: THREE.Object3D): void {
  root.traverse((node) => {
    if (node instanceof THREE.Mesh) {
      node.geometry.dispose();
      (node.material as THREE.Material).dispose();
    }
  });
}
