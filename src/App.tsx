import { useState, useEffect, useRef, useCallback } from 'react';
import { MultiInstanceEngine } from './engine/multiInstanceEngine';
import { videoRecorderService } from './recorder/videoRecorderService';
import { DashboardHeader } from './components/DashboardHeader';
import { ConfigurationPanel } from './components/ConfigurationPanel';
import { InstanceGrid } from './components/InstanceGrid';
import { InstanceDetailModal } from './components/InstanceDetailModal';
import { VideoFileManager } from './components/VideoFileManager';
import { SystemLogsModal } from './components/SystemLogsModal';
import { WindowsSetupGuideModal } from './components/WindowsSetupGuideModal';
import { AppleGameModal } from './components/AppleGameModal';
import { HighEndRacingView } from './components/HighEndRacingView';
import {
  CameraMode,
  InstanceRuntime,
  LogMessage,
  SystemConfig,
  SystemHardwareStats,
  VideoRecordJob
} from './types';

export default function App() {
  const [appMode, setAppMode] = useState<'PLAYABLE_RACING' | 'VIDEO_FACTORY'>('PLAYABLE_RACING');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<MultiInstanceEngine | null>(null);

  // Cấu hình hệ thống mặc định: 6 luồng đồng thời, 1080x1920 (9:16 dọc), .mp4, 60 FPS
  const [config, setConfig] = useState<SystemConfig>({
    instanceCount: 6, // Mặc định chạy đồng thời 6 luồng video Full HD dọc
    resolution: '1080x1920 (Full HD Dọc)',
    aspectRatio: '9:16',
    fileFormat: 'mp4',
    fps: 60,
    durationSeconds: 120, // Tự động cắt video mỗi 2 phút (120 giây)
    saveDirectory: 'D:\\RacingVideoFactory\\Videos\\',
    autoExportToDisk: false,
    codec: 'video/webm;codecs=vp9',
    aiAggressionGlobal: 0.85,
    cinematicAutoDirector: true
  });

  const [selectedDirectoryName, setSelectedDirectoryName] = useState<string>('');

  // Trạng thái chạy của hệ thống
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // Giám sát tài nguyên phần cứng
  const [stats, setStats] = useState<SystemHardwareStats>({
    engineFPS: 60,
    cpuUsagePct: 24,
    gpuUsagePct: 48,
    ramUsageMB: 2840,
    ramTotalMB: 32768,
    diskFreeGB: 842.4,
    totalVideosCreated: 0,
    systemUptimeSeconds: 0
  });

  // Dữ liệu trạng thái của các Instance thời gian thực
  const [instancesState, setInstancesState] = useState<InstanceRuntime[]>([]);
  const [activeJobs, setActiveJobs] = useState<VideoRecordJob[]>([]);
  const [logs, setLogs] = useState<LogMessage[]>([
    {
      id: 'init_1',
      timestamp: new Date().toLocaleTimeString('vi-VN'),
      type: 'info',
      message: 'Khởi động Động cơ Racing Video Factory trên môi trường Windows Local.'
    },
    {
      id: 'init_2',
      timestamp: new Date().toLocaleTimeString('vi-VN'),
      type: 'success',
      message: 'Hệ thống Render Multi-Viewport Scissor Test sẵn sàng. Hỗ trợ tối đa 10 luồng đua song song.'
    }
  ]);

  // Trạng thái các Modal
  const [inspectInstanceId, setInspectInstanceId] = useState<number | null>(null);
  const [isLibraryOpen, setIsLibraryOpen] = useState<boolean>(false);
  const [isLogsOpen, setIsLogsOpen] = useState<boolean>(false);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [isAppleGameOpen, setIsAppleGameOpen] = useState<boolean>(false);

  // Thêm thông điệp vào nhật ký
  const addLog = useCallback((type: 'info' | 'success' | 'warning' | 'error', message: string, instanceId?: number) => {
    setLogs(prev => [
      {
        id: `log_${Date.now()}_${Math.random()}`,
        timestamp: new Date().toLocaleTimeString('vi-VN'),
        type,
        message,
        instanceId
      },
      ...prev.slice(0, 99)
    ]);
  }, []);

  // Khởi tạo WebGL MultiInstanceEngine
  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new MultiInstanceEngine();
    engine.init(canvasRef.current, config);
    engineRef.current = engine;

    // Xử lý sự kiện khi một instance hoàn thành chu kỳ cắt video 2 phút
    engine.onChunkCompleted = (instance) => {
      const job = videoRecorderService.finalizeChunk(instance, config);
      if (job) {
        setActiveJobs(prev => [job, ...prev]);
        setStats(prev => ({
          ...prev,
          totalVideosCreated: prev.totalVideosCreated + 1,
          diskFreeGB: Math.max(10, prev.diskFreeGB - job.sizeMB / 1024)
        }));

        addLog(
          'success',
          `Đã xuất video #${job.videoNumber}: "${job.fileName}" (${job.sizeMB}MB, Seed: #${job.seed}). Tự động bắt đầu chặng đua 2 phút tiếp theo với xe và đường đua mới.`,
          instance.id
        );
      }
    };

    // Cập nhật FPS thực tế
    engine.onFpsUpdate = (fps) => {
      setStats(prev => ({
        ...prev,
        engineFPS: fps,
        gpuUsagePct: Math.min(98, Math.round(18 + config.instanceCount * 7.5 + (Math.random() * 4 - 2))),
        cpuUsagePct: Math.min(95, Math.round(12 + config.instanceCount * 4.2 + (Math.random() * 3 - 1.5)))
      }));
    };

    // Đồng bộ HUD thời gian thực
    let lastTick = 0;
    engine.onStateTick = () => {
      const now = performance.now();
      if (now - lastTick > 100) {
        lastTick = now;
        const list: InstanceRuntime[] = [];
        for (const inst of engine.instances.values()) {
          list.push(inst.getRuntimeState());
        }
        setInstancesState(list);
      }
    };

    engine.start(config);
    addLog('info', `Hệ thống đang vận hành ${config.instanceCount} luồng render video đồng thời.`);

    return () => {
      engine.destroy();
    };
  }, [addLog]);

  // Đồng bộ khi thay đổi số lượng instance hoặc thời lượng
  useEffect(() => {
    if (!engineRef.current) return;
    engineRef.current.updateInstanceCount(config.instanceCount, config.durationSeconds);
  }, [config.instanceCount, config.durationSeconds]);

  // Bộ đếm thời gian hoạt động Uptime
  useEffect(() => {
    const timer = setInterval(() => {
      if (isRunning && !isPaused) {
        setStats(prev => ({
          ...prev,
          systemUptimeSeconds: prev.systemUptimeSeconds + 1
        }));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [isRunning, isPaused]);

  // Các thao tác điều hành
  const handleStart = () => {
    if (!engineRef.current) return;
    engineRef.current.start(config);
    setIsRunning(true);
    setIsPaused(false);
    addLog('info', 'Đã khởi động toàn bộ hệ thống mô phỏng và sản xuất video.');
  };

  const handleStop = () => {
    if (!engineRef.current) return;
    engineRef.current.stop();
    setIsRunning(false);
    setIsPaused(false);
    videoRecorderService.stopAll();
    addLog('warning', 'Hệ thống đã dừng bởi người điều hành.');
  };

  const handlePause = () => {
    if (!engineRef.current) return;
    engineRef.current.pause();
    const paused = engineRef.current.isCurrentlyPaused();
    setIsPaused(paused);
    addLog('info', paused ? 'Hệ thống đã tạm dừng.' : 'Hệ thống tiếp tục hoạt động.');
  };

  const handleChangeConfig = (updates: Partial<SystemConfig>) => {
    setConfig(prev => {
      const updated = { ...prev, ...updates };
      addLog('info', `Cập nhật cấu hình: ${Object.keys(updates).join(', ')}`);
      return updated;
    });
  };

  // Chọn thư mục máy tính Windows qua File System Access API
  const handlePickDirectory = async () => {
    if ('showDirectoryPicker' in window) {
      try {
        const handle = await (window as any).showDirectoryPicker({
          mode: 'readwrite'
        });
        videoRecorderService.setDirectoryHandle(handle);
        setSelectedDirectoryName(handle.name);
        setConfig(prev => ({
          ...prev,
          saveDirectory: `D:\\${handle.name}\\`,
          autoExportToDisk: true
        }));
        addLog('success', `Đã kết nối thành công thư mục Windows: "${handle.name}". Các video xuất ra sẽ được tự động lưu trực tiếp vào thư mục này.`);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.warn('Lỗi chọn thư mục:', err);
        }
      }
    } else {
      setIsGuideOpen(true);
    }
  };

  const handleSelectCamera = (instanceId: number, mode: CameraMode) => {
    if (!engineRef.current) return;
    const inst = engineRef.current.instances.get(instanceId);
    if (inst) {
      inst.cameraDirector.setCameraMode(mode);
      addLog('info', `Đã chuyển Instance #${instanceId} sang góc quay: ${mode}`, instanceId);
    }
  };

  const handleForceRerollSeed = (instanceId: number) => {
    if (!engineRef.current) return;
    const inst = engineRef.current.instances.get(instanceId);
    if (inst) {
      inst.recycleToNextRace(config.durationSeconds);
      addLog('info', `Đã tạo mới đường đua, thời tiết và xe cho Instance #${instanceId}.`, instanceId);
    }
  };

  const handleTriggerRecoveryTest = () => {
    if (!engineRef.current) return;
    const targetId = Math.floor(Math.random() * config.instanceCount) + 1;
    const inst = engineRef.current.instances.get(targetId);
    if (inst) {
      addLog('error', `Phát hiện lỗi mô phỏng (Crash) trên Instance #${targetId}! Watchdog đang kích hoạt quy trình tự phục hồi...`, targetId);
      inst.recover();
      setTimeout(() => {
        addLog('success', `Watchdog đã tự phục hồi thành công Instance #${targetId}. Cuộc đua tiếp tục bình thường mà không làm dừng các luồng khác.`, targetId);
      }, 500);
    }
  };

  const handleSwitchMode = (mode: 'PLAYABLE_RACING' | 'VIDEO_FACTORY') => {
    setAppMode(mode);
    if (mode === 'VIDEO_FACTORY' && engineRef.current) {
      setTimeout(() => {
        engineRef.current?.handleResize();
      }, 50);
      setTimeout(() => {
        engineRef.current?.handleResize();
      }, 200);
    }
  };

  const inspectedInstance = instancesState.find(i => i.id === inspectInstanceId) || null;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans select-none">
      {/* 1. Thanh tiêu đề & Giám sát phần cứng & Chọn Chế Độ Game */}
      <DashboardHeader
        isRunning={isRunning}
        isPaused={isPaused}
        stats={stats}
        config={config}
        appMode={appMode}
        onToggleAppMode={handleSwitchMode}
        onStart={handleStart}
        onStop={handleStop}
        onPause={handlePause}
        onOpenLogs={() => setIsLogsOpen(true)}
        onOpenGuide={() => setIsGuideOpen(true)}
        onOpenVideoLibrary={() => setIsLibraryOpen(true)}
      />

      {/* 2. Khu vực làm việc chính */}
      <div className={`flex-1 relative overflow-hidden ${appMode === 'PLAYABLE_RACING' ? 'block' : 'hidden'}`}>
        <HighEndRacingView onSwitchToVideoFactory={() => handleSwitchMode('VIDEO_FACTORY')} />
      </div>

      <div className={`flex flex-col lg:flex-row flex-1 overflow-hidden relative ${appMode === 'VIDEO_FACTORY' ? 'flex' : 'hidden'}`}>
        {/* Bảng cấu hình bên trái */}
        <ConfigurationPanel
          config={config}
          isRunning={isRunning}
          onChangeConfig={handleChangeConfig}
          onPickDirectory={handlePickDirectory}
          selectedDirectoryName={selectedDirectoryName}
        />

        {/* Lưới hiển thị 3D đa khung hình */}
        <main className="flex-1 relative flex flex-col overflow-hidden bg-black">
          <InstanceGrid
            canvasRef={canvasRef}
            instances={instancesState}
            activeCount={config.instanceCount}
            onInspectInstance={id => setInspectInstanceId(id)}
          />

          {/* Thanh trạng thái dưới đáy */}
          <footer className="h-7 bg-slate-900 border-t border-slate-800 px-4 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Trạng thái: {isRunning ? (isPaused ? 'TẠM DỪNG' : 'SẢN XUẤT TỰ ĐỘNG') : 'ĐANG DỪNG'}
              </span>
              <span className="hidden sm:inline">&bull;</span>
              <span className="hidden sm:inline">
                Chu kỳ cắt video: {config.durationSeconds}s / file
              </span>
              <span className="hidden md:inline">&bull;</span>
              <span className="hidden md:inline">
                Mã hóa phần cứng GPU (NVENC/WebCodecs): Hoạt động
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsAppleGameOpen(true)}
                className="text-[11px] text-rose-400 hover:text-rose-300 font-medium cursor-pointer"
              >
                🍎 Game Hứng Táo (HTML/JS)
              </button>
              <span>&bull;</span>
              <span className="font-mono text-slate-300">
                Đã sản xuất: {stats.totalVideosCreated} video
              </span>
            </div>
          </footer>
        </main>
      </div>

      {/* 3. Các cửa sổ Modal */}
      {/* Modal xem chi tiết và tự chọn 10 góc camera */}
      {inspectedInstance && (
        <InstanceDetailModal
          instance={inspectedInstance}
          onClose={() => setInspectInstanceId(null)}
          onSelectCamera={handleSelectCamera}
          onForceRerollSeed={handleForceRerollSeed}
        />
      )}

      {/* Modal Kho video đã xuất */}
      <VideoFileManager
        jobs={activeJobs}
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        onDownloadJob={job => videoRecorderService.triggerDownload(job)}
      />

      {/* Modal Nhật ký hệ thống & Thử nghiệm tự phục hồi lỗi */}
      <SystemLogsModal
        logs={logs}
        isOpen={isLogsOpen}
        onClose={() => setIsLogsOpen(false)}
        onTriggerRecoveryTest={handleTriggerRecoveryTest}
        onClearLogs={() => setLogs([])}
      />

      {/* Modal Hướng dẫn Windows & Thư mục D:\ */}
      <WindowsSetupGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />

      {/* Modal Game Hứng Táo */}
      <AppleGameModal
        isOpen={isAppleGameOpen}
        onClose={() => setIsAppleGameOpen(false)}
      />
    </div>
  );
}
