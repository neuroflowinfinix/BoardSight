import React, { useState, useEffect } from 'react';
import EvalBadge from './EvalBadge';
import GameGraph from './GameGraph';

function getPhaseGrade(accuracy) {
  if (accuracy >= 95) return 'A+';
  if (accuracy >= 90) return 'A';
  if (accuracy >= 80) return 'B';
  if (accuracy >= 70) return 'C';
  if (accuracy >= 60) return 'D';
  return 'F';
}

function PhaseReportCard({ moves, serverMetrics, color, isDesktopModal }) {
  const phaseMoves = {
    opening: moves.filter(m => m.phase === 'opening'),
    middlegame: moves.filter(m => m.phase === 'middlegame'),
    endgame: moves.filter(m => m.phase === 'endgame')
  };

  const phases = serverMetrics?.phases || {
    opening: { white: 0, black: 0 },
    middlegame: { white: 0, black: 0 },
    endgame: { white: 0, black: 0 }
  };

  const accField = color === 'w' ? 'white' : 'black';

  const getAcc = (phaseObj) => {
    const val = phaseObj?.[accField];
    return typeof val === 'object' ? (val?.accuracy ?? 0) : (val ?? 0);
  };

  const acc = {
    opening: phaseMoves.opening.length ? Math.round(getAcc(phases.opening)) : 0,
    middlegame: phaseMoves.middlegame.length ? Math.round(getAcc(phases.middlegame)) : 0,
    endgame: phaseMoves.endgame.length ? Math.round(getAcc(phases.endgame)) : 0,
  };

  // Find the lowest accuracy phase to add the focus tag
  let worstPhase = 'middlegame';
  let lowestAcc = 100;
  Object.entries(acc).forEach(([phase, val]) => {
    if (phaseMoves[phase].length > 0 && val < lowestAcc) {
      lowestAcc = val;
      worstPhase = phase;
    }
  });

  return (
    <div className={`mt-auto pt-3 border-t border-gray-100 flex flex-col gap-2 px-1 font-mono ${isDesktopModal ? 'text-[15px]' : 'text-[13px]'} tracking-tight`}>
      {['opening', 'middlegame', 'endgame'].map(phase => {
        if (!phaseMoves[phase].length) return null;
        const isWorst = phase === worstPhase && lowestAcc < 90;
        return (
          <div key={phase} className="flex justify-between items-center whitespace-nowrap">
            <span className="text-gray-400 dark:text-slate-500 uppercase w-28">{phase}:</span>
            <span className={`font-bold ${isWorst ? 'text-orange-600' : 'text-gray-700 dark:text-slate-300'}`}>
              {getPhaseGrade(acc[phase])} <span className="text-gray-400 dark:text-slate-500 font-normal">({acc[phase]}%)</span>
            </span>
            <span className="w-[90px] text-right text-orange-500 italic text-xs">
              {isWorst ? '← focus here' : ''}
            </span>
          </div>
        );
      })}
    </div>
  );
}

const SHOWN_ROWS = [
  'brilliant','great','best','excellent','good','inaccuracy','miss','mistake','blunder',
];

function AccuracyRing({ value, label, color, title, isDesktopModal }) {
  const [animValue, setAnimValue] = useState(0);

  useEffect(() => {
    // Spring from 0 to value upon mounting
    const timer = setTimeout(() => setAnimValue(value), 100);
    return () => clearTimeout(timer);
  }, [value]);

  // Use the color scheme from AccuracyPanel dynamically as it springs
  const getDynamicColor = (val) => {
    // Calculates a perfect smooth gradient: 0 is Red (0° hue), 100 is Green (120° hue)
    const hue = Math.max(0, Math.min(100, val)) * 1.2;
    // Lowered lightness (45% -> 40%) and saturation (85% -> 80%) for a deeper, less neon green
    return `hsl(${hue}, 80%, 40%)`;
  };

  const currentColor = getDynamicColor(animValue);
  const radius = 35; // Increased from 30
  const circ = 2 * Math.PI * radius;
  const offset = circ - (animValue / 100) * circ;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-[84px] h-[84px]">
        <svg viewBox="0 0 84 84" className="w-full h-full -rotate-90">
          <circle cx="42" cy="42" r={radius} fill="none" className="stroke-gray-200 dark:stroke-slate-700" strokeWidth="6" />
          <circle cx="42" cy="42" r={radius} fill="none"
            stroke={currentColor} strokeWidth="6" strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={offset}
            className="transition-all duration-[900ms] ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Ensure the text number also springs up with the animation */}
          <span className={`font-black text-gray-800 dark:text-slate-100 leading-none tracking-tight ${isDesktopModal ? 'text-[24px]' : 'text-[20px]'}`}>{Number(animValue).toFixed(1)}</span>
        </div>
      </div>
      <div className="flex items-center justify-center gap-1">
        {title && <span className={`font-black text-red-700 uppercase tracking-wider ${isDesktopModal ? 'text-[15px]' : 'text-[13px]'}`}>{title}</span>}
        <span className={`font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500 ${isDesktopModal ? 'text-[15px]' : 'text-[13px]'}`}>{label}</span>
      </div>
    </div>
  );
}

