/**
 * SolarFarm — hundreds of PV panels rendered as three InstancedMeshes
 * (glass face / aluminum frame / support legs) that share one matrix set.
 * Random tilt, yaw jitter, spacing jitter and dropout kill the repetition.
 */
import * as THREE from 'three';
import { PALETTE, SOLAR } from '../config/settings.js';
import { createSolarCellTexture } from '../utils/textures.js';

export class SolarFarm {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'solar-farm';
    /** Per-instance telemetry seeds, indexed by instanceId. */
    this.panelData = [];

    const transforms = this.#layoutTransforms();
    const count = transforms.length;

    // — Glass face —
    const glassGeo = new THREE.BoxGeometry(SOLAR.panelW * 0.94, 0.06, SOLAR.panelH * 0.9);
    glassGeo.translate(0, 0.08, 0);
    const glassMat = new THREE.MeshStandardMaterial({
      map: createSolarCellTexture(),
      color: 0xffffff,
      metalness: 0.35,
      roughness: 0.14,
      envMapIntensity: 1.6,
      emissive: PALETTE.panelBlue,
      emissiveIntensity: 0.14,
    });
    this.glass = new THREE.InstancedMesh(glassGeo, glassMat, count);
    this.glass.name = 'solar-glass';

    // — Frame —
    const frameGeo = new THREE.BoxGeometry(SOLAR.panelW, 0.1, SOLAR.panelH);
    const frameMat = new THREE.MeshStandardMaterial({
      color: PALETTE.aluminum,
      metalness: 0.9,
      roughness: 0.42,
    });
    this.frame = new THREE.InstancedMesh(frameGeo, frameMat, count);

    // — Support legs (single merged post under the panel centre-line) —
    const legGeo = new THREE.BoxGeometry(0.16, 1.15, 0.16);
    legGeo.translate(0, -0.62, 0);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x5a6068, metalness: 0.8, roughness: 0.5 });
    this.legs = new THREE.InstancedMesh(legGeo, legMat, count);

    const color = new THREE.Color();
    transforms.forEach((m, i) => {
      this.glass.setMatrixAt(i, m);
      this.frame.setMatrixAt(i, m);
      this.legs.setMatrixAt(i, m);
      // Subtle per-panel tint variation reads as roughness/soiling variance
      const v = 0.9 + Math.random() * 0.25;
      this.glass.setColorAt(i, color.setScalar(v));
      this.panelData.push({
        id: `SA-${String(1000 + i).slice(1)}`,
        output: 380 + Math.random() * 95,
        temp: 28 + Math.random() * 14,
        eff: 19 + Math.random() * 3.4,
      });
    });

    this.glass.castShadow = this.frame.castShadow = true;
    this.glass.receiveShadow = true;
    for (const mesh of [this.glass, this.frame, this.legs]) {
      mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
      this.group.add(mesh);
    }

    // Raycast against the glass layer only (cheapest, topmost)
    this.pickables = [this.glass];
  }

  /** Grid layout for both arrays with jitter + random dropout. */
  #layoutTransforms() {
    const transforms = [];
    const m = new THREE.Matrix4();
    const p = new THREE.Vector3();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const s = new THREE.Vector3(1, 1, 1);

    for (const f of [SOLAR.field, SOLAR.satellite]) {
      const w = (f.cols - 1) * f.colPitch;
      const h = (f.rows - 1) * f.rowPitch;
      for (let r = 0; r < f.rows; r++) {
        for (let c = 0; c < f.cols; c++) {
          if (Math.random() > SOLAR.fill) continue; // dropout for realism
          const lx = c * f.colPitch - w / 2 + (Math.random() - 0.5) * 0.35;
          const lz = r * f.rowPitch - h / 2 + (Math.random() - 0.5) * 0.25;
          // Rotate the whole field by its yaw
          const x = f.cx + lx * Math.cos(f.yaw) - lz * Math.sin(f.yaw);
          const z = f.cz + lx * Math.sin(f.yaw) + lz * Math.cos(f.yaw);
          e.set(
            SOLAR.tilt + (Math.random() - 0.5) * 0.05,
            f.yaw + (Math.random() - 0.5) * 0.04,
            (Math.random() - 0.5) * 0.02,
          );
          m.compose(p.set(x, 1.28, z), q.setFromEuler(e), s);
          transforms.push(m.clone());
        }
      }
    }
    return transforms;
  }

  getTelemetry(instanceId) {
    const d = this.panelData[instanceId];
    return {
      type: 'SOLAR ARRAY',
      name: d.id,
      status: d.output > 400 ? 'Operational' : 'Reduced output',
      warn: d.output <= 400,
      rows: [
        ['Output', `${d.output.toFixed(0)} W`],
        ['Cell temp', `${d.temp.toFixed(1)} °C`],
        ['Efficiency', `${d.eff.toFixed(1)} %`],
        ['String voltage', `${(d.output / 8.4).toFixed(1)} V`],
        ['Uptime', '99.2 %'],
      ],
    };
  }

  /** World position of one panel instance (for camera focus). */
  getInstancePosition(instanceId, out = new THREE.Vector3()) {
    const m = new THREE.Matrix4();
    this.glass.getMatrixAt(instanceId, m);
    return out.setFromMatrixPosition(m);
  }
}
