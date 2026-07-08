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

/** Helper to create a soft, round glowing texture for stars. */
function createStarTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 16;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
  g.addColorStop(0, 'rgba(255, 255, 255, 1)');
  g.addColorStop(0.35, 'rgba(255, 255, 255, 0.7)');
  g.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 16, 16);
  return new THREE.CanvasTexture(canvas);
}

/** Helper to create a detailed moon texture with cyan glow corona and craters. */
function createMoonTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  
  // 1. Cyan/Blue outer corona glow
  let g = ctx.createRadialGradient(64, 64, 20, 64, 64, 64);
  g.addColorStop(0, 'rgba(215, 235, 255, 1)');
  g.addColorStop(0.35, 'rgba(140, 190, 255, 0.65)');
  g.addColorStop(0.65, 'rgba(90, 140, 255, 0.18)');
  g.addColorStop(1, 'rgba(90, 140, 255, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  
  // 2. Moon solid disk clip
  ctx.save();
  ctx.beginPath();
  ctx.arc(64, 64, 26, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  
  // Base moon surface color
  ctx.fillStyle = '#f2f6ff';
  ctx.fillRect(0, 0, 128, 128);
  
  // Crater overlays
  ctx.fillStyle = 'rgba(135, 165, 205, 0.28)';
  const craters = [
    [54, 52, 6], [74, 58, 8], [60, 76, 5], [48, 68, 7], 
    [72, 72, 4], [52, 44, 4], [80, 50, 5], [64, 64, 10]
  ];
  for (const [cx, cy, cr] of craters) {
    ctx.beginPath();
    ctx.arc(cx, cy, cr, 0, Math.PI * 2);
    ctx.fill();
    
    // Sub-crater highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.beginPath();
    ctx.arc(cx + cr * 0.2, cy - cr * 0.2, cr * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(135, 165, 205, 0.28)';
  }
  
  ctx.restore();
  return new THREE.CanvasTexture(canvas);
}

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

    // Create Starry sky
    const starVertices = [];
    const starCount = 1200;
    for (let i = 0; i < starCount; i++) {
      const uVal = Math.random();
      const vVal = Math.random();
      const theta = uVal * 2.0 * Math.PI;
      const phi = Math.acos(vVal); // Upper hemisphere only
      const r = 2600; // far background
      
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.cos(phi);
      const z = r * Math.sin(phi) * Math.sin(theta);
      starVertices.push(x, y, z);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    
    this.starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 11,
      map: createStarTexture(),
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.stars = new THREE.Points(starGeo, this.starMat);
    scene.add(this.stars);

    // Create Moon
    this.moonMat = new THREE.MeshBasicMaterial({
      map: createMoonTexture(),
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.moon = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), this.moonMat);
    scene.add(this.moon);

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

    // — Stars & Moon visibility and animation —
    // t goes 0 (night) to 1 (day)
    this.starMat.opacity = (1 - t) * 0.85;
    this.moonMat.opacity = (1 - t) * 0.95;
    this.stars.visible = this.starMat.opacity > 0.01;
    this.moon.visible = this.moonMat.opacity > 0.01;

    // Position moon opposite the sun direction
    if (this.moon.visible) {
      this.moon.position.copy(this.sunDir).multiplyScalar(-1800);
      this.moon.lookAt(0, 0, 0);
    }

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
