// ── Classification catalogue ────────────────────────────────────────────────
export const CLASSIFICATIONS = {
  brilliant: {
    id: 'brilliant', label: 'Brilliant', symbol: '!!',
    color: '#13ccc6', bg: '#e6f7f7',
    icon: '/icons/eval_brilliant.png',
  },
  great: {
    id: 'great', label: 'Great', symbol: '!',
    color: '#5C8BB0', bg: '#e8f0f8',
    icon: '/icons/eval_great.png',
  },
  best: {
    id: 'best', label: 'Best', symbol: '⊕',
    color: '#96BC4B', bg: '#f0f7e6',
    icon: '/icons/eval_best.png',
  },
  excellent: {
    id: 'excellent', label: 'Excellent', symbol: '✓',
    color: '#96BC4B', bg: '#f0f7e6',
    icon: '/icons/eval_excellent.png',
  },
  good: {
    id: 'good', label: 'Good', symbol: '',
    color: '#96BC4B', bg: '#f5f9ee',
    icon: '/icons/eval_good.png',
  },
  inaccuracy: {
    id: 'inaccuracy', label: 'Inaccuracy', symbol: '?!',
    color: '#F0C45D', bg: '#fef9e6',
    icon: '/icons/eval_inaccuracy.png',
  },
  miss: {
    id: 'miss', label: 'Miss', symbol: '⊘',
    color: '#E8706A', bg: '#fef3e6',
    icon: '/icons/eval_miss.png',
  },
  mistake: {
    id: 'mistake', label: 'Mistake', symbol: '?',
    color: '#E07832', bg: '#fdeee6',
    icon: '/icons/eval_mistake.png',
  },
  blunder: {
    id: 'blunder', label: 'Blunder', symbol: '??',
    color: '#C93832', bg: '#fce8e8',
    icon: '/icons/eval_blunder.png',
  },
  book: {
    id: 'book', label: 'Book', symbol: '',
    color: '#C8956C', bg: '#f5eefa',
    icon: '/icons/eval_book.png',
  },
  novelty: {
    id: 'novelty', label: 'Novelty', symbol: 'N',
    color: '#3B82F6', bg: '#eff6ff',
    icon: '/icons/eval_novelty.png',
  },
};

// ── Tactic Label Helper ─────────────────────────────────────────────────────
export function getTacticLabel(tacticType) {
  return {
    fork: 'Fork',
    pin: 'Pin',
    skewer: 'Skewer',
    discoveredAttack: 'Discovered Attack',
    zwischenzug: 'Zwischenzug',
    xray: 'X-Ray Attack',
    removalOfDefender: 'Remove the Guard',
    backRank: 'Back Rank',
    promotion: 'Promotion',
    promotionThreat: 'Promotion Threat',
    zugzwang: 'Zugzwang',
    prophylaxis: 'Prophylaxis',
    kingActivity: 'King Activity',
    enPassant: 'En Passant',
  }[tacticType] || null;
}

// ── Win probability helper ──────────────────────────────────────────────────
/**
 * Convert centipawns to win probability (0–100%).
 * Lichess formula, also used by en-croissant.
 * Handles extreme values (±30 000 cp mate scores) gracefully.
 *
 * @param {number} cp – centipawns from the moving player's perspective
 * @returns {number} win probability 0–100
 */
export function cpToWinPct(cp) {
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
}

// ── Move classifier ─────────────────────────────────────────────────────────
/**
 * Classify a single move.
 *
 * Both scores must be from the MOVING PLAYER's perspective.
 * If your engine reports postScore from the opponent's POV, negate it first.
 *
 * isSacrifice / isOnlySoundMove use `undefined` as their default — NOT `false`.
 * This lets the function detect whether the caller has been updated to provide
 * them. When both are `undefined` (old caller), Brilliant and Great fall back to
 * the original centipawn heuristics so no existing behaviour is lost.
 * Once your caller starts providing them, the new en-croissant logic takes over.
 *
 * @param {object}   p
 * @param {number}   p.preScore          – eval before move, moving player's POV (cp)
 * @param {number}   p.postScore         – eval after move, moving player's POV (cp)
 * @param {string}  [p.engineBestMove]   – UCI of engine's top-1 move
 * @param {string}  [p.playerMoveUCI]    – UCI of the move actually played
 * @param {boolean} [p.isBookMove=false]
 * @param {boolean} [p.isSacrifice]      – undefined = not yet computed by caller.
 *                                         true  = move loses material, engine endorses it.
 *                                         false = caller confirmed: not a sacrifice.
 * @param {boolean} [p.isOnlySoundMove]  – undefined = not yet computed by caller.
 *                                         true  = MultiPV shows all alternatives significantly worse.
 *                                         false = caller confirmed: other sound moves exist.
 */
