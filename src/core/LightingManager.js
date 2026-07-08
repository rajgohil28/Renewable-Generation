/**
 * LightingManager — premium nighttime rig: cool moonlight key with soft
 * shadows, hemisphere fill, and warm site floodlights.
 */
import * as THREE from 'three';
import { QUALITY } from '../config/settings.js';

export class LightingManager {
  constructor(scene) {
    // Ambient floor so blacks never crush completely
    this.ambient = new THREE.AmbientLight(0x1c2740, 1.15);
    scene.add(this.ambient);

    // Sky/ground bounce — cold blue sky, faint asphalt bounce
    const hemi = new THREE.HemisphereLight(0x33477a, 0x0b0e14, 0.75);
    scene.add(hemi);
    this.hemi = hemi;

    // Moonlight key — the single shadow caster
    const moon = new THREE.DirectionalLight(0xbfd4ff, 1.9);
    moon.position.set(-90, 160, 60);
    moon.castShadow = true;
    moon.shadow.mapSize.set(QUALITY.shadowMapSize, QUALITY.shadowMapSize);
    moon.shadow.camera.near = 40;
    moon.shadow.camera.far = 420;
    const S = 150;
    moon.shadow.camera.left = -S;
    moon.shadow.camera.right = S;
    moon.shadow.camera.top = S;
    moon.shadow.camera.bottom = -S;
    moon.shadow.bias = -0.0006;
    moon.shadow.normalBias = 0.6;
    moon.shadow.radius = 5;
    scene.add(moon);
    this.moon = moon;

    // Rim/backlight to lift silhouettes against the dark water
    const rim = new THREE.DirectionalLight(0x2a55b0, 0.5);
    rim.position.set(140, 60, -120);
    scene.add(rim);

    // Warm sodium floodlights near the facility core (faded out by day)
    const flood1 = new THREE.PointLight(0xffb45e, 260, 90, 2);
    flood1.position.set(14, 16, 10);

    const flood2 = new THREE.PointLight(0x6fa8ff, 200, 80, 2);
    flood2.position.set(-46, 14, -2);

    const flood3 = new THREE.PointLight(0xffb45e, 160, 70, 2);
    flood3.position.set(64, 12, 30);

    this.floods = [flood1, flood2, flood3];
    this.floodBaseIntensity = this.floods.map((f) => f.intensity);
    scene.add(...this.floods);
  }
}
