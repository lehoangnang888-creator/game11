import React from 'react';
import { X, Camera, Trophy, Gauge, Activity, RefreshCw } from 'lucide-react';
import { CameraMode, InstanceRuntime } from '../types';

interface InstanceDetailModalProps {
  instance: InstanceRuntime | null;
  onClose: () => void;
  onSelectCamera: (instanceId: number, mode: CameraMode) => void;
  onForceRerollSeed: (instanceId: number) => void;
}

export const InstanceDetailModal: React.FC<InstanceDetailModalProps> = ({
  instance,
  onClose,
  onSelectCamera,
  onForceRerollSeed
}) => {
  if (!instance) return null;

  const cameras: { mode: CameraMode; label: string; desc: string }[] = [
    { mode: CameraMode.BEHIND, label: '1. Phía Sau Xe', desc: 'Bám sau đuôi xe góc nhìn thứ 3 với khoảng cách động' },
    { mode: CameraMode.HOOD, label: '2. Mui Xe / Cockpit', desc: 'Góc nhìn thấp từ nắp capo nhìn thẳng đường đua' },
    { mode: CameraMode.LOW_GROUND, label: '3. Sát Mặt Đường', desc: 'Góc siêu thấp sát lốp và hệ thống giảm xóc' },
    { mode: CameraMode.SIDE_PROFILE, label: '4. Bên Hông Xe', desc: 'Quay ngang hông xe và các pha so kè bánh xe' },
    { mode: CameraMode.FLYCAM, label: '5. Flycam Drone', desc: 'Camera trên không trung bám đuổi theo cung đường' },
    { mode: CameraMode.PANORAMIC, label: '6. Toàn Cảnh Khán Đài', desc: 'Camera góc rộng toàn cảnh từ khán đài' },
    { mode: CameraMode.LEADER_TRACKING, label: '7. Bám Xe Dẫn Đầu', desc: 'Tự động khóa mục tiêu bám theo xe hạng 1 (P1)' },
    { mode: CameraMode.OVERTAKE_ACTION, label: '8. Góc Vượt Mặt', desc: 'Cận cảnh hành động khi xe lách qua đối thủ' },
    { mode: CameraMode.COLLISION_DRIFT, label: '9. Va Chạm & Drift', desc: 'Bắt khoảnh khắc trượt bánh, bốc khói va chạm' },
    { mode: CameraMode.CINEMATIC_ORBIT, label: '10. Xoay 360 Vòng', desc: 'Quỹ đạo xoay mượt mà liên tục quanh xe' },
  ];

  const sortedCars = [...instance.cars].sort((a, b) => a.rank - b.rank);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded bg-cyan-500/20 text-cyan-400 font-mono text-xs font-bold border border-cyan-500/30">
              CHI TIẾT CUỘC ĐUA #{instance.id.toString().padStart(2, '0')}
            </span>
            <div>
              <h2 className="text-sm font-bold text-white">
                {instance.seedData.biome.name}
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Mã Seed: #{instance.seedData.seed} &bull; Thời tiết: {instance.seedData.weather}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onForceRerollSeed(instance.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition cursor-pointer"
              title="Đổi kịch bản mới"
            >
              <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
              Đổi Ngẫu Nhiên Seed Mới
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Nội dung modal */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Lựa chọn trực tiếp 10 góc camera */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-purple-400" />
                Chuyển Thủ Công Trong 10 Góc Quay Cinematic:
              </h3>
              <span className="text-[11px] text-purple-300 font-mono bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800/40">
                Góc hiện tại: {instance.currentCameraMode}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {cameras.map(cam => (
                <button
                  key={cam.mode}
                  onClick={() => onSelectCamera(instance.id, cam.mode)}
                  className={`p-2.5 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between ${
                    instance.currentCameraMode === cam.mode
                      ? 'bg-purple-600/30 border-purple-500 text-white shadow-sm'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <span className="text-xs font-bold">{cam.label}</span>
                  <span className="text-[10px] text-slate-400 mt-1 leading-tight line-clamp-2">
                    {cam.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Bảng xếp hạng và đo lường thông số xe đua AI */}
          <div>
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-400" />
              Bảng Xếp Hạng & Thông Số Xe Đua Tự Lái:
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {sortedCars.map(car => (
                <div
                  key={car.id}
                  className="bg-slate-950 border border-slate-800/80 rounded-lg p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 font-bold text-[11px] flex items-center justify-center font-mono">
                        Hạng {car.rank}
                      </span>
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: car.color }}
                      ></span>
                      <span className="text-xs font-bold text-slate-100 truncate">
                        {car.name}
                      </span>
                    </div>

                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                      {car.type}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="bg-slate-900/80 p-1.5 rounded border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Vận tốc</span>
                      <span className="font-bold text-cyan-400 flex items-center gap-1">
                        <Gauge className="w-3 h-3" />
                        {Math.round(car.speed)} km/h
                      </span>
                    </div>

                    <div className="bg-slate-900/80 p-1.5 rounded border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Vòng đua / Tiến trình</span>
                      <span className="font-bold text-emerald-400">
                        Vòng {car.lap} ({(car.lapProgress * 100).toFixed(0)}%)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-900">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Activity className="w-3 h-3" />
                      Độ hung hãn: {Math.round(car.aggression * 100)}%
                    </span>
                    {car.isDrifting && (
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/30 animate-pulse">
                        ĐANG DRIFT
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400">
          <span>Vòng lặp mô phỏng: 60 FPS &bull; Đường cong Catmull-Rom 3D thực</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded font-semibold transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
