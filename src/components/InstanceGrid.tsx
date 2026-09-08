import React, { RefObject } from 'react';
import { Camera, Maximize2, Radio, Trophy, Gauge } from 'lucide-react';
import { CameraMode, InstanceRuntime } from '../types';

interface InstanceGridProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  instances: InstanceRuntime[];
  activeCount: number;
  onInspectInstance: (instanceId: number) => void;
  onQuickSwitchCamera?: (instanceId: number, mode: CameraMode) => void;
}

export const InstanceGrid: React.FC<InstanceGridProps> = ({
  canvasRef,
  instances,
  activeCount,
  onInspectInstance
}) => {
  // Bố cục lưới dựa theo số instance kích hoạt
  const getGridColsClass = (count: number) => {
    switch (count) {
      case 1:
        return 'grid-cols-1 grid-rows-1';
      case 2:
        return 'grid-cols-1 md:grid-cols-2 grid-rows-1';
      case 4:
        return 'grid-cols-2 grid-rows-2';
      case 6:
        return 'grid-cols-2 md:grid-cols-3 grid-rows-2';
      case 8:
        return 'grid-cols-2 md:grid-cols-4 grid-rows-2';
      case 10:
        return 'grid-cols-2 md:grid-cols-5 grid-rows-2';
      default:
        return 'grid-cols-2 md:grid-cols-4 grid-rows-2';
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getCameraLabelVN = (mode: CameraMode) => {
    switch (mode) {
      case CameraMode.BEHIND: return '1. Sau Xe';
      case CameraMode.HOOD: return '2. Mui Xe / Lái';
      case CameraMode.LOW_GROUND: return '3. Sát Mặt Đường';
      case CameraMode.SIDE_PROFILE: return '4. Bên Hông Xe';
      case CameraMode.FLYCAM: return '5. Flycam Drone';
      case CameraMode.PANORAMIC: return '6. Toàn Cảnh';
      case CameraMode.LEADER_TRACKING: return '7. Bám Xe Đầu';
      case CameraMode.OVERTAKE_ACTION: return '8. Góc Vượt Mặt';
      case CameraMode.COLLISION_DRIFT: return '9. Va Chạm / Drift';
      case CameraMode.CINEMATIC_ORBIT: return '10. Xoay 360';
      default: return 'Cinematic';
    }
  };

  return (
    <div className="relative flex-1 w-full h-full min-h-[450px] bg-black overflow-hidden flex flex-col">
      {/* Canvas WebGL render trực tiếp đa khung hình */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-cover z-0"
      />

      {/* Lớp phủ HUD hiển thị thông tin thời gian thực 9:16 Full HD Dọc */}
      <div
        className={`absolute inset-0 z-10 grid ${getGridColsClass(
          activeCount
        )} gap-2 p-2 pointer-events-none`}
      >
        {instances.slice(0, activeCount).map(instance => {
          const leader = instance.cars.find(c => c.rank === 1) || instance.cars[0];
          const progressPct = Math.min(
            100,
            (instance.chunkTimeElapsed / instance.totalChunkDuration) * 100
          );
          const remainingSecs = Math.max(
            0,
            Math.ceil(instance.totalChunkDuration - instance.chunkTimeElapsed)
          );
          const leaderSpeed = Math.round(leader?.speed || 0);

          return (
            <div
              key={instance.id}
              className="flex items-center justify-center w-full h-full min-h-0 overflow-hidden pointer-events-none"
            >
              <div
                id={`viewport-tile-${instance.id}`}
                className="relative aspect-[9/16] h-full max-h-full max-w-full rounded-2xl border-2 border-slate-700/80 overflow-hidden bg-transparent flex flex-col justify-between p-2 shadow-2xl pointer-events-auto group hover:border-cyan-400/90 transition-all ring-1 ring-white/10"
              >
                {/* Lớp Gradient bảo đảm chữ luôn đọc rõ nét */}
                <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/85 via-black/40 to-transparent pointer-events-none -z-10" />
                <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none -z-10" />

                {/* Thanh thông tin phía trên - Chuẩn Video Dọc 9:16 */}
                <div className="flex flex-col gap-1.5 z-10">
                  <div className="flex items-center justify-between">
                    {/* Badge Luồng & Định dạng */}
                    <div className="flex items-center gap-1">
                      <span className="px-1.5 py-0.5 rounded bg-cyan-500/30 text-cyan-300 font-mono text-[9px] font-bold border border-cyan-500/40 shadow-sm">
                        LUỒNG #{instance.id.toString().padStart(2, '0')}
                      </span>
                      <span className="px-1 py-0.5 rounded bg-slate-900/80 text-emerald-400 font-mono text-[9px] font-semibold border border-slate-700">
                        1080x1920 (9:16)
                      </span>
                    </div>

                    {/* Trạng thái REC */}
                    <div className="flex items-center gap-1 bg-black/80 backdrop-blur-md px-1.5 py-0.5 rounded-full border border-rose-500/40">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                      <span className="text-[9px] font-mono font-bold text-rose-400">
                        REC {formatTime(instance.chunkTimeElapsed)}
                      </span>
                    </div>
                  </div>

                  {/* Thẻ FPS & Góc quay */}
                  <div className="flex items-center justify-between text-[9px]">
                    <span className="text-slate-300 font-medium truncate max-w-[100px] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      60 FPS • .MP4
                    </span>
                    <div className="flex items-center gap-1 text-purple-300 bg-purple-950/80 px-1.5 py-0.5 rounded border border-purple-500/40">
                      <Camera className="w-2.5 h-2.5" />
                      <span className="truncate max-w-[85px]">{getCameraLabelVN(instance.currentCameraMode)}</span>
                    </div>
                  </div>
                </div>

                {/* Nút xem chi tiết khi rê chuột */}
                <div className="flex-1 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-200 z-10">
                  <button
                    id={`btn-inspect-${instance.id}`}
                    onClick={() => onInspectInstance(instance.id)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-cyan-600/95 hover:bg-cyan-500 text-white text-[11px] font-bold shadow-lg backdrop-blur cursor-pointer active:scale-95 transition"
                  >
                    <Maximize2 className="w-3 h-3" />
                    Xem & Chọn 10 Góc Quay
                  </button>
                </div>

                {/* Thông số xe dẫn đầu & Tốc độ cao & Tiến độ */}
                <div className="space-y-1 z-10">
                  {/* Bảng tốc độ và xe dẫn đầu */}
                  <div className="flex items-center justify-between text-[10px] bg-black/80 backdrop-blur-md px-2 py-1 rounded-lg border border-slate-800">
                    <div className="flex items-center gap-1.5 truncate">
                      <Trophy className="w-3 h-3 text-amber-400 shrink-0" />
                      <span
                        className="w-2 h-2 rounded-full shrink-0 ring-1 ring-white/30"
                        style={{ backgroundColor: leader?.color || '#00f0ff' }}
                      ></span>
                      <span className="font-semibold text-slate-200 truncate max-w-[80px]">
                        {leader?.name || 'Xe Dẫn Đầu'}
                      </span>
                    </div>

                    <div className={`flex items-center gap-1 font-mono font-bold shrink-0 ${
                      leaderSpeed > 340 ? 'text-rose-400' : 'text-cyan-300'
                    }`}>
                      <Gauge className="w-3 h-3" />
                      <span>{leaderSpeed} km/h</span>
                    </div>
                  </div>

                  {/* Thanh tiến trình cắt video */}
                  <div className="space-y-0.5">
                    <div className="flex justify-between text-[8.5px] font-mono text-slate-400">
                      <span className="flex items-center gap-1 text-emerald-400">
                        <Radio className="w-2 h-2" />
                        Video #{instance.currentVideoChunkIndex}
                      </span>
                      <span>Còn {remainingSecs}s</span>
                    </div>
                    <div className="w-full h-1 bg-slate-800/90 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-300"
                        style={{ width: `${progressPct}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
