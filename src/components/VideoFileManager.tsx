import React, { useState } from 'react';
import { X, Film, Download, Play, CheckCircle2, FileText, Code, HardDrive, Sparkles } from 'lucide-react';
import { VideoRecordJob } from '../types';

interface VideoFileManagerProps {
  jobs: VideoRecordJob[];
  isOpen: boolean;
  onClose: () => void;
  onDownloadJob: (job: VideoRecordJob) => void;
}

export const VideoFileManager: React.FC<VideoFileManagerProps> = ({
  jobs,
  isOpen,
  onClose,
  onDownloadJob
}) => {
  const [selectedInstanceFilter, setSelectedInstanceFilter] = useState<number | 'all'>('all');
  const [playingJob, setPlayingJob] = useState<VideoRecordJob | null>(null);

  if (!isOpen) return null;

  const filteredJobs = selectedInstanceFilter === 'all'
    ? jobs
    : jobs.filter(j => j.instanceId === selectedInstanceFilter);

  const totalSizeMB = jobs.reduce((acc, curr) => acc + curr.sizeMB, 0);

  const exportMetadataJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(jobs, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `RacingVideoFactory_Catalog_${new Date().toISOString().slice(0, 10)}.json`);
    dlAnchor.click();
  };

  const generateWindowsFFmpegBat = () => {
    const batContent = `@echo off
REM ==========================================================
REM Racing Video Factory - Script chay FFmpeg NVENC tren Windows
REM Xuat video 60FPS cuc nhanh bang phan cung card do hoa GPU
REM ==========================================================

mkdir D:\\RacingVideoFactory\\Videos 2>nul
echo [*] Dang khoi dong pipeline encode video GPU...

REM Cau lenh encode truc tiep NVENC cho 1080x1920 60FPS (Full HD doc, 9:16, H.264 .mp4):
REM ffmpeg -y -f rawvideo -vcodec rawvideo -s 1080x1920 -pix_fmt rgba -r 60 -i - -c:v h264_nvenc -preset p7 -b:v 18M -maxrate 25M -bufsize 36M D:\\RacingVideoFactory\\Videos\\race_vertical_1080x1920.mp4

echo [*] He thong dang hoat dong tren Windows.
pause
`;
    const blob = new Blob([batContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const dlAnchor = document.createElement('a');
    dlAnchor.href = url;
    dlAnchor.download = 'run_nvenc_pipeline.bat';
    dlAnchor.click();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Kho Video Đã Xuất
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-cyan-300 font-mono">
                  {jobs.length} video hoàn chỉnh
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Các clip MP4 2 phút được cắt tự động liên tục và lưu trữ kèm Seed độc lập
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={exportMetadataJSON}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              Xuất Báo Cáo JSON
            </button>

            <button
              onClick={generateWindowsFFmpegBat}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition cursor-pointer"
              title="Tải Script Batch FFmpeg NVENC"
            >
              <Code className="w-3.5 h-3.5 text-amber-400" />
              Tải Script .BAT
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Thanh lọc và tổng kết dung lượng */}
        <div className="px-6 py-2.5 bg-slate-950/60 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            <span className="text-slate-400 font-semibold mr-1">Lọc theo Instance:</span>
            <button
              onClick={() => setSelectedInstanceFilter('all')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition cursor-pointer ${
                selectedInstanceFilter === 'all'
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              Tất Cả
            </button>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(id => (
              <button
                key={id}
                onClick={() => setSelectedInstanceFilter(id)}
                className={`px-2 py-1 rounded text-xs font-mono font-bold transition cursor-pointer ${
                  selectedInstanceFilter === id
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                }`}
              >
                #{id.toString().padStart(2, '0')}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 text-slate-400 font-mono">
            <span className="flex items-center gap-1">
              <HardDrive className="w-3.5 h-3.5 text-slate-500" />
              Tổng dung lượng đã tạo: {totalSizeMB.toFixed(1)} MB
            </span>
          </div>
        </div>

        {/* Danh sách video */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredJobs.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
                <Film className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-300">
                Chưa có video nào hoàn thành trong bộ lọc này.
              </p>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Bấm nút <strong>BẮT ĐẦU CHẠY</strong> ở thanh tiêu đề trên cùng. Hệ thống sẽ render các cuộc đua và tự động đóng file video xuất ra cứ mỗi 2 phút (hoặc 30s nếu chọn test nhanh).
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredJobs.map(job => (
                <div
                  key={job.id}
                  className="bg-slate-950 border border-slate-800 rounded-lg p-3.5 flex flex-col justify-between space-y-3 hover:border-slate-700 transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono text-[10px] font-bold border border-cyan-500/30">
                          CUỘC ĐUA #{job.instanceId.toString().padStart(2, '0')}
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-200 truncate">
                          {job.fileName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <span>{job.biomeName}</span>
                        <span>&bull;</span>
                        <span className="text-amber-400">Về nhất: {job.winnerCar}</span>
                      </div>
                    </div>

                    <div className="text-right font-mono text-[11px] text-slate-400 shrink-0">
                      <span className="block text-slate-200 font-bold">{job.sizeMB} MB</span>
                      <span>{job.durationSeconds}s @ {job.fps}fps</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 font-mono text-[11px] text-emerald-400 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Đã đóng file hoàn chỉnh
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-purple-300 font-mono">
                        <Sparkles className="w-3 h-3" />
                        Seed: #{job.seed}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPlayingJob(job)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition cursor-pointer"
                      >
                        <Play className="w-3 h-3 text-cyan-400 fill-cyan-400" />
                        Xem thử
                      </button>

                      <button
                        onClick={() => onDownloadJob(job)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition cursor-pointer"
                      >
                        <Download className="w-3 h-3" />
                        Tải Video MP4
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal xem video thử */}
        {playingJob && (
          <div className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-3xl w-full overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between p-3 border-b border-slate-800">
                <span className="text-xs font-mono font-bold text-white">
                  Đang phát: {playingJob.fileName}
                </span>
                <button
                  onClick={() => setPlayingJob(null)}
                  className="p-1 text-slate-400 hover:text-white rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 bg-black flex justify-center">
                <video
                  src={playingJob.url}
                  controls
                  autoPlay
                  className="max-h-[60vh] w-full rounded border border-slate-800 object-contain"
                />
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400">
          <span>
            Đường dẫn lưu trữ Windows: <code>D:\RacingVideoFactory\Videos\Instance_XX\</code>
          </span>
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
