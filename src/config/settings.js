/**
 * Global configuration — world layout, palette and quality settings.
 * All world units are metres-ish; the platform is roughly 220 × 140.
 */
import * as THREE from 'three';

export const PALETTE = {
  night: 0x05080f,
  fog: 0x070b14,
  water: 0x040910,
  asphalt: 0x16181d,
  concrete: 0x24262c,
  aluminum: 0x9aa3ab,
  panelBlue: 0x0a2450,
  flowGreen: 0x31e981,
  flowBlue: 0x3f8cff,
  flowViolet: 0xb46bff,
  flowAmber: 0xffc233,
  warnRed: 0xff4f5e,
  ledGreen: 0x46ffa1,
  textMetal: 0x878e99,
};

/** Irregular platform outline in world XZ space (clockwise-ish). */
export const PLATFORM_OUTLINE = [
  [-108, -8], [-96, -38], [-72, -58], [-30, -68], [30, -70],
  [82, -68], [108, -46], [110, 30], [86, 62], [30, 70],
  [-42, 68], [-84, 48], [-104, 22],
];

export const PLATFORM = {
  minX: -112, maxX: 114, minZ: -74, maxZ: 74,
  thickness: 3.2,
};

export const SOLAR = {
  // Main field on the left of the platform
  field: { cx: -46, cz: -2, cols: 22, rows: 17, colPitch: 3.55, rowPitch: 4.7, yaw: 0.3 },
  // Small satellite array top-right (mirrors the reference)
  satellite: { cx: 52, cz: -56, cols: 3, rows: 9, colPitch: 3.4, rowPitch: 4.4, yaw: 0.06 },
  panelW: 4.5, panelH: 2.8, tilt: -0.34, fill: 0.88,
};

export const TURBINES = [
  // [x, z, height, rotor speed rad/s]
  { x: -98, z: 6, h: 24, s: 1.15 }, { x: -86, z: -30, h: 26, s: 0.9 },
  { x: -60, z: -50, h: 24, s: 1.3 }, { x: -28, z: -58, h: 27, s: 1.0 },
  { x: 2, z: -62, h: 24, s: 1.2 }, { x: 30, z: -60, h: 26, s: 0.85 },
  { x: 62, z: -58, h: 23, s: 1.25 }, { x: 90, z: -50, h: 25, s: 1.05 },
  { x: -96, z: 34, h: 23, s: 1.1 }, { x: -66, z: 54, h: 25, s: 0.95 },
  { x: -30, z: 60, h: 24, s: 1.2 }, { x: -4, z: 34, h: 26, s: 0.9 },
  { x: -18, z: -28, h: 25, s: 1.15 }, { x: 14, z: 62, h: 23, s: 1.35 },
];

export const CAMERA = {
  fov: 40,
  home: new THREE.Vector3(152, 134, 192),
  target: new THREE.Vector3(-4, 0, 2),
  flyFrom: new THREE.Vector3(380, 300, 480),
  minDistance: 40,
  maxDistance: 400,
  minPolar: 0.35,
  maxPolar: 1.22,
};

export const QUALITY = {
  // 1.5 keeps text/edges crisp with SMAA while cutting fill-rate ~45%
  // versus native 2.0 on retina displays — the difference is invisible
  // at typical viewing distance, the frame-time win is not.
  maxPixelRatio: 1.5,
  shadowMapSize: 2048,
  bloom: { strength: 0.58, radius: 0.65, threshold: 0.72 },
};
