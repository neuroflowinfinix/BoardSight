import { Chess } from 'chess.js';

export function findAllPinnedPieces(fen) {
    try {
        const chess = new Chess(fen);
        const RAYS = {
            'b': [[1, 1], [1, -1], [-1, 1], [-1, -1]],
            'r': [[1, 0], [-1, 0], [0, 1], [0, -1]],
            'q': [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]]
        };
        const PIECE_VALUES = { 'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9, 'k': 100 };

        const board = chess.board(); 
        
        const pinnedSquares = [];

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = board[r][c];
                if (!piece || !['b', 'r', 'q'].includes(piece.type)) continue;

                // Cast rays
                for (const ray of RAYS[piece.type]) {
                    let curR = r + ray[1]; 
                    let curC = c + ray[0]; 
                    
                    const encountered = [];
                    while (curR >= 0 && curR <= 7 && curC >= 0 && curC <= 7) {
                        const p = board[curR][curC];
                        if (p) {
                            encountered.push(p);
                            if (encountered.length === 2) break;
                        }
                        curR += ray[1];
                        curC += ray[0];
                    }

                    if (encountered.length === 2) {
                        const first = encountered[0];
                        const second = encountered[1];
                        
                        // Pin conditions:
                        // Both pieces belong to the opponent of the pinning piece.
                        // The pinned piece (first) shields the King (second) - absolute pin.
                        if (first.color !== piece.color && second.color !== piece.color) {
                            if (second.type === 'k') {
                                pinnedSquares.push(first.square);
                            }
                        }
                    }
                }
            }
        }
        
        return pinnedSquares;
    } catch {
        return [];
    }
}
