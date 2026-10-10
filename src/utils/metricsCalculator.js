// ─────────────────────────────────────────────────────────────────────────────
// Client-side Metrics Calculator
// Computes game accuracy, phase accuracies, ACPL, and classification counts.
// Used directly or as an instant local fallback for fetchGameMetrics.
// ─────────────────────────────────────────────────────────────────────────────

import { calculateGameAccuracy } from './accuracy.js';

export function countClassifications(analyzedMoves, color) {
  const counts = {
    brilliant: 0, great: 0, best: 0, excellent: 0, good: 0,
    inaccuracy: 0, miss: 0, mistake: 0, blunder: 0, book: 0, novelty: 0
  };
  for (const m of analyzedMoves) {
    if (m.color === color && m.classification) {
      const id = m.classification.id;
      if (counts[id] !== undefined) counts[id]++;
    }
  }
  return counts;
}

export function calcACPL(analyzedMoves, color) {
  const moves = analyzedMoves.filter(
    m => m.color === color && m.classification?.id !== 'book'
  );
  if (!moves.length) return 0;
  const total = moves.reduce((s, m) => {
    let l = m.loss ?? 0;
    return s + Math.max(0, Number.isNaN(l) ? 0 : l);
  }, 0);
  return Math.round(total / moves.length);
}

export function calculateAllMetrics(movesArray, whiteRating = 0, blackRating = 0) {
  const gameAccuracy = calculateGameAccuracy(movesArray, whiteRating, blackRating);

  const whiteACPL = calcACPL(movesArray, 'w');
  const blackACPL = calcACPL(movesArray, 'b');

  const whiteElo = gameAccuracy.white.estimatedRating;
  const blackElo = gameAccuracy.black.estimatedRating;

  const whiteCounts = countClassifications(movesArray, 'w');
  const blackCounts = countClassifications(movesArray, 'b');

  const openingMoves = movesArray.filter(m => m.phase === 'opening');
  const middlegameMoves = movesArray.filter(m => m.phase === 'middlegame');
  const endgameMoves = movesArray.filter(m => m.phase === 'endgame');

  const phases = {
    opening: calculateGameAccuracy(openingMoves, whiteRating, blackRating),
    middlegame: calculateGameAccuracy(middlegameMoves, whiteRating, blackRating),
    endgame: calculateGameAccuracy(endgameMoves, whiteRating, blackRating)
  };

  return {
    gameAccuracy,
    phases,
    whiteACPL,
    blackACPL,
    whiteElo,
    blackElo,
    whiteCounts,
    blackCounts
  };
}
