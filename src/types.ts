export type ResolutionPreset = '1080x1920 (Full HD Dọc)' | '720x1280 (HD Dọc)' | '1440x2560 (2K Dọc)' | '2160x3840 (4K Dọc)' | '1080p (Ngang)' | '720p' | '4K';
export type AspectRatioOption = '9:16' | '16:9';
export type VideoFileFormat = 'mp4' | 'mov';
export type FPSOption = 30 | 60 | 120;
export type VideoDurationPreset = 30 | 60 | 120 | number;

export enum CameraMode {
  BEHIND = 'BEHIND', // 1. Camera phía sau xe
  HOOD = 'HOOD', // 2. Camera phía trước xe (Hood/Cockpit)
  LOW_GROUND = 'LOW_GROUND', // 3. Camera góc thấp sát mặt đường
  SIDE_PROFILE = 'SIDE_PROFILE', // 4. Camera bên hông
  FLYCAM = 'FLYCAM', // 5. Camera góc flycam (Drone chase)
  PANORAMIC = 'PANORAMIC', // 6. Camera quay toàn cảnh
  LEADER_TRACKING = 'LEADER_TRACKING', // 7. Camera bám theo xe dẫn đầu
  OVERTAKE_ACTION = 'OVERTAKE_ACTION', // 8. Camera bám theo xe đang vượt
  COLLISION_DRIFT = 'COLLISION_DRIFT', // 9. Camera quay cảnh va chạm/drift
  CINEMATIC_ORBIT = 'CINEMATIC_ORBIT', // 10. Camera cinematic ngẫu nhiên
}

export interface TrackBiome {
  id: string;
  name: string;
  skyColor: number;
  groundColor: number;
  trackColor: number;
  kerbColor1: number;
  kerbColor2: number;
  fogColor: number;
  fogDensity: number;
  lightIntensity: number;
  ambientColor: number;
  theme: 'neon_cyber' | 'sunset_canyon' | 'alpine_snow' | 'midnight_highway' | 'desert_oasis';
}

export interface AICarState {
  id: string;
  name: string;
  color: string;
  hexColor: number;
  type: 'hypercar' | 'muscle' | 'formula' | 'gt_racer' | 'cyber_coupe';
  speed: number;
  targetSpeed: number;
  maxSpeed: number;
  acceleration: number;
  lap: number;
  lapProgress: number; // 0 to 1 along track
  lateralOffset: number; // offset from track center line (-1.0 to 1.0)
  targetLateralOffset: number;
  steerAngle: number;
  rank: number;
  aggression: number;
  isDrifting: boolean;
  driftAngle: number;
  collisionCooldown: number;
  meshIndex: number;
}

export interface InstanceSeedData {
  seed: number;
  instanceId: number;
  biome: TrackBiome;
  weather: 'Sunny' | 'Overcast' | 'Night' | 'Neon' | 'Sunset';
  carCount: number;
  cars: AICarState[];
  aiAggressionBase: number;
  createdAt: string;
}

export interface InstanceRuntime {
  id: number;
  name: string;
  active: boolean;
  seedData: InstanceSeedData;
  currentCameraMode: CameraMode;
  cameraDwellTimer: number;
  cameraNextSwitchDuration: number;
  targetCarId: string;
  cars: AICarState[];
  lapLeaderId: string;
  isRecording: boolean;
  currentVideoChunkIndex: number;
  chunkTimeElapsed: number; // seconds into current 2-minute cycle
  totalChunkDuration: number; // 120 seconds default
  fps: number;
  status: 'idle' | 'rendering' | 'exporting' | 'recovering';
  errorMessage?: string;
}

export interface VideoRecordJob {
  id: string;
  instanceId: number;
  videoNumber: number;
  fileName: string;
  url: string;
  blob?: Blob;
  sizeMB: number;
  durationSeconds: number;
  timestamp: string;
  seed: number;
  biomeName: string;
  winnerCar: string;
  topSpeedKmh: number;
  resolution: ResolutionPreset;
  fps: number;
}

export interface SystemConfig {
  instanceCount: 1 | 2 | 4 | 6 | 8 | 10;
  resolution: ResolutionPreset;
  aspectRatio: AspectRatioOption;
  fileFormat: VideoFileFormat;
  fps: FPSOption;
  durationSeconds: number; // 120 for 2 mins
  saveDirectory: string;
  autoExportToDisk: boolean;
  codec: 'video/webm;codecs=vp9' | 'video/mp4;codecs=avc1' | 'video/webm';
  aiAggressionGlobal: number; // 0.2 - 1.0
  cinematicAutoDirector: boolean;
}

export interface SystemHardwareStats {
  engineFPS: number;
  cpuUsagePct: number;
  gpuUsagePct: number;
  ramUsageMB: number;
  ramTotalMB: number;
  diskFreeGB: number;
  totalVideosCreated: number;
  systemUptimeSeconds: number;
}

export interface LogMessage {
  id: string;
  timestamp: string;
  instanceId?: number;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
}
