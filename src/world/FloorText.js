/**
 * FloorText — engraved metallic capacity labels set into the concrete
 * apron, with thin outline frames and glowing underlines, mirroring
 * the reference dashboard's floor typography.
 */
import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { PALETTE } from '../config/settings.js';
// Bundled with the three package — no network fetch, version-locked.
import fontData from 'three/examples/fonts/helvetiker_bold.typeface.json';

const metalMat = new THREE.MeshStandardMaterial({
  color: PALETTE.textMetal,
  metalness: 0.9,
  roughness: 0.32,
  envMapIntensity: 1.4,
});
const frameMat = new THREE.MeshStandardMaterial({
  color: 0x6c737e,
  metalness: 0.85,
  roughness: 0.4,
});

export class FloorText {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'floor-text';
    this.#build();
  }

  #build() {
    const font = new FontLoader().parse(fontData);

    // ── TOTAL POWER CAPACITY / 86.7 GW ──
    this.#addFrame(56, -10, 74, 26);
    this.#addText(font, 'TOTAL POWER CAPACITY', { x: 56, z: -17, size: 3.4 });
    this.#addText(font, '86.7 GW', { x: 56, z: -6.5, size: 8 });

    // ── SOLAR 26 GW ──
    this.#addFrame(35, 16, 34, 22);
    this.#addText(font, 'SOLAR', { x: 35, z: 11, size: 3 });
    this.#addText(font, '26 GW', { x: 35, z: 20, size: 6 });
    this.#addUnderline(35, 25.5, 17, PALETTE.flowBlue);

    // ── WIND 30.7 GW ──
    this.#addFrame(79, 16, 40, 22);
    this.#addText(font, 'WIND', { x: 79, z: 11, size: 3 });
    this.#addText(font, '30.7 GW', { x: 79, z: 20, size: 6 });
    this.#addUnderline(79, 25.5, 21, PALETTE.flowBlue);

    // ── 30 GW BY 2030 ──
    this.#addFrame(56, 42, 74, 15);
    this.#addText(font, '30 GW BY 2030', { x: 56, z: 44.5, size: 6.4 });
  }

  /** Extruded metallic text lying flat, centred on (x, z). */
  #addText(font, text, { x, z, size }) {
    const geo = new TextGeometry(text, {
      font,
      size,
      depth: 0.22,
      curveSegments: 5,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.04,
      bevelSegments: 2,
    });
    geo.computeBoundingBox();
    const bb = geo.boundingBox;
    // Centre in XY (text plane), then lay flat: text Y → world -Z
    geo.translate(-(bb.max.x + bb.min.x) / 2, -(bb.max.y + bb.min.y) / 2, 0);
    geo.rotateX(-Math.PI / 2);

    const mesh = new THREE.Mesh(geo, metalMat);
    mesh.position.set(x, 0.04, z);
    mesh.receiveShadow = true;
    this.group.add(mesh);
  }

  /** Thin rectangular outline frame with cut corners. */
  #addFrame(x, z, w, h) {
    const t = 0.28; // frame bar thickness
    const cut = 2.2; // corner cut length
    const outer = new THREE.Shape();
    outer.moveTo(-w / 2 + cut, -h / 2);
    outer.lineTo(w / 2 - cut, -h / 2);
    outer.lineTo(w / 2, -h / 2 + cut);
    outer.lineTo(w / 2, h / 2 - cut);
    outer.lineTo(w / 2 - cut, h / 2);
    outer.lineTo(-w / 2 + cut, h / 2);
    outer.lineTo(-w / 2, h / 2 - cut);
    outer.lineTo(-w / 2, -h / 2 + cut);
    outer.closePath();

    const iw = w - t * 2, ih = h - t * 2, icut = cut - t * 0.5;
    const hole = new THREE.Path();
    hole.moveTo(-iw / 2 + icut, -ih / 2);
    hole.lineTo(iw / 2 - icut, -ih / 2);
    hole.lineTo(iw / 2, -ih / 2 + icut);
    hole.lineTo(iw / 2, ih / 2 - icut);
    hole.lineTo(iw / 2 - icut, ih / 2);
    hole.lineTo(-iw / 2 + icut, ih / 2);
    hole.lineTo(-iw / 2, ih / 2 - icut);
    hole.lineTo(-iw / 2, -ih / 2 + icut);
    hole.closePath();
    outer.holes.push(hole);

    const geo = new THREE.ShapeGeometry(outer);
    geo.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(geo, frameMat);
    mesh.position.set(x, 0.05, z);
    this.group.add(mesh);
  }

  /** Emissive accent underline (blue glow under SOLAR/WIND values). */
  #addUnderline(x, z, w, colorHex) {
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(colorHex).multiplyScalar(1.6),
      toneMapped: false,
    });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, 0.34), mat);
    mesh.position.set(x, 0.07, z);
    this.group.add(mesh);
  }
}
