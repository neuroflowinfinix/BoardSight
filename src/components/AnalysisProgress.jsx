import React, { useEffect, useState, useRef } from 'react';

export default function AnalysisProgress({ current, total, isFetchingBookMoves }) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  const isComplete = total > 0 && current >= total;
  const [dots, setDots] = useState('');
  const intervalRef = useRef(null);

  useEffect(() => {
    if (isComplete) {
      setDots('');
      return;
    }
    intervalRef.current = setInterval(() => {
      setDots(d => d.length >= 3 ? '' : d + '.');
    }, 380);
    return () => clearInterval(intervalRef.current);
  }, [isComplete]);

  return (
    <div className="bg-[#4a7c59]/5 rounded-xl border border-[#4a7c59]/20 shadow-sm p-3">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-2 h-2 rounded-full shrink-0 ${isComplete ? 'bg-[#4a7c59]' : 'bg-[#4a7c59] animate-pulse'}`} />
          {/* Fixed width container prevents the text from jumping as dots animate */}
          <div className="w-48 text-left truncate">
            <span className="text-xs font-bold text-gray-800 dark:text-slate-200">
              {isComplete ? 'Analyzed game...' : isFetchingBookMoves ? `Fetching book moves${dots}` : `Analyzing${dots}`}
            </span>
          </div>
        </div>
        <span className="text-xs font-black text-[#4a7c59] font-mono">
          {percentage}%
        </span>
      </div>
      <div className="w-full bg-[#4a7c59]/20 rounded-full h-1.5 overflow-hidden">
        <div
          className="bg-[#4a7c59] h-1.5 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}