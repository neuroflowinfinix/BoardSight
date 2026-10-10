import { Chess } from 'chess.js';

const PN = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

/**
 * Analyzes the pawn structure of the board.
 * Detects isolated pawns, doubled pawns, and space advantages.
 */
export function evaluatePawnStructure(fen, moveObj) {
    if (!moveObj || moveObj.piece !== 'p') return null; // Only evaluate when a pawn moves or captures

    try {
        const chess = new Chess(fen);
        const color = moveObj.color;
        const oppColor = color === 'w' ? 'b' : 'w';
        
        const pawns = [];
        const files = { a: 0, b: 0, c: 0, d: 0, e: 0, f: 0, g: 0, h: 0 };
        
        chess.board().forEach((row, rowIndex) => {
            row.forEach((piece, colIndex) => {
                if (piece && piece.type === 'p' && piece.color === color) {
                    const file = String.fromCharCode(97 + colIndex);
                    const rank = 8 - rowIndex;
                    pawns.push({ file, rank, square: file + rank });
                    files[file]++;
                }
            });
        });

        const movedFile = moveObj.to.charAt(0);
        const movedRank = parseInt(moveObj.to.charAt(1));

        // 1. Doubled Pawns (only relevant when a capture created them)
        if (files[movedFile] > 1 && moveObj.captured) {
            return {
                type: 'doubled_pawns',
                text: [
                    `This capture doubles your pawns on the ${movedFile}-file — a structural concession, though it does open the ${moveObj.from.charAt(0)}-file.`,
                    `Capturing toward the ${movedFile}-file doubles your pawns there. It opens lines, but the structure is permanently weakened.`,
                    `The recapture creates doubled pawns on the ${movedFile}-file. Worth watching — they can become targets later.`
                ]
            };
        }

        // 2. Isolated Pawns
        const isIsolated = (file) => {
            const charCode = file.charCodeAt(0);
            const leftFile = String.fromCharCode(charCode - 1);
            const rightFile = String.fromCharCode(charCode + 1);
            return (files[leftFile] || 0) === 0 && (files[rightFile] || 0) === 0;
        };

        if (isIsolated(movedFile)) {
            return {
                type: 'isolated_pawn',
                text: [
                    `You now have an isolated pawn on ${moveObj.to}. Without friendly pawns on adjacent files to defend it, it may become a long-term target.`,
                    `Creating an isolated pawn on ${moveObj.to}. This pawn requires constant defense by your pieces.`,
                    `The pawn on ${moveObj.to} is now isolated from the rest of your structure, creating a static weakness.`
                ]
            };
        }

        // 3. Space Advantage (Central push)
        if (color === 'w' && movedRank >= 5 && (movedFile === 'd' || movedFile === 'e' || movedFile === 'c' || movedFile === 'f')) {
             return {
                 type: 'space_advantage',
                 text: [
                     `Pushing the pawn to ${moveObj.to} grabs vital space, cramping the opponent's pieces and controlling the board.`,
                     `A strong central push to ${moveObj.to}, claiming a solid space advantage.`,
                     `Taking control of the center with ${moveObj.to}, leaving the opponent with less room to maneuver.`
                 ]
             };
        }
        if (color === 'b' && movedRank <= 4 && (movedFile === 'd' || movedFile === 'e' || movedFile === 'c' || movedFile === 'f')) {
             return {
                 type: 'space_advantage',
                 text: [
                     `Pushing the pawn to ${moveObj.to} grabs vital space, cramping the opponent's pieces and controlling the board.`,
                     `A strong central push to ${moveObj.to}, claiming a solid space advantage.`,
                     `Taking control of the center with ${moveObj.to}, leaving the opponent with less room to maneuver.`
                 ]
             };
        }

        return null;
    } catch (e) {
        return null;
    }
}
