/**
 * CameraManager — perspective camera, orbit controls, the cinematic
 * fly-in, focus-on-object animation and toolbar view actions.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import gsap from 'gsap';
import { CAMERA } from '../config/settings.js';

export class CameraManager {
  constructor(canvas) {
    this.camera = new THREE.PerspectiveCamera(
      CAMERA.fov, window.innerWidth / window.innerHeight, 0.5, 1600,
    );
    this.camera.position.copy(CAMERA.flyFrom);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.target.copy(CAMERA.target);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.minDistance = CAMERA.minDistance;
    this.controls.maxDistance = CAMERA.maxDistance;
    // Clamp polar angle to preserve the isometric feel and avoid flipping
    this.controls.minPolarAngle = CAMERA.minPolar;
    this.controls.maxPolarAngle = CAMERA.maxPolar;
    this.controls.enablePan = true;
    this.controls.panSpeed = 0.9;
    this.controls.rotateSpeed = 0.55;
    this.controls.autoRotateSpeed = 0.5;
    this.controls.enabled = false; // unlocked after the fly-in
    this.controls.update();
  }

  /** Cinematic approach from far above, then hand control to the user. */
  flyIn(onComplete) {
    const cam = this.camera.position;
    gsap.to(cam, {
      x: CAMERA.home.x, y: CAMERA.home.y, z: CAMERA.home.z,
      duration: 4.2,
      ease: 'power3.inOut',
      onUpdate: () => this.controls.update(),
      onComplete: () => {
        this.controls.enabled = true;
        onComplete?.();
      },
    });
  }

  /** Smoothly frame a world position (double-click / "Focus camera"). */
  focusOn(point, distance = 42) {
    const dir = this.camera.position.clone().sub(this.controls.target).normalize();
    const dest = point.clone().add(dir.multiplyScalar(distance));
    dest.y = Math.max(dest.y, 18);
    gsap.to(this.controls.target, {
      x: point.x, y: point.y, z: point.z,
      duration: 1.4, ease: 'power2.inOut',
    });
    gsap.to(this.camera.position, {
      x: dest.x, y: dest.y, z: dest.z,
      duration: 1.4, ease: 'power2.inOut',
      onUpdate: () => this.controls.update(),
    });
  }

  resetView() {
    gsap.to(this.controls.target, {
      x: CAMERA.target.x, y: CAMERA.target.y, z: CAMERA.target.z,
      duration: 1.5, ease: 'power2.inOut',
    });
    gsap.to(this.camera.position, {
      x: CAMERA.home.x, y: CAMERA.home.y, z: CAMERA.home.z,
      duration: 1.5, ease: 'power2.inOut',
      onUpdate: () => this.controls.update(),
    });
  }

  /** Animated dolly along the view direction. factor < 1 zooms in. */
  zoomBy(factor) {
    const offset = this.camera.position.clone().sub(this.controls.target);
    const len = THREE.MathUtils.clamp(
      offset.length() * factor,
      this.controls.minDistance,
      this.controls.maxDistance,
    );
    const dest = this.controls.target.clone().add(offset.normalize().multiplyScalar(len));
    gsap.to(this.camera.position, {
      x: dest.x, y: dest.y, z: dest.z,
      duration: 0.6, ease: 'power2.out',
      onUpdate: () => this.controls.update(),
    });
  }

  /** Toolbar mode: 'select' | 'pan' | 'rotate'. */
  setMode(mode) {
    const MB = THREE.MOUSE;
    if (mode === 'pan') {
      this.controls.mouseButtons = { LEFT: MB.PAN, MIDDLE: MB.DOLLY, RIGHT: MB.ROTATE };
      this.controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE };
    } else {
      this.controls.mouseButtons = { LEFT: MB.ROTATE, MIDDLE: MB.DOLLY, RIGHT: MB.PAN };
      this.controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
    }
  }

  update() {
    this.controls.update();
  }

  resize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }
}
