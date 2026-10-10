import { Chess } from 'chess.js';

const RAYS = {
    'b': [[1, 1], [1, -1], [-1, 1], [-1, -1]],
    'r': [[1, 0], [-1, 0], [0, 1], [0, -1]],
    'q': [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]]
};

const KNIGHT_MOVES = [
    [2, 1], [2, -1], [-2, 1], [-2, -1],
    [1, 2], [1, -2], [-1, 2], [-1, -2]
];

function getAttackedSquares(chess, square, piece) {
    const coords = { 
        x: square.charCodeAt(0) - 97, 
        y: 8 - parseInt(square[1]) 
    };
    const attacked = [];

    function checkSq(x, y) {
        if (x < 0 || x > 7 || y < 0 || y > 7) return false;
        const sq = String.fromCharCode(x + 97) + (8 - y).toString();
        attacked.push(sq);
        return !!chess.get(sq); // blocked if there is a piece
    }

    if (piece.type === 'n') {
        for (const m of KNIGHT_MOVES) checkSq(coords.x + m[0], coords.y + m[1]);
    } else if (RAYS[piece.type]) {
        for (const ray of RAYS[piece.type]) {
            let cx = coords.x + ray[0];
            let cy = coords.y + ray[1];
            while (true) {
                if (cx < 0 || cx > 7 || cy < 0 || cy > 7) break;
                if (checkSq(cx, cy)) break;
                cx += ray[0]; cy += ray[1];
            }
        }
    } else if (piece.type === 'p') {
        const dir = piece.color === 'w' ? -1 : 1;
        checkSq(coords.x + 1, coords.y + dir);
        checkSq(coords.x - 1, coords.y + dir);
    }
    // King doesn't deliver check
    return attacked;
}

export function findAllChecks(fen) {
    try {
        const chess = new Chess(fen);
        if (!chess.isCheck()) return [];

        const turn = chess.turn(); // The side that is in check
        let kingSq = null;
        
        const SQUARES = [
            'a8','b8','c8','d8','e8','f8','g8','h8','a7','b7','c7','d7','e7','f7','g7','h7',
            'a6','b6','c6','d6','e6','f6','g6','h6','a5','b5','c5','d5','e5','f5','g5','h5',
            'a4','b4','c4','d4','e4','f4','g4','h4','a3','b3','c3','d3','e3','f3','g3','h3',
            'a2','b2','c2','d2','e2','f2','g2','h2','a1','b1','c1','d1','e1','f1','g1','h1',
        ];

        for (const sq of SQUARES) {
            const p = chess.get(sq);
            if (p && p.type === 'k' && p.color === turn) {
                kingSq = sq;
                break;
            }
        }

        if (!kingSq) return [];

        const checkingSquares = [];
        for (const sq of SQUARES) {
            const p = chess.get(sq);
            if (p && p.color !== turn) {
                const attacks = getAttackedSquares(chess, sq, p);
                if (attacks.includes(kingSq)) {
                    checkingSquares.push(sq);
                }
            }
        }

        return checkingSquares;
    } catch {
        return [];
    }
}
