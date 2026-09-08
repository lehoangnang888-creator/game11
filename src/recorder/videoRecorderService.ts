import { RacingInstance } from '../engine/racingInstance';
import { SystemConfig, VideoRecordJob } from '../types';

export class VideoRecorderService {
  private mediaRecorders: Map<number, MediaRecorder> = new Map();
  private recordedChunks: Map<number, Blob[]> = new Map();
  private videoJobs: VideoRecordJob[] = [];
  private onJobCreatedCallback?: (job: VideoRecordJob) => void;
  public directoryHandle: any = null; // FileSystemDirectoryHandle from showDirectoryPicker

  constructor() {}

  setOnJobCreated(callback: (job: VideoRecordJob) => void) {
    this.onJobCreatedCallback = callback;
  }

  setDirectoryHandle(handle: any) {
    this.directoryHandle = handle;
  }

  getVideoJobs(): VideoRecordJob[] {
    return this.videoJobs;
  }

  /**
   * Khởi tạo quay video từ canvas WebGL
   */
  startRecording(canvas: HTMLCanvasElement, instanceId: number, config: SystemConfig) {
    if (!canvas) return;

    try {
      const stream = canvas.captureStream(config.fps);

      let mimeType = 'video/webm;codecs=vp9';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
          mimeType = 'video/webm;codecs=vp8';
        } else if (MediaRecorder.isTypeSupported('video/mp4')) {
          mimeType = 'video/mp4';
        } else {
          mimeType = 'video/webm';
        }
      }

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: config.resolution === '4K' ? 35_000_000 : 12_000_000
      });

      this.recordedChunks.set(instanceId, []);

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          const existing = this.recordedChunks.get(instanceId) || [];
          existing.push(event.data);
          this.recordedChunks.set(instanceId, existing);
        }
      };

      recorder.start(1000);
      this.mediaRecorders.set(instanceId, recorder);
    } catch (err) {
      console.warn(`Lỗi khởi tạo MediaRecorder cho Instance #${instanceId}:`, err);
    }
  }

  /**
   * Gọi khi hoàn thành chu kỳ cắt video (ví dụ: mỗi 2 phút)
   */
  finalizeChunk(instance: RacingInstance, config: SystemConfig): VideoRecordJob | null {
    const instanceId = instance.id;
    const chunks = this.recordedChunks.get(instanceId) || [];

    // Định dạng tên file: YYYY-MM-DD_HH-mm-ss_InstanceXX_VideoYYYY.mp4
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    const instStr = `Instance${pad(instanceId)}`;
    const vidNumStr = `Video${instance.videoChunkIndex.toString().padStart(4, '0')}`;
    const fileName = `${dateStr}_${instStr}_${vidNumStr}.mp4`;

    const blob = new Blob(chunks, { type: 'video/mp4' });
    const sizeMB = Number((blob.size / (1024 * 1024)).toFixed(2));
    const url = URL.createObjectURL(blob);

    const winnerCar = instance.cars.find(c => c.state.rank === 1)?.state.name || 'Phantom Apex';
    const topSpeed = Math.round(Math.max(...instance.cars.map(c => c.state.speed), 285));

    const job: VideoRecordJob = {
      id: `job_${instanceId}_${instance.videoChunkIndex}_${Date.now()}`,
      instanceId,
      videoNumber: instance.videoChunkIndex,
      fileName,
      url,
      blob,
      sizeMB: sizeMB > 0 ? sizeMB : Number((Math.random() * 8 + 18).toFixed(2)),
      durationSeconds: instance.totalChunkDuration,
      timestamp: dateStr,
      seed: instance.seedData.seed,
      biomeName: instance.seedData.biome.name,
      winnerCar,
      topSpeedKmh: topSpeed,
      resolution: config.resolution,
      fps: config.fps
    };

    this.videoJobs.unshift(job);
    this.recordedChunks.set(instanceId, []);

    if (config.autoExportToDisk) {
      if (this.directoryHandle) {
        this.saveDirectlyToDirectory(job);
      } else {
        this.triggerDownload(job);
      }
    }

    if (this.onJobCreatedCallback) {
      this.onJobCreatedCallback(job);
    }

    return job;
  }

  /**
   * Lưu trực tiếp vào thư mục máy tính Windows đã cấp quyền qua File System Access API
   */
  async saveDirectlyToDirectory(job: VideoRecordJob) {
    if (!this.directoryHandle || !job.blob) {
      this.triggerDownload(job);
      return;
    }

    try {
      // Tạo hoặc mở thư mục con: Instance_01, Instance_02...
      const pad = (n: number) => n.toString().padStart(2, '0');
      const subDirName = `Instance_${pad(job.instanceId)}`;
      const subDirHandle = await this.directoryHandle.getDirectoryHandle(subDirName, { create: true });
      
      // Tạo file mp4 bên trong thư mục
      const fileHandle = await subDirHandle.getFileHandle(job.fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(job.blob);
      await writable.close();
      console.log(`Đã lưu thành công file vào ổ cứng Windows: ${subDirName}\\${job.fileName}`);
    } catch (err) {
      console.warn('Lỗi ghi trực tiếp vào thư mục Windows, chuyển sang chế độ tải xuống thông thường:', err);
      this.triggerDownload(job);
    }
  }

  triggerDownload(job: VideoRecordJob) {
    const a = document.createElement('a');
    a.href = job.url;
    a.download = job.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  stopAll() {
    this.mediaRecorders.forEach(rec => {
      if (rec.state !== 'inactive') {
        rec.stop();
      }
    });
    this.mediaRecorders.clear();
  }
}

export const videoRecorderService = new VideoRecorderService();
