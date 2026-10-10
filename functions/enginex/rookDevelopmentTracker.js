import { Chess } from 'chess.js';

// ─────────────────────────────────────────────────────────────────────────────
//  rookDevelopmentTracker.js — Detect rook activation patterns
//
//  Patterns detected:
//   • Rook leaving starting corner (first activation)
//   • Rook to open file (no pawns on file)
//   • Rook to semi-open file (no friendly pawns)
//   • Rook to 7th rank (powerful pawn-hunting / king-restricting position)
//   • Rook lift (rook moving to 3rd/4th rank for horizontal attack)
// ─────────────────────────────────────────────────────────────────────────────

const WHITE_CORNERS = ['a1', 'h1'];
const BLACK_CORNERS = ['a8', 'h8'];

/**
 * Detect whether a rook move constitutes a meaningful development pattern.
 *
 * @param {string} preFen  - FEN *before* the move was made.
 * @param {object} moveObj - The move object. Must have { from, to, piece, color, captured }.
 * @param {boolean} isInEngineLine - Whether the move is in the engine's top lines.
 * @returns {{ type: string, text: string } | null}
 */
export function detectRookDevelopment(preFen, moveObj, isInEngineLine) {
    try {
        if (!isInEngineLine) return null;
        if (!moveObj || moveObj.piece !== 'r') return null;

        const from  = moveObj.from;
        const to    = moveObj.to;
        const color = moveObj.color;

        const chess = new Chess(preFen);
        const board = chess.board();

        const toFile       = to[0];
        const toRank       = to[1];
        const fromFile     = from[0];
        const fileIndex    = to.charCodeAt(0) - 97;
        const seventhRank  = color === 'w' ? '7' : '2';
        const liftRanks    = color === 'w' ? ['3', '4'] : ['6', '5'];
        const startCorners = color === 'w' ? WHITE_CORNERS : BLACK_CORNERS;

        // Count pawns on the DESTINATION file (pre-move board)
        let friendlyPawnOnFile = false;
        let enemyPawnOnFile    = false;
        for (let r = 0; r < 8; r++) {
            const p = board[r][fileIndex];
            if (p && p.type === 'p') {
                if (p.color === color) friendlyPawnOnFile = true;
                else                   enemyPawnOnFile    = true;
            }
        }

        const isOpenFile     = !friendlyPawnOnFile && !enemyPawnOnFile;
        const isSemiOpenFile = !friendlyPawnOnFile && enemyPawnOnFile;

        // ── Rook to 7th rank ──────────────────────────────────────────────
        if (toRank === seventhRank && from[1] !== seventhRank) {
            return {
                type: 'rook_seventh',
                text: `The rook invades the seventh rank — cutting off the king and pressuring pawns.`
            };
        }

        // ── Rook leaving starting corner ──────────────────────────────────
        if (startCorners.includes(from)) {
            if (isOpenFile) {
                return {
                    type: 'rook_development',
                    text: `The rook activates on the open ${toFile}-file — maximum influence.`
                };
            }
            if (isSemiOpenFile) {
                return {
                    type: 'rook_development',
                    text: `The rook swings to the semi-open ${toFile}-file, targeting the enemy pawn.`
                };
            }
            return {
                type: 'rook_development',
                text: `The rook enters the game from the corner.`
            };
        }

        // ── Rook to open file (from a different file) ─────────────────────
        if (isOpenFile && fromFile !== toFile) {
            return {
                type: 'rook_open_file',
                text: `Rook shifts to the open ${toFile}-file.`
            };
        }

        // ── Rook to semi-open file ────────────────────────────────────────
        if (isSemiOpenFile && fromFile !== toFile) {
            return {
                type: 'rook_semi_open',
                text: `Rook eyes the semi-open ${toFile}-file, putting pressure on the enemy pawn.`
            };
        }

        // ── Rook lift (3rd/4th rank for attack) ───────────────────────────
        if (liftRanks.includes(toRank) && fromFile === toFile) {
            const fromRankNum = parseInt(from[1]);
            const toRankNum   = parseInt(to[1]);
            const isForward   = color === 'w' ? toRankNum > fromRankNum : toRankNum < fromRankNum;
            if (isForward) {
                return {
                    type: 'rook_lift',
                    text: `Rook lift — the rook climbs to the ${toRank === (color === 'w' ? '3' : '6') ? 'third' : 'fourth'} rank, ready to swing across.`
                };
            }
        }

        return null;
    } catch {
        return null;
    }
}
