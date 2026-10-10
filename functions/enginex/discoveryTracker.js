import { Chess } from 'chess.js';

export function findAllDiscoveries(fen) {
    try {
        const chess = new Chess(fen);
        const RAYS = {
            'b': [[1, 1], [1, -1], [-1, 1], [-1, -1]],
            'r': [[1, 0], [-1, 0], [0, 1], [0, -1]],
            'q': [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]]
        };

        const board = chess.board(); 
        const discoverySquares = new Set();
        
        // Setup dual-turn chess instances to get legal moves for both colors
        const fenTokens = fen.split(' ');
        const currentTurn = fenTokens[1];
        const inactiveTurn = currentTurn === 'w' ? 'b' : 'w';
        fenTokens[1] = inactiveTurn;
        fenTokens[3] = '-'; // Clear EP target to avoid FEN validation errors on turn swap
        
        let inactiveChess;
        try {
            inactiveChess = new Chess(fenTokens.join(' '));
        } catch (e) {
            inactiveChess = chess; // fallback
        }

        const chessInstances = {
            [currentTurn]: chess,
            [inactiveTurn]: inactiveChess
        };

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = board[r][c];
                if (!piece || !['b', 'r', 'q'].includes(piece.type)) continue;

                // Cast rays from the slider
                for (const ray of RAYS[piece.type]) {
                    let curR = r + ray[1]; 
                    let curC = c + ray[0]; 
                    
                    let friendlyBlocker = null;

                    while (curR >= 0 && curR <= 7 && curC >= 0 && curC <= 7) {
                        const p = board[curR][curC];
                        
                        if (p) {
                            if (!friendlyBlocker) {
                                // First piece encountered must be friendly
                                if (p.color !== piece.color) break;
                                friendlyBlocker = { r: curR, c: curC, type: p.type, square: p.square };
                                
                                // Check the IMMEDIATELY NEXT square on the ray
                                let nextR = curR + ray[1];
                                let nextC = curC + ray[0];
                                
                                if (nextR >= 0 && nextR <= 7 && nextC >= 0 && nextC <= 7) {
                                    let nextPiece = board[nextR][nextC];
                                    
                                    // If the next square is not a friendly piece, moving the blocker unleashes the line of sight!
                                    if (!nextPiece || nextPiece.color !== piece.color) {
                                        const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
                                        const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
                                        
                                        // Pick the correct chess instance to evaluate legal moves for this color
                                        const activeChess = chessInstances[piece.color];
                                        const legalMoves = activeChess.moves({ square: friendlyBlocker.square, verbose: true });
                                        
                                        let canStepOffRay = false;
                                        for (const move of legalMoves) {
                                            const toC = files.indexOf(move.to[0]);
                                            const toR = ranks.indexOf(move.to[1]);
                                            
                                            const dr = toR - friendlyBlocker.r;
                                            const dc = toC - friendlyBlocker.c;
                                            
                                            // Vector Cross-Product: Is the move non-parallel to the ray?
                                            if (dc * ray[1] !== dr * ray[0]) {
                                                canStepOffRay = true;
                                                break;
                                            }
                                        }

                                        if (canStepOffRay) {
                                            discoverySquares.add(friendlyBlocker.square);
                                        }
                                    }
                                }
                                break; 
                            }
                        }
                        curR += ray[1];
                        curC += ray[0];
                    }
                }
            }
        }
        
        return Array.from(discoverySquares);
    } catch {
        return [];
    }
}
