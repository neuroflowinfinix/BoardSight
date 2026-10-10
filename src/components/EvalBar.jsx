import React from 'react';

export default function EvalBar({ score, isWhiteTurn }) {
  // Engine scores above 9000 indicate a forced mate. 
  const isMate = Math.abs(score) >= 9000;
  let mateMoves = '';

  if (isMate) {
    const moves = 10000 - Math.abs(score);
    mateMoves = moves > 0 && moves <= 100 ? moves : '';
  }

  // Cap the visual bar fill so it doesn't break CSS bounds
  const displayScore = Math.max(-1500, Math.min(1500, score || 0));
  const winProbability = 50 + (50 * (2 / (1 + Math.exp(-0.004 * displayScore)) - 1));
  const whiteHeight = `${winProbability}%`;
  const isWhiteWinning = score >= 0;

  // Removed the '+' sign to save horizontal space (the bar color already indicates who is winning)
  const label = isMate
    ? (score > 0 ? `M${mateMoves}` : `-M${mateMoves}`)
    : Math.abs(score / 100).toFixed(1);

  return (
    <div className="w-6 sm:w-7 h-full bg-gray-800 rounded-md sm:rounded-lg overflow-hidden flex flex-col justify-end relative shadow-inner select-none shrink-0 isolate border border-black/10">
      {/* Black portion top */}
      <div className="w-full bg-gray-800 flex-1 transition-all duration-700 ease-in-out" />

      {/* White portion bottom */}
      <div
        className="w-full bg-white transition-all duration-700 ease-in-out"
        style={{ height: whiteHeight }}
      />

      {/* Score label */}
      <div
        className={`absolute left-0 right-0 flex items-center justify-center pointer-events-none px-0.5 z-10
          ${isWhiteWinning ? 'bottom-1.5' : 'top-1.5'}`}
      >
        <span
          className={`text-[9px] sm:text-[11px] font-black leading-none tracking-tighter text-center w-full
            ${isWhiteWinning ? 'text-gray-800 dark:text-slate-800' : 'text-white'}`}
        >
          {label}
        </span>
      </div>
    </div>
  );
}