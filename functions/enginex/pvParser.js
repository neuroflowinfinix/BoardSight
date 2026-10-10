import { Chess } from 'chess.js';
import { findAllForks } from './forkTracker.js';

const PIECE_VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const PN = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

/**
 * Parses the engine's Principal Variation (PV) string to extract tactical ideas.
 * This looks into the future to see WHY a move is good or bad.
 * 
 * @param {string} startFen - The FEN before the PV starts (usually the board state AFTER the player's move).
 * @param {string} pvStr - Space-separated UCI moves (e.g., "e4d5 c4d5").
 * @param {string} playerColor - 'w' or 'b' (the color of the player who just moved).
 * @returns {object|null} - Tactical extraction { type, text, materialSwing, tacticSquare }
 */
export function extractPVTactics(startFen, pvStr, playerColor) {
    if (!pvStr || typeof pvStr !== 'string') return null;
    const moves = pvStr.trim().split(' ').slice(0, 5); // Look ahead up to 5 plies (2.5 moves)
    if (moves.length === 0 || !moves[0]) return null;

    try {
        const chess = new Chess(startFen);
        const oppColor = playerColor === 'w' ? 'b' : 'w';
        
        let initialMaterialW = 0;
        let initialMaterialB = 0;
        
        // Calculate initial material
        chess.board().forEach(row => {
            row.forEach(piece => {
                if (piece) {
                    const val = PIECE_VALUES[piece.type] || 0;
                    if (piece.color === 'w') initialMaterialW += val;
                    if (piece.color === 'b') initialMaterialB += val;
                }
            });
        });

        const initialDiff = playerColor === 'w' ? (initialMaterialW - initialMaterialB) : (initialMaterialB - initialMaterialW);
        
        let foundFork = null;
        let foundMate = false;
        let highestCaptured = null;
        let forcingMoves = 0;
        let punishingMoveSan = null;

        for (let i = 0; i < moves.length; i++) {
            const uci = moves[i];
            const from = uci.slice(0, 2);
            const to = uci.slice(2, 4);
            const prom = uci.slice(4, 5);
            
            const moveObj = chess.move({ from, to, promotion: prom || undefined });
            if (!moveObj) break; // Invalid PV string for some reason
            
            if (i === 0) punishingMoveSan = moveObj.san;

            if (moveObj.captured) {
                const val = PIECE_VALUES[moveObj.captured] || 0;
                if (!highestCaptured || val > PIECE_VALUES[highestCaptured]) {
                    highestCaptured = moveObj.captured;
                }
            }
            
            if (chess.isCheck()) forcingMoves++;
            if (chess.isCheckmate()) {
                foundMate = true;
                break;
            }

            // Check for forks by the opponent in the PV
            if (moveObj.color === oppColor && !foundFork) {
                const forks = findAllForks(chess.fen());
                if (forks && forks.length > 0) {
                    const oppForks = forks.filter(f => f.color === oppColor && f.isAdvantageous);
                    if (oppForks.length > 0) {
                        foundFork = oppForks[0];
                    }
                }
            }
        }

        // Calculate final material
        let finalMaterialW = 0;
        let finalMaterialB = 0;
        chess.board().forEach(row => {
            row.forEach(piece => {
                if (piece) {
                    const val = PIECE_VALUES[piece.type] || 0;
                    if (piece.color === 'w') finalMaterialW += val;
                    if (piece.color === 'b') finalMaterialB += val;
                }
            });
        });

        const finalDiff = playerColor === 'w' ? (finalMaterialW - finalMaterialB) : (finalMaterialB - finalMaterialW);
        const materialSwing = finalDiff - initialDiff; // Negative means player lost material

        const moveText = punishingMoveSan ? ` starting with **${punishingMoveSan}**` : ``;

        // Construct narrative based on extraction
        if (foundMate) {
            return {
                type: 'pv_mate',
                text: [
                    `The engine sees that this allows a forced checkmate sequence${moveText}.`,
                    `This blunder allows the opponent to force a checkmate${moveText}.`,
                    `The engine line reveals a forced checkmate for the opponent here${moveText}.`
                ],
                isPunishment: true
            };
        }

        if (foundFork && materialSwing <= -3) {
            const targets = foundFork.targets.map(t => PN[t.type]).join(' and ');
            return {
                type: 'pv_fork',
                text: [
                    `This allows the opponent to force a brutal fork on your ${targets}${moveText}, winning material.`,
                    `The engine shows this walks into a tactical fork against your ${targets}${moveText}.`,
                    `A fatal miscalculation. The opponent can force a fork on your ${targets}${moveText}.`
                ],
                isPunishment: true
            };
        }

        if (materialSwing <= -3) {
            let pieceName = highestCaptured ? PN[highestCaptured] : 'material';
            return {
                type: 'pv_material_loss',
                text: [
                    `The engine line shows this leads directly to the forced loss of your ${pieceName}${moveText}.`,
                    `This allows a tactical sequence${moveText} that wins your ${pieceName}.`,
                    `The opponent can now force a line${moveText} winning your ${pieceName}.`
                ],
                isPunishment: true
            };
        }

        if (materialSwing >= 3) {
            // Player wins material in the PV! (Good for sacrifices or brilliant moves)
            let pieceName = highestCaptured ? PN[highestCaptured] : 'material';
            return {
                type: 'pv_material_gain',
                text: [
                    `The engine confirms this forces a winning sequence${moveText}, ultimately capturing their ${pieceName}.`,
                    `Brilliant calculation! This forces a line${moveText} that wins their ${pieceName}.`,
                    `The tactical sequence works perfectly${moveText}, leading to the capture of their ${pieceName}.`
                ],
                isPunishment: false
            };
        }

        return null;

    } catch (e) {
        return null;
    }
}
