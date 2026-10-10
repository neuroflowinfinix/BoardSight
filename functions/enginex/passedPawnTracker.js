import { Chess } from 'chess.js';

/**
 * Check if a square has a passed pawn for the given color.
 * Rule: Must be within 3 steps of promotion (Rank >= 5 for White, Rank <= 4 for Black),
 * and have no opposing pawns in front on its file or adjacent files.
 */
export function isPassedPawn(chess, sq, color) {
  const piece = chess.get(sq);
  if (!piece || piece.type !== 'p' || piece.color !== color) return false;

  const fileIdx = sq.charCodeAt(0) - 97; // 0..7 for a..h
  const rank = parseInt(sq[1], 10);      // 1..8

  // Must be 3 steps or fewer from promotion:
  // White: Rank 5, 6, 7 (3, 2, 1 steps away)
  // Black: Rank 4, 3, 2 (3, 2, 1 steps away)
  if (color === 'w' && rank < 5) return false;
  if (color === 'b' && rank > 4) return false;

  const oppColor = color === 'w' ? 'b' : 'w';

  // Check files [fileIdx - 1, fileIdx, fileIdx + 1] in front of pawn
  for (let f = Math.max(0, fileIdx - 1); f <= Math.min(7, fileIdx + 1); f++) {
    const fileChar = String.fromCharCode(f + 97);
    if (color === 'w') {
      for (let r = rank + 1; r <= 8; r++) {
        const checkSq = `${fileChar}${r}`;
        const p = chess.get(checkSq);
        if (p && p.type === 'p' && p.color === oppColor) return false;
      }
    } else {
      for (let r = rank - 1; r >= 1; r--) {
        const checkSq = `${fileChar}${r}`;
        const p = chess.get(checkSq);
        if (p && p.type === 'p' && p.color === oppColor) return false;
      }
    }
  }

  return true;
}

/**
 * Evaluates a passed pawn move and checks engine lines & blockade threats.
 */
export function evaluatePassedPawnMove(move, fen, preFen, engineTopMoves = []) {
  if (!move || move.piece !== 'p') return null;

  try {
    const chess = new Chess(fen);
    const color = move.color;
    const toSq = move.to;

    if (!isPassedPawn(chess, toSq, color)) return null;

    const rank = parseInt(toSq[1], 10);
    const isSprinting = color === 'w' ? rank >= 6 : rank <= 3;
    const isNearPromotion = color === 'w' ? rank === 7 : rank === 2;

    // Check if an enemy Rook/Queen on the same file threatens/blockades promotion path
    const fileChar = toSq[0];
    const oppColor = color === 'w' ? 'b' : 'w';
    let blockaded = false;

    for (let r = 1; r <= 8; r++) {
      const checkSq = `${fileChar}${r}`;
      const p = chess.get(checkSq);
      if (p && p.color === oppColor && (p.type === 'r' || p.type === 'q')) {
        blockaded = true;
        break;
      }
    }

    return {
      isPassed: true,
      toSquare: toSq,
      rank,
      isSprinting,
      isNearPromotion,
      blockaded
    };
  } catch {
    return null;
  }
}
