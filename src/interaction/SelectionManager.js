/**
 * SelectionManager — raycast-driven hover highlights, click selection
 * (opens the telemetry info card) and double-click camera focus.
 *
 * Solar panels are InstancedMesh, so hover is shown with a floating
 * glowing "bracket" placed at the instance transform; regular meshes
 * get an emissive boost + micro scale pop.
 */
import * as THREE from 'three';
import gsap from 'gsap';
import { SOLAR } from '../config/settings.js';

export class SelectionManager {
  constructor({ canvas, camera, cameraManager, solarFarm, turbines, structures, ui }) {
    this.canvas = canvas;
    this.camera = camera;
    this.cameraManager = cameraManager;
    this.solarFarm = solarFarm;
    this.turbines = turbines;
    this.structures = structures;
    this.ui = ui;

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.pointerPx = { x: 0, y: 0 };
    this.enabled = false;
    this.needsCast = false;

    this.hover = null; // { kind, object?, instanceId?, label }
    this.lastFocus = null;

    // Glowing hover bracket for instanced solar panels
    this.bracket = this.#makeBracket();
    this.bracket.visible = false;

    this.#bind();
  }

  #makeBracket() {
    const geo = new THREE.PlaneGeometry(SOLAR.panelW * 1.12, SOLAR.panelH * 1.18);
    const edges = new THREE.EdgesGeometry(geo);
    const mat = new THREE.LineBasicMaterial({
      color: new THREE.Color(0x3f8cff).multiplyScalar(2.4),
      toneMapped: false,
      transparent: true,
      opacity: 0.95,
    });
    const line = new THREE.LineSegments(edges, mat);
    line.rotation.order = 'YXZ';
    return line;
  }

  #bind() {
    let downAt = 0;
    let downPos = { x: 0, y: 0 };

    this.canvas.addEventListener('pointermove', (e) => {
      this.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
      this.pointerPx = { x: e.clientX, y: e.clientY };
      this.needsCast = true;
    });

    this.canvas.addEventListener('pointerdown', (e) => {
      downAt = performance.now();
      downPos = { x: e.clientX, y: e.clientY };
    });

    this.canvas.addEventListener('pointerup', (e) => {
      // Click only if it wasn't a drag
      const dist = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
      if (dist < 6 && performance.now() - downAt < 400) this.#onClick();
    });

    this.canvas.addEventListener('dblclick', () => {
      if (this.lastFocus) this.cameraManager.focusOn(this.lastFocus.point, this.lastFocus.distance);
    });

    this.canvas.addEventListener('pointerleave', () => this.#clearHover());
  }

  /** Walk up the hierarchy to find pick metadata. */
  #resolvePick(object) {
    let o = object;
    while (o) {
      if (o.userData.pick) return o.userData.pick;
      o = o.parent;
    }
    return null;
  }

  #cast() {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const targets = [
      ...this.solarFarm.pickables,
      ...this.turbines.pickables,
      ...this.structures.pickables,
    ];
    const hits = this.raycaster.intersectObjects(targets, true);
    return hits[0] ?? null;
  }

  #onHover(hit) {
    if (!hit) return this.#clearHover();

    // — Instanced solar panel —
    if (hit.object === this.solarFarm.glass && hit.instanceId != null) {
      if (this.hover?.kind === 'solar' && this.hover.instanceId === hit.instanceId) return;
      this.#clearHover();
      const m = new THREE.Matrix4();
      this.solarFarm.glass.getMatrixAt(hit.instanceId, m);
      this.bracket.position.setFromMatrixPosition(m).add(new THREE.Vector3(0, 0.22, 0));
      const rot = new THREE.Euler().setFromRotationMatrix(m, 'YXZ');
      this.bracket.rotation.set(rot.x - Math.PI / 2, rot.y, 0);
      this.bracket.visible = true;
      const d = this.solarFarm.panelData[hit.instanceId];
      this.hover = { kind: 'solar', instanceId: hit.instanceId, label: d.id, sub: `${d.output.toFixed(0)} W` };
      this.ui.showHoverTip(this.hover.label, this.hover.sub, this.pointerPx);
      this.canvas.style.cursor = 'pointer';
      return;
    }

    // — Regular object with pick metadata —
    const pick = this.#resolvePick(hit.object);
    if (!pick) return this.#clearHover();
    if (this.hover?.kind === 'mesh' && this.hover.pick === pick) {
      this.ui.showHoverTip(pick.label, '', this.pointerPx);
      return;
    }
    this.#clearHover();
    const root = pick.kind === 'turbine'
      ? this.turbines.pickables[pick.index]
      : this.structures.pickables.find((p) => p.userData.pick === pick) ?? hit.object;

    // Emissive boost + micro scale pop
    const restore = [];
    root.traverse((o) => {
      if (o.isMesh && o.material?.emissive && !o.material.userData?.noHighlight) {
        restore.push({ mat: o.material, e: o.material.emissive.getHex(), i: o.material.emissiveIntensity });
      }
    });
    const seen = new Set();
    for (const r of restore) {
      if (seen.has(r.mat)) continue;
      seen.add(r.mat);
      r.mat.emissive.setHex(0x2a70e0);
      r.mat.emissiveIntensity = 0.55;
    }
    gsap.to(root.scale, { x: 1.03, y: 1.03, z: 1.03, duration: 0.25, ease: 'power2.out' });

    this.hover = { kind: 'mesh', pick, root, restore };
    this.ui.showHoverTip(pick.label, '', this.pointerPx);
    this.canvas.style.cursor = 'pointer';
  }

  #clearHover() {
    if (!this.hover) return;
    if (this.hover.kind === 'solar') {
      this.bracket.visible = false;
    } else {
      const seen = new Set();
      for (const r of this.hover.restore) {
        if (seen.has(r.mat)) continue;
        seen.add(r.mat);
        r.mat.emissive.setHex(r.e);
        r.mat.emissiveIntensity = r.i;
      }
      gsap.to(this.hover.root.scale, { x: 1, y: 1, z: 1, duration: 0.3, ease: 'power2.out' });
    }
    this.hover = null;
    this.ui.hideHoverTip();
    this.canvas.style.cursor = '';
  }

  #onClick() {
    if (!this.enabled || !this.hover) return;

    if (this.hover.kind === 'solar') {
      const id = this.hover.instanceId;
      const point = this.solarFarm.getInstancePosition(id);
      this.lastFocus = { point, distance: 26 };
      this.ui.showInfoCard(this.solarFarm.getTelemetry(id), () =>
        this.cameraManager.focusOn(point, 26));
      return;
    }

    const pick = this.hover.pick;
    if (pick.kind === 'turbine') {
      this.lastFocus = { point: pick.focus, distance: 55 };
      this.ui.showInfoCard(this.turbines.getTelemetry(pick.index), () =>
        this.cameraManager.focusOn(pick.focus, 55));
    } else {
      this.lastFocus = { point: pick.focus, distance: 30 };
      this.ui.showInfoCard(pick.telemetry, () =>
        this.cameraManager.focusOn(pick.focus, 30));
    }
  }

  /** Called from the main loop — raycast at most once per frame. */
  update() {
    if (!this.enabled || !this.needsCast) return;
    this.needsCast = false;
    this.#onHover(this.#cast());
  }
}
