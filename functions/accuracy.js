import { cpToWinPct } from './moveClassifier.js';

// ── Calibration constants (ported verbatim from Chrome extension calibration.json) ──
// Source: data/calibration.json, version "engine-2026-06-22-accbias", sf18-litewasm_d16_mpv1
const CALIB = {
  winK: 0.003001472674915567,
  moveAcc: { a: 103.1668, b: 0.058, c: 3.1669 },
  agg: {
    mode: "learned",
    p: -2.796046439738944,
    floor: 36.64236434544436,
    missFloor: 0,
    useVol: false,
    learnedFeatures: ["bias", "mean", "harmonic", "wmean", "min", "fracLt50", "logn"],
    learnedWeights: [
      -4.952576975621859,
      -0.41043360407395846,
      2.046596575115292,
      -0.41043360407395896,
      -0.12656923368315615,
      -4.023655547089195,
      -3.2852003664918668
    ]
  },
  volatility: { winMin: 2, winMax: 8, winDiv: 10, clampMin: 0.5, clampMax: 16.173003673553467 },
  accRating: { on: true, center: 2100, slope: 0.00016646902020927515, min: 0.7, max: 1.4716689426917582 },
  accBias: { on: true, edges: [1200, 1600, 2000], bias: [-0.4316, -0.749, 0.4928, 1.3511], lambda: 8 },
  eloModel: { on: true, a: -1613.3, b: 0.72597, c: 28.179, clampMin: 100, clampMax: 3200 }
};

// ── Win% conversion (uses calibrated winK, NOT the default 0.00368208) ──
function winPct(cp) { return 50 + 50 * (2 / (1 + Math.exp(-CALIB.winK * cp)) - 1); }

// ── Score normalization (matches extension's scoreToCp) ──
// Mate scores → large finite values preserving ordering: mate in N → ±(10000 - N*100)
function scoreToCp(score) {
  if (score == null) return 0;
  // Handle raw numbers
  if (typeof score === 'number') return score;
  // Handle mate scores
  if (score.type === 'mate' || score.mate != null) {
    const m = score.mate ?? score.value;
    if (m == null || m === 0) return 0;
    const dist = Math.min(Math.abs(m), 50);
    return m > 0 ? 10000 - dist * 100 : -10000 + dist * 100;
  }
  // Handle cp scores
  const cp = score.cp ?? score.value ?? 0;
  return typeof cp === 'number' && !Number.isNaN(cp) ? cp : 0;
}

// ── Per-move accuracy (extension formula: a * exp(-b * d) - c) ──
function extMoveAccuracy(winDrop) {
  const m = CALIB.moveAcc;
  return Math.max(0, Math.min(100, m.a * Math.exp(-m.b * winDrop) - m.c));
}

// ── Rating-dependent accuracy multiplier (calAccMult) ──
function calAccMult(rating) {
  const ar = CALIB.accRating; if (!ar?.on) return 1;
  const r = Number(rating); if (!Number.isFinite(r) || r <= 0) return 1;
  return Math.max(ar.min, Math.min(ar.max, 1 + (ar.center - r) * ar.slope));
}

// ── Aggregation helpers (exact copies from extension) ──
function stdev(arr) {
  if (arr.length < 2) return 0;
  const m = arr.reduce((a, b) => a + b, 0) / arr.length;
  return Math.sqrt(arr.reduce((a, b) => a + (b - m) * (b - m), 0) / arr.length);
}
function harmonicMean(arr) {
  const v = arr.filter((x) => x > 0);
  if (!v.length) return 0;
  return v.length / v.reduce((a, b) => a + 1 / b, 0);
}
function weightedMean(vals, wts) {
  let sw = 0, swv = 0;
  for (let i = 0; i < vals.length; i++) { sw += wts[i]; swv += wts[i] * vals[i]; }
  return sw > 0 ? swv / sw : (vals.reduce((a, b) => a + b, 0) / (vals.length || 1));
}

// Weighted power mean with an outlier floor — the tuned aggregation family (p=-1 harmonic,
// p→1 arithmetic). Used when calibration.json selects agg.mode "power".
function powerMean(vals, wts, p, floor = 0) {
  let sw = 0, s = 0;
  for (let i = 0; i < vals.length; i++) { const v = Math.max(1e-6, Math.max(floor, vals[i])); sw += wts[i]; s += wts[i] * Math.pow(v, p); }
  return sw > 0 ? Math.pow(s / sw, 1 / p) : 0;
}

