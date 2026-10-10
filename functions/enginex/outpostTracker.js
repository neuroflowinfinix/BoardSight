import { Chess } from 'chess.js';

/**
 * Detects if a piece (usually a Knight) has landed on a dominant outpost.
 * An outpost is a square in enemy territory protected by a pawn.
 */
export function detectOutpost(fen, moveObj) {
    if (!moveObj || moveObj.piece !== 'n') return null; // Primarily focus on Knight outposts

    try {
        const chess = new Chess(fen);
        const color = moveObj.color;
        const toSq = moveObj.to;
        const file = toSq.charCodeAt(0);
        const rank = parseInt(toSq.charAt(1));

        // Check if it's in enemy territory (Rank 5-7 for White, Rank 2-4 for Black)
        const isEnemyTerritory = color === 'w' ? (rank >= 5 && rank <= 7) : (rank >= 2 && rank <= 4);
        if (!isEnemyTerritory) return null;

        // Check if it is defended by a friendly pawn
        let defendedByPawn = false;
        const pawnDir = color === 'w' ? -1 : 1;
        const checkSquares = [
            String.fromCharCode(file - 1) + (rank + pawnDir),
            String.fromCharCode(file + 1) + (rank + pawnDir)
        ];

        for (const sq of checkSquares) {
            if (sq.match(/^[a-h][1-8]$/)) {
                const p = chess.get(sq);
                if (p && p.type === 'p' && p.color === color) {
                    defendedByPawn = true;
                    break;
                }
            }
        }

        if (defendedByPawn) {
            return {
                type: 'outpost',
                text: [
                    `The knight anchors itself on an incredible outpost on ${toSq}. Defended by a pawn and deep in enemy territory, it completely dominates the board.`,
                    `Landing on ${toSq} creates a permanent outpost for your knight. It cannot be chased away easily by pawns.`,
                    `A perfect outpost on ${toSq}. The knight is entrenched and exerts massive pressure on the opponent's position.`
                ]
            };
        }

        return null;
    } catch (e) {
        return null;
    }
}
