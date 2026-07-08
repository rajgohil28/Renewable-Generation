/**
 * Structures — utility buildings, transformer stations, inverter cabinets
 * and a fenced substation, all procedural with PBR materials.
 */
import * as THREE from 'three';
import { createBuildingWallTexture } from '../utils/textures.js';

const wallTex = { current: null };

function wallMaterial() {
  wallTex.current ??= createBuildingWallTexture();
  return new THREE.MeshStandardMaterial({ map: wallTex.current, roughness: 0.85, metalness: 0.05 });
}

export class Structures {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'structures';
    this.pickables = [];
    /** Emissive LED materials that pulse in update(). */
    this.leds = [];

    this.#buildings();
    this.#transformers();
    this.#inverters();
    this.#substation();
  }

  #registerPickable(mesh, pick) {
    mesh.traverse((o) => { o.userData.pick = pick; });
    mesh.userData.pick = pick;
    this.pickables.push(mesh);
  }

  // ── Utility buildings ───────────────────────────────────────────

  #building({ x, z, w, d, h, ry = 0, name }) {
    const b = new THREE.Group();
    b.position.set(x, 0, z);
    b.rotation.y = ry;

    const walls = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMaterial());
    walls.position.y = h / 2;
    walls.castShadow = walls.receiveShadow = true;
    b.add(walls);

    // Metal roof with overhang
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.5, 0.28, d + 0.5),
      new THREE.MeshStandardMaterial({ color: 0x3a4048, metalness: 0.85, roughness: 0.4 }),
    );
    roof.position.y = h + 0.14;
    roof.castShadow = true;
    b.add(roof);

    // HVAC units on the roof
    const hvacMat = new THREE.MeshStandardMaterial({ color: 0x8f969e, metalness: 0.7, roughness: 0.5 });
    for (let i = 0; i < Math.max(1, Math.round(w / 5)); i++) {
      const hvac = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.9, 1.2), hvacMat);
      hvac.position.set(-w / 2 + 2 + i * 4.2, h + 0.75, (i % 2 ? -1 : 1) * d * 0.16);
      hvac.castShadow = true;
      b.add(hvac);
      const fan = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.12, 12),
        new THREE.MeshStandardMaterial({ color: 0x2c3138, metalness: 0.8, roughness: 0.35 }));
      fan.position.set(hvac.position.x, h + 1.28, hvac.position.z);
      b.add(fan);
    }

    // Door + lit window strip
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 2.2, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x30363e, metalness: 0.7, roughness: 0.45 }),
    );
    door.position.set(w * 0.2, 1.1, d / 2 + 0.04);
    b.add(door);

    const winMat = new THREE.MeshStandardMaterial({
      color: 0x0c1826, emissive: 0xffb45e, emissiveIntensity: 1.1, roughness: 0.2,
    });
    const win = new THREE.Mesh(new THREE.BoxGeometry(w * 0.5, 0.8, 0.06), winMat);
    win.position.set(-w * 0.14, h * 0.62, d / 2 + 0.04);
    b.add(win);

    b.userData.telemetry = {
      type: 'UTILITY BUILDING',
      name,
      status: 'Operational',
      warn: false,
      rows: [
        ['Function', 'Control & switchgear'],
        ['Load', `${(40 + Math.random() * 90).toFixed(0)} kW`],
        ['Interior temp', `${(21 + Math.random() * 3).toFixed(1)} °C`],
        ['Access', 'Secured'],
        ['Last inspection', '2026-06-18'],
      ],
    };
    this.#registerPickable(b, {
      kind: 'structure', label: name,
      focus: new THREE.Vector3(x, h / 2, z),
      telemetry: b.userData.telemetry,
    });
    this.group.add(b);
  }

  #buildings() {
    this.#building({ x: 16, z: 8, w: 12, d: 7, h: 4.6, ry: 0.05, name: 'CTRL-01' });
    this.#building({ x: 40, z: 50, w: 9, d: 6, h: 4.0, ry: -0.04, name: 'OPS-02' });
    this.#building({ x: -18, z: 46, w: 8, d: 5.5, h: 3.6, ry: 0.12, name: 'MAINT-03' });
  }

  // ── Transformer stations ────────────────────────────────────────

  #transformer(x, z, name, ry = 0) {
    const t = new THREE.Group();
    t.position.set(x, 0, z);
    t.rotation.y = ry;

    // Concrete pad
    const pad = new THREE.Mesh(
      new THREE.BoxGeometry(6.4, 0.24, 4.6),
      new THREE.MeshStandardMaterial({ color: 0x3c4046, roughness: 0.9 }),
    );
    pad.position.y = 0.12;
    pad.receiveShadow = true;
    t.add(pad);

    // Main tank
    const tank = new THREE.Mesh(
      new THREE.BoxGeometry(3.4, 2.2, 2.4),
      new THREE.MeshStandardMaterial({ color: 0x565e66, metalness: 0.8, roughness: 0.45 }),
    );
    tank.position.y = 1.34;
    tank.castShadow = true;
    t.add(tank);

    // Cooling fins
    const finMat = new THREE.MeshStandardMaterial({ color: 0x474e56, metalness: 0.8, roughness: 0.5 });
    for (let i = 0; i < 5; i++) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.8, 2.1), finMat);
      fin.position.set(-2 - i * 0.16, 1.3, 0);
      t.add(fin);
    }

    // Bushings
    const bushingMat = new THREE.MeshStandardMaterial({ color: 0x7d8288, metalness: 0.4, roughness: 0.35 });
    for (let i = 0; i < 3; i++) {
      const bushing = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 0.9, 8), bushingMat);
      bushing.position.set(-0.9 + i * 0.9, 2.9, 0);
      t.add(bushing);
    }

    // Yellow hazard chevron band
    const band = new THREE.Mesh(
      new THREE.BoxGeometry(3.44, 0.3, 2.44),
      new THREE.MeshStandardMaterial({
        color: 0xd8a411, emissive: 0xffc233, emissiveIntensity: 0.35, roughness: 0.5,
      }),
    );
    band.position.y = 0.44;
    t.add(band);

    // Status LED
    const ledMat = new THREE.MeshBasicMaterial({ color: 0xffc233, toneMapped: false });
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), ledMat);
    led.position.set(1.76, 1.8, 0.6);
    t.add(led);
    this.leds.push({ mat: ledMat, base: new THREE.Color(0xffc233), phase: Math.random() * 6 });

    this.#registerPickable(t, {
      kind: 'structure', label: name,
      focus: new THREE.Vector3(x, 1.4, z),
      telemetry: {
        type: 'TRANSFORMER',
        name,
        status: 'Operational',
        warn: false,
        rows: [
          ['Throughput', `${(8 + Math.random() * 6).toFixed(1)} MW`],
          ['Oil temp', `${(52 + Math.random() * 9).toFixed(1)} °C`],
          ['Load factor', `${(68 + Math.random() * 22).toFixed(0)} %`],
          ['Tap position', '4 / 9'],
          ['Cooling', 'ONAF — active'],
        ],
      },
    });
    this.group.add(t);
  }

  #transformers() {
    this.#transformer(8, -14, 'TR-201', 0.2);
    this.#transformer(6, 26, 'TR-202', -0.1);
    this.#transformer(88, 44, 'TR-203', 0.4);
  }

  // ── Inverter cabinets beside the solar rows ─────────────────────

  #inverters() {
    const cabinetGeo = new THREE.BoxGeometry(1.5, 1.7, 0.9);
    const cabinetMat = new THREE.MeshStandardMaterial({ color: 0xb9bec4, metalness: 0.6, roughness: 0.45 });
    const spots = [
      [-84, -34], [-86, 8], [-80, 32], [-14, -32], [-10, 12], [-12, 34], [30, -50], [70, -48],
    ];
    spots.forEach(([x, z], i) => {
      const inv = new THREE.Group();
      inv.position.set(x, 0, z);
      inv.rotation.y = Math.random() * 0.5;

      const body = new THREE.Mesh(cabinetGeo, cabinetMat);
      body.position.y = 0.97;
      body.castShadow = true;
      inv.add(body);

      const base = new THREE.Mesh(
        new THREE.BoxGeometry(1.7, 0.24, 1.1),
        new THREE.MeshStandardMaterial({ color: 0x3c4046, roughness: 0.9 }),
      );
      base.position.y = 0.12;
      inv.add(base);

      // Glowing green status LED strip
      const ledMat = new THREE.MeshBasicMaterial({ color: 0x46ffa1, toneMapped: false });
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.07, 0.04), ledMat);
      strip.position.set(0, 1.5, 0.47);
      inv.add(strip);
      this.leds.push({ mat: ledMat, base: new THREE.Color(0x46ffa1), phase: i * 0.9 });

      const name = `INV-${301 + i}`;
      this.#registerPickable(inv, {
        kind: 'structure', label: name,
        focus: new THREE.Vector3(x, 1, z),
        telemetry: {
          type: 'STRING INVERTER',
          name,
          status: 'Exporting',
          warn: false,
          rows: [
            ['AC output', `${(96 + Math.random() * 24).toFixed(1)} kW`],
            ['DC input', `${(101 + Math.random() * 26).toFixed(1)} kW`],
            ['Efficiency', `${(97.1 + Math.random() * 1.6).toFixed(1)} %`],
            ['Heatsink', `${(41 + Math.random() * 8).toFixed(0)} °C`],
            ['MPPT', '2 / 2 tracking'],
          ],
        },
      });
      this.group.add(inv);
    });
  }

  // ── Fenced substation (top-right) ───────────────────────────────

  #substation() {
    const s = new THREE.Group();
    s.position.set(78, 0, -28);

    const steel = new THREE.MeshStandardMaterial({ color: 0x6a7076, metalness: 0.85, roughness: 0.4 });

    // Gantry frame
    for (const gx of [-6, 6]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 6.4, 8), steel);
      post.position.set(gx, 3.2, 0);
      post.castShadow = true;
      s.add(post);
    }
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 12.6, 8), steel);
    beam.rotation.z = Math.PI / 2;
    beam.position.y = 6.2;
    s.add(beam);

    // Insulator strings hanging from the beam
    const insulatorMat = new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.3, metalness: 0.3 });
    for (const gx of [-4, 0, 4]) {
      const ins = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.4, 6), insulatorMat);
      ins.position.set(gx, 5.4, 0);
      s.add(ins);
    }

    // Perimeter fence — thin instanced posts + translucent mesh panels
    const fenceMat = new THREE.MeshStandardMaterial({
      color: 0x8b949c, metalness: 0.8, roughness: 0.4, transparent: true, opacity: 0.28, side: THREE.DoubleSide,
    });
    const fence = new THREE.Mesh(new THREE.BoxGeometry(18, 2, 0.03), fenceMat);
    const f2 = fence.clone(); const f3 = new THREE.Mesh(new THREE.BoxGeometry(0.03, 2, 12), fenceMat); const f4 = f3.clone();
    fence.position.set(0, 1, -6); f2.position.set(0, 1, 6);
    f3.position.set(-9, 1, 0); f4.position.set(9, 1, 0);
    s.add(fence, f2, f3, f4);

    this.#registerPickable(s, {
      kind: 'structure', label: 'SUB-01',
      focus: new THREE.Vector3(78, 3, -28),
      telemetry: {
        type: 'SUBSTATION',
        name: 'SUB-01',
        status: 'Grid-tied',
        warn: false,
        rows: [
          ['Export', `${(52 + Math.random() * 18).toFixed(1)} MW`],
          ['Bus voltage', '132.4 kV'],
          ['Frequency', '50.02 Hz'],
          ['Breakers', '6 / 6 closed'],
          ['SCADA link', 'Healthy'],
        ],
      },
    });
    this.group.add(s);
  }

  update(elapsed) {
    // Slow breathing glow on all status LEDs
    for (const led of this.leds) {
      const k = 1.6 + Math.sin(elapsed * 2.4 + led.phase) * 0.9;
      led.mat.color.copy(led.base).multiplyScalar(k);
    }
  }
}