// ── Learned aggregation (ridge regression on per-move features) ──
const AGG_FEATURES = {
  bias: () => 1,
  mean: (v) => v.reduce((a, b) => a + b, 0) / v.length,
  harmonic: (v) => harmonicMean(v),
  wmean: (v, w) => weightedMean(v, w),
  min: (v) => Math.min(...v),
  p25: (v) => v.slice().sort((a, b) => a - b)[Math.floor(0.25 * v.length)],
  fracLt50: (v) => v.filter((x) => x < 50).length / v.length,
  fracLt30: (v) => v.filter((x) => x < 30).length / v.length,
  logn: (v) => Math.log(v.length),
};
function learnedAccuracy(accs, vols, a) {
  const vals = accs.map((v) => Math.max(a.floor || 0, v));
  const wts = a.useVol ? vols : vals.map(() => 1);
  let acc = 0;
  a.learnedFeatures.forEach((f, i) => { acc += (AGG_FEATURES[f] ? AGG_FEATURES[f](vals, wts) : 0) * a.learnedWeights[i]; });
  return Math.max(0, Math.min(100, acc));
}

// ── Per-rating-band additive correction (calAccBias) ──
function calAccBias(acc, rating) {
  const ab = CALIB.accBias; if (acc == null || !ab?.on) return acc;
  const r = Number(rating); if (!Number.isFinite(r) || r <= 0) return acc;
  let idx = ab.edges.length; for (let i = 0; i < ab.edges.length; i++) if (r < ab.edges[i]) { idx = i; break; }
  return Math.max(0, Math.min(100, acc - (ab.bias[idx] || 0)));
}

// ── Elo estimation (exact extension logic) ──
const ELO_ANCHORS = [[30,550],[40,800],[50,1100],[58,1300],[65,1450],[72,1600],[78,1750],[85,2000],[91,2200],[96,2450],[100,2750]];
const round50 = (v) => Math.round(v / 50) * 50;

function estimateEloFromAcc(acc) {
  if (acc == null) return null;
  const A = ELO_ANCHORS;
  if (acc <= A[0][0]) return A[0][1];
  for (let i = 1; i < A.length; i++) {
    if (acc <= A[i][0]) {
      const [x0, y0] = A[i - 1], [x1, y1] = A[i];
      return round50(y0 + ((acc - x0) / (x1 - x0)) * (y1 - y0));
    }
  }
  return A[A.length - 1][1];
}

function estimateElo(acc, rating) {
  if (acc == null) return null;
  const em = CALIB.eloModel;
  const r = Number(rating);
  if (em?.on && Number.isFinite(r) && r > 0) {
    const v = em.a + em.b * r + em.c * acc;
    const lo = em.clampMin ?? 100, hi = em.clampMax ?? 3200;
    return round50(Math.max(lo, Math.min(hi, v)));
  }
  return estimateEloFromAcc(acc);
}

