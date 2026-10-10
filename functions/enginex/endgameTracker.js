import { Chess } from 'chess.js';

const PIECE_VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/**
 * Detects endgame principles, specifically King activity.
 */
export function evaluateEndgame(fen, moveObj) {
    if (!moveObj) return null;

    try {
        const chess = new Chess(fen);
        
        let queenCount = 0;
        let minorMajorCount = 0;

        chess.board().forEach(row => {
            row.forEach(piece => {
                if (piece) {
                    if (piece.type === 'q') queenCount++;
                    if (piece.type === 'n' || piece.type === 'b' || piece.type === 'r') minorMajorCount++;
                }
            });
        });

        // Simple endgame heuristic: no queens, or very few pieces
        const isEndgame = queenCount === 0 || (queenCount <= 1 && minorMajorCount <= 2);

        if (isEndgame && moveObj.piece === 'k') {
            const rank = parseInt(moveObj.to.charAt(1));
            const file = moveObj.to.charAt(0);
            
            const isCentral = (rank >= 3 && rank <= 6) && (file >= 'c' && file <= 'f');

            if (isCentral) {
                return {
                    type: 'endgame_king_activity',
                    text: [
                        `We are in the endgame! Moving the king toward the center is excellent technique—it becomes an active attacking piece.`,
                        `Activating the king! In the endgame, the king must participate in the battle, and this centralizing move does just that.`,
                        `Excellent endgame technique. The king steps up to influence the center of the board.`
                    ]
                };
            }
        }

        return null;
    } catch (e) {
        return null;
    }
}
