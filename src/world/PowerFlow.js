/**
 * PowerFlow — glowing electrical cables built from CatmullRomCurve3 +
 * TubeGeometry with a custom shader that drives bright energy pulses
 * along each tube. Colour-coded per system:
 *   green = AC power · blue = data · violet = comms · amber = transformer
 */
import * as THREE from 'three';
import { PALETTE } from '../config/settings.js';

const CABLE_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// u (vUv.x) runs 0→1 along the tube. Several pulses travel the length,
// each a smooth hot band over a dim always-on core.
const CABLE_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uSpeed;
  uniform float uPulses;
  uniform float uIntensity;
  varying vec2 vUv;

  void main() {
    float t = fract(vUv.x * uPulses - uTime * uSpeed);
    float pulse = smoothstep(0.0, 0.42, t) * (1.0 - smoothstep(0.42, 0.55, t));
    pulse = pow(pulse, 2.2);
    vec3 color = uColor * (0.35 + pulse * uIntensity);
    gl_FragColor = vec4(color, 1.0);
  }
`;

/** Cable route definitions: flat point lists laid slightly above ground. */
const ROUTES = {
  green: [
    // Solar field strings → inverters → transformers
    [[-84, -34], [-66, -30], [-46, -26], [-24, -28], [-14, -32], [2, -22], [8, -14]],
    [[-86, 8], [-64, 4], [-42, 6], [-22, 8], [-10, 12], [0, 18], [6, 26]],
    [[-80, 32], [-58, 30], [-36, 32], [-12, 34], [2, 30], [6, 26]],
    [[-84, -12], [-60, -14], [-38, -10], [-20, -12], [-2, -4], [8, -14]],
    // Transformers → substation
    [[8, -14], [26, -18], [48, -22], [66, -26], [78, -28]],
    [[6, 26], [24, 20], [44, 8], [62, -10], [78, -28]],
    // Satellite array feed
    [[30, -50], [48, -46], [64, -40], [74, -32], [78, -28]],
  ],
  blue: [
    [[16, 8], [4, 4], [-16, 2], [-44, -2], [-70, -4], [-88, -6]],
    [[16, 8], [30, 4], [52, -2], [70, -12], [78, -24]],
    [[40, 50], [30, 36], [20, 20], [16, 8]],
  ],
  violet: [
    [[-18, 46], [-46, 44], [-72, 38], [-92, 24], [-98, 2]],
    [[-18, 46], [4, 48], [26, 50], [40, 50]],
  ],
  amber: [
    [[8, -14], [10, -4], [8, 6], [6, 16], [6, 26]],
    [[88, 44], [84, 28], [80, 8], [78, -12], [78, -28]],
  ],
};

const COLORS = {
  green: PALETTE.flowGreen,
  blue: PALETTE.flowBlue,
  violet: PALETTE.flowViolet,
  amber: PALETTE.flowAmber,
};

export class PowerFlow {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'power-flow';
    /** @type {THREE.ShaderMaterial[]} */
    this.materials = [];
    this.speedScale = 1;

    for (const [system, routes] of Object.entries(ROUTES)) {
      const color = new THREE.Color(COLORS[system]);
      routes.forEach((pts, i) => {
        const curve = new THREE.CatmullRomCurve3(
          pts.map(([x, z]) => new THREE.Vector3(x, 0.16, z)),
          false, 'catmullrom', 0.35,
        );
        const length = curve.getLength();
        const geo = new THREE.TubeGeometry(curve, Math.round(length * 1.4), 0.09, 6, false);
        const mat = new THREE.ShaderMaterial({
          uniforms: {
            uColor: { value: color },
            uTime: { value: 0 },
            uSpeed: { value: 0.5 + Math.random() * 0.4 },
            uPulses: { value: Math.max(2, Math.round(length / 26)) },
            uIntensity: { value: 2.6 },
          },
          vertexShader: CABLE_VERT,
          fragmentShader: CABLE_FRAG,
          toneMapped: false,
          fog: false,
        });
        this.materials.push(mat);
        const tube = new THREE.Mesh(geo, mat);
        tube.frustumCulled = true;
        this.group.add(tube);

        // Junction node glow at route endpoints
        if (i < routes.length) {
          const nodeMat = new THREE.MeshBasicMaterial({
            color: color.clone().multiplyScalar(1.8), toneMapped: false,
          });
          for (const idx of [0, pts.length - 1]) {
            const node = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), nodeMat);
            node.position.set(pts[idx][0], 0.16, pts[idx][1]);
            this.group.add(node);
          }
        }
      });
    }
  }

  setEnabled(enabled) {
    this.group.visible = enabled;
  }

  update(dt) {
    for (const mat of this.materials) {
      mat.uniforms.uTime.value += dt * this.speedScale;
    }
  }
}
