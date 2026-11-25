import { useEffect, useState } from 'react';

interface LoadingScreenProps {
  roomName: string;
  onComplete: () => void;
}

export function LoadingScreen({ roomName, onComplete }: LoadingScreenProps) {
  const [progress, setProgress] = useState(14);

  useEffect(() => {
    const start = performance.now();
    const duration = 780;
    let raf = 0;
    let completed = false;

    const advance = (now: number) => {
      if (completed) return;
      const elapsed = now - start;
      const pct = Math.min(100, Math.round(14 + (elapsed / duration) * 86));
      setProgress(pct);
      if (elapsed < duration) {
        raf = requestAnimationFrame(advance);
      } else {
        completed = true;
        onComplete();
      }
    };

    raf = requestAnimationFrame(advance);
    const interval = window.setInterval(() => {
      advance(performance.now());
    }, 50);

    return () => {
      completed = true;
      cancelAnimationFrame(raf);
      window.clearInterval(interval);
    };
  }, [onComplete]);

  return (
    <div
      data-testid="hotel-loading-screen"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#141414] text-white select-none p-4"
    >
      {/* Classic 2009 Flash Hotel Splash */}
      <div className="mb-5 flex flex-col items-center">
        <div className="mb-4 border border-[#000000] bg-[#1d2d3e] p-3 rounded-[3px] shadow-[inset_0_0_0_1px_#3c5b7a]">
          <svg className="h-28 w-44" viewBox="0 0 180 120" shapeRendering="crispEdges">
            <rect x="0" y="0" width="180" height="120" fill="#102133" />
            <rect x="0" y="106" width="180" height="14" fill="#1b3a57" />
            <rect x="58" y="16" width="64" height="92" fill="#2b6ca3" stroke="#000000" strokeWidth="1" />
            <rect x="64" y="8" width="52" height="8" fill="#1d4e78" stroke="#000000" strokeWidth="1" />
            <rect x="76" y="2" width="28" height="6" fill="#ffd400" stroke="#000000" strokeWidth="1" />
            <rect x="68" y="24" width="9" height="9" fill="#fef08a" />
            <rect x="85" y="24" width="9" height="9" fill="#fef08a" />
            <rect x="102" y="24" width="9" height="9" fill="#38bdf8" />
            <rect x="68" y="40" width="9" height="9" fill="#38bdf8" />
            <rect x="85" y="40" width="9" height="9" fill="#fef08a" />
            <rect x="102" y="40" width="9" height="9" fill="#fef08a" />
            <rect x="68" y="56" width="9" height="9" fill="#fef08a" />
            <rect x="85" y="56" width="9" height="9" fill="#38bdf8" />
            <rect x="102" y="56" width="9" height="9" fill="#fef08a" />
            <rect x="78" y="86" width="24" height="22" fill="#0f2336" />
            <rect x="24" y="50" width="34" height="58" fill="#1d4e78" stroke="#000000" strokeWidth="1" />
            <rect x="122" y="44" width="34" height="64" fill="#1d4e78" stroke="#000000" strokeWidth="1" />
          </svg>
        </div>

        <div className="flex items-center gap-2 border border-[#000000] bg-[#ffd400] px-4 py-1.5 rounded-[3px] shadow-[inset_0_1px_0_#fff7b2,0_3px_0_#000000]">
          <span className="font-pixel text-2xl text-[#111827] tracking-tight">PIXL</span>
          <span className="border border-[#000000] bg-[#9e1b1b] px-1.5 py-0.5 font-pixel text-[10px] font-bold text-[#fef08a] rounded-[2px]">
            HOTEL
          </span>
        </div>
      </div>

      {/* Classic Chunky Retro Loading Bar */}
      <div className="w-72 sm:w-80 border border-[#000000] bg-[#222222] p-2.5 rounded-[3px] shadow-[inset_0_0_0_1px_#3a3a3a]">
        <div className="h-5 w-full border border-[#000000] bg-[#111111] p-0.5">
          <div
            className="h-full bg-gradient-to-b from-[#6bd233] via-[#5bb52c] to-[#3d8b18] transition-none"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] font-bold text-[#e5e7eb]">
          <span>Loading {roomName}...</span>
          <span className="font-mono-num text-[#fef08a]">{progress}%</span>
        </div>
      </div>
    </div>
  );
}
