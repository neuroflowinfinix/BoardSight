// ─────────────────────────────────────────────────────────────────────────────
//  shareEncoder.js  —  Client-side share link encoding / decoding
//
//  Runs entirely in the browser using chess.js, so there is zero server
//  dependency, zero network latency, and zero risk of API / CORS errors.
//
//  Format (V2, 4 bytes per move):
//    std_v2;;<white_uri>;;<black_uri>;<url-safe-base64>
//    960_v2;<startingFen>;<white_uri>;<black_uri>;<url-safe-base64>
//
//  Byte layout per move:
//    [0]  move index in chess.moves() list     (0-254; 255 = not found)
//    [1]  eval byte  (evalByte = clamp(round(whiteScore/10), -126, 126) + 127;
//                    255 = white mate, 0 = black mate)
//    [2]  classification id  (see CLASS_MAP below)
//    [3]  best-move SAN index in chess.moves() (255 = unknown)
// ─────────────────────────────────────────────────────────────────────────────

import { Chess } from 'chess.js';
import { deflateSync, inflateSync } from 'fflate';
import { findAllHangingSquares } from '../../functions/enginex/hangingPieceTracker.js';
import { findAllForks } from '../../functions/enginex/forkTracker.js';
import { findAllChecks } from '../../functions/enginex/checkTracker.js';
import { findAllPinnedPieces } from '../../functions/enginex/pinTracker.js';
import { findAllCheckBlockers } from '../../functions/enginex/checkBlockerTracker.js';
import { findAllDiscoveries } from '../../functions/enginex/discoveryTracker.js';

const THEME_MAP_ENC = { 'green': 'g', 'wood': 'w' };
const THEME_MAP_DEC = { 'g': 'green', 'w': 'wood' };
const PIECE_MAP_ENC = { 'Staunty': 'S', 'Infinix': 'I', 'Cooke': 'C', 'Monarchy': 'M', 'Maya-4': 'm', 'Trinity-4': 'T' };
const PIECE_MAP_DEC = { 'S': 'Staunty', 'I': 'Infinix', 'C': 'Cooke', 'M': 'Monarchy', 'm': 'Maya-4', 'T': 'Trinity-4' };

// ── Classification tables ────────────────────────────────────────────────────
const CLASS_MAP = {
    book: 0, brilliant: 1, great: 2, best: 3, excellent: 4,
    good: 5, inaccuracy: 6, miss: 7, mistake: 8, blunder: 9, novelty: 10,
};

