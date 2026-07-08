/**
 * DayNightCycle — physically-styled sky dome (three.js Sky), a sun that
 * travels with the time-of-day slider, and coordinated grading of every
 * light, fog, exposure and bloom threshold so the facility reads
 * correctly from midnight to noon.
 *
 * The single shadow-casting DirectionalLight doubles as sun and moon:
 * it follows the sun by day and returns to the fixed moon position by
 * night, cross-fading colour and intensity through twilight.
 */
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { PALETTE, QUALITY } from '../config/settings.js';

const NIGHT = {
  fog: new THREE.Color(PALETTE.fog),
  fogDensity: 0.0026,
  background: new THREE.Color(PALETTE.night),
  key: { color: new THREE.Color(0xbfd4ff), intensity: 1.9, pos: new THREE.Vector3(-90, 160, 60) },
  hemiSky: new THREE.Color(0x33477a),
  hemiGround: new THREE.Color(0x0b0e14),
  hemiIntensity: 0.75,
  ambient: 1.15,
  exposure: 1.3,
  envIntensity: 0.35,
  bloomStrength: QUALITY.bloom.strength,
  bloomThreshold: QUALITY.bloom.threshold,
};

const DAY = {
  fog: new THREE.Color(0xbdcde2),
  fogDensity: 0.00055, // just enough to haze the horizon, not the site
  key: { color: new THREE.Color(0xfff1d6), intensity: 3.6 },
  hemiSky: new THREE.Color(0x9dc2ff),
  hemiGround: new THREE.Color(0x3d4148),
  hemiIntensity: 1.0,
  ambient: 0.55,
  exposure: 1.0,
  envIntensity: 0.9,
  bloomStrength: 0.32,
  bloomThreshold: 1.5,
};

const WATER_NIGHT = new THREE.Color(PALETTE.water);
const WATER_DAY = new THREE.Color(0x33516e);

export class DayNightCycle {
  constructor({ scene, lighting, renderer, postFX, ground }) {
    this.scene = scene;
    this.lighting = lighting;
    this.renderer = renderer;
    this.postFX = postFX;
    this.ground = ground;

    this.sky = new Sky();
    this.sky.scale.setScalar(3000);
    const u = this.sky.material.uniforms;
    u.turbidity.value = 4;
    u.rayleigh.value = 1.3;
    u.mieCoefficient.value = 0.004;
    u.mieDirectionalG.value = 0.85;
    scene.add(this.sky);

    this.sunDir = new THREE.Vector3();
    this.setHour(21); // matches the original nighttime look
  }

  /**
   * @param {number} hour 0–24 local time
   */
  setHour(hour) {
    this.hour = hour;

    // Sun elevation follows a sine day-arc: −62° at midnight, +62° at noon
    const elevDeg = Math.sin(((hour - 6) / 12) * Math.PI) * 62;
    const azimDeg = (hour - 12) * 15 + 180; // east at 06:00 → west at 18:00
    const phi = THREE.MathUtils.degToRad(90 - elevDeg);
    const theta = THREE.MathUtils.degToRad(azimDeg);
    this.sunDir.setFromSphericalCoords(1, phi, theta);
    this.sky.material.uniforms.sunPosition.value.copy(this.sunDir);

    // 0 = deep night · 1 = full day, with twilight between −6° and +12°
    const t = THREE.MathUtils.smoothstep(elevDeg, -6, 12);

    // Sky dome only earns its draw call once any twilight is visible
    this.sky.visible = elevDeg > -9;

    // — Fog & background —
    this.scene.fog.color.copy(NIGHT.fog).lerp(DAY.fog, t);
    this.scene.fog.density = THREE.MathUtils.lerp(NIGHT.fogDensity, DAY.fogDensity, t);
    this.scene.background = NIGHT.background; // visible only when sky is hidden

    // — Key light: moon by night, sun by day —
    const key = this.lighting.moon;
    key.color.copy(NIGHT.key.color).lerp(DAY.key.color, t);
    key.intensity = THREE.MathUtils.lerp(NIGHT.key.intensity, DAY.key.intensity, t);
    if (t > 0.01) {
      key.position.copy(this.sunDir).multiplyScalar(220).max(new THREE.Vector3(-999, 30, -999));
    } else {
      key.position.copy(NIGHT.key.pos);
    }

    // — Fill lights —
    this.lighting.hemi.color.copy(NIGHT.hemiSky).lerp(DAY.hemiSky, t);
    this.lighting.hemi.groundColor.copy(NIGHT.hemiGround).lerp(DAY.hemiGround, t);
    this.lighting.hemi.intensity = THREE.MathUtils.lerp(NIGHT.hemiIntensity, DAY.hemiIntensity, t);
    this.lighting.ambient.intensity = THREE.MathUtils.lerp(NIGHT.ambient, DAY.ambient, t);

    // Site floodlights switch off as the sun rises
    this.lighting.floods.forEach((f, i) => {
      f.intensity = this.lighting.floodBaseIntensity[i] * (1 - t);
    });

    // — Water: ink-black mirror at night, steel-blue sea by day —
    this.ground.waterMat.color.copy(WATER_NIGHT).lerp(WATER_DAY, t);
    this.ground.waterMat.roughness = THREE.MathUtils.lerp(0.48, 0.34, t);

    // — Grading: exposure, reflections, bloom discipline in daylight —
    this.renderer.toneMappingExposure = THREE.MathUtils.lerp(NIGHT.exposure, DAY.exposure, t);
    this.scene.environmentIntensity = THREE.MathUtils.lerp(NIGHT.envIntensity, DAY.envIntensity, t);
    this.postFX.bloomPass.strength = THREE.MathUtils.lerp(NIGHT.bloomStrength, DAY.bloomStrength, t);
    this.postFX.bloomPass.threshold = THREE.MathUtils.lerp(NIGHT.bloomThreshold, DAY.bloomThreshold, t);
  }
}
