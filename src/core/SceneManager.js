/**
 * SceneManager — root scene, fog and image-based environment lighting.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { PALETTE } from '../config/settings.js';

export class SceneManager {
  constructor(renderer) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(PALETTE.night);
    this.scene.fog = new THREE.FogExp2(PALETTE.fog, 0.0026);

    // PMREM-filtered studio environment gives PBR surfaces something to
    // reflect at night without washing the scene out.
    const pmrem = new THREE.PMREMGenerator(renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.35;
    pmrem.dispose();
  }

  add(...objects) {
    this.scene.add(...objects);
  }
}
