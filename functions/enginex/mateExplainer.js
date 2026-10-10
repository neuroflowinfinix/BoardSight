import { Chess } from 'chess.js';

const SQUARES = [
    'a8','b8','c8','d8','e8','f8','g8','h8',
    'a7','b7','c7','d7','e7','f7','g7','h7',
    'a6','b6','c6','d6','e6','f6','g6','h6',
    'a5','b5','c5','d5','e5','f5','g5','h5',
    'a4','b4','c4','d4','e4','f4','g4','h4',
    'a3','b3','c3','d3','e3','f3','g3','h3',
    'a2','b2','c2','d2','e2','f2','g2','h2',
    'a1','b1','c1','d1','e1','f1','g1','h1'
];

function squareToCoords(sq) {
    return { x: sq.charCodeAt(0) - 97, y: 8 - parseInt(sq[1]) };
}

function coordsToSquare(x, y) {
    if (x < 0 || x > 7 || y < 0 || y > 7) return null;
    return String.fromCharCode(x + 97) + (8 - y).toString();
}

// --- Attack detection helpers ---

/**
 * Check if the path between two squares is clear (no pieces in the way).
 * Used for sliding pieces (bishop, rook, queen).
 */
function isPathClear(chess, from, to, stepX, stepY) {
    let x = from.x + stepX;
    let y = from.y + stepY;
    while (x !== to.x || y !== to.y) {
        const sq = coordsToSquare(x, y);
        if (!sq || chess.get(sq)) return false;
        x += stepX;
        y += stepY;
    }
    return true;
}

/**
 * Determine if a piece on pieceSquare actually attacks targetSquare,
 * accounting for piece movement rules and blocked paths.
 */
function doesPieceAttackSquare(chess, pieceSquare, targetSquare) {
    const piece = chess.get(pieceSquare);
    if (!piece) return false;

    const from = squareToCoords(pieceSquare);
    const to = squareToCoords(targetSquare);
    const dx = to.x - from.x;
    const dy = to.y - from.y;

    if (dx === 0 && dy === 0) return false;

    switch (piece.type) {
        case 'p': {
            // Pawns attack one square diagonally forward
            const dir = piece.color === 'w' ? -1 : 1;
            return Math.abs(dx) === 1 && dy === dir;
        }
        case 'n':
            return (Math.abs(dx) === 2 && Math.abs(dy) === 1) ||
                   (Math.abs(dx) === 1 && Math.abs(dy) === 2);
        case 'b':
            if (Math.abs(dx) !== Math.abs(dy)) return false;
            return isPathClear(chess, from, to, Math.sign(dx), Math.sign(dy));
        case 'r':
            if (dx !== 0 && dy !== 0) return false;
            return isPathClear(chess, from, to, Math.sign(dx), Math.sign(dy));
        case 'q':
            if (Math.abs(dx) === Math.abs(dy) || dx === 0 || dy === 0) {
                return isPathClear(chess, from, to, Math.sign(dx), Math.sign(dy));
            }
            return false;
        case 'k':
            return Math.abs(dx) <= 1 && Math.abs(dy) <= 1;
        default:
            return false;
    }
}

/**
 * Find a piece of the given type and color that actually attacks targetSquare.
 * Returns the square of the attacker, or null if none found.
 */
function findAttacker(chess, targetSquare, pieceType, color, excludeSquare) {
    for (const sq of SQUARES) {
        if (sq === excludeSquare) continue;
        const p = chess.get(sq);
        if (p && p.type === pieceType && p.color === color) {
            if (doesPieceAttackSquare(chess, sq, targetSquare)) {
                return sq;
            }
        }
    }
    return null;
}

/**
 * Check if a piece on pieceSquare controls (attacks) any square
 * adjacent to the king at kingCoords.
 */
function controlsKingArea(chess, pieceSquare, kingCoords) {
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            const adjSq = coordsToSquare(kingCoords.x + dx, kingCoords.y + dy);
            if (adjSq && doesPieceAttackSquare(chess, pieceSquare, adjSq)) {
                return true;
            }
        }
    }
    return false;
}

