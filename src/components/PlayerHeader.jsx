import React from 'react';
import { formatClock } from '../utils/pgnParser';

// Piece values for material score
const PIECE_VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9 };

// Unicode chess symbols (appended with \uFE0E to force text rendering and prevent emoji styles)
const PIECE_SYMBOL = {
  white: { q: '♛\uFE0E', r: '♜\uFE0E', b: '♝\uFE0E', n: '♞\uFE0E', p: '♟\uFE0E' },
  black: { q: '♛\uFE0E', r: '♜\uFE0E', b: '♝\uFE0E', n: '♞\uFE0E', p: '♟\uFE0E' },
};

/**
 * Renders a compact row of captured pieces, grouped and sorted by value.
 * Only shows piece types where count > 0.
 * capturedBy = 'white' → pieces captured BY white (white's captures = black pieces lost)
 */
function CapturedPieces({ pieces, score, side }) {
  // Order: most valuable first
  const ORDER = ['q', 'r', 'b', 'n', 'p'];
  const hasPieces = ORDER.some(t => (pieces[t] || 0) > 0);
  const isWhiteSide = side === 'white';

  return (
    <div className="flex items-center flex-wrap gap-x-1 gap-y-0.5 min-w-0">
      {/* Piece icons */}
      <div className="flex items-center flex-wrap gap-0" style={{ lineHeight: 1 }}>
        {ORDER.map(type => {
          const count = pieces[type] || 0;
          if (count === 0) return null;
          return (
            <div key={type} className="flex items-center mr-[3px] last:mr-0">
              <span
                className={`text-[14px] leading-none select-none ${
                  isWhiteSide
                    ? 'text-gray-700 dark:text-slate-300'
                    : 'text-gray-300 dark:text-slate-500'
                }`}
                style={{ filter: isWhiteSide ? 'none' : 'drop-shadow(0 0 1px rgba(0,0,0,0.8))' }}
              >
                {PIECE_SYMBOL.white[type]}
              </span>
              {count > 1 && (
                <span className={`text-[10px] font-bold ml-[1px] select-none ${
                  isWhiteSide ? 'text-gray-500 dark:text-slate-400' : 'text-gray-500 dark:text-slate-500'
                }`}>
                  x{count}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Material advantage score — only show if positive */}
      {score > 0 && (
        <span className={`text-[11px] font-black ml-0.5 shrink-0 ${
          isWhiteSide
            ? 'text-gray-500 dark:text-slate-400'
            : 'text-gray-500 dark:text-slate-500'
        }`}>
          +{score}
        </span>
      )}
    </div>
  );
}

export default function PlayerHeader({
  name, rating, clock, isActive, side, estElo, title, avatarUrl,
  capturedPieces, materialScore,
}) {
  const isWhite = side === 'white';
  const hasCaptured = capturedPieces && Object.values(capturedPieces).some(v => v > 0);

  return (
    <div
      className={`flex items-center justify-between px-2.5 rounded-xl border shadow-sm transition-colors py-1 ${
        isActive
          ? (isWhite
              ? 'bg-white dark:bg-slate-800 border-[#4a7c59]/50'
              : 'bg-gray-800 dark:bg-slate-800 border-[#4a7c59]/50')
          : (isWhite
              ? 'bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700'
              : 'bg-gray-900 dark:bg-slate-900 border-gray-700 dark:border-slate-700')
      }`}
    >
      {/* Left: avatar + name + captured pieces */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {/* Colour indicator / Avatar */}
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name}
            className="w-6 h-6 rounded-sm object-cover shrink-0 shadow-sm border border-gray-200 dark:border-slate-600"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        ) : (
          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
            isWhite
              ? 'bg-white dark:bg-slate-100 border-gray-300 dark:border-slate-400'
              : 'bg-gray-800 dark:bg-slate-700 border-gray-600 dark:border-slate-500'
          }`}>
            <svg className={`w-3.5 h-3.5 ${isWhite ? 'text-gray-800 dark:text-slate-800' : 'text-white'}`}
              viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 3v2H7v2h2v1H5l-1 5h1l1 3h12l1-3h1l-1-5h-4V7h2V5h-2V3H9z" />
            </svg>
          </div>
        )}

        <div className="min-w-0 flex-1">
          {/* Name + title row */}
          <div className={`text-sm font-bold truncate leading-tight flex items-center gap-1 ${
            isWhite ? 'text-black dark:text-white' : 'text-white dark:text-white'
          }`}>
            {title && (
              <span className={`font-black text-xs ${isWhite ? 'text-red-600 dark:text-red-400' : 'text-red-400'}`}>
                {title}
              </span>
            )}
            <span className="truncate">{name}</span>
          </div>

          {/* Rating row */}
          <div className={`text-[11px] font-semibold truncate ${
            isWhite ? 'text-black dark:text-white' : 'text-white dark:text-white'
          }`}>
            {rating && rating !== '?' && !isNaN(parseInt(rating)) ? rating : '-'}
            {estElo != null && !isNaN(estElo) ? ` • Est. ${estElo}` : ''}
          </div>

          {/* Captured pieces row */}
          <div className="mt-0.5 min-h-[16px] flex items-center">
            {hasCaptured && (
              <CapturedPieces
                pieces={capturedPieces}
                score={materialScore ?? 0}
                side={side}
              />
            )}
          </div>
        </div>
      </div>

      {/* Clock */}
      {clock != null && (
        <div className={`font-mono font-bold text-sm px-2 py-1 rounded-lg shrink-0 transition-colors ml-2 ${
          isActive
            ? 'bg-[#4a7c59] text-white shadow-sm'
            : (isWhite
                ? 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300'
                : 'bg-gray-700 dark:bg-slate-700 text-gray-300 dark:text-slate-300')
        }`}>
          {formatClock(clock)}
        </div>
      )}
    </div>
  );
}