function PlayerStats({ label, moves, pgn_elo, color, site, title, estEloProp, serverMetrics, isDesktopModal }) {
  const counts = (color === 'w' ? serverMetrics?.whiteCounts : serverMetrics?.blackCounts) || {};

  const acpl = (color === 'w' ? serverMetrics?.whiteACPL : serverMetrics?.blackACPL) || 0;
  
  const rawAcc = color === 'w' ? serverMetrics?.gameAccuracy?.white : serverMetrics?.gameAccuracy?.black;
  const actualAcc = typeof rawAcc === 'object' ? rawAcc.accuracy : rawAcc;
  const accVal = Math.max(0, Math.min(100, actualAcc || 0));

  // Using master Elo from props to ensure 100% match with Header
  const estElo = estEloProp ?? "?";

  // Custom Color Logic based on exact thresholds
  let accColor = '#96BC4B'; // Light Green (> 70)
  if (accVal <= 35) {
    accColor = '#ef4444'; // Red
  } else if (accVal <= 70) {
    accColor = '#f59e0b'; // Orange
  }

  return (
    <div className="flex-1 min-w-0 flex flex-col gap-3">
      {/* Accuracy ring */}
      <div className="flex items-center justify-center mt-3">
        <AccuracyRing value={accVal} label={label} color={accColor} title={title} isDesktopModal={isDesktopModal} />
      </div>

      {/* ACPL + Est Elo (Bigger Text) */}
      <div className="text-center mb-1">
        <div className={`text-gray-500 dark:text-slate-400 ${isDesktopModal ? 'text-[18px]' : 'text-[15px]'}`}>ACPL: <span className="font-bold text-gray-800 dark:text-slate-200">{acpl}</span></div>
        <div className={`text-gray-500 dark:text-slate-400 ${isDesktopModal ? 'text-[18px]' : 'text-[15px]'}`}>
          Est: <span className="font-bold text-green-600">{estElo}</span>
        </div>
        <div className={`text-gray-400 dark:text-slate-500 mt-0.5 ${isDesktopModal ? 'text-sm' : 'text-xs'}`}>
          ({Number.isFinite(pgn_elo) ? pgn_elo : '-'})
        </div>
      </div>

      {/* Classification counts (Bigger Text) */}
      <div className="flex flex-col gap-1.5 px-2 mt-1">
        {SHOWN_ROWS.map(id => {
          const n = counts[id] || 0;
          if (n === 0) return null;
          return (
            <div key={id} className="flex items-center gap-2 px-0.5">
              <div className="w-[18px] h-[18px] shrink-0 flex items-center justify-center">
                <EvalBadge type={id} />
              </div>
              <span className={`text-gray-500 dark:text-slate-400 capitalize flex-1 leading-none ${isDesktopModal ? 'text-[15px]' : 'text-[13px]'}`}>{id}</span>
              <span className={`font-bold text-gray-700 dark:text-slate-300 ${isDesktopModal ? 'text-[15px]' : 'text-[13px]'}`}>{n}</span>
            </div>
          );
        })}
      </div>

      {/* Phase Analysis Report Card */}
      <PhaseReportCard moves={moves} serverMetrics={serverMetrics} color={color} isDesktopModal={isDesktopModal} />
    </div>
  );
}

export default function SummaryPanel({ moves, gameInfo, whiteEstElo, blackEstElo, serverMetrics, isDesktopModal }) {
  if (!moves.length) return null;

  return (
    <div className={`bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm p-2.5 ${isDesktopModal ? 'flex flex-col h-full' : ''}`}>
      <p className={`font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-1.5 text-center ${isDesktopModal ? 'text-sm' : 'text-xs'}`}>
        Summary
      </p>
      <div className="flex gap-1.5 flex-shrink-0">
        <PlayerStats
          label={gameInfo?.white || 'White'}
          moves={moves} color="w"
          pgn_elo={gameInfo?.whiteElo}
          site={gameInfo?.site}
          title={gameInfo?.whiteTitle}
          estEloProp={whiteEstElo}
          serverMetrics={serverMetrics}
          isDesktopModal={isDesktopModal}
        />
        <div className="w-px bg-gray-100 self-stretch" />
        <PlayerStats
          label={gameInfo?.black || 'Black'}
          moves={moves} color="b"
          pgn_elo={gameInfo?.blackElo}
          site={gameInfo?.site}
          title={gameInfo?.blackTitle}
          estEloProp={blackEstElo}
          serverMetrics={serverMetrics}
          isDesktopModal={isDesktopModal}
        />
      </div>

      {isDesktopModal && (
        <div className="mt-4 pt-4 border-t border-gray-100 flex-1 flex flex-col min-h-0 px-2">
          <p className="font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-3 text-center text-xs">
            Game Evaluation
          </p>
          <div className="flex-1 min-h-[150px] flex items-center justify-center">
            <div className="w-full max-w-4xl h-full">
              <GameGraph moves={moves} currentMoveIndex={-1} totalMoves={moves.length} />
            </div>
          </div>
          <div className="mt-4 text-center text-[13px] text-gray-500 dark:text-slate-400 max-w-3xl mx-auto leading-relaxed shrink-0 pb-6 px-4">
            <span className="font-bold text-gray-700 dark:text-slate-300">Graph Info:</span> This graph visualizes the engine's evaluation throughout the game. 
            The area above the center line represents a White advantage, while the area below represents a Black advantage. 
            Spikes indicate blunders, mistakes, or sudden shifts in the game's momentum.
          </div>
        </div>
      )}
    </div>
  );
}