// ──────────────────────────────────────────────────────────────────────────────
// sideAccuracies: Computes per-side game accuracy using the EXACT same pipeline
// as the Chrome extension's sideAccuracies() function.
//
// Input: movesArray with { color, preScore, postScore, isBookMove, playerMoveUCI,
//        engineBestMove }, plus whiteRating and blackRating from the PGN.
//
// Steps (matching extension analysis.js lines 856–907):
//   1. Compute white-relative win% per ply, carry-forward missing evals
//   2. Compute volatility weights (stdev in a sliding window)
//   3. Compute per-move accuracy using extension's moveAccuracy formula
//      with the rating-dependent calAccMult multiplier
//   4. Aggregate using learned ridge regression (matching calibration.json)
// ──────────────────────────────────────────────────────────────────────────────
function sideAccuracies(movesArray, whiteRating, blackRating) {
  const N = movesArray.length;
  if (N === 0) return { w: null, b: null };

  // Build arrays of white-relative win% per ply (ply 0 = before move 0).
  // The extension uses S.evals[p] which are white-relative. Here we reconstruct that.
  // wp[0] = eval before first move, wp[i] = eval after move i-1 (= before move i)
  const wp = new Array(N + 1).fill(50);
  for (let i = 0; i < N; i++) {
    const m = movesArray[i];
    const preScore = m.preScore;
    if (preScore != null) {
      const preCp = scoreToCp(preScore);
      // preScore is from the MOVER's perspective. Convert to white-relative.
      wp[i] = m.color === 'w' ? winPct(preCp) : winPct(-preCp);
    } else if (i > 0) {
      wp[i] = wp[i - 1]; // carry-forward
    }
  }
  // wp[N] = eval after last move
  const lastMove = movesArray[N - 1];
  if (lastMove.postScore != null) {
    const postCp = scoreToCp(lastMove.postScore);
    wp[N] = lastMove.color === 'w' ? winPct(postCp) : winPct(-postCp);
  } else {
    wp[N] = wp[N - 1];
  }

  // Volatility weights (extension lines 861–869):
  // Window size = floor(N/10), clamped to [2, 8]
  const win = Math.max(2, Math.min(8, Math.floor(N / 10)));
  const weight = new Array(N + 1).fill(1);
  for (let i = 1; i <= N; i++) {
    const seg = [];
    for (let j = Math.max(0, i - win); j <= Math.min(N, i); j++) seg.push(wp[j]);
    weight[i] = Math.max(CALIB.volatility.clampMin, Math.min(CALIB.volatility.clampMax, stdev(seg)));
  }

  // Per-move accuracy (extension lines 1215–1222):
  // accMove[i] = moveAccuracy(max(0, winBefore - winAfter) * calAccMult(rating))
  // where winBefore/winAfter are from the MOVER's perspective.
  // If the player played the engine's best move, winBefore === winAfter (rawDrop = 0).
  const acc = { w: [], b: [] }, wts = { w: [], b: [] };
  for (let i = 0; i < N; i++) {
    const m = movesArray[i];

    const preCp = scoreToCp(m.preScore);
    const postCp = scoreToCp(m.postScore);

    // preCp and postCp are ALREADY from the mover's perspective
    const winBefore = winPct(preCp);
    const winAfter = winPct(postCp);

    const playedBest = !!(
      (m.playerMoveUCI && m.engineBestMove && m.playerMoveUCI.toLowerCase() === m.engineBestMove.toLowerCase()) ||
      m.isBestMove ||
      m.classification?.id === 'best' ||
      m.classification?.id === 'great' ||
      m.classification?.id === 'brilliant'
    );
    const rawDrop = playedBest ? 0 : Math.max(0, winBefore - winAfter);
    const rating = m.color === 'w' ? whiteRating : blackRating;
    const scaledDrop = rawDrop * calAccMult(rating);
    const moveAcc = extMoveAccuracy(scaledDrop);

    const plyIndex = i + 1; // 1-indexed like extension
    acc[m.color].push(moveAcc);
    wts[m.color].push(weight[plyIndex]);
  }

  // Aggregate (extension lines 877–887):
  const out = {};
  const a = CALIB.agg;
  for (const s of ["w", "b"]) {
    if (!acc[s].length) { out[s] = null; continue; }
    if (a && a.mode === "learned" && a.learnedFeatures) out[s] = learnedAccuracy(acc[s], wts[s], a);
    else if (a && a.mode === "power") out[s] = powerMean(acc[s], a.useVol ? wts[s] : acc[s].map(() => 1), a.p, a.floor || 0);
    else out[s] = (weightedMean(acc[s], wts[s]) + harmonicMean(acc[s])) / 2;
  }
  return out;
}

// ──────────────────────────────────────────────────────────────────────────────
// Public API: calculateGameAccuracy
// Returns { white: { accuracy, estimatedRating }, black: { accuracy, estimatedRating } }
//
// The accuracy and Elo estimation follow the EXACT same pipeline as the
// Chrome extension:
//   1. sideAccuracies() → raw win%-based accuracy (S.accElo in extension)
//   2. calAccBias(rawAcc, rating) → bias-corrected accuracy (S.acc & meEloAcc in extension)
//   3. estimateElo(biasedAcc, rating) → estimated Elo
// ──────────────────────────────────────────────────────────────────────────────
export function calculateGameAccuracy(movesArray, whiteRating = 0, blackRating = 0) {
  if (!movesArray || movesArray.length === 0) {
    return {
      white: { accuracy: 100, rawAccuracy: 100, estimatedRating: whiteRating || null },
      black: { accuracy: 100, rawAccuracy: 100, estimatedRating: blackRating || null }
    };
  }

  const rawAccs = sideAccuracies(movesArray, whiteRating, blackRating);

  const result = {};
  for (const [side, color, rating] of [['white', 'w', whiteRating], ['black', 'b', blackRating]]) {
    const rawAcc = rawAccs[color];
    // Extension line 1264: S.acc[side] = (CALIB?.display === "winpct") ? calAccBias(eloAccs[side], S.players[side]?.rating) : catAvg;
    const biasedAcc = calAccBias(rawAcc, rating);
    // Extension line 3280 & 3337: estimateElo(calAccBias(S.accElo[side], rating), rating)
    const elo = estimateElo(biasedAcc, rating);

    result[side] = {
      accuracy: biasedAcc != null ? Math.round(biasedAcc * 10) / 10 : 100,
      rawAccuracy: rawAcc != null ? Math.round(rawAcc * 10) / 10 : 100,
      estimatedRating: elo
    };
  }

  return result;
}

