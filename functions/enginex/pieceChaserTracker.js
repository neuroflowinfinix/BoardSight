import { Chess } from 'chess.js';

const PIECE_VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/**
 * Detects if a pawn move attacks an enemy piece of higher value,
 * and checks if the pawn is defended.
 */
export function evaluatePawnChaser(move, fen, isInEngineLine = false) {
  if (!move || move.piece !== 'p' || !isInEngineLine) return null;

  try {
    const chess = new Chess(fen);
    const color = move.color;
    const oppColor = color === 'w' ? 'b' : 'w';
    const pawnSq = move.to;

    // Is the pawn defended by friendly piece or pawn?
    const isDefended = chess.isAttacked(pawnSq, color);

    // Find pieces attacked by this pawn
    const fileIdx = pawnSq.charCodeAt(0) - 97;
    const rank = parseInt(pawnSq[1], 10);
    const dir = color === 'w' ? 1 : -1;
    const attackRanks = rank + dir;

    const targets = [];
    for (const df of [-1, 1]) {
      const tf = fileIdx + df;
      if (tf >= 0 && tf <= 7 && attackRanks >= 1 && attackRanks <= 8) {
        const attackSq = String.fromCharCode(tf + 97) + attackRanks;
        const targetPiece = chess.get(attackSq);
        if (targetPiece && targetPiece.color === oppColor && PIECE_VALUES[targetPiece.type] > 1) {
          targets.push({ square: attackSq, piece: targetPiece.type, value: PIECE_VALUES[targetPiece.type] });
        }
      }
    }

    if (targets.length > 0) {
      targets.sort((a, b) => b.value - a.value);
      return {
        isChasing: true,
        target: targets[0],
        isDefended
      };
    }

    return null;
  } catch {
    return null;
  }
}
