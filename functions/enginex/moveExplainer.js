// ─────────────────────────────────────────────────────────────────────────────
//  moveExplainer.js — Unified client-side & server-side move explanation engine
//
//  All explanations are anchored to the PLAYER'S MOVE and ENGINE LINES.
//  Nothing fires independently — every tracker output is strictly gated by
//  move quality and engine line validation.
// ─────────────────────────────────────────────────────────────────────────────

import { Chess } from 'chess.js';
import { getOpeningExplanation } from './openingExplainer.js';
import { detectWhiplash } from './whiplashTracker.js';
import { isCentralSquare } from './developmentTracker.js';
import { findAllPinnedPieces } from './pinTracker.js';
import { findAllForks } from './forkTracker.js';
import { findAllHangingSquares } from './hangingPieceTracker.js';
import { findAllChecks } from './checkTracker.js';
import { findAllCheckBlockers } from './checkBlockerTracker.js';
import { findAllDiscoveries } from './discoveryTracker.js';
import { detectSacrifice } from './sacrificeTracker.js';
import { detectMate } from './mateExplainer.js';
import { evaluatePassedPawnMove } from './passedPawnTracker.js';
import { evaluateTempoLoss } from './tempoTracker.js';
import { evaluatePawnChaser } from './pieceChaserTracker.js';
import { detectRookDevelopment } from './rookDevelopmentTracker.js';
import { StreakTracker } from './streakTracker.js';
import { extractPVTactics } from './pvParser.js';
import { evaluatePawnStructure } from './pawnStructureTracker.js';
import { detectOutpost } from './outpostTracker.js';
import { evaluateEndgame } from './endgameTracker.js';

// ── Piece helpers ──────────────────────────────────────────────────────────
const PN = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const PV = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

function pn(t)  { return PN[t?.toLowerCase()] || 'piece'; }
function pv(t)  { return PV[t?.toLowerCase()] || 0; }
function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

function getBestMoveAttackSuffix(preFen, bestMoveSan) {
    if (!bestMoveSan || !preFen) return '';
    if (bestMoveSan.includes('#')) return ''; // Checkmate is the ultimate attack!
    try {
        const tempChess = new Chess(preFen);
        const m = tempChess.move(bestMoveSan);
        if (!m) return '';

        let suffix = '';
        let hasAction = false;

        if (m.captured) {
            const verb = pick(['taking', 'capturing', 'snagging', 'grabbing', 'picking up']);
            suffix += `, ${verb} the ${pn(m.captured)}`;
            hasAction = true;
        } else {
            const fenParts = tempChess.fen().split(' ');
            fenParts[1] = fenParts[1] === 'w' ? 'b' : 'w';
            fenParts[3] = '-'; // strip en-passant to avoid validation issues on turn flip
            const attackChess = new Chess(fenParts.join(' '));
            
            const captures = attackChess.moves({ square: m.to, verbose: true }).filter(x => x.captured);
            if (captures.length > 0) {
                let highestCap = captures[0];
                let highestVal = pv(captures[0].captured);
                for (const cap of captures) {
                    const val = pv(cap.captured);
                    if (val > highestVal) {
                        highestVal = val;
                        highestCap = cap;
                    }
                }
                const verb = pick(['attacking', 'eyeing', 'targeting', 'threatening', 'pressuring']);
                suffix += `, ${verb} the ${pn(highestCap.captured)}`;
                hasAction = true;
            }
        }

        if (isCentralSquare(m.to) && !isCentralSquare(m.from) && m.piece !== 'p' && m.piece !== 'k') {
            if (Math.random() < 0.25) {
                const devPhrase = pick([
                    'developing to the center',
                    'bringing the piece into the action',
                    'controlling the central squares',
                    'improving the piece\'s position'
                ]);
                
                if (hasAction) {
                    suffix += `, and ${devPhrase}`;
                } else {
                    suffix += `, ${devPhrase}`;
                }
            }
        }

        return suffix;
    } catch (e) {
        return '';
    }
    return '';
}

// ── Anti-repetition phrase picker ─────────────────────────────────────────
// Tracks normalised output strings in a rolling window. Each candidate is
// scored by how recently its normalised form appeared; the picker always
// chooses from the tier that was used longest ago (or never used at all).
// Window size of 60 ensures phrases don't repeat within ~60 pick() calls.
const recentOutputs = [];                 // rolling window of normalised strings
const RECENT_OUTPUT_WINDOW = 60;

export function clearExplainerSession() {
  recentOutputs.length = 0;
}

/**
 * Normalise a string for duplicate comparison by stripping move-specific
 * tokens (SAN, squares, check/mate symbols), markdown bold, punctuation,
 * and collapsing whitespace.  Two strings that differ only by the move
 * name or target square will produce the same normalised key.
 */
