import { useEffect, useState } from 'react';

interface LoadingScreenProps {
  roomName: string;
  onComplete: () => void;
}

export function LoadingScreen({ roomName, onComplete }: LoadingScreenProps) {
  const [progress, setProgress] = useState(12);

  useEffect(() => {
    const start = performance.now();
    const duration = 850;
    let raf = 0;

    const tick = (now: number) => {
      const elapsed = now - start;
      const pct = Math.min(100, Math.round(12 + (elapsed / duration) * 88));
      setProgress(pct);
      if (elapsed < duration) {
        raf = requestAnimationFrame(tick);
      } else {
        onComplete();
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0d1926] text-white select-none">
      {/* Classic Hotel Silhouette */}
      <div className="mb-6 flex flex-col items-center">
        <svg className="h-32 w-48 mb-4" viewBox="0 0 180 120" shapeRendering="crispEdges">
          <rect x="60" y="16" width="60" height="96" fill="#23486b" />
          <rect x="66" y="8" width="48" height="8" fill="#17324b" />
          <rect x="78" y="2" width="24" height="6" fill="#ffd400" />
          <rect x="70" y="24" width="8" height="8" fill="#fef08a" />
          <rect x="86" y="24" width="8" height="8" fill="#fef08a" />
          <rect x="102" y="24" width="8" height="8" fill="#38bdf8" />
          <rect x="70" y="40" width="8" height="8" fill="#38bdf8" />
          <rect x="86" y="40" width="8" height="8" fill="#fef08a" />
          <rect x="102" y="40" width="8" height="8" fill="#fef08a" />
          <rect x="70" y="56" width="8" height="8" fill="#fef08a" />
          <rect x="86" y="56" width="8" height="8" fill="#38bdf8" />
          <rect x="102" y="56" width="8" height="8" fill="#fef08a" />
          <rect x="78" y="88" width="24" height="24" fill="#0f2336" />
          <rect x="28" y="52" width="32" height="60" fill="#1b3a57" />
          <rect x="120" y="46" width="32" height="66" fill="#1b3a57" />
        </svg>

        <div className="flex items-center gap-2 rounded border-2 border-[#1b1922] bg-[#ffd400] px-4 py-1.5 shadow-[0_3px_0_#9e6e00]">
          <span className="font-pixel text-2xl text-[#1b1922]">PIXL</span>
          <span className="rounded bg-[#9e1b1b] px-1.5 py-0.5 font-pixel text-[10px] font-bold text-[#fef08a]">
            HOTEL
          </span>
        </div>
      </div>

      {/* Classic Chunky Loading Bar */}
      <div className="w-72 sm:w-80">
        <div className="h-6 w-full rounded border-2 border-[#94a3b8] bg-[#162536] p-0.5 shadow-inner">
          <div
            className="h-full bg-gradient-to-b from-[#7dd3fc] via-[#38bdf8] to-[#0284c7] transition-none"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-2.5 flex items-center justify-between text-xs font-bold text-slate-300">
          <span>Entering {roomName}...</span>
          <span className="font-mono-num">{progress}%</span>
        </div>
      </div>
    </div>
  );
}
