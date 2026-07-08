/**
 * RendererManager — WebGL renderer, colour pipeline and resize handling.
 */
import * as THREE from 'three';
import { QUALITY } from '../config/settings.js';

export class RendererManager {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false, // AA handled by SMAA in the composer
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, QUALITY.maxPixelRatio));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.3;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
  }

  /** Adaptive-quality hook — clamps DPR without touching canvas CSS size. */
  setPixelRatio(pr) {
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  setShadows(enabled) {
    this.renderer.shadowMap.enabled = enabled;
    // Force material recompilation so the change takes effect immediately
    this.renderer.shadowMap.needsUpdate = true;
  }

  resize() {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, QUALITY.maxPixelRatio));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