export function classifyMove({
  preScore,
  postScore,
  engineBestMove,
  playerMoveUCI,
  isBookMove = false,
  isNovelty = false,
  isSacrifice,      // intentionally undefined by default — see JSDoc above
  isOnlySoundMove,  // intentionally undefined by default — see JSDoc above
}) {
  // ── Book & Novelty ────────────────────────────────────────────────────────
  if (isBookMove) return CLASSIFICATIONS.book;
  if (isNovelty) return CLASSIFICATIONS.novelty;

  // Extract raw numerical cp if an object was passed, handling mate and clamping per score.ts CP_CEILING
  const CP_CEILING = 1000;
  let pcp = typeof preScore === 'number' ? preScore : preScore?.value ?? 0;
  if (Number.isNaN(pcp)) pcp = 0;
  if (preScore?.type === 'mate') pcp = CP_CEILING * Math.sign(pcp || 1);
  pcp = Math.max(-CP_CEILING, Math.min(CP_CEILING, pcp));
  
  let postcp = typeof postScore === 'number' ? postScore : postScore?.value ?? 0;
  if (Number.isNaN(postcp)) postcp = 0;
  if (postScore?.type === 'mate') postcp = CP_CEILING * Math.sign(postcp || 1);
  postcp = Math.max(-CP_CEILING, Math.min(CP_CEILING, postcp));

  // ── Derived metrics ───────────────────────────────────────────────────────
  const preWin = cpToWinPct(pcp);
  const postWin = cpToWinPct(postcp);
  // positive = player lost win% vs the best available move
  const winLoss = preWin - postWin;

  // ── Blunder (??) [100% matched with score.ts: winChanceDiff > 20] ──────────
  // In score.ts, any move with winChanceDiff > 20 is strictly a Blunder
  if (winLoss > 20) return CLASSIFICATIONS.blunder;

  // Guards both UCI strings being present and matching.
  // Without this, a bad sacrifice or a missed only-sound-move would incorrectly
  // receive Brilliant / Great.
  const playedBest = !!(
    playerMoveUCI &&
    engineBestMove &&
    playerMoveUCI.toLowerCase() === engineBestMove.toLowerCase()
  );

  // ── Brilliant (!!) ────────────────────────────────────────────────────────
  // A true sacrifice validated by our sacrifice tracker, provided it did not blunder.
  // Aligned with sacrificeTracker soundness: winning (postcp >= 150) or sound win drop (winLoss <= 12).
  if (isSacrifice && (winLoss <= 12 || postcp >= 150) && winLoss <= 20) return CLASSIFICATIONS.brilliant;

  // ── Great (!) and Best (★) [100% matched with score.ts] ───────────────────
  if (playedBest && winLoss <= 5) {
    if (isOnlySoundMove) return CLASSIFICATIONS.great;

    // ── Legacy fallback (original cp heuristics) ─────────────────────────
    if (isSacrifice === undefined && isOnlySoundMove === undefined) {
      const gain = postcp - pcp;
      const turnaround = pcp < -50 && postcp > 50;
      if (turnaround || gain >= 55) return CLASSIFICATIONS.brilliant;
      if (gain >= 25) return CLASSIFICATIONS.great;
    }

    return CLASSIFICATIONS.best;
  }

  // ── Win% thresholds (strictly matching score.ts) ──────────────────────────
  // In score.ts:
  //   winChanceDiff > 20 -> ?? (Blunder - handled above)
  //   winChanceDiff > 10 -> ?  (Mistake)
  //   winChanceDiff > 5  -> ?! (Inaccuracy)

  if (winLoss > 10) return CLASSIFICATIONS.mistake;     // 10–20 %

  // ── Miss (⊘) ──────────────────────────────────────────────────────────────
  // Missed Win: The player had a decisive advantage (≥ +300 cp) and let it slip
  // to a slight advantage or equal (≤ +150 cp), without giving away the lead entirely (≥ 0 cp),
  // and only for non-blunders (loss <= 20%).
  if (pcp >= 300 && postcp <= 150 && postcp >= 0) {
    return CLASSIFICATIONS.miss;
  }

  if (winLoss > 5) return CLASSIFICATIONS.inaccuracy;   // 5–10 % drop
  if (winLoss >= 3) return CLASSIFICATIONS.good;        // minor imprecision (3–5 %)
  return CLASSIFICATIONS.excellent;                     // negligible loss (< 3 %)
}

// ── Aggregation helpers ─────────────────────────────────────────────────────

/** Count classifications for a player ('w' or 'b'). */
export function countClassifications(analyzedMoves, color) {
  const counts = {};
  for (const k of Object.keys(CLASSIFICATIONS)) counts[k] = 0;
  for (const m of analyzedMoves) {
    if (m.color === color && m.classification) {
      counts[m.classification.id] = (counts[m.classification.id] || 0) + 1;
    }
  }
  return counts;
}

/**
 * Average centipawn loss (non-book moves only).
 * Callers store raw cp loss as `m.loss` on each analyzed move — unchanged.
 */
export function calcACPL(analyzedMoves, color) {
  const moves = analyzedMoves.filter(
    m => m.color === color && m.classification?.id !== 'book'
  );
  if (!moves.length) return 0;
  const total = moves.reduce((s, m) => {
    let l = m.loss ?? 0;
    return s + Math.max(0, Number.isNaN(l) ? 0 : l);
  }, 0);
  return Math.round(total / moves.length);
}
