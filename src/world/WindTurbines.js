/**
 * WindTurbines — procedurally built HAWT turbines with tapered towers,
 * nacelles, spinning three-blade rotors and blinking aviation lights.
 */
import * as THREE from 'three';
import gsap from 'gsap';
import { TURBINES } from '../config/settings.js';

/** Tapered airfoil-ish blade outline, extruded thin. */
function createBladeGeometry(length) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.quadraticCurveTo(length * 0.28, 0.5, length * 0.62, 0.34);
  shape.quadraticCurveTo(length * 0.92, 0.2, length, 0.05);
  shape.lineTo(length, -0.02);
  shape.quadraticCurveTo(length * 0.55, -0.22, length * 0.12, -0.3);
  shape.quadraticCurveTo(length * 0.02, -0.28, 0, 0);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.12,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.04,
    bevelSegments: 1,
  });
  geo.translate(0, 0, -0.06);
  return geo;
}

export class WindTurbines {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'wind-turbines';
    /** @type {{ spinner: THREE.Group, speed: number, light: THREE.Mesh, phase: number }[]} */
    this.units = [];
    this.pickables = [];

    // Shared across every turbine so the wind fleet can be dimmed with
    // two material tweens when the solar filter is active.
    this.towerMat = new THREE.MeshStandardMaterial({ color: 0xe8eaee, metalness: 0.25, roughness: 0.4 });
    this.nacelleMat = new THREE.MeshStandardMaterial({ color: 0xd7dade, metalness: 0.4, roughness: 0.35 });

    TURBINES.forEach((cfg, i) => {
      const unit = this.#buildTurbine(cfg, i, this.towerMat, this.nacelleMat);
      this.group.add(unit.root);
      this.units.push(unit);
      this.pickables.push(unit.root);
    });
  }

  #buildTurbine({ x, z, h, s }, index, towerMat, nacelleMat) {
    const root = new THREE.Group();
    root.position.set(x, 0, z);
    root.rotation.y = -0.6 + Math.random() * 0.5; // rough shared wind heading
    root.userData.pick = {
      kind: 'turbine',
      index,
      focus: new THREE.Vector3(x, h * 0.75, z),
      label: `WT-${String(101 + index)}`,
    };

    // Tower — tapered cylinder
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.95, h, 14), towerMat);
    tower.position.y = h / 2;
    tower.castShadow = tower.receiveShadow = true;
    root.add(tower);

    // Nacelle
    const nacelle = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.15, 1.1), nacelleMat);
    nacelle.geometry.translate(0.35, 0, 0);
    nacelle.position.y = h;
    nacelle.castShadow = true;
    root.add(nacelle);

    // Hub + blades under one spinner group (rotates about X)
    const spinner = new THREE.Group();
    spinner.position.set(1.75, h, 0);
    root.add(spinner);

    const hub = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), nacelleMat);
    hub.scale.set(1.4, 1, 1);
    spinner.add(hub);

    const bladeGeo = createBladeGeometry(h * 0.42);
    for (let b = 0; b < 3; b++) {
      const blade = new THREE.Mesh(bladeGeo, towerMat);
      blade.castShadow = true;
      // inner: blade length (+X) → up, chord into the rotor plane;
      // holder: distributes the three blades 120° apart around the rotor axis.
      const inner = new THREE.Group();
      inner.rotation.set(0, Math.PI / 2, Math.PI / 2);
      inner.add(blade);
      const holder = new THREE.Group();
      holder.rotation.x = (b / 3) * Math.PI * 2;
      holder.add(inner);
      spinner.add(holder);
    }
    spinner.rotation.x = Math.random() * Math.PI * 2;

    // Aviation warning light on the nacelle roof
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xff2233, toneMapped: false });
    const light = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), lightMat);
    light.position.set(-0.4, h + 0.75, 0);
    root.add(light);

    return { root, spinner, speed: s, light, phase: Math.random() * Math.PI * 2 };
  }

  getTelemetry(index) {
    const cfg = TURBINES[index];
    const rpm = (cfg.s * 60) / (Math.PI * 2);
    return {
      type: 'WIND TURBINE',
      name: `WT-${101 + index}`,
      status: 'Operational',
      warn: false,
      rows: [
        ['Output', `${(1.8 + cfg.s * 1.4).toFixed(2)} MW`],
        ['Rotor speed', `${rpm.toFixed(1)} rpm`],
        ['Wind speed', `${(6 + cfg.s * 3.2).toFixed(1)} m/s`],
        ['Hub height', `${cfg.h} m`],
        ['Vibration', 'Nominal'],
      ],
    };
  }

  /**
   * Filter response for the fleet, driven by one tweened state:
   *   'wind'  — towers pick up a cool blue emissive glow
   *   'solar' — fleet fades towards charcoal
   *   'both'  — neutral baseline
   */
  setFilterMode(mode) {
    const target = {
      wind: { k: 1, em: 0.5 },
      solar: { k: 0.2, em: 0 },
      both: { k: 1, em: 0 },
    }[mode] ?? { k: 1, em: 0 };

    this.fx ??= { k: 1, em: 0 };
    gsap.to(this.fx, {
      ...target,
      duration: 0.7,
      ease: 'power2.inOut',
      overwrite: 'auto',
      onUpdate: () => {
        const { k, em } = this.fx;
        this.towerMat.color.setHex(0xe8eaee).multiplyScalar(k);
        this.nacelleMat.color.setHex(0xd7dade).multiplyScalar(k);
        this.towerMat.emissive.setHex(0x1c55b0);
        this.nacelleMat.emissive.setHex(0x1c55b0);
        this.towerMat.emissiveIntensity = em;
        this.nacelleMat.emissiveIntensity = em;
      },
    });
  }

  update(dt, elapsed) {
    for (const u of this.units) {
      u.spinner.rotation.x += u.speed * dt;
      // Slow aviation beacon blink, desynchronised per turbine
      const on = Math.sin(elapsed * 2.2 + u.phase) > 0.55;
      u.light.material.color.setHex(on ? 0xff4455 : 0x330a0d);
      if (on) u.light.material.color.multiplyScalar(3.2); // pushes into bloom
    }
  }
}