function normaliseForComparison(str) {
    if (!str) return '';
    return str
        // Strip SAN move tokens  e.g. Nxe5, e4, O-O-O, Qh4+
        .replace(/\b([A-NQRKB][a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?|[a-h]x?[a-h][1-8](?:=[QRBN])?|[a-h][1-8]|O-O(?:-O)?)[+#]?(?!\w)/g, '')
        // Strip remaining bare squares like "e5" or "d4"
        .replace(/\b[a-h][1-8]\b/g, '')
        // Strip markdown bold markers
        .replace(/\*{1,2}/g, '')
        // Strip punctuation (keep hyphens and apostrophes for readability)
        .replace(/[!.,;:?]+/g, '')
        // Collapse whitespace
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

export function pick(arr) {
    if (!Array.isArray(arr) || arr.length === 0) return '';
    if (arr.length === 1) {
        const only = typeof arr[0] === 'function' ? arr[0]() : arr[0];
        recentOutputs.push(normaliseForComparison(only));
        if (recentOutputs.length > RECENT_OUTPUT_WINDOW) recentOutputs.shift();
        return only;
    }

    // Resolve all candidates and compute their normalised keys
    const resolved = arr.map((item, i) => {
        const str = typeof item === 'function' ? item() : item;
        const norm = normaliseForComparison(str);
        // Find how recently this normalised key appeared (0 = never seen)
        const lastSeenIdx = recentOutputs.lastIndexOf(norm);
        // Convert to "recency score": -1 means never used (best), otherwise
        // higher number = more recent = worse
        const recency = lastSeenIdx === -1 ? -1 : lastSeenIdx;
        return { idx: i, str, norm, recency };
    });

    // Sort by recency ascending — never-used first, then oldest-used
    resolved.sort((a, b) => a.recency - b.recency);

    // Pick randomly from the tier with the smallest recency
    const bestRecency = resolved[0].recency;
    const candidates = resolved.filter(r => r.recency === bestRecency);
    const chosen = candidates[Math.floor(Math.random() * candidates.length)];

    // Record in the rolling window
    recentOutputs.push(chosen.norm);
    if (recentOutputs.length > RECENT_OUTPUT_WINDOW) recentOutputs.shift();

    return chosen.str;
}


// ── Perspective-coloured interjections ─────────────────────────────────────
const CASUAL_WIN_GOOD  = ['Nice!', 'Ooh,', 'Love that.', 'Sharp!', 'Clean.', 'Smooth.', 'Yes!', 'Great find.', 'Textbook.', 'Right on the money!', 'Beautiful.', 'Top tier.'];
const CASUAL_WIN_BAD   = ['Hmm,', 'Oof.', 'Yikes.', 'Ouch.', 'Ah,', 'Oh no,', 'Uh oh.', 'Wait —', 'Whoops.', 'That slipped.', 'Not quite.'];
const CASUAL_LOSE_GOOD = ['Hang in there!', 'Fighting spirit!', 'Resilient.', 'Still in it.', 'Solid defence.', 'Staying alive.', 'Not backing down!', 'Way to hold the line.'];
const CASUAL_LOSE_BAD  = ['That might be it.', 'Rough.', 'Ouch.', 'Ah,', 'Not ideal.', 'This hurts.', 'Slipping away.', 'Tough break.'];
const CASUAL_TACTIC    = ['Boom!', 'There it is!', 'Oh yes!', 'Gotcha.', 'Bam!', 'Pow!', 'Tactical strike!', 'Bulls-eye!'];
const CASUAL_EQUAL     = ['Interesting.', 'Alright,', 'Okay then.', 'Solid.', 'Fair enough.'];

function casual(arr) {
    return Math.random() < 0.30 ? pick(arr) + ' ' : '';
}

function formatEngagingText(text) {
    if (!text) return '';
    let styled = text;

    // Core high-impact terms (always styled with bold & uppercase)
    styled = styled.replace(/\b(Checkmate)\b!?/i, '**CHECKMATE!**');
    styled = styled.replace(/\b(Brilliant)\b!?/i, '**BRILLIANT!**');
    styled = styled.replace(/\b(Blunder)\b!?/i, '**BLUNDER!**');
    styled = styled.replace(/\b(Coronation)\b!?/i, '**CORONATION!**');
    styled = styled.replace(/\b(Double check)\b!?/i, '**DOUBLE CHECK!**');
    styled = styled.replace(/\b(Discovered check)\b!?/i, '**DISCOVERED CHECK!**');
    styled = styled.replace(/\b(Discovered attack)\b!?/i, '**DISCOVERED ATTACK!**');
    styled = styled.replace(/\b(Double attack)\b!?/i, '**DOUBLE ATTACK!**');
    styled = styled.replace(/\bFree (queen|rook|knight|bishop)\b!?/i, (match, p1) => `**FREE ${p1.toUpperCase()}!**`);

    // Key tactics & pieces (40-60% random probability bolding/uppercase)
    styled = styled.replace(/\b(queen|Queen)\b/g, (m) => Math.random() < 0.55 ? '**QUEEN**' : m);
    styled = styled.replace(/\b(fork|Fork)\b(!?)/g, (match, p1, p2) => Math.random() < 0.55 ? `**FORK**${p2}` : match);
    styled = styled.replace(/\b(pin|Pin)\b(!?)/g, (match, p1, p2) => Math.random() < 0.55 ? `**PIN**${p2}` : match);
    styled = styled.replace(/\b(passed pawn|Passed pawn)\b/gi, (m) => Math.random() < 0.60 ? '**Passed Pawn**' : m);
    styled = styled.replace(/\b(Check)\b(!?)/g, (match, p1, p2) => Math.random() < 0.50 ? `**CHECK**${p2}` : match);

    // Clean up any double exclamation marks like !! or !!
    styled = styled.replace(/!{2,}/g, '!');
    return styled;
}

const WINNING_THRESHOLD =  150;
const LOSING_THRESHOLD  = -150;

function stance(preScore) {
    if (typeof preScore !== 'number') return 'equal';
    if (preScore >= WINNING_THRESHOLD)  return 'winning';
    if (preScore <= LOSING_THRESHOLD)   return 'losing';
    return 'equal';
}

function goodCasual(st) {
    if (st === 'winning') return CASUAL_WIN_GOOD;
    if (st === 'losing')  return CASUAL_LOSE_GOOD;
    return CASUAL_EQUAL;
}

function badCasual(st) {
    if (st === 'winning') return CASUAL_WIN_BAD;
    if (st === 'losing')  return CASUAL_LOSE_BAD;
    return CASUAL_EQUAL;
}

function isForkTargetCapturedInPV(forkEntry, pvString, startFen) {
    if (!forkEntry || !forkEntry.targets || !pvString || !startFen) return true;
    try {
        const moves = pvString.split(' ').slice(0, 4);
        let tempChess = new Chess(startFen);
        for (const mUCI of moves) {
            const from = mUCI.slice(0, 2);
            const to   = mUCI.slice(2, 4);
            const prom = mUCI.slice(4, 5);
            if (forkEntry.targets.some(t => t.square === to && t.type !== 'k')) {
                return true;
            }
            tempChess.move({ from, to, promotion: prom || undefined });
        }
    } catch {
        return true;
    }
    return false;
}

export function generateMoveExplanation(params) {
    const {
        move, preFen, fen, classification,
        forkSquares, pinSquares, checkSquares, hangingSquares, blockSquares, discoverySquares,
        isSacrifice: rawSacrifice, streakExplanation: providedStreakExplanation,
        bestMoveSan, loss, preScore, postScore, whiteScore,
        isBookMove, isNovelty, isLastBookMove,
        moveNumber, openingName, phase,
        engineTopMoves, playerMoveUCI,
        pvStr, perspectiveColor = 'w',
        history = []
    } = params;

    if (!move || !fen) return { type: 'observation', text: '' };

    const san   = move.san;
    let clsId = classification?.id;

    // Check for missed mate or missed high-value hanging piece to override blunder -> miss
    if (clsId === 'blunder' || clsId === 'mistake') {
        const preScoreIsMate = (typeof preScore === 'number' && Math.abs(preScore) > 9000) || (typeof preScore === 'string' && (preScore.includes('M') || preScore.includes('m')));
        
        let missedHighValueHanging = false;
        try {
            const preHangingSquares = findAllHangingSquares(preFen);
            if (preHangingSquares && preHangingSquares.length > 0) {
                const preChess = new Chess(preFen);
                const oppHanging = preHangingSquares
                    .map(sq => preChess.get(sq))
                    .filter(p => p && p.color !== move.color && pv(p.type) >= 3);
                
                if (oppHanging.length > 0 && (!move.captured || pv(move.captured) < 3)) {
                    missedHighValueHanging = true;
                }
            }
        } catch (e) {}

        if (preScoreIsMate || missedHighValueHanging) {
            clsId = 'miss';
        }
    }

    const isGoodCls = ['brilliant', 'great', 'best', 'excellent', 'good'].includes(clsId);
    const isBadCls  = ['blunder', 'mistake', 'miss'].includes(clsId);
    const isInaccuracy = clsId === 'inaccuracy';
    const isCheck   = san.includes('+') || san.includes('#');

    // Auto-resolve tactical squares if caller didn't supply them
    const activeCheckSquares = Array.isArray(checkSquares) ? checkSquares : (fen ? findAllChecks(fen) : []);
    const activeForkSquares = Array.isArray(forkSquares) ? forkSquares : (fen ? findAllForks(fen) : []);
    const activePinSquares = Array.isArray(pinSquares) ? pinSquares : (fen ? findAllPinnedPieces(fen) : []);
    const activeBlockSquares = Array.isArray(blockSquares) ? blockSquares : (preFen ? findAllCheckBlockers(preFen) : []);

    // Pronoun Helpers
    const isPlayer = move.color === perspectiveColor;

    let streakExplanation = providedStreakExplanation;
    if (!streakExplanation && Array.isArray(history)) {
        const tracker = new StreakTracker();
        tracker.hydrate(history);
        streakExplanation = tracker.processMove(move.color, clsId, isPlayer);
    }

    const YOU = () => isPlayer ? 'You' : 'The opponent';
    const you = () => isPlayer ? 'you' : 'the opponent';
    const YOUR = () => isPlayer ? 'Your' : 'Their';
    const your = () => isPlayer ? 'your' : 'their';
    const YOU_RE = () => isPlayer ? "You're" : "They're";
    const THEY = () => isPlayer ? 'They' : 'You';
    const they = () => isPlayer ? 'they' : 'you';

    const st = stance(preScore);
    const CG = goodCasual(st);
    const CB = badCasual(st);

    const moveUCI = playerMoveUCI || ((move.from || '') + (move.to || '') + (move.promotion || ''));
    const isInEngineLine = Array.isArray(engineTopMoves) && engineTopMoves.some(tm => tm.move === moveUCI);

    let chess = null;
    try { chess = new Chess(fen); } catch { /* ignore */ }

    // ── 0. CHECKMATE ON BOARD (mateExplainer Integration) ──────────────────
    if (chess && chess.isCheckmate()) {
        const matePattern = detectMate(fen, move);
        if (matePattern) {
            let mateText = '';
            switch (matePattern) {
                case "Ladder mate":
                    mateText = isPlayer ? pick([
                        "You closed out the game with a ladder mate – just like in the books!",
                        "Ladder mate! Heavy pieces box in the king step-by-step for checkmate.",
                        "Checkmate! The ladder pattern locks down the king against the edge.",
                        "Lawn mower mate! Rolling the rooks up the board to seal the victory.",
                        "Rolling checkmate! Your heavy pieces march the king right off the board.",
                        "Textbook ladder mate! Smooth, systematic, and completely inescapable.",
                        "Game over! A classic ladder mate closes out a commanding win!"
                    ]) : pick([
                        "Your opponent closed out the game with a ladder mate.",
                        "Ladder mate! Their heavy pieces box in your king against the edge.",
                        "Checkmate! The opponent's rooks step up the board in a ladder pattern.",
                        "Lawn mower mate by your opponent. The king ran out of squares.",
                        "Systematic checkmate. Their heavy pieces march your king to the wall."
                    ]);
                    break;

                case "Fool's mate":
                    mateText = isPlayer ? pick([
                        "Fool's mate! A lightning-fast checkmate exploiting the weakened diagonal!",
                        "Unbelievable! You delivered Fool's mate in the blink of an eye!",
                        "Fool's mate! Taking instant advantage of that early pawn slip.",
                        "Speedrun victory! Fool's mate punishes the weakened king diagonal.",
                        "Blink and you missed it! Fool's mate closes out the game immediately."
                    ]) : pick([
                        "Fool's mate! Your opponent caught your king on the open diagonal.",
                        "Ouch! A quick Fool's mate ends the game early.",
                        "Fool's mate! The open diagonal proved fatal for the king."
                    ]);
                    break;

                case "Scholar's mate":
                    mateText = isPlayer ? pick([
                        "Scholar's mate! A lightning-fast checkmate on the f-pawn target square!",
                        "Kiss of death! Scholar's mate lands on the weak f-pawn.",
                        "Scholar's mate! Queen and bishop team up for a textbook early victory.",
                        "Early fireworks! Scholar's mate strikes right at the start.",
                        "Checkmate! Scholar's mate crashes through on the f-pawn."
                    ]) : pick([
                        "Scholar's mate! Your opponent caught your weak f-pawn early on.",
                        "Ouch! Scholar's mate strikes on the early target square.",
                        "Scholar's mate from the opponent! The queen and bishop combined early."
                    ]);
                    break;

                case "Smothered mate":
                    mateText = isPlayer ? pick([
                        "Smothered mate! A legendary knight checkmate trapping the king among its own pieces!",
                        "Unbelievable smothered mate! The knight leaps in while the king is suffocated by its own defenders.",
                        "Pure poetry! Smothered mate with the knight — one of the rarest tactics in chess!",
                        "Smothered checkmate! The king is completely boxed in by its own army.",
                        "Knight masterpiece! A classic smothered mate traps the helpless king."
                    ]) : pick([
                        "Smothered mate! The opponent's knight delivers checkmate to your trapped king.",
                        "Ouch! A smothered mate leaves your king with nowhere to run among its own pieces.",
                        "Smothered checkmate by the opponent's knight. Brutal tactical finish."
                    ]);
                    break;

                case "Legal's mate":
                    mateText = isPlayer ? pick([
                        "Legal's mate! A brilliant minor piece combination trapping the king!",
                        "Legal's mate! Minor pieces coordinate to deliver a stunning early checkmate.",
                        "Tactical perfection! Legal's mate showcases incredible minor piece teamwork.",
                        "Checkmate! Legal's mate weaves a lethal net around the king."
                    ]) : pick([
                        "Legal's mate! The opponent's minor pieces trapped your king in the center.",
                        "Ouch! A swift Legal's mate combination ends the game."
                    ]);
                    break;

                case "Boden's mate":
                    mateText = isPlayer ? pick([
                        "Boden's mate! Crisscrossing bishops slash across the diagonals for checkmate!",
                        "Boden's mate! Double bishops slice through the king's defences.",
                        "Bishop power! Boden's mate delivers a gorgeous diagonal checkmate.",
                        "Crisscross checkmate! Boden's mate traps the king between the two bishops."
                    ]) : pick([
                        "Boden's mate! The opponent's bishops sliced through the diagonals.",
                        "Ouch! Boden's mate traps your king behind friendly pieces."
                    ]);
                    break;

                case "Arabian mate":
                    mateText = isPlayer ? pick([
                        "Arabian mate! The rook delivers checkmate guarded by the powerful knight!",
                        "Arabian mate! Knight and rook team up in the corner to seal the win.",
                        "Corner trap! Arabian mate locks the king in the corner.",
                        "Classic Arabian mate! The knight covers the escape while the rook finishes it."
                    ]) : pick([
                        "Arabian mate! The opponent's rook and knight cornered your king.",
                        "Ouch! Arabian mate locks your king in the corner."
                    ]);
                    break;

                case "Anastasia's mate":
                    mateText = isPlayer ? pick([
                        "Anastasia's mate! The rook blasts down the file supported by the knight!",
                        "Anastasia's mate! Knight blocks the escape squares while the rook strikes.",
                        "Lethal coordination! Anastasia's mate traps the king on the edge file."
                    ]) : pick([
                        "Anastasia's mate! Your opponent trapped your king along the edge file.",
                        "Ouch! Anastasia's mate ends the fight along the file."
                    ]);
                    break;

                case "Back rank mate":
                    mateText = isPlayer ? pick([
                        "Back rank mate! The rook locks down the king along the back rank.",
                        "Classic back rank mate! Trapping the king behind its own pawn wall.",
                        "Back rank checkmate! The heavy piece sweeps the back line.",
                        "Pawn wall trap! Back rank mate takes immediate advantage of the tight quarters.",
                        "Checkmate! The rook slides across the back rank for a swift victory."
                    ]) : pick([
                        "Back rank mate! Your opponent traps your king on the back line.",
                        "Ouch! Back rank checkmate behind the pawn wall.",
                        "Back rank mate by the opponent's rook. The back line was vulnerable."
                    ]);
                    break;

                case "Opera mate":
                    mateText = isPlayer ? pick([
                        "Opera mate! Rook strikes along the file protected by the bishop!",
                        "Morphy's famous Opera mate! Rook and bishop combine for a legendary checkmate.",
                        "Opera house victory! The bishop guards the rook for a clean mate."
                    ]) : pick([
                        "Opera mate! The opponent's rook and bishop combined to corner your king.",
                        "Ouch! Opera mate finishes the game."
                    ]);
                    break;

                default:
                    mateText = isPlayer ? pick([
                        "Checkmate! You closed out the game with a clean, decisive victory!",
                        "Game over! A sharp checkmate seals a commanding win.",
                        "Checkmate! The king has no escape squares left.",
                        "Victory! You land the final checkmate blow to wrap up the game!",
                        "Checkmate! Flawless execution to bring down the enemy king.",
                        "Bulls-eye! The checkmate net closes, game over!"
                    ]) : pick([
                        "Checkmate! Your opponent closed out the game.",
                        "Game over! The opponent landed the checkmate blow.",
                        "Checkmate! Your king has run out of escape squares."
                    ]);
                    break;
            }
            return { type: 'mate', text: mateText, tacticType: 'checkmate' };
        }
    }

    // ── 1. Opening phase ───────────────────────────────────────────────────
    if (isBookMove || isNovelty || isLastBookMove) {
        try {
            const result = getOpeningExplanation(
                move, bestMoveSan, isBookMove, isNovelty, moveNumber, openingName, isLastBookMove,
                classification, loss, isPlayer
            );
            if (result && result.text) return result;
        } catch { /* fall through */ }
    }

    const parts = [];
    let tacticType = null;
    let explType   = 'observation';

    // ── 2. Special moves ───────────────────────────────────────────────────
    if (san === 'O-O' || san === 'O-O-O') {
        const side = san === 'O-O' ? 'kingside' : 'queenside';
        parts.push(isPlayer ? pick([
            `Castling ${side} — king heads to safety and the rook connects.`,
            `${side === 'kingside' ? 'Short' : 'Long'} castle — tucking the king away.`,
            `Castling ${side}. You prepped a cozy shelter for your king!`,
        ]) : pick([
            `Ooh, your opponent's castling ${side} to get that king safe and sound!`,
            `They castled ${side}, moving their king out of harm's way.`,
        ]));
        if (streakExplanation && streakExplanation.text) {
            parts.push(/[.!?]$/.test(streakExplanation.text) ? streakExplanation.text : streakExplanation.text + '.');
        }
        return { type: explType, text: parts.join(' ').trim(), tacticType };
    } else if (move.flags && move.flags.includes('e')) {
        parts.push(isPlayer ? pick([
            `En passant capture on ${move.to} — the pawn vanishes!`,
            `Sneaky en passant on ${move.to}! You love to see it!`,
        ]) : pick([
            `Your opponent pulled off an en passant capture on ${move.to}.`,
            `En passant! They snagged your pawn in passing.`,
        ]));
        if (streakExplanation && streakExplanation.text) {
            parts.push(/[.!?]$/.test(streakExplanation.text) ? streakExplanation.text : streakExplanation.text + '.');
        }
        return { type: explType, text: parts.join(' ').trim(), tacticType };
    } else if (move.promotion) {
        if (move.promotion === 'q') {
            parts.push(isPlayer ? pick([
                `You got a QUEEN! It's CORONATION! time, baby!`,
                `Promoting to a QUEEN! You're not letting up!`,
                `CORONATION! The pawn completes its journey to become a QUEEN!`
            ]) : pick([
                `Your opponent promoted their pawn to a brand new QUEEN!`,
                `They got a QUEEN on the board!`
            ]));
        } else {
            parts.push(`Underpromotion to a ${pn(move.promotion).toUpperCase()} — a rare and precise choice.`);
        }
        tacticType = 'promotion';
        explType = 'tactical';
        if (streakExplanation && streakExplanation.text) {
            parts.push(/[.!?]$/.test(streakExplanation.text) ? streakExplanation.text : streakExplanation.text + '.');
        }
        return { type: explType, text: formatEngagingText(parts.join(' ').trim()), tacticType };
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  3. BRANCH: Move quality determines explanation strategy
    // ═══════════════════════════════════════════════════════════════════════

    const isForced = clsId === 'forced';

    if (isGoodCls || isForced) {
        let foundTactic = false;

        // Forced move handling
        if (isForced) {
            parts.push(isPlayer ? pick([
                `Forced move — stepping into the only legal square available.`,
                `Only choice on the board! Moving out of check.`,
                `Forced move — no other legal option on the board.`
            ]) : pick([
                `Forced move — your opponent had to step into the only legal square.`,
                `Forced response — no other choice available for your opponent.`
            ]));
            explType = 'observation';
            tacticType = 'forced';
        }

        // Sacrifice detection
        const sacObj = rawSacrifice || (chess ? detectSacrifice(fen, move, { topMoves: engineTopMoves }, preScore, postScore) : null);
        if (sacObj && sacObj.type === 'tactical_sacrifice') {
            parts.push(isPlayer ? pick([
                `${casual(CASUAL_TACTIC)}Tactical sacrifice! You give up material on ${move.to} for a forcing attack.`,
                `${casual(CASUAL_TACTIC)}A bold sacrifice on ${move.to}! Opening up the enemy position.`
            ]) : pick([
                `Tactical sacrifice — opponent gives up material on ${move.to} to push an attack.`,
                `They sacrificed material on ${move.to} for an aggressive continuation.`
            ]));
            tacticType = 'sacrifice';
            explType = 'tactical';
            foundTactic = true;
        }

        // Passed Pawn March (gated by engine line / position)
        const passedData = evaluatePassedPawnMove(move, fen, preFen, engineTopMoves);
        if (passedData && passedData.isPassed) {
            if (passedData.blockaded) {
                parts.push(isPlayer ? pick([
                    `Your passed pawn marches forward, but their heavy piece is keeping a close eye on the promotion path.`,
                    `Advancing the passed pawn! Watch out for their rook blockading the file.`
                ]) : pick([
                    `Their passed pawn pushes ahead, but your pieces are guarding the promotion path.`,
                    `They push their passed pawn forward, but it's held in check.`
                ]));
            } else if (passedData.isNearPromotion) {
                parts.push(isPlayer ? pick([
                    `That passed pawn is sprinting to the finish line! Promote it!`,
                    `One square away from coronation! The pawn is ready to promote.`
                ]) : pick([
                    `Their passed pawn is one step from promoting! High alert!`,
                    `Danger! Their passed pawn is right on the doorstep of promotion.`
                ]));
            } else {
                parts.push(isPlayer ? pick([
                    `You're marching that passed pawn to glory! One step closer to promotion!`,
                    `Pushing the passed pawn forward! Pressing down the file.`
                ]) : pick([
                    `Their passed pawn is marching down the board — keep an eye on it!`,
                    `They advance their passed pawn down the file.`
                ]));
            }
            if (!tacticType) tacticType = 'passed_pawn';
            explType = 'tactical';
            foundTactic = true;
        }

        // Pawn Chaser (Attacking higher-value piece, strictly in engine line)
        const chaserData = evaluatePawnChaser(move, fen, isInEngineLine);
        if (chaserData && chaserData.isChasing) {
            const tgtPiece = pn(chaserData.target.piece);
            parts.push(isPlayer ? pick([
                `You chased that ${tgtPiece} away like it stole your lunch money!`,
                `Pushing the pawn to attack the ${tgtPiece} and claim central space!`,
                `Kick! The pawn drives away their ${tgtPiece}.`
            ]) : pick([
                `They pushed their pawn to attack your ${tgtPiece} and claim space.`,
                `Your opponent advances a pawn to drive your ${tgtPiece} back.`
            ]));
            if (!tacticType) tacticType = 'pawn_chase';
            explType = 'tactical';
            foundTactic = true;
        }

        // Rook Development
        const rookDev = detectRookDevelopment(preFen, move, isInEngineLine);
        if (rookDev) {
            parts.push(rookDev.text);
            if (!tacticType) tacticType = rookDev.type;
            explType = 'tactical';
            foundTactic = true;
        }

        // Check (double / discovered / direct)
        if (activeCheckSquares && activeCheckSquares.length > 0 && chess) {
            if (activeCheckSquares.length >= 2) {
                parts.push(isPlayer ? pick([
                    `${casual(CASUAL_TACTIC)}Double check! The king must move — no blocking, no capturing.`,
                    `${casual(CASUAL_TACTIC)}Double check! Only the king can get out of this one.`,
                ]) : pick([
                    `Watch out! Double check against your king — king has to run!`,
                    `Double check from the opponent! The king is forced to move.`
                ]));
                if (!tacticType) tacticType = 'discoveredAttack';
                explType = 'tactical';
                foundTactic = true;
            } else if (!activeCheckSquares.includes(move.to)) {
                const checker = chess.get(activeCheckSquares[0]);
                if (checker) {
                    parts.push(isPlayer ? pick([
                        `${casual(CASUAL_TACTIC)}Discovered attack! The ${pn(move.piece)} steps aside, unleashing the ${pn(checker.type)} on the king.`,
                        `${casual(CASUAL_TACTIC)}Discovered check! The ${pn(move.piece)} moves and reveals a check from the ${pn(checker.type)}.`,
                    ]) : pick([
                        `Watch out! Discovered check! Their ${pn(move.piece)} moved and revealed a check from the ${pn(checker.type)}.`,
                        `Discovered check from your opponent's ${pn(checker.type)}!`
                    ]));
                    if (!tacticType) tacticType = 'discoveredAttack';
                    explType = 'tactical';
                    foundTactic = true;
                }
            }
        }

        // Fork by moved piece
        if (!chess?.isCheckmate()) {
            const forkEntry = Array.isArray(activeForkSquares)
                ? activeForkSquares.find(f => (typeof f === 'object' ? f.square : f) === move.to)
                : null;
            const forkIsAdvantageous = forkEntry && typeof forkEntry === 'object' ? forkEntry.isAdvantageous : !!forkEntry;

            if (forkEntry && forkIsAdvantageous && chess) {
                let playerForkValid = true;
                if (engineTopMoves && engineTopMoves[0] && engineTopMoves[0].pv) {
                    playerForkValid = isForkTargetCapturedInPV(forkEntry, engineTopMoves[0].pv, fen);
                }

                if (playerForkValid) {
                    const targets = typeof forkEntry === 'object' && forkEntry.targets ? forkEntry.targets : [];
                    if (targets.length >= 2) {
                        targets.sort((a, b) => (b.value || pv(b.type)) - (a.value || pv(a.type)));
                        const hasKing = targets.some(t => t.type === 'k');
                        let forkLine = '';

                        if (hasKing) {
                            const best = targets.find(t => t.type !== 'k');
                            if (best) {
                                forkLine = isPlayer ? pick([
                                    `Check! And the ${pn(best.type)} on ${best.square} is caught in the fork. You love to see it!`,
                                    `Fork! ${cap(pn(move.piece))} attacks the king and the ${pn(best.type)} on ${best.square} with check.`,
                                    `Double trouble! Check on the king while the ${pn(best.type)} is under fire.`
                                ]) : pick([
                                    `Watch out! The opponent's ${pn(move.piece)} forks your king and the ${pn(best.type)} on ${best.square} with check.`,
                                    `Ouch! A checking fork against your king and ${pn(best.type)}.`
                                ]);
                            }
                        } else {
                            const t0 = targets[0], t1 = targets[1];
                            forkLine = isPlayer ? pick([
                                `Double attack! The ${pn(move.piece)} forks the ${pn(t0.type)} on ${t0.square} and the ${pn(t1.type)} on ${t1.square}.`,
                                `Boom! You're hitting both the ${pn(t0.type)} and the ${pn(t1.type)} at once.`
                            ]) : pick([
                                `Watch out! Your opponent's ${pn(move.piece)} forks your ${pn(t0.type)} and ${pn(t1.type)}.`,
                                `Ouch! The opponent attacks both your ${pn(t0.type)} and ${pn(t1.type)} at once.`
                            ]);
                        }

                        if (forkLine) {
                            parts.push(`${casual(CASUAL_TACTIC)}${forkLine}`);
                            if (!tacticType) tacticType = 'fork';
                            explType = 'tactical';
                            foundTactic = true;
                        }
                    }
                }
            }
        }

        // Recaptures & Captures
        if (move.captured) {
            const captPiece = pn(move.captured);
            let preHanging = [];
            try { preHanging = findAllHangingSquares(preFen); } catch { /* ignore */ }
            const isFree = preHanging && preHanging.includes(move.to);

            const lastMove = Array.isArray(history) && history.length > 0 ? history[history.length - 1] : null;
            const isRecapture = lastMove && lastMove.to === move.to;

            if (isRecapture) {
                parts.push(isPlayer ? pick([
                    `Recapturing on ${move.to} to maintain material balance.`,
                    `Recapturing their ${captPiece} on ${move.to}.`,
                    `Immediate recapture with ${san}, keeping the piece count level.`
                ]) : pick([
                    `Your opponent recaptured on ${move.to}.`,
                    `They recaptured your ${captPiece} on ${move.to}.`
                ]));
                if (!tacticType) tacticType = 'recapture';
                explType = 'tactical';
                foundTactic = true;
            } else if (move.captured === 'q' || move.captured === 'r') {
                parts.push(isPlayer ? pick([
                    isFree ? `This captures a free ${captPiece}! Snagging high-value material!` : `Taking their ${captPiece} on ${move.to} — off with high-value material!`,
                    isFree ? `Free ${captPiece}! Off with high-value material!` : `Capturing their ${captPiece} on ${move.to}.`,
                    `Snagged! Taking their ${captPiece} on ${move.to}.`
                ]) : pick([
                    `Your opponent just captured your ${captPiece} on ${move.to}!`,
                    `Ouch! They snapped up your ${captPiece}.`
                ]));
                if (!tacticType) tacticType = 'major_capture';
                explType = 'tactical';
                foundTactic = true;
            } else if (isFree && (move.captured === 'b' || move.captured === 'n')) {
                parts.push(isPlayer ? pick([
                    `Free ${captPiece}! Snagging the unprotected piece on ${move.to}.`,
                    `Taking advantage of their mistake by capturing the hanging ${captPiece} on ${move.to}!`,
                    `Snagging the undefended ${captPiece} on ${move.to} for free!`
                ]) : pick([
                    `Your opponent captured your undefended ${captPiece} on ${move.to}.`,
                    `Ouch! They scooped up your hanging ${captPiece}.`
                ]));
                if (!tacticType) tacticType = 'free_piece';
                explType = 'tactical';
                foundTactic = true;
            }
        }

        // Defense of an attacked piece or pawn (ONLY when not capturing)
        if (!move.captured) {
            try {
                const preHanging = findAllHangingSquares(preFen);
                if (preHanging && preHanging.includes(move.from)) {
                    parts.push(isPlayer ? pick([
                        `You defended your ${pn(move.piece)}! A safe square is a happy square.`,
                        `Moving the ${pn(move.piece)} to safety! No free material for them!`,
                        `Safety first! Your ${pn(move.piece)} steps out of harm's way.`
                    ]) : pick([
                        `Your opponent is getting their ${pn(move.piece)} out of danger! A safe square is a happy square.`,
                        `They moved their ${pn(move.piece)} to safety.`
                    ]));
                    if (!tacticType) tacticType = 'defense';
                    explType = 'tactical';
                    foundTactic = true;
                }
            } catch { /* ignore */ }
        }

        // Pin
        if (activePinSquares && activePinSquares.length > 0 && chess) {
            let prePins = [];
            try { prePins = findAllPinnedPieces(preFen); } catch { /* ignore */ }
            const newPins = activePinSquares.filter(sq => !prePins.includes(sq));

            if (newPins.length > 0) {
                const pinnedSq    = newPins[0];
                const pinnedPiece = chess.get(pinnedSq);
                if (pinnedPiece && pinnedPiece.color !== move.color) {
                    parts.push(isPlayer ? pick([
                        `Pin! The ${pn(pinnedPiece.type)} on ${pinnedSq} is locked in place. You love to see it!`,
                        `That pins their ${pn(pinnedPiece.type)} on ${pinnedSq}! Material is frozen!`,
                        `Pinning the ${pn(pinnedPiece.type)} on ${pinnedSq} — a beast of a tactic!`,
                    ]) : pick([
                        `Watch out! They pinned your ${pn(pinnedPiece.type)} on ${pinnedSq}!`,
                        `Ouch! Your ${pn(pinnedPiece.type)} on ${pinnedSq} is stuck in a pin.`,
                    ]));
                    if (!tacticType) tacticType = 'pin';
                    explType = 'tactical';
                    foundTactic = true;
                }
            }
        }

        // Check Blocker (Interposing a piece)
        if (activeBlockSquares && activeBlockSquares.length > 0 && activeBlockSquares.includes(move.to)) {
            let checkingPieceName = 'attacker';
            try {
                const preChess = new Chess(preFen);
                if (preChess.inCheck()) {
                    const checks = findAllChecks(preFen);
                    if (checks && checks.length > 0) {
                        const chk = preChess.get(checks[0]);
                        if (chk) checkingPieceName = pn(chk.type);
                    }
                }
            } catch { /* ignore */ }

            parts.push(isPlayer ? pick([
                `You're blocking that check like a boss! That ${checkingPieceName} ain't getting through.`,
                `Interposing the ${pn(move.piece)} to shield your king from the ${checkingPieceName}'s check!`
            ]) : pick([
                `Your opponent blocked the check with their ${pn(move.piece)}.`,
                `They interposed their ${pn(move.piece)} to block the check from your ${checkingPieceName}.`
            ]));
            if (!tacticType) tacticType = 'blocker';
            explType = 'tactical';
            foundTactic = true;
        }

        // Forcing loss of castling rights
        try {
            const preChess = new Chess(preFen);
            const preCastling = preChess.fen().split(' ')[2];
            const oppColor = move.color === 'w' ? 'b' : 'w';
            const oppCastlingBefore = oppColor === 'w' ? (preCastling.includes('K') || preCastling.includes('Q')) : (preCastling.includes('k') || preCastling.includes('q'));
            const postCastling = fen.split(' ')[2];
            const oppCastlingAfter = oppColor === 'w' ? (postCastling.includes('K') || postCastling.includes('Q')) : (postCastling.includes('k') || postCastling.includes('q'));
            if (oppCastlingBefore && !oppCastlingAfter && san.includes('+')) {
                parts.push(isPlayer ? pick([
                    `This forces the opponent to lose castling rights!`,
                    `Check! Stripping away their castling rights and leaving the king in the center!`
                ]) : pick([
                    `This move forces you to lose castling rights!`
                ]));
            }
        } catch { /* ignore */ }

        // ── POSITIONAL TRACKERS (Engine/Board Situation) ──
        if (!foundTactic) {
            const endgameObj = evaluateEndgame(fen, move);
            if (endgameObj) {
                parts.push(Array.isArray(endgameObj.text) ? pick(endgameObj.text) : endgameObj.text);
                if (!tacticType) tacticType = endgameObj.type;
                explType = 'positional';
                foundTactic = true;
            }

            if (!foundTactic) {
                const outpostObj = detectOutpost(fen, move);
                if (outpostObj) {
                    parts.push(Array.isArray(outpostObj.text) ? pick(outpostObj.text) : outpostObj.text);
                    if (!tacticType) tacticType = outpostObj.type;
                    explType = 'positional';
                    foundTactic = true;
                }
            }

            if (!foundTactic) {
                const pawnStruct = evaluatePawnStructure(fen, move);
                if (pawnStruct) {
                    parts.push(Array.isArray(pawnStruct.text) ? pick(pawnStruct.text) : pawnStruct.text);
                    if (!tacticType) tacticType = pawnStruct.type;
                    explType = 'positional';
                    foundTactic = true;
                }
            }
            
            if (!foundTactic && pvStr && (clsId === 'brilliant' || clsId === 'best')) {
                const pvGood = extractPVTactics(fen, pvStr, move.color);
                if (pvGood && !pvGood.isPunishment) {
                    parts.push(Array.isArray(pvGood.text) ? pick(pvGood.text) : pvGood.text);
                    if (!tacticType) tacticType = pvGood.type;
                    explType = 'tactical';
                    foundTactic = true;
                }
            }
        }

        // Whiplash eval swing
        if (!foundTactic && typeof preScore === 'number' && typeof whiteScore === 'number') {
            const preWhiteCp = move.color === 'w' ? preScore : -preScore;
            const whiplash = detectWhiplash(preWhiteCp, whiteScore);
            if (whiplash) {
                const wt = whiplash.text;
                if (wt === 'losing to winning') {
                    parts.push(pick([
                        `${casual(CG)}The tables have turned — a losing position becomes winning.`,
                        `${casual(CG)}What a turnaround! The eval swings from losing to winning.`,
                    ]));
                    explType = 'tactical';
                    foundTactic = true;
                } else if (wt === 'winning and advantage secured') {
                    parts.push(pick([
                        `${casual(CG)}The advantage is now firmly locked in.`,
                        `${casual(CG)}The grip tightens — this extends the lead.`,
                    ]));
                    explType = 'tactical';
                    foundTactic = true;
                }
            }
        }

        // Fallback: Position-aware context builder
        if (!foundTactic) {
            const isCapt = !!move.captured;
            const captPiece = isCapt ? pn(move.captured) : '';
            const movingPiece = pn(move.piece);

            // Build a board-context sentence describing what the move physically does
            let contextSentence = '';

            // 1. Check + Capture
            if (isCheck && isCapt) {
                contextSentence = pick([
                    `${san} captures the ${captPiece} with check — a double threat that demands an immediate response.`,
                    `Taking the ${captPiece} and delivering check simultaneously with ${san}. Maximum pressure.`,
                    `Check! And the ${captPiece} is gone. ${san} combines attack and material gain.`
                ]);
            }
            // 2. Check only
            else if (isCheck) {
                contextSentence = pick([
                    `${san} delivers check, forcing the opponent's king to react immediately.`,
                    `Check with ${san}! The king must respond, giving ${you()} the initiative.`,
                    `${san} puts the king in check — a forcing move that keeps the tempo.`
                ]);
            }
            // 3. Capture of minor/pawn piece
            else if (isCapt && pv(move.captured) <= 3) {
                contextSentence = pick([
                    `${san} picks off the ${captPiece}. Every bit of material counts.`,
                    `Capturing the ${captPiece} with ${san}. A clean exchange.`,
                    `Taking the ${captPiece} on ${move.to} with ${san}.`
                ]);
            }
            // 4. Central development of a minor piece
            else if ((move.piece === 'n' || move.piece === 'b') && isCentralSquare(move.to)) {
                contextSentence = pick([
                    `${san} develops the ${movingPiece} to an active central square, controlling key territory.`,
                    `Active development! The ${movingPiece} arrives on ${move.to}, influencing the center.`,
                    `${san} places the ${movingPiece} on a strong central square with maximum reach.`
                ]);
            }
            // 5. Piece developing to a natural square (not returning home)
            else if ((move.piece === 'n' || move.piece === 'b') && move.from !== move.to) {
                let attackSuffix = '';
                try {
                    const postChess = new Chess(fen);
                    const fenParts = postChess.fen().split(' ');
                    fenParts[1] = fenParts[1] === 'w' ? 'b' : 'w';
                    fenParts[3] = '-';
                    const attackChess = new Chess(fenParts.join(' '));
                    const attacks = attackChess.moves({ square: move.to, verbose: true }).filter(x => x.captured);
                    if (attacks.length > 0) {
                        let best = attacks[0];
                        for (const a of attacks) { if (pv(a.captured) > pv(best.captured)) best = a; }
                        attackSuffix = `, eyeing the ${pn(best.captured)} on ${best.to}`;
                    }
                } catch {}
                contextSentence = pick([
                    `${san} repositions the ${movingPiece} to ${move.to}${attackSuffix}.`,
                    `The ${movingPiece} heads to ${move.to} with ${san}${attackSuffix}.`,
                    `${san} improves the ${movingPiece}'s placement${attackSuffix}.`
                ]);
            }
            // 6. Rook or queen moving to an open file or rank
            else if (move.piece === 'r' || move.piece === 'q') {
                let fileContext = '';
                try {
                    const postChess = new Chess(fen);
                    const file = move.to.charAt(0);
                    let hasFriendlyPawn = false, hasEnemyPawn = false;
                    postChess.board().forEach(row => {
                        row.forEach(p => {
                            if (p && p.type === 'p' && String.fromCharCode(97 + postChess.board()[0].indexOf(p)) === file) {
                                // Simplified check
                            }
                        });
                    });
                    // Check attacks
                    const fenParts = postChess.fen().split(' ');
                    fenParts[1] = fenParts[1] === 'w' ? 'b' : 'w';
                    fenParts[3] = '-';
                    const attackChess = new Chess(fenParts.join(' '));
                    const attacks = attackChess.moves({ square: move.to, verbose: true }).filter(x => x.captured);
                    if (attacks.length > 0) {
                        let best = attacks[0];
                        for (const a of attacks) { if (pv(a.captured) > pv(best.captured)) best = a; }
                        fileContext = `, putting pressure on the ${pn(best.captured)}`;
                    }
                } catch {}
                contextSentence = pick([
                    `${san} activates the ${movingPiece}${fileContext}.`,
                    `The ${movingPiece} swings to ${move.to} with ${san}${fileContext}.`,
                    `${san} brings the ${movingPiece} into the action${fileContext}.`
                ]);
            }

            // Now combine the classification frame with the context
            switch (clsId) {
                case 'brilliant':
                    parts.push(contextSentence || pick([
                        `Absolute brilliance! ${san} is the only move that works here.`,
                        `${YOU()} saw the vision! ${san} is a stroke of genius.`,
                        `${san} — only this move holds the position together. Brilliant!`,
                        `A stroke of pure brilliance! ${san} blows the game wide open.`
                    ]));
                    explType = 'tactical';
                    break;

                case 'great':
                    parts.push(contextSentence || pick([
                        `A fantastic find! ${san} capitalises on the position perfectly.`,
                        `Textbook. ${san} is precisely the right idea at the right moment.`,
                        `${YOU_RE()} seeing the board clearly! ${san} is a great move.`,
                        `Sharp calculation! ${san} lands with maximum impact.`
                    ]));
                    explType = 'tactical';
                    break;

                case 'best':
                    if (st === 'losing') {
                        parts.push(contextSentence || pick([
                            `${san} is the best try here — holding the position as well as possible.`,
                            `${san} is the engine's top pick. Keeping things together for now.`,
                            `The toughest defence. ${san} is the absolute best way to keep fighting.`,
                            `Tough spot, but ${san} finds the cleanest defensive path.`,
                            `Clinging on! ${san} is the most resilient move available.`,
                            `Best defensive try! ${san} makes your opponent prove it.`
                        ]));
                    } else if (st === 'winning') {
                        parts.push(contextSentence || pick([
                            isCapt ? `Snagging the ${captPiece} with ${san} — pressing the advantage!` : `Bullseye. ${san} is the engine's favorite, and the advantage grows.`,
                            `Right on the money. ${san} is the strongest continuation. No letting up!`,
                            `One step closer to victory! ${san} keeps the pressure high.`,
                            `Cruising ahead! ${san} locks in the winning continuation.`,
                            `No mercy! ${san} maintains a lethal grip on the position.`,
                            `Pure precision! ${san} converts the advantage effortlessly.`
                        ]));
                    } else {
                        parts.push(contextSentence || pick([
                            isCapt ? `Taking the ${captPiece} with ${san} — top choice.` : `${san} is the absolute top move on the board here.`,
                            `${san} — right on target!`,
                            `Top-tier move! ${san} keeps the game in excellent balance.`,
                            `Bullseye! ${san} is the engine's favorite.`,
                            `Exact precision! ${san} is the best option available.`,
                            `Flawless choice! ${san} hits the mark.`,
                            `Optimal play — ${san} is recommended by the engine.`,
                            `Masterclass continuation with ${san}.`,
                            `Right on the money! ${san} is the top line.`
                        ]));
                    }
                    explType = 'tactical';
                    break;

                case 'excellent':
                    if (contextSentence) {
                        parts.push(contextSentence);
                    } else {
                        parts.push(pick([
                            `Virtually flawless. ${san} is practically indistinguishable from the absolute best.`,
                            `Top-notch chess right there. ${san} is an excellent choice.`,
                            `${YOU_RE()} playing like a machine! ${san} is nearly perfect.`,
                            `Sensational choice. ${san} keeps the pressure firmly on.`,
                            `Superb positional judgment with ${san}.`,
                            `Strong play! ${san} keeps the momentum going cleanly.`,
                            `Crisp and precise. ${san} maintains high-level quality.`,
                            `Fine execution! ${san} is a top-tier continuation.`,
                            `Impressive control — ${san} keeps the position sharp.`,
                            `Clean technique with ${san}. Excellent decision.`,
                            `Sharp vision! ${san} leaves little for your opponent to work with.`,
                            `High-caliber chess. ${san} maintains complete command of the board.`,
                            `Masterful coordination with ${san}.`
                        ]));
                    }
                    break;

                case 'good':
                    if (contextSentence) {
                        parts.push(contextSentence);
                    } else {
                        parts.push(pick(
                            st === 'losing'
                                ? [ `${san} is decent — it doesn't make things worse when behind.`,
                                    `${san} holds the position. Solid under pressure.`,
                                    `A practical try with ${san} while weathering the storm.`,
                                    `Steady play. ${san} keeps hopes alive in a tough fight.` ]
                                : [ `A solid, sensible choice. ${san} keeps the position active.`,
                                    `Keeping things locked down. ${san} is a healthy, practical move.`,
                                    `A natural move. ${san} keeps things ticking over smoothly.`,
                                    `Good development with ${san}.`,
                                    `Healthy move. ${san} maintains a steady balance.`,
                                    `Practical choice! ${san} keeps the game steady.`,
                                    `Sensible play — ${san} does not overcommit.`,
                                    `Decent continuation with ${san}.`,
                                    `Keeping control with ${san}.`,
                                    `No unnecessary risks — ${san} keeps the game stable.`,
                                    `Clean and reliable. ${san} is a solid pick.` ]
                        ));
                    }
                    break;
            }
        }

    } else if (isBadCls) {
        // Disadvantage moves — explain engine line and why it's better
        let frameText = '';
        switch (clsId) {
            case 'blunder':
                frameText = pick([
                    `Oof, a major blunder.`,
                    `Woah, a severe mistake!`,
                    `A tough slip-up here.`
                ]);
                break;
            case 'mistake':
                frameText = pick([
                    `A mistake in this position.`,
                    `That move drops some evaluation.`,
                    `A misstep here.`
                ]);
                break;
            case 'miss':
                frameText = pick([
                    `A missed opportunity!`,
                    `Missed a sharp chance here.`,
                    `Slipped right by!`
                ]);
                break;
        }
        
        let evalSwingText = '';
        if (typeof preScore === 'number' && typeof postScore === 'number' && Math.abs(preScore) < 9000 && Math.abs(postScore) < 9000) {
            evalSwingText = ` It drops the evaluation from ${(preScore/100).toFixed(1)} to ${(postScore/100).toFixed(1)}.`;
        }

        parts.push(frameText + evalSwingText);

        // Check for missed mate in 1..5 lines
        if ((typeof preScore === 'number' && Math.abs(preScore) > 9000) || (typeof preScore === 'string' && (preScore.includes('M') || preScore.includes('m')))) {
            parts.push(isPlayer ? pick([
                `You missed an opportunity to force eventual checkmate!`,
                `Checkmate was in sight! A faster forcing line was available.`,
                `Missed forced mate! Keep an eye out for direct mating nets.`
            ]) : pick([
                `Your opponent missed a chance to force checkmate!`,
                `They had a forced checkmate line but let it slip!`
            ]));
        }

        // Tempo loss check for early piece repetition (gated by bad/inaccuracy move)
        const tempoData = evaluateTempoLoss(move, moveNumber, history);
        if (tempoData && tempoData.isTempoLoss) {
            if (isPlayer) {
                parts.push(pick([
                    `Stop moving the same piece! Get those other pieces out!`,
                    `Moving the ${pn(move.piece)} again in the opening loses valuable tempo.`
                ]));
            } else {
                parts.push(pick([
                    `Your opponent moved the same piece twice already! That's a loss of tempo.`,
                    `They moved their ${pn(move.piece)} again early on — losing tempo.`
                ]));
            }
        }

        // Check for PV-based tactical punishment (Engine extracted)
        let pvPunished = false;
        if (pvStr && (clsId === 'blunder' || clsId === 'mistake')) {
            const pvPunishment = extractPVTactics(fen, pvStr, move.color);
            if (pvPunishment && pvPunishment.isPunishment) {
                parts.push(Array.isArray(pvPunishment.text) ? pick(pvPunishment.text) : pvPunishment.text);
                pvPunished = true;
            }
        }

        // Check for hanging pieces left by this move (if PV didn't cover it)
        if (!pvPunished) {
            try {
                const postHangingSquares = findAllHangingSquares(fen);
            if (postHangingSquares && postHangingSquares.length > 0) {
                const postChess = new Chess(fen);
                const hangingPieces = postHangingSquares
                    .map(sq => postChess.get(sq))
                    .filter(p => p && p.color === move.color);
                
                if (hangingPieces.length > 0) {
                    let highest = hangingPieces[0];
                    let maxVal = pv(highest.type);
                    for (const p of hangingPieces) {
                        const val = pv(p.type);
                        if (val > maxVal) {
                            maxVal = val;
                            highest = p;
                        }
                    }
                    const hangingPieceName = pn(highest.type);
                    parts.push(isPlayer ? pick([
                        `You let your ${hangingPieceName} be captured for free.`,
                        `That drops the ${hangingPieceName}.`,
                        `You hung your ${hangingPieceName}!`
                    ]) : pick([
                        `Your opponent left their ${hangingPieceName} hanging for free.`,
                        `They dropped their ${hangingPieceName}.`,
                        `They hung their ${hangingPieceName}!`
                    ]));
                }
            }
        } catch (e) {}
        }

        // Describe engine's best move (skip if it's the same as what was played)
        if (bestMoveSan && bestMoveSan !== san) {
            const attackSuffix = getBestMoveAttackSuffix(preFen, bestMoveSan);
            parts.push(isPlayer ? `Your better move was ${bestMoveSan}${attackSuffix}.` : `Their better move was ${bestMoveSan}${attackSuffix}.`);
        }

        explType = 'tactical';
    } else if (isInaccuracy) {
        let inaccFrame = pick([
            `A minor wobble — ${san} is slightly imprecise.`,
            `${san} is a bit off — leaving a small opportunity on the board.`,
            `Not the worst, but ${san} gives away a subtle edge.`
        ]);
        // Add eval drop for inaccuracies too
        if (typeof preScore === 'number' && typeof postScore === 'number' && Math.abs(preScore) < 9000 && Math.abs(postScore) < 9000) {
            const drop = Math.abs(preScore - postScore);
            if (drop > 30) {
                inaccFrame += ` The eval shifts by ${(drop/100).toFixed(1)}.`;
            }
        }
        parts.push(inaccFrame);

        // Tempo check for inaccuracy
        const tempoData = evaluateTempoLoss(move, moveNumber, history);
        if (tempoData && tempoData.isTempoLoss) {
            if (isPlayer) {
                parts.push(pick([
                    `Stop moving the same piece! Get those other pieces out!`,
                    `Moving the ${pn(move.piece)} again in the opening loses valuable tempo.`
                ]));
            } else {
                parts.push(pick([
                    `Your opponent moved the same piece twice already! That's a loss of tempo.`
                ]));
            }
        }

        if (bestMoveSan && bestMoveSan !== san) {
            const attackSuffix = getBestMoveAttackSuffix(preFen, bestMoveSan);
            parts.push(isPlayer ? `Your better move was ${bestMoveSan}${attackSuffix}.` : `Their better move was ${bestMoveSan}${attackSuffix}.`);
        }
    }

    if (streakExplanation && streakExplanation.text) {
        const sText = /[.!?]$/.test(streakExplanation.text) ? streakExplanation.text : streakExplanation.text + '.';
        parts.push(sText);
    }

    return {
        type: explType,
        text: formatEngagingText(parts.join(' ').trim()),
        tacticType
    };
}
