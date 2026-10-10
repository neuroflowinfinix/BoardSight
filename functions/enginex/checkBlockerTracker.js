import { Chess } from 'chess.js';

export function findAllCheckBlockers(fen) {
    try {
        const chess = new Chess(fen);
        
        // If not in check, there are no checks to block
        if (!chess.isCheck()) return [];

        // Get all legal moves
        // Since we are in check, the only legal moves are those that resolve the check
        const moves = chess.moves({ verbose: true });
        
        const blockerSquares = new Set();

        for (const move of moves) {
            // If the piece resolving the check is not the King, 
            // it means the piece is either capturing the attacker or blocking the ray of attack.
            if (move.piece !== 'k') {
                blockerSquares.add(move.from);
            }
        }

        return Array.from(blockerSquares);
    } catch {
        return [];
    }
}
