import { Chess } from 'chess.js';

/**
 * Evaluates whether a move constitutes moving the same specific piece multiple times
 * during the opening phase (moves 1..10) without necessity.
 */
export function evaluateTempoLoss(move, moveNumber, history = []) {
  if (!move || move.piece === 'p') return null;
  if (move.san === 'O-O' || move.san === 'O-O-O') return null;

  const actualMoveNum = (typeof moveNumber === 'number' && moveNumber > 0)
    ? moveNumber
    : Math.floor((history?.length || 0) / 2) + 1;

  // Strictly only in opening phase (first 10 moves)
  if (actualMoveNum > 10) return null;

  if (!Array.isArray(history) || history.length === 0) return null;

  // Trace back the chain of squares for this EXACT piece
  let currSquare = move.from;
  let chainMoves = 0;

  for (let i = history.length - 1; i >= 0; i--) {
    const past = history[i];
    if (past.color === move.color && past.to === currSquare && past.piece === move.piece) {
      chainMoves++;
      currSquare = past.from;
    }
  }

  // If this exact piece has already moved in the opening, moving it again loses tempo
  if (chainMoves >= 1) {
    return {
      isTempoLoss: true,
      piece: move.piece,
      moveCount: chainMoves + 1
    };
  }

  return null;
}
