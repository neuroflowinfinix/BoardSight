import { Chess } from 'chess.js';

const PIECE_VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/**
 * Detect a true sacrifice, distinguishing between tactical, positional, and unsound sacrifices.
 *
 * @param {string} fen      - Board state AFTER the move was made.
 * @param {object} moveObj  - The move that was just played { piece, captured, to, ... }
 * @param {object} postEval - The Stockfish evaluation object for the position AFTER the move.
 * @param {number} preScore - The Stockfish score before the move (from the moving player's perspective).
 * @param {number} postScore- The Stockfish score after the move (from the moving player's perspective).
 * @returns {object|null}   - { type, text } for the explanation box.
 */
export function detectSacrifice(fen, moveObj, postEval, preScore, postScore, prevMove = null) {
    try {
        if (!moveObj || !postEval || !postEval.topMoves || postEval.topMoves.length === 0) {
            return null;
        }

        const chess = new Chess(fen);
        const opponentMoves = chess.moves({ verbose: true });
        
        // 1. Direct sacrifice: the piece that moved is put on an attacked square
        const directCaptures = opponentMoves.filter(m => m.to === moveObj.to);
        let isDirectSac = false;
        let captureIsDisadvantage = true;

        if (directCaptures.length > 0) {
            const movingValue = PIECE_VALUES[moveObj.piece] ?? 0;
            const capturedValue = moveObj.captured ? (PIECE_VALUES[moveObj.captured] ?? 0) : 0;
            let minAttacker = 99;
            for (const c of directCaptures) {
                const v = PIECE_VALUES[c.piece] ?? 0;
                if (v < minAttacker) minAttacker = v;
            }
            chess.move(directCaptures[0].san);
            const recaptures = chess.moves({ verbose: true }).filter(m => m.to === moveObj.to);
            const isDefended = recaptures.length > 0;
            chess.undo();

            const expectedLoss = isDefended ? (movingValue - capturedValue - minAttacker) : (movingValue - capturedValue);
            if (expectedLoss > 0) {
                isDirectSac = true;
                for (const cap of directCaptures) {
                    const uci = cap.from + cap.to + (cap.promotion ? cap.promotion : '');
                    const topMoveEntry = postEval.topMoves.find(tm => tm.move === uci);
                    if (topMoveEntry && topMoveEntry.score >= 0) {
                        captureIsDisadvantage = false;
                    }
                }
            }
        }

        // 2. Hanging piece sacrifice: leaving a major piece (Rook or Queen) hanging
        // ONLY valid if the move itself was not a capture and the resulting position is clearly winning (postScore >= 150)
        let isHangingPieceSac = false;
        if (!isDirectSac && !moveObj.captured && postScore >= 150) {
            const majorCaptures = opponentMoves.filter(m => {
                if (!m.flags.includes('c') && !m.flags.includes('e')) return false;
                const victim = chess.get(m.to);
                if (!victim) return false;
                const val = PIECE_VALUES[victim.type] || 0;
                return val >= 5; // Major piece: Rook or Queen
            });

            for (const cap of majorCaptures) {
                const victim = chess.get(cap.to);
                const victimVal = PIECE_VALUES[victim.type] || 0;
                const attackerVal = PIECE_VALUES[cap.piece] || 0;

                chess.move(cap.san);
                const recaptures = chess.moves({ verbose: true }).filter(m => m.to === cap.to);
                const isDef = recaptures.length > 0;
                chess.undo();

                const loss = isDef ? (victimVal - attackerVal) : victimVal;
                if (loss > 0) {
                    isHangingPieceSac = true;
                    const uci = cap.from + cap.to + (cap.promotion ? cap.promotion : '');
                    const topMoveEntry = postEval.topMoves.find(tm => tm.move === uci);
                    if (topMoveEntry && topMoveEntry.score >= 0) {
                        captureIsDisadvantage = false;
                    }
                    break;
                }
            }
        }

        const isTrueSacrifice = isDirectSac || isHangingPieceSac;
        if (!isTrueSacrifice) return null;

        // --- 3. Soundness Assessment ---
        // A sacrifice is sound if the player retains a winning position (postScore >= 150)
        // OR if the win% drop is <= 12% and postScore >= 0.
        const winPct = (cp) => 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
        const winDrop = winPct(preScore) - winPct(postScore);
        
        const isSound = (postScore >= 150) || (winDrop <= 12 && postScore >= 0);

        // --- 4. Categorization ---
        if (!isSound) {
            return {
                type: 'unsound_sacrifice',
                text: 'unsound sacrifice'
            };
        }

        if (captureIsDisadvantage) {
            return {
                type: 'tactical_sacrifice',
                text: 'tactical sacrifice'
            };
        } else {
            return {
                type: 'positional_sacrifice',
                text: 'positional sacrifice'
            };
        }
    } catch {
        return null;
    }
}
