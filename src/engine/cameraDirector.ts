import * as THREE from 'three';
import { CameraMode } from '../types';
import { Car3DObject } from './vehiclePhysics';

export class CameraDirector {
  public currentMode: CameraMode = CameraMode.BEHIND;
  public camera: THREE.PerspectiveCamera;
  private currentTargetCarId: string = '';
  private dwellTimer: number = 0;
  private nextSwitchTime: number = 5.0; // 4 to 8 seconds
  private orbitAngle: number = 0;

  // Smoothing buffers for cinematic movement
  private smoothedCamPos: THREE.Vector3 = new THREE.Vector3(0, 10, 20);
  private smoothedLookTarget: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private isFirstFrame: boolean = true;

  constructor(fov: number = 60, aspect: number = 16 / 9) {
    this.camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 1000);
  }

  setCameraMode(mode: CameraMode) {
    this.currentMode = mode;
    this.dwellTimer = 0;
  }

  resetFirstFrame() {
    this.isFirstFrame = true;
  }

  update(
    cars: Car3DObject[],
    delta: number,
    activeOvertakeCarId: string | null,
    collisionCarId: string | null,
    autoDirectorEnabled: boolean = true
  ): CameraMode {
    if (cars.length === 0) return this.currentMode;

    this.dwellTimer += delta;
    this.orbitAngle += delta * 0.45;

    // Determine Leader (P1)
    const leaderCar = cars.find(c => c.state.rank === 1) || cars[0];

    // Priority event-driven director switches
    if (autoDirectorEnabled) {
      if (collisionCarId && this.dwellTimer > 3.0) {
        this.currentMode = CameraMode.COLLISION_DRIFT;
        this.currentTargetCarId = collisionCarId;
        this.dwellTimer = 0;
        this.nextSwitchTime = 4.5;
      } else if (activeOvertakeCarId && this.dwellTimer > 3.5) {
        this.currentMode = CameraMode.OVERTAKE_ACTION;
        this.currentTargetCarId = activeOvertakeCarId;
        this.dwellTimer = 0;
        this.nextSwitchTime = 5.0;
      } else if (this.dwellTimer >= this.nextSwitchTime) {
        // Automatic periodic cinematic shift
        this.cycleNextCinematicMode();
        this.dwellTimer = 0;
        this.nextSwitchTime = 4.5 + Math.random() * 4.0; // 4.5 to 8.5 seconds dwell
      }
    }

    // Select target car based on mode
    let targetCar = cars.find(c => c.state.id === this.currentTargetCarId);
    if (!targetCar || this.currentMode === CameraMode.LEADER_TRACKING) {
      targetCar = leaderCar;
      this.currentTargetCarId = targetCar.state.id;
    }

    // Compute ideal camera position and look-at target for each mode
    const idealPos = new THREE.Vector3();
    const lookTarget = new THREE.Vector3();

    const carPos = targetCar.group.position;
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(targetCar.group.quaternion).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(forward, up).normalize();

    switch (this.currentMode) {
      case CameraMode.BEHIND: {
        // 1. Camera phía sau xe
        const distance = 8.5 + (targetCar.state.speed / 300) * 2.0;
        idealPos.copy(carPos).addScaledVector(forward, -distance).addScaledVector(up, 3.2);
        lookTarget.copy(carPos).addScaledVector(forward, 6.0).addScaledVector(up, 1.2);
        break;
      }

      case CameraMode.HOOD: {
        // 2. Camera phía trước xe (Hood/Cockpit view)
        idealPos.copy(carPos).addScaledVector(forward, 1.2).addScaledVector(up, 1.3);
        lookTarget.copy(carPos).addScaledVector(forward, 25.0).addScaledVector(up, 1.2);
        break;
      }

      case CameraMode.LOW_GROUND: {
        // 3. Camera góc thấp sát mặt đường
        idealPos.copy(carPos).addScaledVector(forward, -4.5).addScaledVector(right, 2.2).addScaledVector(up, 0.45);
        lookTarget.copy(carPos).addScaledVector(forward, 3.5).addScaledVector(up, 0.8);
        break;
      }

      case CameraMode.SIDE_PROFILE: {
        // 4. Camera bên hông
        idealPos.copy(carPos).addScaledVector(right, 4.5).addScaledVector(forward, -0.5).addScaledVector(up, 1.4);
        lookTarget.copy(carPos).addScaledVector(forward, 1.5).addScaledVector(up, 1.0);
        break;
      }

      case CameraMode.FLYCAM: {
        // 5. Camera góc flycam (Drone chase)
        idealPos.copy(carPos).addScaledVector(forward, -14.0).addScaledVector(up, 12.0);
        lookTarget.copy(carPos).addScaledVector(forward, 4.0);
        break;
      }

      case CameraMode.PANORAMIC: {
        // 6. Camera quay toàn cảnh (Grandstand / Crane elevated view)
        idealPos.set(carPos.x + 28, carPos.y + 20, carPos.z + 28);
        lookTarget.copy(carPos).addScaledVector(forward, 2.0);
        break;
      }

      case CameraMode.LEADER_TRACKING: {
        // 7. Camera bám theo xe dẫn đầu
        idealPos.copy(leaderCar.group.position).addScaledVector(forward, -9.0).addScaledVector(up, 4.0);
        lookTarget.copy(leaderCar.group.position).addScaledVector(up, 1.2);
        break;
      }

      case CameraMode.OVERTAKE_ACTION: {
        // 8. Camera bám theo xe đang vượt
        idealPos.copy(carPos).addScaledVector(right, -3.2).addScaledVector(forward, -4.0).addScaledVector(up, 1.8);
        lookTarget.copy(carPos).addScaledVector(forward, 8.0).addScaledVector(up, 1.0);
        break;
      }

      case CameraMode.COLLISION_DRIFT: {
        // 9. Camera quay cảnh va chạm / drift
        const sideOffset = targetCar.state.isDrifting ? 4.0 : 3.0;
        idealPos.copy(carPos).addScaledVector(right, sideOffset).addScaledVector(forward, 2.0).addScaledVector(up, 1.2);
        lookTarget.copy(carPos).addScaledVector(up, 0.8);
        break;
      }

      case CameraMode.CINEMATIC_ORBIT:
      default: {
        // 10. Camera cinematic ngẫu nhiên (Smooth revolving orbit)
        const radius = 9.0;
        const oX = Math.cos(this.orbitAngle) * radius;
        const oZ = Math.sin(this.orbitAngle) * radius;
        idealPos.copy(carPos).add(new THREE.Vector3(oX, 3.5 + Math.sin(this.orbitAngle * 2) * 1.5, oZ));
        lookTarget.copy(carPos).addScaledVector(up, 1.2);
        break;
      }
    }

    // Smooth camera damping for broadcast cinematic feel
    // High-speed camera rumble/vibration for intense speed sensation (> 280 km/h)
    const currentSpeed = targetCar.state.speed || 0;
    if (currentSpeed > 280) {
      const rumble = Math.min(0.22, (currentSpeed - 280) / 500);
      idealPos.x += (Math.random() - 0.5) * rumble;
      idealPos.y += (Math.random() - 0.5) * rumble * 0.7;
    }

    if (this.isFirstFrame) {
      this.smoothedCamPos.copy(idealPos);
      this.smoothedLookTarget.copy(lookTarget);
      this.isFirstFrame = false;
    } else {
      const smoothFactor = Math.min(1.0, delta * 6.5);
      this.smoothedCamPos.lerp(idealPos, smoothFactor);
      this.smoothedLookTarget.lerp(lookTarget, smoothFactor);
    }

    // Dynamic Speed FOV expansion (Warp Speed effect: 58 deg idle up to 82 deg at 400+ km/h)
    const targetFov = 58 + Math.min(24, (currentSpeed / 420) * 24);
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, Math.min(1.0, delta * 5.0));
    this.camera.updateProjectionMatrix();

    this.camera.position.copy(this.smoothedCamPos);
    this.camera.lookAt(this.smoothedLookTarget);

    return this.currentMode;
  }

  private cycleNextCinematicMode() {
    const modes = [
      CameraMode.BEHIND,
      CameraMode.HOOD,
      CameraMode.LOW_GROUND,
      CameraMode.FLYCAM,
      CameraMode.SIDE_PROFILE,
      CameraMode.LEADER_TRACKING,
      CameraMode.CINEMATIC_ORBIT,
      CameraMode.PANORAMIC
    ];

    // Pick a different mode
    let next: CameraMode;
    do {
      next = modes[Math.floor(Math.random() * modes.length)];
    } while (next === this.currentMode && modes.length > 1);

    this.currentMode = next;
  }
}
