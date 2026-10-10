import React from 'react';

function AccuracyRing({ value, label, color }) {
  const radius = 26; // Increased from 22
  const circ = 2 * Math.PI * radius;
  const offset = circ - (value / 100) * circ;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-16 h-16">
        <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
          <circle cx="32" cy="32" r={radius} fill="none" className="stroke-gray-200 dark:stroke-slate-700" strokeWidth="5" />
          <circle
            cx="32" cy="32" r={radius}
            fill="none"
            stroke={color}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[15px] font-black text-gray-800 dark:text-slate-100 leading-none tracking-tight">{Number(value).toFixed(1)}</span>
        </div>
      </div>
      <span className="text-xs font-bold uppercase tracking-wider text-gray-500">{label}</span>
    </div>
  );
}

export default function AccuracyPanel({ whiteAccuracy, blackAccuracy }) {
  const getColor = (val) => {
    // Calculates a perfect smooth gradient: 0 is Red (0° hue), 100 is Green (120° hue)
    const hue = Math.max(0, Math.min(100, val)) * 1.2;
    return `hsl(${hue}, 85%, 45%)`;
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-gray-500 text-center mb-3">Accuracy</p>
      <div className="flex justify-around items-center">
        <AccuracyRing value={whiteAccuracy} label="White" color={getColor(whiteAccuracy)} />
        <div className="w-px h-12 bg-gray-100" />
        <AccuracyRing value={blackAccuracy} label="Black" color={getColor(blackAccuracy)} />
      </div>
    </div>
  );
}
