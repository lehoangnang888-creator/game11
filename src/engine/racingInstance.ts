import * as THREE from 'three';
import { CameraMode, InstanceRuntime, InstanceSeedData, TrackBiome } from '../types';
import { CameraDirector } from './cameraDirector';
import { seedManager } from './scenarioGenerator';
import { GeneratedTrack, TrackGenerator } from './trackGenerator';
import { Car3DObject, VehiclePhysicsSystem } from './vehiclePhysics';

export class RacingInstance {
  public id: number;
  public scene: THREE.Scene;
  public cameraDirector: CameraDirector;
  public track: GeneratedTrack;
  public cars: Car3DObject[] = [];
  public seedData: InstanceSeedData;

  // Runtime info
  public chunkTimeElapsed: number = 0;
  public totalChunkDuration: number = 120; // 2 minutes
  public videoChunkIndex: number = 1;
  public isRecording: boolean = true;
  public status: 'idle' | 'rendering' | 'exporting' | 'recovering' = 'rendering';
  public lastOvertakeCarId: string | null = null;
  public lastCollisionCarId: string | null = null;

  private directionalLight: THREE.DirectionalLight;
  private ambientLight: THREE.AmbientLight;

  constructor(id: number, chunkDuration: number = 120, forcedSeed?: number) {
    this.id = id;
    this.totalChunkDuration = chunkDuration;
    this.scene = new THREE.Scene();
    this.cameraDirector = new CameraDirector(60, 9 / 16);

    this.seedData = seedManager.createScenario(id, forcedSeed);

    // Build Environment
    this.setupEnvironment(this.seedData.biome);
    this.track = TrackGenerator.generateTrack(this.seedData.seed, this.seedData.biome);
    this.scene.add(this.track.trackMesh);
    this.scene.add(this.track.sceneryGroup);

    // Build Cars
    this.seedData.cars.forEach(carState => {
      const car3d = VehiclePhysicsSystem.createCarMesh(carState);
      this.cars.push(car3d);
      this.scene.add(car3d.group);
    });

    // Lights
    this.ambientLight = new THREE.AmbientLight(this.seedData.biome.ambientColor, 1.2);
    this.scene.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, this.seedData.biome.lightIntensity);
    this.directionalLight.position.set(50, 100, 50);
    this.directionalLight.castShadow = true;
    this.scene.add(this.directionalLight);
  }

  private setupEnvironment(biome: TrackBiome) {
    this.scene.background = new THREE.Color(biome.skyColor);
    this.scene.fog = new THREE.FogExp2(biome.fogColor, biome.fogDensity);
  }

  /**
   * Updates physics, AI, and cameras for this specific instance
   */
  update(delta: number, globalAggression: number, autoDirector: boolean): { chunkCompleted: boolean } {
    if (this.status === 'recovering') {
      return { chunkCompleted: false };
    }

    // Advance 2-minute recording chunk timer
    this.chunkTimeElapsed += delta;
    let chunkCompleted = false;

    if (this.chunkTimeElapsed >= this.totalChunkDuration) {
      chunkCompleted = true;
    }

    // Step AI Vehicles
    const { activeOvertakeCarId, collisionCarId } = VehiclePhysicsSystem.updateVehicles(
      this.cars,
      this.track.curve,
      this.track.totalLength,
      delta,
      globalAggression
    );

    this.lastOvertakeCarId = activeOvertakeCarId;
    this.lastCollisionCarId = collisionCarId;

    // Update Camera
    this.cameraDirector.update(this.cars, delta, activeOvertakeCarId, collisionCarId, autoDirector);

    return { chunkCompleted };
  }

  /**
   * Resets simulation with new unique seed when 2-minute video ends
   */
  recycleToNextRace(newDuration?: number) {
    if (newDuration) this.totalChunkDuration = newDuration;
    this.chunkTimeElapsed = 0;
    this.videoChunkIndex += 1;

    // Clean up old cars and track scenery
    this.cars.forEach(c => this.scene.remove(c.group));
    this.cars = [];
    this.scene.remove(this.track.trackMesh);
    this.scene.remove(this.track.sceneryGroup);

    // Generate fresh seed and biome scenario
    this.seedData = seedManager.createScenario(this.id);
    this.setupEnvironment(this.seedData.biome);

    this.track = TrackGenerator.generateTrack(this.seedData.seed, this.seedData.biome);
    this.scene.add(this.track.trackMesh);
    this.scene.add(this.track.sceneryGroup);

    this.seedData.cars.forEach(carState => {
      const car3d = VehiclePhysicsSystem.createCarMesh(carState);
      this.cars.push(car3d);
      this.scene.add(car3d.group);
    });

    // Update lighting
    this.ambientLight.color.setHex(this.seedData.biome.ambientColor);
    this.directionalLight.intensity = this.seedData.biome.lightIntensity;

    this.cameraDirector.currentMode = CameraMode.BEHIND;
    this.cameraDirector.resetFirstFrame();
    this.status = 'rendering';
  }

  /**
   * Error recovery: restarts instance if corrupted or halted
   */
  recover() {
    this.status = 'recovering';
    setTimeout(() => {
      this.recycleToNextRace();
      this.status = 'rendering';
    }, 500);
  }

  getRuntimeState(): InstanceRuntime {
    const leader = this.cars.find(c => c.state.rank === 1) || this.cars[0];

    return {
      id: this.id,
      name: `Instance #${this.id.toString().padStart(2, '0')}`,
      active: true,
      seedData: this.seedData,
      currentCameraMode: this.cameraDirector.currentMode,
      cameraDwellTimer: 0,
      cameraNextSwitchDuration: 5,
      targetCarId: leader ? leader.state.id : '',
      cars: this.cars.map(c => ({ ...c.state })),
      lapLeaderId: leader ? leader.state.id : '',
      isRecording: this.isRecording,
      currentVideoChunkIndex: this.videoChunkIndex,
      chunkTimeElapsed: this.chunkTimeElapsed,
      totalChunkDuration: this.totalChunkDuration,
      fps: 60,
      status: this.status
    };
  }
}
