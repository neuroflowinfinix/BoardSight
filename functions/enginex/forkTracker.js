import { Chess } from 'chess.js';

// ─────────────────────────────────────────────────────────────────────────────
//  forkTracker.js — Defense-aware fork detection
//
//  Returns RICH fork objects so moveExplainer can decide whether a fork is
//  worth mentioning. A fork is only "advantageous" when the forking player
//  can win material — not just attack two pieces that are both defended.
// ─────────────────────────────────────────────────────────────────────────────

const RAYS = {
    'b': [[1, 1], [1, -1], [-1, 1], [-1, -1]],
    'r': [[1, 0], [-1, 0], [0, 1], [0, -1]],
    'q': [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]]
};

const KNIGHT_MOVES = [
    [2, 1], [2, -1], [-2, 1], [-2, -1],
    [1, 2], [1, -2], [-1, 2], [-1, -2]
];

const PIECE_VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

function getAttackedEnemyPieces(chess, square, piece, oppColor) {
    const coords = { 
        x: square.charCodeAt(0) - 97, 
        y: 8 - parseInt(square[1]) 
    };
    const attackedPieces = [];

    function checkSq(x, y) {
        if (x < 0 || x > 7 || y < 0 || y > 7) return false;
        const sq = String.fromCharCode(x + 97) + (8 - y).toString();
        const p = chess.get(sq);
        if (p) {
            if (p.color === oppColor) {
                attackedPieces.push({
                    square: sq,
                    type: p.type,
                    value: PIECE_VALUES[p.type] || 0,
                    // isDefended: is this piece covered by another friendly piece?
                    isDefended: chess.isAttacked(sq, oppColor)
                });
            }
            return true; // Blocked by any piece
        }
        return false;
    }

    if (piece.type === 'n') {
        for (const m of KNIGHT_MOVES) {
            checkSq(coords.x + m[0], coords.y + m[1]);
        }
    } else if (RAYS[piece.type]) {
        for (const ray of RAYS[piece.type]) {
            let cx = coords.x + ray[0];
            let cy = coords.y + ray[1];
            while (true) {
                if (cx < 0 || cx > 7 || cy < 0 || cy > 7) break;
                if (checkSq(cx, cy)) break;
                cx += ray[0];
                cy += ray[1];
            }
        }
    } else if (piece.type === 'p') {
        const dir = piece.color === 'w' ? -1 : 1;
        checkSq(coords.x + 1, coords.y + dir);
        checkSq(coords.x - 1, coords.y + dir);
    } else if (piece.type === 'k') {
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0) continue;
                checkSq(coords.x + dx, coords.y + dy);
            }
        }
    }
    return attackedPieces;
}

/**
 * Determine whether a fork is advantageous (the forking player gains material).
 *
 * Rules:
 *  • Fork WITH check (king is a target):
 *    → King MUST move. Advantageous if any non-king target is undefended,
 *      or defended but worth MORE than the forker (trade up).
 *  • Fork WITHOUT check:
 *    → Opponent can save one piece. Advantageous if at least TWO targets
 *      are "profitable" (undefended, or worth more than the forker),
 *      OR if at least one target is undefended.
 */
function computeIsAdvantageous(forkerType, targets) {
    const forkerValue = PIECE_VALUES[forkerType] || 0;
    const hasKing     = targets.some(t => t.type === 'k');

    if (hasKing) {
        const nonKing = targets.filter(t => t.type !== 'k');
        return nonKing.some(t => !t.isDefended || t.value > forkerValue);
    }

    // Without check: need ≥2 profitable targets OR ≥1 undefended target
    const profitable = targets.filter(t =>
        !t.isDefended || t.value > forkerValue
    );
    if (profitable.length >= 2) return true;

    // Also count as advantageous if any target is simply undefended (free material)
    return targets.some(t => !t.isDefended && t.value > 0);
}

/**
 * Find all fork positions on the board.
 *
 * Returns an array of rich fork objects:
 * [{
 *   square: 'e4',
 *   type:   'n',
 *   color:  'w',
 *   targets: [{ square, type, value, isDefended }],
 *   hasKingTarget: false,
 *   isAdvantageous: true
 * }]
 */
export function findAllForks(fen) {
    try {
        const chess = new Chess(fen);
        const SQUARES = [
            'a8','b8','c8','d8','e8','f8','g8','h8','a7','b7','c7','d7','e7','f7','g7','h7',
            'a6','b6','c6','d6','e6','f6','g6','h6','a5','b5','c5','d5','e5','f5','g5','h5',
            'a4','b4','c4','d4','e4','f4','g4','h4','a3','b3','c3','d3','e3','f3','g3','h3',
            'a2','b2','c2','d2','e2','f2','g2','h2','a1','b1','c1','d1','e1','f1','g1','h1',
        ];
        
        const forks = [];
        
        for (const sq of SQUARES) {
            const piece = chess.get(sq);
            if (piece) {
                const oppColor = piece.color === 'w' ? 'b' : 'w';
                const attackedEnemies = getAttackedEnemyPieces(chess, sq, piece, oppColor);
                
                // A fork means attacking 2 or more enemy pieces simultaneously
                if (attackedEnemies.length >= 2) {
                    const hasKingTarget = attackedEnemies.some(t => t.type === 'k');
                    forks.push({
                        square: sq,
                        type:   piece.type,
                        color:  piece.color,
                        targets: attackedEnemies,
                        hasKingTarget,
                        isAdvantageous: computeIsAdvantageous(piece.type, attackedEnemies)
                    });
                }
            }
        }
        return forks;
    } catch {
        return [];
    }
}