const ID_TO_CLASS = {
    0:  { id: 'book',       label: 'Book Move'  },
    1:  { id: 'brilliant',  label: 'Brilliant'  },
    2:  { id: 'great',      label: 'Great Move' },
    3:  { id: 'best',       label: 'Best Move'  },
    4:  { id: 'excellent',  label: 'Excellent'  },
    5:  { id: 'good',       label: 'Good'       },
    6:  { id: 'inaccuracy', label: 'Inaccuracy' },
    7:  { id: 'miss',       label: 'Miss'       },
    8:  { id: 'mistake',    label: 'Mistake'    },
    9:  { id: 'blunder',    label: 'Blunder'    },
    10: { id: 'novelty',    label: 'Novelty'    },
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function detectGamePhase(moveIndex, totalMoves) {
    const pct = moveIndex / Math.max(1, totalMoves);
    if (pct <= 0.30) return 'opening';
    if (pct <= 0.70) return 'middlegame';
    return 'endgame';
}

const SEVERITY_RANK = {
    blunder: 0, mistake: 1, inaccuracy: 2, good: 3,
    excellent: 4, best: 5, great: 6, brilliant: 7,
};

function applyDiscounting(moves) {
    // Mirror the same no-discount policy used in useGameAnalysis
    return moves.map(m => ({ ...m, discounted: false }));
}

// ── Safe Uint8Array → binary string (avoids spread stack-overflow on huge games) ──
function uint8ToBinaryString(buf) {
    let s = '';
    for (let i = 0; i < buf.length; i++) s += String.fromCharCode(buf[i]);
    return s;
}

// ── Encoder ──────────────────────────────────────────────────────────────────
/**
 * Encode a completed analysis into a compact, URL-safe hash string.
 * Pure client-side — no network call needed.
 *
 * @param {Array}  analysisResults  – array of analyzed move objects
 * @param {string} pgnVariant       – 'standard' | 'chess960'
 * @param {string} [startingFen]    – Chess960 starting FEN (omit for standard)
 * @param {object} [gameInfo]       – { white, black }
 * @returns {string}  hash string ready to be appended after '#' in a URL
 */
export function encodeGameHash(analysisResults, pgnVariant, startingFen, gameInfo, options = {}) {
    const w = encodeURIComponent(gameInfo?.white || 'White');
    const b = encodeURIComponent(gameInfo?.black || 'Black');
    
    let themeStr = options.theme ? THEME_MAP_ENC[options.theme] || options.theme : '';
    let pieceSetStr = options.pieceSet ? PIECE_MAP_ENC[options.pieceSet] || options.pieceSet : '';

    if (themeStr === 'g' || themeStr === 'green') themeStr = '';
    if (pieceSetStr === 'S' || pieceSetStr === 'Staunty') pieceSetStr = '';

    const m = options.metrics;
    const metricsStr = m ? [m.wAcc, m.bAcc, m.wOp, m.wMg, m.wEg, m.bOp, m.bMg, m.bEg].join(',') : '';

    const fromMove = options.fromMoveIndex !== undefined && options.fromMoveIndex !== null ? options.fromMoveIndex : '';
    const persp = options.perspective === 'black' ? 'b' : (options.perspective === 'white' ? 'w' : '');

    // '_v3' tag tells the decoder to use compressed 4-byte-per-move parsing
    const prefix = pgnVariant === 'chess960'
        ? `960_v3;${startingFen || ''};${w};${b};${themeStr};${pieceSetStr};${metricsStr};${fromMove};${persp};`
        : `std_v3;;${w};${b};${themeStr};${pieceSetStr};${metricsStr};${fromMove};${persp};`;

    const B      = 4;
    const buffer = new Uint8Array(analysisResults.length * B);
    const chess  = new Chess(startingFen || undefined, pgnVariant === 'chess960' ? { chess960: true } : {});

    analysisResults.forEach((res, i) => {
        // Byte 0 – move index
        const legalMoves = chess.moves();
        const moveIdx    = legalMoves.indexOf(res.san);

        // Byte 1 – eval (white-relative centipawns compressed to 1 byte)
        // Reserve 235-255 for White Mate (M20 to M0)
        // Reserve 0-20 for Black Mate (M0 to M20)
        // Standard eval uses 27 to 227 (clamped to +/- 10.0)
        const cp = res.whiteScore ?? 0;
        let evalByte;
        if (cp >= 9000) {
            const m = 10000 - cp;
            evalByte = 255 - Math.min(20, m); 
        } else if (cp <= -9000) {
            const m = cp + 10000;
            evalByte = Math.min(20, m);
        } else {
            const scaled = Math.max(-100, Math.min(100, Math.round(cp / 10)));
            evalByte = scaled + 127;
        }

        // Byte 2 – classification
        const classId = CLASS_MAP[res.classification?.id] ?? 4;

        // Byte 3 – best-move SAN index (so the coach can reconstruct on load)
        let bestMoveIdx = 255;
        if (res.engineBestMove) {
            try {
                const tmp   = new Chess(res.preFen);
                const from  = res.engineBestMove.substring(0, 2);
                const to    = res.engineBestMove.substring(2, 4);
                const promo = res.engineBestMove.length > 4 ? res.engineBestMove[4].toLowerCase() : undefined;
                const mv    = tmp.move({ from, to, promotion: promo });
                if (mv) {
                    const idx = tmp.moves().indexOf(mv.san);
                    bestMoveIdx = idx !== -1 ? idx : 255;
                }
            } catch (_) {}
        }

        buffer[i * B]     = moveIdx !== -1 ? moveIdx : 255;
        buffer[i * B + 1] = evalByte;
        buffer[i * B + 2] = classId;
        buffer[i * B + 3] = bestMoveIdx;

        chess.move(res.san);
    });

    // Compress if we have moves to compress
    const outputBuffer = analysisResults.length > 0 ? deflateSync(buffer, { level: 9 }) : buffer;

    // Use loop instead of spread to avoid call-stack limits on very long games
    const binaryString = uint8ToBinaryString(outputBuffer);
    const base64 = btoa(binaryString)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');   // strip padding — re-added on decode

    return prefix + base64;
}

// ── Decoder ──────────────────────────────────────────────────────────────────
/**
 * Decode a shared hash string back into the full analysis state.
 * Pure client-side — no network call needed.
 * Coach explanations are left null; the existing enrichMove() hook will
 * populate them lazily as the user navigates through moves.
 *
 * @param {string} hashString
 * @returns {{ results, positions, finalFen, pgnVariant, startingFen, white, black }}
 */
export function decodeGameHash(hashString) {
    const parts       = hashString.split(';');
    const variantFlag = parts[0];
    const fenStr      = parts[1] ?? '';

    let wStr, bStr, base64, themeStr, pieceSetStr, metricsStr, fromMoveStr, perspStr;
    if (parts.length >= 10) {
        wStr   = parts[2];
        bStr   = parts[3];
        themeStr = parts[4];
        pieceSetStr = parts[5];
        metricsStr = parts[6];
        fromMoveStr = parts[7];
        perspStr = parts[8];
        base64 = parts[9];
    } else if (parts.length >= 8) {
        wStr   = parts[2];
        bStr   = parts[3];
        themeStr = parts[4];
        pieceSetStr = parts[5];
        metricsStr = parts[6];
        base64 = parts[7];
    } else if (parts.length >= 7) {
        wStr   = parts[2];
        bStr   = parts[3];
        themeStr = parts[4];
        pieceSetStr = parts[5];
        base64 = parts[6];
    } else if (parts.length >= 5) {
        wStr   = parts[2];
        bStr   = parts[3];
        base64 = parts[4];
    } else {
        // Legacy 3-part links (no player names)
        wStr   = encodeURIComponent('Shared');
        bStr   = encodeURIComponent('Game');
        base64 = parts[2];
    }

    const isV3  = variantFlag.includes('v3');
    const isV2  = variantFlag.includes('v2') || isV3;
    const is960 = variantFlag.includes('960');
    const B     = isV2 ? 4 : 3;

    // Restore standard base64 padding
    let std = base64.replace(/-/g, '+').replace(/_/g, '/');
    const pad = std.length % 4;
    if (pad) std += '='.repeat(4 - pad);

    const bin   = atob(std);
    let decodedBuffer = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) decodedBuffer[i] = bin.charCodeAt(i);

    if (isV3 && decodedBuffer.length > 0) {
        try {
            decodedBuffer = inflateSync(decodedBuffer);
        } catch (e) {
            console.error("Decompression failed", e);
        }
    }

    const chess = new Chess(fenStr || undefined, is960 ? { chess960: true } : {});

    const results   = [];
    const positions = [chess.fen()];
    let previousWhiteScore = 0;

    for (let i = 0; i < decodedBuffer.length; i += B) {
        const moveIdx   = decodedBuffer[i];
        const legalMoves = chess.moves();
        const san       = legalMoves[moveIdx];
        if (!san) break; // fail-safe: truncate on first gap

        const preFen  = chess.fen();
        const moveObj = chess.move(san);
        if (!moveObj) break;
        const fen = chess.fen();
        positions.push(fen);

        // Parse eval / classification bytes
        let whiteScore = 0;
        let classId    = 4;
        let bestMoveIdx = 255;

        if (isV2) {
            const evalByte = decodedBuffer[i + 1];
            if (evalByte >= 235) {
                const m = 255 - evalByte;
                whiteScore = 10000 - m;
            } else if (evalByte <= 20) {
                const m = evalByte;
                whiteScore = -10000 + m;
            } else {
                whiteScore = (evalByte - 127) * 10;
            }

            classId     = decodedBuffer[i + 2];
            bestMoveIdx = decodedBuffer[i + 3];
        } else {
            // Legacy 3-byte format
            const evalByte = decodedBuffer[i + 1];
            whiteScore = (evalByte - 128) * 10;
            classId    = decodedBuffer[i + 2];
        }

        const preScore  = moveObj.color === 'w' ?  previousWhiteScore : -previousWhiteScore;
        const postScore = moveObj.color === 'w' ?  whiteScore         : -whiteScore;
        const loss      = Math.max(0, preScore - postScore);

        const classification = ID_TO_CLASS[classId] || ID_TO_CLASS[4];
        const isBookMove     = classId === 0;
        const isNovelty      = classId === 10;

        // Reconstruct best-move SAN (powers the coach on load)
        let bestMoveSan = null;
        if (isV2 && bestMoveIdx !== 255) {
            try {
                bestMoveSan = new Chess(preFen).moves()[bestMoveIdx] ?? null;
            } catch (_) {}
        }

        const plyIndex    = i / B;
        const totalPlies  = decodedBuffer.length / B;
        const moveNumber  = Math.floor(plyIndex / 2) + 1;
        const phase       = detectGamePhase(plyIndex, totalPlies);
        const hangingSquares = findAllHangingSquares(fen);
        const forkSquares = findAllForks(fen);
        const checkSquares = findAllChecks(fen);
        const pinSquares = findAllPinnedPieces(fen);
        const blockSquares = findAllCheckBlockers(fen);
        const discoverySquares = findAllDiscoveries(fen);
        // Coach explanation left null — enrichMove() will populate it lazily
        results.push({
            ...moveObj,
            moveNumber,
            fen, preFen,
            whiteScore, preScore, postScore, loss,
            isBookMove, isNovelty, isBranch: false,
            classification, phase, hangingSquares, forkSquares, checkSquares, pinSquares, blockSquares, discoverySquares,
            // Coach explanation left null — enrichMove() will populate it lazily
            coachExplanation: null,
            _deferredData: {
                bestMoveSan,
                currentIsBookMove: isBookMove,
                currentIsNovelty: isNovelty,
                isOnlySoundMove: false,
                timeSpent: null,
                captureStreak: 0,
                pvStr: null,
                evalStr: null,
            },
            engineBestMove: null,  // best-move UCI not stored; SAN reconstructed above
            engineTopMoves: [],
        });

        previousWhiteScore = whiteScore;
    }

    const finalTheme = themeStr ? (THEME_MAP_DEC[themeStr] || decodeURIComponent(themeStr)) : null;
    const finalPieceSet = pieceSetStr ? (PIECE_MAP_DEC[pieceSetStr] || decodeURIComponent(pieceSetStr)) : null;

    let metrics = null;
    if (metricsStr) {
        const p = metricsStr.split(',');
        if (p.length === 8) {
            metrics = {
                wAcc: p[0] ? Number(p[0]) : null,
                bAcc: p[1] ? Number(p[1]) : null,
                wOp: p[2] ? Number(p[2]) : null,
                wMg: p[3] ? Number(p[3]) : null,
                wEg: p[4] ? Number(p[4]) : null,
                bOp: p[5] ? Number(p[5]) : null,
                bMg: p[6] ? Number(p[6]) : null,
                bEg: p[7] ? Number(p[7]) : null,
            };
        }
    }

    return {
        results: applyDiscounting(results),
        positions,
        finalFen:   chess.fen(),
        pgnVariant: is960 ? 'chess960' : 'standard',
        startingFen: fenStr,
        white: decodeURIComponent(wStr),
        black: decodeURIComponent(bStr),
        theme: finalTheme,
        pieceSet: finalPieceSet,
        metrics,
        fromMoveIndex: fromMoveStr ? Number(fromMoveStr) : null,
        perspective: perspStr === 'b' ? 'black' : 'white',
    };
}