// ── Legacy exports (used by other parts of the website) ──
const winPercent = cpToWinPct;
const CP_CEILING = 1000;

export function normalizeScore(score) {
  let cp = typeof score === 'number' ? score : score?.value;
  if (typeof cp !== 'number' || Number.isNaN(cp)) cp = 0;
  if (score?.type === 'mate') cp = CP_CEILING * Math.sign(cp);
  return Math.max(-CP_CEILING, Math.min(CP_CEILING, cp));
}

export function getCPLoss(prevScore, nextScore) {
  const prevCP = normalizeScore(prevScore);
  const nextCP = normalizeScore(nextScore);
  return Math.max(0, prevCP - nextCP);
}

// Legacy moveAccuracy (kept for any code that still calls it directly)
export function moveAccuracy(cpBefore, cpAfter, playedBestMove = false) {
  if (playedBestMove) return 100;
  const wpBefore = winPercent(cpBefore);
  const wpAfter = winPercent(cpAfter);
  const loss = Math.max(0, wpBefore - wpAfter);
  if (loss === 0) return 100;
  const rawAcc = 100 * Math.exp(-0.11327 * loss);
  return Math.max(4.29, Math.min(100, rawAcc));
}

// Local helper to strictly replicate En Croissant's color-aware score normalization
function enCroissantNormalize(score, color) {
  let cp = typeof score === 'number' ? score : (score?.value?.value ?? score?.value ?? 0);
  if (typeof cp !== 'number' || Number.isNaN(cp)) cp = 0;
  
  if (color === 'black' || color === 'b') {
    cp *= -1;
  }
  
  const scoreType = score?.type ?? score?.value?.type;
  if (scoreType === 'mate') {
    cp = CP_CEILING * Math.sign(cp);
  }
  
  return Math.max(-CP_CEILING, Math.min(CP_CEILING, cp));
}

function normalizeScores(prev, next, color) {
  return {
    prevCP: enCroissantNormalize(prev, color),
    nextCP: enCroissantNormalize(next, color),
  };
}

// Move annotation: returns '??', '?', '?!', '!!', '!', '!?', or ''
// Exactly matches En Croissant's score.ts getAnnotation logic
export function getAnnotation(prevprevScore, prevScore, nextScore, color, prevMoves, isSacrifice, move) {
  const { prevCP, nextCP } = normalizeScores(prevScore || { type: 'cp', value: 0 }, nextScore, color);
  const winChanceDiff = winPercent(prevCP) - winPercent(nextCP);

  if (winChanceDiff > 20) {
    return '??';
  }
  if (winChanceDiff > 10) {
    return '?';
  }
  if (winChanceDiff > 5) {
    return '?!';
  }

  if (prevMoves && prevMoves.length > 1) {
    const scores = normalizeScores(prevMoves[0].score, prevMoves[1].score, color);
    const playedBest = (
      move === prevMoves[0].sanMoves?.[0] ||
      move === prevMoves[0].uciMoves?.[0] ||
      move === prevMoves[0].san ||
      move === prevMoves[0].move
    );

    if (
      winPercent(scores.prevCP) - winPercent(scores.nextCP) > 10 &&
      playedBest
    ) {
      const turnScores = normalizeScores(
        prevprevScore || { type: 'cp', value: 0 },
        prevMoves[0].score,
        color
      );
      if (isSacrifice) {
        return '!!';
      }
      if (winPercent(turnScores.nextCP) - winPercent(turnScores.prevCP) > 5) {
        return '!';
      }
    } else if (isSacrifice && nextCP > -200) {
      return '!?';
    }
  }
  return '';
}