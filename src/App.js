/**
 * App — composition root. Builds every manager, assembles the world,
 * runs the render loop and routes UI events into the 3D scene.
 */
import * as THREE from 'three';
import { RendererManager } from './core/RendererManager.js';
import { SceneManager } from './core/SceneManager.js';
import { CameraManager } from './core/CameraManager.js';
import { LightingManager } from './core/LightingManager.js';
import { PostProcessingManager } from './core/PostProcessingManager.js';
import { Ground } from './world/Ground.js';
import { SolarFarm } from './world/SolarFarm.js';
import { WindTurbines } from './world/WindTurbines.js';
import { Structures } from './world/Structures.js';
import { PowerFlow } from './world/PowerFlow.js';
import { FloorText } from './world/FloorText.js';
import { SelectionManager } from './interaction/SelectionManager.js';
import { UIManager } from './ui/UIManager.js';

export class App {
  constructor() {
    this.canvas = document.getElementById('scene-canvas');
    this.ui = new UIManager();
    this.clock = new THREE.Clock();

    // — Core —
    this.ui.setProgress(0.1);
    this.rendererMgr = new RendererManager(this.canvas);
    this.sceneMgr = new SceneManager(this.rendererMgr.renderer);
    this.cameraMgr = new CameraManager(this.canvas);
    this.lighting = new LightingManager(this.sceneMgr.scene);
    this.ui.setProgress(0.3);

    // — World —
    this.ground = new Ground();
    this.ui.setProgress(0.5);
    this.solarFarm = new SolarFarm();
    this.turbines = new WindTurbines();
    this.ui.setProgress(0.7);
    this.structures = new Structures();
    this.powerFlow = new PowerFlow();
    this.floorText = new FloorText();
    this.sceneMgr.add(
      this.ground.group,
      this.solarFarm.group,
      this.turbines.group,
      this.structures.group,
      this.powerFlow.group,
      this.floorText.group,
    );
    this.ui.setProgress(0.85);

    // — Post & interaction —
    this.postFX = new PostProcessingManager(
      this.rendererMgr.renderer, this.sceneMgr.scene, this.cameraMgr.camera,
    );
    this.selection = new SelectionManager({
      canvas: this.canvas,
      camera: this.cameraMgr.camera,
      cameraManager: this.cameraMgr,
      solarFarm: this.solarFarm,
      turbines: this.turbines,
      structures: this.structures,
      ui: this.ui,
    });
    this.sceneMgr.add(this.selection.bracket);
    this.ui.setProgress(1);

    this.#wireUI();
    window.addEventListener('resize', () => this.#resize());

    // Warm-up render (compiles shaders) before revealing anything
    this.rendererMgr.renderer.compile(this.sceneMgr.scene, this.cameraMgr.camera);
    this.#start();
  }

  #start() {
    this.rendererMgr.renderer.setAnimationLoop(() => this.#tick());
    // Small delay lets the first frames settle, then reveal + fly in
    setTimeout(() => {
      this.ui.reveal();
      this.cameraMgr.flyIn(() => {
        this.selection.enabled = true;
      });
    }, 350);
  }

  #wireUI() {
    this.ui.on({
      onTool: (tool) => {
        switch (tool) {
          case 'select':
          case 'rotate':
          case 'pan':
            this.cameraMgr.setMode(tool);
            break;
          case 'zoom-in': this.cameraMgr.zoomBy(0.72); break;
          case 'zoom-out': this.cameraMgr.zoomBy(1.38); break;
          case 'reset':
            this.cameraMgr.resetView();
            this.ui.hideInfoCard();
            break;
        }
      },
      onToggle: (id, value) => {
        switch (id) {
          case 'bloom': this.postFX.setBloom(value); break;
          case 'ssao': this.postFX.setSSAO(value); break;
          case 'shadows': this.rendererMgr.setShadows(value); break;
          case 'autorotate': this.cameraMgr.controls.autoRotate = value; break;
          case 'flow': this.powerFlow.setEnabled(value); break;
        }
      },
    });
  }

  #tick() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const elapsed = this.clock.elapsedTime;

    this.turbines.update(dt, elapsed);
    this.structures.update(elapsed);
    this.powerFlow.update(dt);
    this.selection.update();
    this.cameraMgr.update();
    this.postFX.render(dt);
  }

  #resize() {
    this.cameraMgr.resize();
    this.rendererMgr.resize();
    this.postFX.resize();
  }
}
