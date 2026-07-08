/**
 * PostProcessingManager — EffectComposer chain:
 *   Render (or SSAO) → UnrealBloom → Vignette → Output (ACES + sRGB) → SMAA
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { QUALITY } from '../config/settings.js';

const VignetteShader = {
  uniforms: {
    tDiffuse: { value: null },
    strength: { value: 0.42 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float strength;
    varying vec2 vUv;
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      float d = distance(vUv, vec2(0.5));
      color.rgb *= smoothstep(0.92, 0.32, d * strength * 2.0);
      gl_FragColor = color;
    }`,
};

export class PostProcessingManager {
  constructor(renderer, scene, camera) {
    const size = new THREE.Vector2();
    renderer.getSize(size);

    this.composer = new EffectComposer(renderer);
    this.composer.setPixelRatio(renderer.getPixelRatio());

    this.renderPass = new RenderPass(scene, camera);
    this.composer.addPass(this.renderPass);

    // SSAO renders its own beauty pass, so it substitutes the RenderPass
    this.ssaoPass = new SSAOPass(scene, camera, size.x, size.y);
    this.ssaoPass.kernelRadius = 10;
    this.ssaoPass.minDistance = 0.002;
    this.ssaoPass.maxDistance = 0.09;
    this.ssaoPass.enabled = false;
    this.composer.addPass(this.ssaoPass);

    this.bloomPass = new UnrealBloomPass(
      size.clone().multiplyScalar(0.5),
      QUALITY.bloom.strength,
      QUALITY.bloom.radius,
      QUALITY.bloom.threshold,
    );
    this.composer.addPass(this.bloomPass);

    this.vignettePass = new ShaderPass(VignetteShader);
    this.composer.addPass(this.vignettePass);

    // Tone mapping + colour space conversion
    this.composer.addPass(new OutputPass());

    // SMAA on the final LDR image
    this.smaaPass = new SMAAPass(size.x, size.y);
    this.composer.addPass(this.smaaPass);
  }

  setBloom(enabled) {
    this.bloomPass.enabled = enabled;
  }

  setSSAO(enabled) {
    this.ssaoPass.enabled = enabled;
    this.renderPass.enabled = !enabled;
  }

  render(delta) {
    this.composer.render(delta);
  }

  resize() {
    this.composer.setSize(window.innerWidth, window.innerHeight);
  }
}
