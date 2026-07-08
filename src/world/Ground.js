/**
 * Ground — the irregular industrial platform: painted asphalt top cap,
 * concrete slab sides with metallic trim, dark water base and low-poly
 * landscaping (trees on the green patches).
 */
import * as THREE from 'three';
import { PALETTE, PLATFORM, PLATFORM_OUTLINE } from '../config/settings.js';
import { createSitePlanTexture, createSiteRoughnessTexture } from '../utils/textures.js';

export class Ground {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'ground';

    this.#buildPlatform();
    this.#buildWater();
    this.#buildTrees();
  }

  #platformShape() {
    // Shape lives in XY; rotateX(-PI/2) maps shape (x, y) → world (x, -y).
    // Feed (x, -z) so painted texture coordinates line up with world XZ.
    const shape = new THREE.Shape();
    PLATFORM_OUTLINE.forEach(([x, z], i) => {
      i === 0 ? shape.moveTo(x, -z) : shape.lineTo(x, -z);
    });
    shape.closePath();
    return shape;
  }

  #buildPlatform() {
    const shape = this.#platformShape();

    // — Top cap with the painted site plan —
    const map = createSitePlanTexture();
    const roughnessMap = createSiteRoughnessTexture();
    const capGeo = new THREE.ShapeGeometry(shape, 4);
    capGeo.rotateX(-Math.PI / 2);

    // Remap UVs (shape coords) into 0-1 across the platform bounds.
    // shapeY = -z, so v = (shapeY - (-maxZ)) / span = (maxZ - z)/span — this
    // matches canvas rows painted with py ∝ z after the default flipY.
    const uv = capGeo.attributes.uv;
    const spanX = PLATFORM.maxX - PLATFORM.minX;
    const spanZ = PLATFORM.maxZ - PLATFORM.minZ;
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(
        i,
        (uv.getX(i) - PLATFORM.minX) / spanX,
        (uv.getY(i) + PLATFORM.maxZ) / spanZ,
      );
    }

    const cap = new THREE.Mesh(
      capGeo,
      new THREE.MeshStandardMaterial({
        map,
        roughnessMap,
        roughness: 0.94,
        metalness: 0.04,
      }),
    );
    cap.position.y = 0.02;
    cap.receiveShadow = true;
    this.group.add(cap);

    // — Slab body (sides) —
    const slabGeo = new THREE.ExtrudeGeometry(shape, {
      depth: PLATFORM.thickness,
      bevelEnabled: false,
    });
    slabGeo.rotateX(Math.PI / 2); // extrude downward
    const slab = new THREE.Mesh(
      slabGeo,
      new THREE.MeshStandardMaterial({ color: 0x14171d, roughness: 0.85, metalness: 0.1 }),
    );
    this.group.add(slab);

    // — Metallic trim ring along the platform edge —
    const trimPts = PLATFORM_OUTLINE.map(([x, z]) => new THREE.Vector3(x, 0.06, z));
    trimPts.push(trimPts[0].clone());
    const trimCurve = new THREE.CatmullRomCurve3(trimPts, true, 'catmullrom', 0.02);
    const trim = new THREE.Mesh(
      new THREE.TubeGeometry(trimCurve, 220, 0.35, 8, true),
      new THREE.MeshStandardMaterial({ color: 0x596273, metalness: 0.92, roughness: 0.3 }),
    );
    this.group.add(trim);
  }

  #buildWater() {
    // Exposed so DayNightCycle can grade it from ink-black to steel blue
    this.waterMat = new THREE.MeshStandardMaterial({
      color: PALETTE.water,
      metalness: 0.55,
      roughness: 0.48,
      envMapIntensity: 0.6,
    });
    const water = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), this.waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.y = -PLATFORM.thickness - 0.6;
    this.group.add(water);
  }

  /** Simple low-poly trees clustered on the landscaped patches. */
  #buildTrees() {
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3626, roughness: 0.95 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x2c5e34, roughness: 0.9, flatShading: true });
    const trunkGeo = new THREE.CylinderGeometry(0.14, 0.22, 1.4, 6);
    const leafGeo = new THREE.IcosahedronGeometry(1.15, 0);

    const clusters = [
      { x: 96, z: 52, r: 10, n: 9 },
      { x: -98, z: 40, r: 7, n: 5 },
      { x: 30, z: 66, r: 6, n: 4 },
      { x: 104, z: -30, r: 6, n: 4 },
    ];
    const count = clusters.reduce((a, c) => a + c.n, 0);
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, count);
    const leaves = new THREE.InstancedMesh(leafGeo, leafMat, count);
    trunks.castShadow = leaves.castShadow = true;

    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    let i = 0;
    for (const c of clusters) {
      for (let k = 0; k < c.n; k++) {
        const ang = Math.random() * Math.PI * 2;
        const rr = Math.sqrt(Math.random()) * c.r * 0.7;
        const x = c.x + Math.cos(ang) * rr;
        const z = c.z + Math.sin(ang) * rr * 0.8;
        const s = 0.7 + Math.random() * 0.8;
        m.compose(new THREE.Vector3(x, 0.7 * s, z), q.setFromEuler(e.set(0, 0, 0)), new THREE.Vector3(s, s, s));
        trunks.setMatrixAt(i, m);
        m.compose(
          new THREE.Vector3(x, (1.4 + 0.7) * s, z),
          q.setFromEuler(e.set(Math.random() * 0.4, Math.random() * Math.PI, 0)),
          new THREE.Vector3(s, s * 1.15, s),
        );
        leaves.setMatrixAt(i, m);
        i++;
      }
    }
    this.group.add(trunks, leaves);
  }
}
