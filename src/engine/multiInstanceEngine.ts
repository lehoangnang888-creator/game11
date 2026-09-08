import * as THREE from 'three';
import { RacingInstance } from './racingInstance';
import { SystemConfig } from '../types';

export class MultiInstanceEngine {
  public renderer: THREE.WebGLRenderer | null = null;
  public instances: Map<number, RacingInstance> = new Map();
  public canvas: HTMLCanvasElement | null = null;

  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private lastFrameTime: number = performance.now();
  private animationFrameId: number | null = null;

  // Callbacks
  public onFpsUpdate?: (fps: number) => void;
  public onChunkCompleted?: (instance: RacingInstance) => void;
  public onStateTick?: () => void;

  private frameCount: number = 0;
  private lastFpsCalcTime: number = performance.now();
  public currentFPS: number = 60;

  constructor() {}

  init(canvas: HTMLCanvasElement, config: SystemConfig) {
    this.canvas = canvas;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true // Required for direct MediaRecorder video streaming
    });

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.updateInstanceCount(config.instanceCount, config.durationSeconds);
    this.handleResize();

    window.addEventListener('resize', this.handleResize);
    // Double check size after next frame to ensure layout is computed
    setTimeout(this.handleResize, 100);
    setTimeout(this.handleResize, 400);
  }

  handleResize = () => {
    if (!this.canvas || !this.renderer) return;
    const parent = this.canvas.parentElement;
    const rect = parent ? parent.getBoundingClientRect() : null;
    const width = Math.max(320, Math.floor(rect && rect.width > 50 ? rect.width : (parent?.clientWidth || window.innerWidth)));
    const height = Math.max(240, Math.floor(rect && rect.height > 50 ? rect.height : (parent?.clientHeight || (window.innerHeight - 180))));

    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
      this.renderer.setSize(width, height, false);
    }
  };

  updateInstanceCount(targetCount: number, durationSeconds: number = 120) {
    // Add missing instances
    for (let i = 1; i <= targetCount; i++) {
      if (!this.instances.has(i)) {
        const inst = new RacingInstance(i, durationSeconds);
        this.instances.set(i, inst);
      } else {
        const inst = this.instances.get(i)!;
        inst.totalChunkDuration = durationSeconds;
      }
    }

    // Remove surplus instances
    for (const [id] of this.instances.entries()) {
      if (id > targetCount) {
        this.instances.delete(id);
      }
    }
  }

  start(config: SystemConfig) {
    this.isRunning = true;
    this.isPaused = false;
    this.lastFrameTime = performance.now();

    const loop = (currentTime: number) => {
      if (!this.isRunning) return;

      const delta = Math.min((currentTime - this.lastFrameTime) / 1000, 0.1);
      this.lastFrameTime = currentTime;

      // FPS Calculation
      this.frameCount++;
      if (currentTime - this.lastFpsCalcTime >= 1000) {
        this.currentFPS = Math.round((this.frameCount * 1000) / (currentTime - this.lastFpsCalcTime));
        this.frameCount = 0;
        this.lastFpsCalcTime = currentTime;
        if (this.onFpsUpdate) this.onFpsUpdate(this.currentFPS);
      }

      if (!this.isPaused) {
        // Update all active instances
        for (const instance of this.instances.values()) {
          const { chunkCompleted } = instance.update(delta, config.aiAggressionGlobal, config.cinematicAutoDirector);
          if (chunkCompleted) {
            if (this.onChunkCompleted) {
              this.onChunkCompleted(instance);
            }
            instance.recycleToNextRace(config.durationSeconds);
          }
        }

        // Render Multi-Viewport Scissor Grid
        this.renderMultiViewport();

        if (this.onStateTick) {
          this.onStateTick();
        }
      }

      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  pause() {
    this.isPaused = !this.isPaused;
  }

  isCurrentlyPaused(): boolean {
    return this.isPaused;
  }

  stop() {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * High performance multi-viewport rendering using WebGL Scissor Test.
   * Renders 1 to 10 instances in a unified 9:16 Full HD vertical format.
   */
  private renderMultiViewport() {
    if (!this.renderer || !this.canvas) return;

    const width = this.canvas.width;
    const height = this.canvas.height;
    if (width <= 0 || height <= 0) return;

    const count = this.instances.size;
    const canvasRect = this.canvas.getBoundingClientRect();

    this.renderer.setScissorTest(true);

    // Fallback grid columns & rows
    let cols = 1;
    let rows = 1;
    if (count === 2) {
      cols = 2; rows = 1;
    } else if (count <= 4) {
      cols = 2; rows = 2;
    } else if (count <= 6) {
      cols = 3; rows = 2;
    } else if (count <= 8) {
      cols = 4; rows = 2;
    } else if (count <= 10) {
      cols = 5; rows = 2;
    }

    const cellWidth = Math.floor(width / cols);
    const cellHeight = Math.floor(height / rows);

    let index = 0;
    for (const [, instance] of this.instances.entries()) {
      let x = 0;
      let y = 0;
      let w = cellWidth;
      let h = cellHeight;
      let usedDomRect = false;

      // Check if DOM tile exists for pixel-perfect 9:16 alignment
      const tileEl = document.getElementById(`viewport-tile-${instance.id}`);
      if (tileEl && canvasRect.width > 0 && canvasRect.height > 0) {
        const tileRect = tileEl.getBoundingClientRect();
        const scaleX = width / canvasRect.width;
        const scaleY = height / canvasRect.height;

        const tileX = Math.round((tileRect.left - canvasRect.left) * scaleX);
        const tileY = Math.round((canvasRect.bottom - tileRect.bottom) * scaleY);
        const tileW = Math.round(tileRect.width * scaleX);
        const tileH = Math.round(tileRect.height * scaleY);

        if (tileW > 20 && tileH > 20) {
          x = tileX;
          y = tileY;
          w = tileW;
          h = tileH;
          usedDomRect = true;
        }
      }

      if (!usedDomRect) {
        // Fallback: 9:16 aspect ratio centered in cell
        const col = index % cols;
        const row = Math.floor(index / cols);
        const targetAspect = 9 / 16;
        let viewW = cellWidth;
        let viewH = cellHeight;

        if (cellWidth / cellHeight > targetAspect) {
          viewW = Math.floor(cellHeight * targetAspect);
          viewH = cellHeight;
        } else {
          viewW = cellWidth;
          viewH = Math.floor(cellWidth / targetAspect);
        }

        const offsetX = Math.floor((cellWidth - viewW) / 2);
        const offsetY = Math.floor((cellHeight - viewH) / 2);

        x = col * cellWidth + offsetX;
        y = height - (row + 1) * cellHeight + offsetY;
        w = viewW;
        h = viewH;
      }

      this.renderer.setViewport(x, y, w, h);
      this.renderer.setScissor(x, y, w, h);

      // Adjust camera aspect ratio for this 9:16 vertical viewport
      const cam = instance.cameraDirector.camera;
      cam.aspect = w / h;
      cam.updateProjectionMatrix();

      this.renderer.render(instance.scene, cam);
      index++;
    }

    this.renderer.setScissorTest(false);
  }

  destroy() {
    this.stop();
    window.removeEventListener('resize', this.handleResize);
    this.instances.clear();
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
  }
}
