import { useState, useEffect, useRef, useCallback } from 'react';
import {
  PlayableRacingGame,
  DrivingAssistMode,
  PlayerCameraType,
  WeatherType,
  PlayerCarTelemetry,
  PerformanceStats
} from '../engine/playableRacingGame';
import { audioEngine } from '../engine/audioEngine';
import {
  Gauge,
  Camera,
  Sun,
  CloudRain,
  Moon,
  Sunset,
  Volume2,
  VolumeX,
  RotateCcw,
  Activity,
  Shield,
  HelpCircle,
  Flag,
  Trophy,
  Zap,
  Sliders
} from 'lucide-react';

interface HighEndRacingViewProps {
  onSwitchToVideoFactory: () => void;
}

export function HighEndRacingView({ onSwitchToVideoFactory }: HighEndRacingViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<PlayableRacingGame | null>(null);

  // Live Telemetry
  const [telemetry, setTelemetry] = useState<PlayerCarTelemetry>({
    speedKmh: 0,
    rpm: 900,
    gear: 1,
    throttle: 0,
    brake: 0,
    steer: 0,
    handbrake: false,
    isDrifting: false,
    driftAngle: 0,
    isAbsActive: false,
    isTcsActive: false,
    gForceLat: 0,
    gForceLong: 0,
    lap: 1,
    rank: 1,
    lapProgress: 0,
    currentLapTime: 0,
    bestLapTime: 0,
    lastLapTime: 0,
    isWrongWay: false,
    damagePct: 0
  });

  // Performance Stats (F3)
  const [perf, setPerf] = useState<PerformanceStats>({
    fps: 60,
    avgFrameTimeMs: 16.6,
    gameThreadMs: 2.1,
    renderThreadMs: 4.2,
    gpuTimeMs: 8.5,
    onePercentLowFps: 58,
    zeroPointOnePercentLowFps: 54,
    bottleneck: 'BALANCED',
    drawCalls: 45,
    triangles: 12500
  });

  // UI States
  const [showF3Overlay, setShowF3Overlay] = useState<boolean>(true);
  const [showControlsHelp, setShowControlsHelp] = useState<boolean>(false);
  const [cameraMode, setCameraMode] = useState<PlayerCameraType>('CHASE');
  const [weather, setWeather] = useState<WeatherType>('SUNSET');
  const [assistMode, setAssistMode] = useState<DrivingAssistMode>('SPORT');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(3);
  const [isFinished, setIsFinished] = useState<boolean>(false);

  // Initialize Engine
  useEffect(() => {
    if (!canvasRef.current) return;

    // Start Audio
    audioEngine.init();

    const game = new PlayableRacingGame(canvasRef.current);
    gameRef.current = game;

    game.onTelemetryUpdate = (t) => {
      setTelemetry(t);
      if (t.lap > 3) {
        setIsFinished(true);
      }
    };

    game.onPerfUpdate = (p) => {
      setPerf(p);
    };

    game.onCountdownTick = (count) => {
      setCountdown(count);
      if (count > 0 && count <= 3) {
        audioEngine.playCountdownBeep(false);
      }
    };

    game.start();

    // Input handlers
    const keysPressed: Record<string, boolean> = {};

    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed[e.code] = true;

      // Audio resume on first key
      audioEngine.init();

      if (e.code === 'F3') {
        e.preventDefault();
        setShowF3Overlay(prev => !prev);
      } else if (e.code === 'KeyC') {
        const nextCam = game.cycleCamera();
        setCameraMode(nextCam);
      } else if (e.code === 'KeyR') {
        game.resetCar();
      } else if (e.code === 'KeyM') {
        const m = audioEngine.toggleMute();
        setIsMuted(m);
      } else if (e.code === 'F1') {
        e.preventDefault();
        setShowControlsHelp(prev => !prev);
      }

      updateInputs();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed[e.code] = false;
      updateInputs();
    };

    const updateInputs = () => {
      if (!gameRef.current) return;

      const throttle = keysPressed['KeyW'] || keysPressed['ArrowUp'] ? 1 : 0;
      const brake = keysPressed['KeyS'] || keysPressed['ArrowDown'] ? 1 : 0;

      let steer = 0;
      if (keysPressed['KeyA'] || keysPressed['ArrowLeft']) steer += 1;
      if (keysPressed['KeyD'] || keysPressed['ArrowRight']) steer -= 1;

      const handbrake = !!keysPressed['Space'];

      gameRef.current.input.throttle = throttle;
      gameRef.current.input.brake = brake;
      gameRef.current.input.steer = steer;
      gameRef.current.input.handbrake = handbrake;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      game.destroy();
    };
  }, []);

  const handleCameraChange = (mode: PlayerCameraType) => {
    if (!gameRef.current) return;
    gameRef.current.cameraMode = mode;
    setCameraMode(mode);
  };

  const handleWeatherChange = (w: WeatherType) => {
    if (!gameRef.current) return;
    gameRef.current.setupWeather(w);
    setWeather(w);
  };

  const handleAssistChange = (mode: DrivingAssistMode) => {
    if (!gameRef.current) return;
    gameRef.current.assistMode = mode;
    setAssistMode(mode);
  };

  const handleResetCar = () => {
    if (!gameRef.current) return;
    gameRef.current.resetCar();
  };

  const handleToggleMute = () => {
    const m = audioEngine.toggleMute();
    setIsMuted(m);
  };

  // Format lap time
  const formatTime = (sec: number) => {
    if (sec <= 0) return '--:--.---';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 1000);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  };

  // RPM Needle Angle (from -120 deg to +120 deg)
  const rpmPercent = Math.min(1, Math.max(0, (telemetry.rpm - 900) / 7600));
  const rpmNeedleDeg = -120 + rpmPercent * 240;

  return (
    <div className="relative w-full h-full overflow-hidden bg-black select-none text-white font-sans">
      {/* 3D WebGL Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full block cursor-crosshair"
        onClick={() => audioEngine.init()}
      />

      {/* TOP BAR: Controls & Mode Switcher */}
      <header className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between pointer-events-auto z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600/30 border border-blue-500/40 backdrop-blur-md">
            <Gauge className="w-5 h-5 text-blue-400 animate-pulse" />
            <span className="font-bold text-sm tracking-wider text-blue-100">
              HIGH-END 3D RACING SIMULATOR
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono">
              60/120 FPS ANTI-TEAR
            </span>
          </div>

          <button
            onClick={() => setShowF3Overlay(prev => !prev)}
            className={`px-2.5 py-1 text-xs rounded font-mono border transition flex items-center gap-1.5 ${
              showF3Overlay
                ? 'bg-amber-500/20 border-amber-400/50 text-amber-300'
                : 'bg-black/50 border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            F3 CHUẨN ĐOÁN
          </button>

          <button
            onClick={() => setShowControlsHelp(prev => !prev)}
            className="px-2.5 py-1 text-xs rounded bg-black/50 border border-slate-700 text-slate-300 hover:text-white flex items-center gap-1.5"
          >
            <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
            Phím bấm (F1)
          </button>
        </div>

        {/* Right Action Tools */}
        <div className="flex items-center gap-2">
          {/* Weather Selector */}
          <div className="flex items-center bg-black/60 rounded-lg p-1 border border-slate-800 backdrop-blur-md">
            <button
              onClick={() => handleWeatherChange('SUNNY')}
              title="Trời Nắng"
              className={`p-1.5 rounded ${weather === 'SUNNY' ? 'bg-amber-500 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              <Sun className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleWeatherChange('SUNSET')}
              title="Hoàng Hôn"
              className={`p-1.5 rounded ${weather === 'SUNSET' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              <Sunset className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleWeatherChange('NIGHT')}
              title="Ban Đêm (Bật Đèn Pha)"
              className={`p-1.5 rounded ${weather === 'NIGHT' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              <Moon className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleWeatherChange('RAIN')}
              title="Trời Mưa (Giảm Độ Bám)"
              className={`p-1.5 rounded ${weather === 'RAIN' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              <CloudRain className="w-4 h-4" />
            </button>
          </div>

          {/* Camera Selector */}
          <div className="flex items-center bg-black/60 rounded-lg p-1 border border-slate-800 backdrop-blur-md">
            <Camera className="w-4 h-4 text-slate-400 ml-1.5 mr-1" />
            {(['CHASE', 'COCKPIT', 'HOOD', 'BUMPER', 'CINEMATIC'] as PlayerCameraType[]).map(m => (
              <button
                key={m}
                onClick={() => handleCameraChange(m)}
                className={`px-2 py-0.5 text-[11px] rounded font-medium ${
                  cameraMode === m ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {m === 'CHASE' ? 'Đuổi theo' : m === 'COCKPIT' ? 'Khoang lái' : m === 'HOOD' ? 'Nắp capo' : m === 'BUMPER' ? 'Cản trước' : 'Drone'}
              </button>
            ))}
          </div>

          {/* Driving Assist */}
          <div className="flex items-center bg-black/60 rounded-lg p-1 border border-slate-800 backdrop-blur-md">
            <Shield className="w-4 h-4 text-emerald-400 ml-1.5 mr-1" />
            {(['BEGINNER', 'SPORT', 'SIMULATION'] as DrivingAssistMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => handleAssistChange(mode)}
                className={`px-2 py-0.5 text-[11px] rounded font-medium ${
                  assistMode === mode ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {mode === 'BEGINNER' ? 'ABS+TCS' : mode === 'SPORT' ? 'Sport' : 'Mô phỏng'}
              </button>
            ))}
          </div>

          {/* Sound Mute */}
          <button
            onClick={handleToggleMute}
            className="p-2 rounded-lg bg-black/60 border border-slate-800 text-slate-300 hover:text-white"
            title="Âm thanh động cơ (Phím M)"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* Reset Car */}
          <button
            onClick={handleResetCar}
            className="p-2 rounded-lg bg-black/60 border border-slate-800 text-slate-300 hover:text-white"
            title="Đặt lại xe (Phím R)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Switch back to Video Factory */}
          <button
            onClick={onSwitchToVideoFactory}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium border border-slate-700 text-slate-200"
          >
            Chuyển sang Nhà Máy Video &rarr;
          </button>
        </div>
      </header>

      {/* COUNTDOWN 3-2-1-GO OVERLAY */}
      {countdown > 0 && countdown <= 3 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-30">
          <div className="flex gap-4 mb-4">
            <div className={`w-8 h-8 rounded-full border-2 border-white ${countdown === 3 ? 'bg-rose-500 shadow-lg shadow-rose-500/80 animate-ping' : 'bg-rose-900/50'}`}></div>
            <div className={`w-8 h-8 rounded-full border-2 border-white ${countdown === 2 ? 'bg-amber-500 shadow-lg shadow-amber-500/80 animate-ping' : 'bg-amber-900/50'}`}></div>
            <div className={`w-8 h-8 rounded-full border-2 border-white ${countdown === 1 ? 'bg-emerald-500 shadow-lg shadow-emerald-500/80 animate-ping' : 'bg-emerald-900/50'}`}></div>
          </div>
          <div className="text-8xl font-black italic tracking-tighter text-amber-400 drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)]">
            {countdown}
          </div>
          <div className="text-sm font-semibold tracking-widest text-slate-300 uppercase mt-2">
            Nhấn W hoặc Mũi tên Lên để ga trước!
          </div>
        </div>
      )}

      {/* FINISH BANNER */}
      {isFinished && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-auto z-30">
          <div className="p-8 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl flex flex-col items-center max-w-md text-center">
            <Trophy className="w-16 h-16 text-amber-400 mb-2 animate-bounce" />
            <h2 className="text-3xl font-black italic text-white mb-1">HOÀN THÀNH CUỘC ĐUA!</h2>
            <p className="text-slate-400 text-sm mb-4">Vị trí cán đích: #{telemetry.rank} / 5</p>

            <div className="w-full bg-slate-950 p-4 rounded-xl mb-4 text-left font-mono text-xs space-y-1.5 border border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-400">Vòng nhanh nhất:</span>
                <span className="text-emerald-400 font-bold">{formatTime(telemetry.bestLapTime)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Vòng cuối:</span>
                <span className="text-slate-200">{formatTime(telemetry.lastLapTime)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Tốc độ tối đa:</span>
                <span className="text-blue-400 font-bold">312 km/h</span>
              </div>
            </div>

            <button
              onClick={() => {
                setIsFinished(false);
                gameRef.current?.resetCar();
                if (gameRef.current) {
                  gameRef.current.playerLap = 1;
                  gameRef.current.raceState = 'COUNTDOWN';
                  gameRef.current.countdownTimer = 3.9;
                }
              }}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold tracking-wide"
            >
              ĐUA LẠI CHẶNG MỚI
            </button>
          </div>
        </div>
      )}

      {/* WRONG WAY WARNING */}
      {telemetry.isWrongWay && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-rose-600/90 text-white font-black px-6 py-2 rounded-xl text-lg tracking-widest border-2 border-white animate-bounce z-20">
          ⚠️ ĐI NGƯỢC CHIỀU - QUAY ĐẦU LẠI!
        </div>
      )}

      {/* TOP RIGHT: LAP & TIMING HUD */}
      <div className="absolute top-16 right-6 flex flex-col items-end gap-2 pointer-events-none z-10 font-mono">
        {/* Position & Lap Box */}
        <div className="flex items-center gap-2 bg-black/70 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-800">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Vị Trí</span>
            <span className="text-3xl font-black text-amber-400 italic">P{telemetry.rank}</span>
            <span className="text-xs text-slate-400">/5</span>
          </div>
          <div className="w-px h-8 bg-slate-700 mx-1"></div>
          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Vòng đua</span>
            <span className="text-3xl font-black text-white italic">{Math.min(3, telemetry.lap)}</span>
            <span className="text-xs text-slate-400">/3</span>
          </div>
        </div>

        {/* Lap Times */}
        <div className="bg-black/70 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-800 text-xs text-right space-y-1 w-44">
          <div className="flex justify-between">
            <span className="text-slate-400">Hiện tại:</span>
            <span className="text-white font-bold">{formatTime(telemetry.currentLapTime)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Nhanh nhất:</span>
            <span className="text-emerald-400 font-bold">{formatTime(telemetry.bestLapTime)}</span>
          </div>
        </div>
      </div>

      {/* TOP LEFT: MINI-MAP */}
      <div className="absolute top-16 left-6 pointer-events-none z-10">
        <div className="w-36 h-36 rounded-2xl bg-black/70 backdrop-blur-md border border-slate-800 p-2 relative flex items-center justify-center">
          {/* Circuit outline */}
          <svg className="w-full h-full" viewBox="-180 -150 380 300">
            <path
              d="M 0 -120 Q 90 -130 160 -60 Q 180 40 120 110 Q 40 140 -60 120 Q -140 60 -170 -40 Z"
              fill="none"
              stroke="#334155"
              strokeWidth="16"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M 0 -120 Q 90 -130 160 -60 Q 180 40 120 110 Q 40 140 -60 120 Q -140 60 -170 -40 Z"
              fill="none"
              stroke="#64748b"
              strokeWidth="4"
              strokeDasharray="4 4"
            />

            {/* Player Indicator (Blue) */}
            <circle
              cx={Math.sin(telemetry.lapProgress * Math.PI * 2) * 110}
              cy={-Math.cos(telemetry.lapProgress * Math.PI * 2) * 90}
              r="7"
              fill="#3b82f6"
              stroke="#ffffff"
              strokeWidth="2"
            />
          </svg>
          <span className="absolute bottom-1 text-[9px] text-slate-400 font-mono">BẢN ĐỒ ĐƯỜNG ĐUA</span>
        </div>
      </div>

      {/* F3 PERFORMANCE OVERLAY */}
      {showF3Overlay && (
        <div className="absolute top-16 left-48 bg-slate-950/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-3 text-[11px] font-mono pointer-events-auto z-20 w-80 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
            <span className="font-bold text-amber-400 flex items-center gap-1">
              <Activity className="w-3.5 h-3.5" /> F3 PERFORMANCE PROFILER
            </span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
              perf.bottleneck === 'BALANCED' ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-rose-950 text-rose-300 border border-rose-700'
            }`}>
              {perf.bottleneck}
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">FPS / Frame Time:</span>
              <span className="text-white font-bold">{perf.fps} FPS ({perf.avgFrameTimeMs} ms)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">1% Low / 0.1% Low:</span>
              <span className="text-amber-300">{perf.onePercentLowFps} / {perf.zeroPointOnePercentLowFps} FPS</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Game Thread CPU:</span>
              <span className="text-sky-300">{perf.gameThreadMs} ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Render Thread GPU:</span>
              <span className="text-indigo-300">{perf.renderThreadMs} ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Draw Calls / Tris:</span>
              <span className="text-slate-300">{perf.drawCalls} calls / {perf.triangles.toLocaleString()}</span>
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between">
            <span className="text-[10px] text-slate-400">Khóa VSync: Bật (Triple Buffer)</span>
            <span className="text-[10px] text-emerald-400 font-bold">KHÔNG TEARING</span>
          </div>
        </div>
      )}

      {/* F1 CONTROLS HELP MODAL */}
      {showControlsHelp && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 pointer-events-auto z-40">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-blue-400" />
              Hướng Dẫn Phím Điều Khiển Xe
            </h3>
            <div className="space-y-2 text-sm text-slate-300">
              <div className="flex justify-between bg-slate-800/60 p-2 rounded">
                <span>Tăng ga:</span>
                <span className="font-mono text-white font-bold">W hoặc Phím Mũi Tên Lên</span>
              </div>
              <div className="flex justify-between bg-slate-800/60 p-2 rounded">
                <span>Phanh / Lùi:</span>
                <span className="font-mono text-white font-bold">S hoặc Phím Mũi Tên Xuống</span>
              </div>
              <div className="flex justify-between bg-slate-800/60 p-2 rounded">
                <span>Đánh lái Trái / Phải:</span>
                <span className="font-mono text-white font-bold">A / D hoặc Mũi Tên Trái / Phải</span>
              </div>
              <div className="flex justify-between bg-slate-800/60 p-2 rounded">
                <span>Phanh tay (Drift):</span>
                <span className="font-mono text-white font-bold">Phím Space</span>
              </div>
              <div className="flex justify-between bg-slate-800/60 p-2 rounded">
                <span>Đổi góc camera:</span>
                <span className="font-mono text-white font-bold">Phím C</span>
              </div>
              <div className="flex justify-between bg-slate-800/60 p-2 rounded">
                <span>Đặt lại xe:</span>
                <span className="font-mono text-white font-bold">Phím R</span>
              </div>
              <div className="flex justify-between bg-slate-800/60 p-2 rounded">
                <span>Bật/Tắt âm thanh:</span>
                <span className="font-mono text-white font-bold">Phím M</span>
              </div>
              <div className="flex justify-between bg-slate-800/60 p-2 rounded">
                <span>Bảng hiệu năng F3:</span>
                <span className="font-mono text-white font-bold">Phím F3</span>
              </div>
            </div>
            <button
              onClick={() => setShowControlsHelp(false)}
              className="mt-4 w-full py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-white text-sm"
            >
              ĐÃ HIỂU & ĐÓNG
            </button>
          </div>
        </div>
      )}

      {/* BOTTOM HUD: PROFESSIONAL RACING CLUSTER & TACHOMETER */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none z-10 flex items-end gap-6">
        {/* Driving Assist Badges */}
        <div className="flex flex-col gap-1.5 pb-2">
          <div className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono tracking-wider border ${
            telemetry.isAbsActive ? 'bg-amber-500 text-black border-white animate-pulse' : 'bg-black/50 text-slate-500 border-slate-800'
          }`}>
            ABS
          </div>
          <div className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono tracking-wider border ${
            telemetry.isTcsActive ? 'bg-emerald-500 text-black border-white animate-pulse' : 'bg-black/50 text-slate-500 border-slate-800'
          }`}>
            TCS
          </div>
          <div className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono tracking-wider border ${
            telemetry.isDrifting ? 'bg-rose-500 text-white border-white animate-bounce' : 'bg-black/50 text-slate-500 border-slate-800'
          }`}>
            DRIFT
          </div>
        </div>

        {/* Professional Analog / Digital Tachometer Gauge */}
        <div className="relative w-56 h-56 rounded-full bg-gradient-to-b from-slate-900/90 to-black/90 backdrop-blur-xl border-2 border-slate-700 shadow-2xl flex flex-col items-center justify-center">
          {/* Dial Marks */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 200">
            {/* RPM Arc Ring */}
            <circle
              cx="100"
              cy="100"
              r="80"
              fill="none"
              stroke="#334155"
              strokeWidth="6"
              strokeDasharray="360 120"
              strokeDashoffset="120"
            />
            {/* Active RPM Fill */}
            <circle
              cx="100"
              cy="100"
              r="80"
              fill="none"
              stroke={telemetry.rpm > 7000 ? '#ef4444' : '#3b82f6'}
              strokeWidth="6"
              strokeDasharray={`${rpmPercent * 335} 400`}
              strokeDashoffset="120"
              className="transition-all duration-75"
            />
          </svg>

          {/* Rotating Needle */}
          <div
            className="absolute w-1 h-20 bg-rose-500 origin-bottom rounded-full shadow-lg shadow-rose-500/80 transition-transform duration-75"
            style={{
              bottom: '50%',
              transform: `rotate(${rpmNeedleDeg}deg)`
            }}
          />

          {/* Needle Hub */}
          <div className="w-5 h-5 rounded-full bg-slate-300 border-2 border-slate-800 z-10"></div>

          {/* Speed & Gear Digital Cluster */}
          <div className="flex flex-col items-center mt-3 z-10 font-mono">
            {/* Gear Indicator */}
            <div className="text-3xl font-black italic text-amber-400 drop-shadow">
              {telemetry.gear === 0 ? 'R' : telemetry.gear}
            </div>

            {/* Digital Speedometer */}
            <div className="text-4xl font-black text-white italic tracking-tighter leading-none mt-0.5">
              {telemetry.speedKmh}
            </div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              KM/H
            </div>

            {/* RPM Counter */}
            <div className="text-[11px] text-blue-400 font-semibold mt-1">
              {telemetry.rpm} <span className="text-[9px] text-slate-500">RPM</span>
            </div>
          </div>
        </div>

        {/* Pedal Bars (Throttle & Brake) */}
        <div className="flex gap-2 pb-2">
          {/* Brake Bar */}
          <div className="flex flex-col items-center gap-1">
            <div className="w-2.5 h-16 bg-slate-900 rounded-full border border-slate-700 overflow-hidden flex flex-col justify-end p-0.5">
              <div
                className="w-full bg-rose-500 rounded-full transition-all duration-75"
                style={{ height: `${telemetry.brake * 100}%` }}
              />
            </div>
            <span className="text-[9px] font-mono text-rose-400 font-bold">BRK</span>
          </div>

          {/* Throttle Bar */}
          <div className="flex flex-col items-center gap-1">
            <div className="w-2.5 h-16 bg-slate-900 rounded-full border border-slate-700 overflow-hidden flex flex-col justify-end p-0.5">
              <div
                className="w-full bg-emerald-500 rounded-full transition-all duration-75"
                style={{ height: `${telemetry.throttle * 100}%` }}
              />
            </div>
            <span className="text-[9px] font-mono text-emerald-400 font-bold">GAS</span>
          </div>
        </div>
      </div>

      {/* MOBILE / ON-SCREEN TOUCH CONTROLS (for touchscreens or quick testing) */}
      <div className="absolute bottom-6 left-6 flex gap-2 pointer-events-auto sm:hidden z-20">
        <button
          onTouchStart={() => { if (gameRef.current) gameRef.current.input.steer = 1; }}
          onTouchEnd={() => { if (gameRef.current) gameRef.current.input.steer = 0; }}
          className="w-14 h-14 rounded-full bg-slate-800/80 border border-slate-600 text-white font-bold text-xl active:bg-blue-600"
        >
          &larr;
        </button>
        <button
          onTouchStart={() => { if (gameRef.current) gameRef.current.input.steer = -1; }}
          onTouchEnd={() => { if (gameRef.current) gameRef.current.input.steer = 0; }}
          className="w-14 h-14 rounded-full bg-slate-800/80 border border-slate-600 text-white font-bold text-xl active:bg-blue-600"
        >
          &rarr;
        </button>
      </div>

      <div className="absolute bottom-6 right-6 flex gap-2 pointer-events-auto sm:hidden z-20">
        <button
          onTouchStart={() => { if (gameRef.current) gameRef.current.input.brake = 1; }}
          onTouchEnd={() => { if (gameRef.current) gameRef.current.input.brake = 0; }}
          className="w-14 h-14 rounded-full bg-rose-800/80 border border-rose-600 text-white font-bold active:bg-rose-600"
        >
          PHANH
        </button>
        <button
          onTouchStart={() => { if (gameRef.current) gameRef.current.input.throttle = 1; }}
          onTouchEnd={() => { if (gameRef.current) gameRef.current.input.throttle = 0; }}
          className="w-14 h-14 rounded-full bg-emerald-800/80 border border-emerald-600 text-white font-bold active:bg-emerald-600"
        >
          GA
        </button>
      </div>
    </div>
  );
}
