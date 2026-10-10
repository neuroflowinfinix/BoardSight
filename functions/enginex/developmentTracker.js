import { Chess } from 'chess.js';

/**
 * The central 16 squares — files c–f, ranks 3–6.
 * This leaves two files on each side (a,b and g,h)
 * and two ranks on each end (1,2 and 7,8).
 */
const CENTER_FILES = ['c', 'd', 'e', 'f'];
const CENTER_RANKS = ['3', '4', '5', '6'];

export function isCentralSquare(square) {
    return CENTER_FILES.includes(square[0]) && CENTER_RANKS.includes(square[1]);
}

const PIECE_NAMES = {
    p: 'pawn', n: 'knight', b: 'bishop',
    r: 'rook', q: 'queen', k: 'king'
};

/**
 * Detect whether a move develops a piece into the center or retreats it out.
 *
 * @param {string} previousFen - FEN *before* the move was made.
 * @param {object} moveObj     - The move object (from chess.js verbose move or
 *                               the caller's own structure). Must contain at
 *                               minimum { from, to, piece }.
 * @returns {object|null}      - { type, text } for the explanation box,
 *                               or null if the move is centre-neutral.
 *
 *   type: 'development'           — piece moved INTO the central 16 squares
 *   type: 'development_retrograde' — piece moved OUT OF the central 16 squares
 */
export function detectDevelopment(previousFen, moveObj) {
    try {
        if (!moveObj || !moveObj.from || !moveObj.to || !moveObj.piece) return null;

        const from = moveObj.from;
        const to   = moveObj.to;
        const pieceName = PIECE_NAMES[moveObj.piece.toLowerCase()] || 'piece';

        const fromCenter = isCentralSquare(from);
        const toCenter   = isCentralSquare(to);

        // Piece moved from outside → inside the center
        if (!fromCenter && toCenter) {
            return {
                type: 'development',
                text: `Development move — the ${pieceName} enters the central squares.`
            };
        }

        // Piece moved from inside → outside the center
        if (fromCenter && !toCenter) {
            return {
                type: 'development_retrograde',
                text: `Development retrograde — the ${pieceName} leaves the central squares.`
            };
        }

        // center → center or outside → outside — no development change
        return null;
    } catch {
        return null;
    }
}
