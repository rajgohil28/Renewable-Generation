/**
 * SystemHighlights — soft ground illumination that identifies each
 * generation system when filtered from the top tabs:
 *   amber wash under the solar arrays · blue discs under each turbine.
 *
 * Modes: 'both' (subtle on both) · 'solar' · 'wind' (selected system
 * bright, the other faded out). Opacities tween with GSAP.
 */
import * as THREE from 'three';
import gsap from 'gsap';
import { SOLAR, TURBINES } from '../config/settings.js';

/** Radial glow sprite texture (white core → transparent edge). */
function createGlowTexture(size = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.05, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,0.9)');
  g.addColorStop(0.45, 'rgba(255,255,255,0.38)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

const LEVELS = {
  both: { solar: 0.34, wind: 0.4 },
  solar: { solar: 0.8, wind: 0.04 },
  wind: { solar: 0.04, wind: 0.95 },
};

export class SystemHighlights {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'system-highlights';

    const glow = createGlowTexture();

    // Shared materials so a whole system fades with one opacity tween.
    this.solarMat = new THREE.MeshBasicMaterial({
      map: glow,
      color: new THREE.Color(0xffb545).multiplyScalar(1.5),
      transparent: true,
      opacity: LEVELS.both.solar,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    this.windMat = new THREE.MeshBasicMaterial({
      map: glow,
      color: new THREE.Color(0x409cff).multiplyScalar(1.6),
      transparent: true,
      opacity: LEVELS.both.wind,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });

    this.#buildSolarZones();
    this.#buildWindDiscs();
  }

  /** One oversized glow plane per solar array, matching its footprint. */
  #buildSolarZones() {
    for (const f of [SOLAR.field, SOLAR.satellite]) {
      const w = (f.cols - 1) * f.colPitch + 16;
      const h = (f.rows - 1) * f.rowPitch + 14;
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), this.solarMat);
      plane.rotation.x = -Math.PI / 2;
      plane.rotation.z = -f.yaw;
      plane.position.set(f.cx, 0.09, f.cz);
      plane.renderOrder = 1;
      this.group.add(plane);
    }
  }

  /** A glow disc beneath every turbine tower. */
  #buildWindDiscs() {
    const geo = new THREE.PlaneGeometry(16, 16);
    for (const t of TURBINES) {
      const disc = new THREE.Mesh(geo, this.windMat);
      disc.rotation.x = -Math.PI / 2;
      disc.position.set(t.x, 0.1, t.z);
      disc.renderOrder = 1;
      this.group.add(disc);
    }
  }

  /** @param {'both'|'solar'|'wind'} mode */
  setMode(mode) {
    const target = LEVELS[mode] ?? LEVELS.both;
    gsap.to(this.solarMat, { opacity: target.solar, duration: 0.7, ease: 'power2.inOut' });
    gsap.to(this.windMat, { opacity: target.wind, duration: 0.7, ease: 'power2.inOut' });
  }
}