export function detectMate(fen, moveObj) {
    try {
        const chess = new Chess(fen);
        if (!chess.isCheckmate()) return null;

        const opponentColor = chess.turn();
        const moveColor = opponentColor === 'w' ? 'b' : 'w';

        // Extract fullmove number from FEN for opening detection.
        // chess.history().length is always 0 when loading from a standalone FEN,
        // so we parse the fullmove counter (6th field) directly.
        const fenParts = fen.split(' ');
        const fullmoveNumber = parseInt(fenParts[5]) || 1;

        let kingSquare = null;
        for (const sq of SQUARES) {
            const p = chess.get(sq);
            if (p && p.type === 'k' && p.color === opponentColor) {
                kingSquare = sq;
                break;
            }
        }
        if (!kingSquare) return null;

        const kingCoords = squareToCoords(kingSquare);
        const movedPiece = moveObj.piece;
        const targetSquare = moveObj.to;
        const targetCoords = squareToCoords(targetSquare);

        const isOccupiedBy = (sq, color) => {
            if (!sq) return false;
            const p = chess.get(sq);
            return p && p.color === color;
        };

        const kingOnFileEdge = kingCoords.x === 0 || kingCoords.x === 7;
        const kingOnRankEdge = kingCoords.y === 0 || kingCoords.y === 7;
        const kingOnEdge = kingOnFileEdge || kingOnRankEdge;

        // ================================================================
        // Patterns are ordered most-specific-first to prevent misclassification.
        // ================================================================

        // === 1. Fool's Mate ===
        // Fastest checkmate (2-3 moves). Queen exploits weakened f/g pawn diagonal.
        // King must still be on its starting square.
        if (fullmoveNumber <= 4 && movedPiece === 'q' &&
            (targetSquare === 'h4' || targetSquare === 'h5')) {
            const expectedKingSq = opponentColor === 'w' ? 'e1' : 'e8';
            if (kingSquare === expectedKingSq) {
                return "Fool's mate";
            }
        }

        // === 2. Scholar's Mate ===
        // Queen mates on f7/f2 with bishop support in the opening.
        if (fullmoveNumber <= 8 && movedPiece === 'q' &&
            (targetSquare === 'f7' || targetSquare === 'f2')) {
            if (findAttacker(chess, targetSquare, 'b', moveColor, targetSquare)) {
                return "Scholar's mate";
            }
        }

        // === 3. Smothered Mate ===
        // Knight delivers while ALL adjacent squares are blocked by king's own pieces.
        if (movedPiece === 'n') {
            let blockedSquares = 0;
            let validAdj = 0;
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    if (dx === 0 && dy === 0) continue;
                    const adjSq = coordsToSquare(kingCoords.x + dx, kingCoords.y + dy);
                    if (adjSq) {
                        validAdj++;
                        if (isOccupiedBy(adjSq, opponentColor)) blockedSquares++;
                    }
                }
            }
            if (validAdj > 0 && blockedSquares === validAdj) return "Smothered mate";
        }

        // === 4. Legal's Mate ===
        // Knight delivers in the opening, king caught in center.
        // The mating side has no queen (it was sacrificed) and multiple
        // minor pieces participate in the mating net.
        if (movedPiece === 'n' && fullmoveNumber <= 12) {
            if (kingCoords.x >= 1 && kingCoords.x <= 6 &&
                kingCoords.y >= 1 && kingCoords.y <= 6) {
                // Mating side should have no queen (it was sacrificed)
                let hasQueen = false;
                for (const sq of SQUARES) {
                    const p = chess.get(sq);
                    if (p && p.type === 'q' && p.color === moveColor) {
                        hasQueen = true;
                        break;
                    }
                }
                if (!hasQueen) {
                    // Count minor pieces of mating side that control the king area
                    let minorPieceHelpers = 0;
                    for (const sq of SQUARES) {
                        const p = chess.get(sq);
                        if (!p || p.color !== moveColor || sq === targetSquare) continue;
                        if ((p.type === 'b' || p.type === 'n') &&
                            controlsKingArea(chess, sq, kingCoords)) {
                            minorPieceHelpers++;
                        }
                    }
                    // Legal's Mate involves 2+ additional minor pieces besides the mating knight
                    if (minorPieceHelpers >= 2) return "Legal's mate";
                }
            }
        }

        // === 5. Boden's Mate ===
        // Two bishops crisscross diagonals to attack the king.
        // The king's own pieces (2+) block its escape.
        if (movedPiece === 'b') {
            if (findAttacker(chess, kingSquare, 'b', moveColor, targetSquare)) {
                let blockerCount = 0;
                for (let dx = -1; dx <= 1; dx++) {
                    for (let dy = -1; dy <= 1; dy++) {
                        if (dx === 0 && dy === 0) continue;
                        const adjSq = coordsToSquare(kingCoords.x + dx, kingCoords.y + dy);
                        if (isOccupiedBy(adjSq, opponentColor)) blockerCount++;
                    }
                }
                if (blockerCount >= 2) return "Boden's mate";
            }
        }

        // === 6. Arabian Mate ===
        // Rook delivers adjacent to king on edge, knight protects rook
        // and blocks the king's escape square.
        if (movedPiece === 'r' && kingOnEdge) {
            const dx = Math.abs(kingCoords.x - targetCoords.x);
            const dy = Math.abs(kingCoords.y - targetCoords.y);
            if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) {
                if (findAttacker(chess, targetSquare, 'n', moveColor, targetSquare)) {
                    return "Arabian mate";
                }
            }
        }

        // === 7. Anastasia's Mate ===
        // King on edge file, rook delivers along that file (not adjacent),
        // knight covers escape squares, own piece (usually pawn) blocks adjacent square.
        if (movedPiece === 'r' && kingOnFileEdge) {
            if (targetCoords.x === kingCoords.x &&
                Math.abs(targetCoords.y - kingCoords.y) > 1) {
                let knightHelps = false;
                for (const sq of SQUARES) {
                    const p = chess.get(sq);
                    if (p && p.type === 'n' && p.color === moveColor &&
                        controlsKingArea(chess, sq, kingCoords)) {
                        knightHelps = true;
                        break;
                    }
                }
                let ownPieceBlocks = false;
                for (let ddx = -1; ddx <= 1; ddx++) {
                    for (let ddy = -1; ddy <= 1; ddy++) {
                        if (ddx === 0 && ddy === 0) continue;
                        const adjSq = coordsToSquare(kingCoords.x + ddx, kingCoords.y + ddy);
                        if (adjSq && isOccupiedBy(adjSq, opponentColor)) {
                            ownPieceBlocks = true;
                            break;
                        }
                    }
                    if (ownPieceBlocks) break;
                }
                if (knightHelps && ownPieceBlocks) return "Anastasia's mate";
            }
        }

        // === 8. Blackburne's Mate ===
        // Bishop delivers against king on edge, supported by another bishop
        // and a knight that both control the king's escape area.
        if (movedPiece === 'b' && kingOnEdge) {
            let knightHelps = false;
            let otherBishopHelps = false;
            for (const sq of SQUARES) {
                const p = chess.get(sq);
                if (!p || p.color !== moveColor || sq === targetSquare) continue;
                if (p.type === 'n' && controlsKingArea(chess, sq, kingCoords)) {
                    knightHelps = true;
                }
                if (p.type === 'b' && controlsKingArea(chess, sq, kingCoords)) {
                    otherBishopHelps = true;
                }
            }
            if (knightHelps && otherBishopHelps) return "Blackburne's mate";
        }

        // === 9. Opera Mate ===
        // Rook delivers on same file/rank as king on edge, bishop protects the rook.
        if (movedPiece === 'r' && kingOnEdge) {
            if (targetCoords.x === kingCoords.x || targetCoords.y === kingCoords.y) {
                if (findAttacker(chess, targetSquare, 'b', moveColor, targetSquare)) {
                    return "Opera mate";
                }
            }
        }

        // === 10. Morphy's Mate ===
        // Bishop delivers, a rook controls escape squares, own pawns restrict the king.
        // Typically happens against a kingside-castled king.
        if (movedPiece === 'b') {
            let rookControlsEscape = false;
            for (const sq of SQUARES) {
                const p = chess.get(sq);
                if (p && p.type === 'r' && p.color === moveColor &&
                    controlsKingArea(chess, sq, kingCoords)) {
                    rookControlsEscape = true;
                    break;
                }
            }
            if (rookControlsEscape) {
                let pawnBlocks = false;
                for (let dx = -1; dx <= 1; dx++) {
                    for (let dy = -1; dy <= 1; dy++) {
                        if (dx === 0 && dy === 0) continue;
                        const adjSq = coordsToSquare(kingCoords.x + dx, kingCoords.y + dy);
                        if (adjSq) {
                            const p = chess.get(adjSq);
                            if (p && p.type === 'p' && p.color === opponentColor) {
                                pawnBlocks = true;
                            }
                        }
                    }
                }
                if (pawnBlocks) return "Morphy's mate";
            }
        }

        // === 11. Epaulette Mate ===
        // Queen mates with two of the king's own pieces flanking it on both sides
        // (the "shoulder" pieces). Accepts any piece type as blocker.
        if (movedPiece === 'q') {
            const dx = Math.abs(kingCoords.x - targetCoords.x);
            const dy = Math.abs(kingCoords.y - targetCoords.y);
            // Queen on same file, one rank away — pieces flank horizontally
            if (dx === 0 && dy === 1) {
                const leftSq = coordsToSquare(kingCoords.x - 1, kingCoords.y);
                const rightSq = coordsToSquare(kingCoords.x + 1, kingCoords.y);
                if (isOccupiedBy(leftSq, opponentColor) &&
                    isOccupiedBy(rightSq, opponentColor)) {
                    return "Epaulette mate";
                }
            }
            // Queen on same rank, one file away — pieces flank vertically
            if (dy === 0 && dx === 1) {
                const upSq = coordsToSquare(kingCoords.x, kingCoords.y - 1);
                const downSq = coordsToSquare(kingCoords.x, kingCoords.y + 1);
                if (isOccupiedBy(upSq, opponentColor) &&
                    isOccupiedBy(downSq, opponentColor)) {
                    return "Epaulette mate";
                }
            }
        }

        // === 12. Dovetail Mate ===
        // Queen on a diagonal square adjacent to king, own pieces block
        // the two remaining escape squares forming the dovetail shape.
        if (movedPiece === 'q') {
            const dx = Math.abs(kingCoords.x - targetCoords.x);
            const dy = Math.abs(kingCoords.y - targetCoords.y);
            if (dx === 1 && dy === 1) {
                const signX = targetCoords.x > kingCoords.x ? 1 : -1;
                const signY = targetCoords.y > kingCoords.y ? 1 : -1;
                const block1 = coordsToSquare(kingCoords.x - signX, kingCoords.y);
                const block2 = coordsToSquare(kingCoords.x, kingCoords.y - signY);
                if (isOccupiedBy(block1, opponentColor) &&
                    isOccupiedBy(block2, opponentColor)) {
                    return "Dovetail mate";
                }
            }
        }

        // === 13. Swallow's Tail Mate ===
        // Queen directly in front of king (same file), V-shaped own pieces
        // on the diagonal squares behind the king.
        if (movedPiece === 'q') {
            const dx = Math.abs(kingCoords.x - targetCoords.x);
            const dy = targetCoords.y - kingCoords.y;
            if (dx === 0 && Math.abs(dy) === 1) {
                const behindY = kingCoords.y - dy;
                const diagLeft = coordsToSquare(kingCoords.x - 1, behindY);
                const diagRight = coordsToSquare(kingCoords.x + 1, behindY);
                if (isOccupiedBy(diagLeft, opponentColor) &&
                    isOccupiedBy(diagRight, opponentColor)) {
                    return "Swallow's tail mate";
                }
            }
        }

        // === 14. Damiano's Mate ===
        // Queen adjacent to king, supported by a pawn or a bishop.
        if (movedPiece === 'q') {
            const dx = Math.abs(kingCoords.x - targetCoords.x);
            const dy = Math.abs(kingCoords.y - targetCoords.y);
            if (dx <= 1 && dy <= 1) {
                if (findAttacker(chess, targetSquare, 'p', moveColor, targetSquare) ||
                    findAttacker(chess, targetSquare, 'b', moveColor, targetSquare)) {
                    return "Damiano's mate";
                }
            }
        }

        // === 15. Back Rank Mate ===
        // Rook or queen delivers on back rank, king trapped by own pieces
        // (typically pawns) on the rank in front.
        if (movedPiece === 'r' || movedPiece === 'q') {
            if (kingOnRankEdge && targetCoords.y === kingCoords.y) {
                const frontY = kingCoords.y === 0 ? 1 : 6;
                let blockedByOwn = 0;
                let frontSquares = 0;
                for (let ddx = -1; ddx <= 1; ddx++) {
                    const frontSq = coordsToSquare(kingCoords.x + ddx, frontY);
                    if (frontSq) {
                        frontSquares++;
                        if (isOccupiedBy(frontSq, opponentColor)) blockedByOwn++;
                    }
                }
                // At least 2 of the front squares must be blocked by own pieces
                if (frontSquares > 0 && blockedByOwn >= Math.min(frontSquares, 2)) {
                    return "Back rank mate";
                }
            }
        }

        // === 16. Ladder Mate (Lawn Mower Mate) ===
        // Two heavy pieces (Rook+Queen or Rook+Rook or Queen+Queen) control adjacent files or ranks,
        // trapping the king against the edge of the board.
        if (movedPiece === 'r' || movedPiece === 'q') {
            if (kingOnEdge) {
                let secondaryHeavyPiece = false;
                for (const sq of SQUARES) {
                    if (sq === targetSquare) continue;
                    const p = chess.get(sq);
                    if (p && p.color === moveColor && (p.type === 'r' || p.type === 'q')) {
                        const pCoords = squareToCoords(sq);
                        if (kingOnFileEdge && targetCoords.x === kingCoords.x && Math.abs(pCoords.x - kingCoords.x) === 1) {
                            secondaryHeavyPiece = true;
                            break;
                        }
                        if (kingOnRankEdge && targetCoords.y === kingCoords.y && Math.abs(pCoords.y - kingCoords.y) === 1) {
                            secondaryHeavyPiece = true;
                            break;
                        }
                    }
                }
                if (secondaryHeavyPiece) return "Ladder mate";
            }
        }

        return "Checkmate";
    } catch {
        return null;
    }
}
