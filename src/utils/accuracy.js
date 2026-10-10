// ─────────────────────────────────────────────────────────────────────────────
// Client-side Accuracy & Elo Pipeline
// Ported verbatim from Chrome extension (analysis.js & data/calibration.json)
// 100% mathematical and architectural match.
// ─────────────────────────────────────────────────────────────────────────────

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

// ── Win% conversion ──
export function winPct(cp) {
  return 50 + 50 * (2 / (1 + Math.exp(-CALIB.winK * cp)) - 1);
}

// ── Score normalization (matches extension scoreToCp) ──
export function scoreToCp(score) {
  if (score == null) return 0;
  if (typeof score === 'number') return score;
  if (score.type === 'mate' || score.mate != null) {
    const m = score.mate ?? score.value;
    if (m == null || m === 0) return 0;
    const dist = Math.min(Math.abs(m), 50);
    return m > 0 ? 10000 - dist * 100 : -10000 + dist * 100;
  }
  const cp = score.cp ?? score.value ?? 0;
  return typeof cp === 'number' && !Number.isNaN(cp) ? cp : 0;
}

// ── Per-move accuracy ──
export function extMoveAccuracy(winDrop) {
  const m = CALIB.moveAcc;
  return Math.max(0, Math.min(100, m.a * Math.exp(-m.b * winDrop) - m.c));
}

// ── Rating-dependent accuracy multiplier ──
export function calAccMult(rating) {
  const ar = CALIB.accRating; if (!ar?.on) return 1;
  const r = Number(rating); if (!Number.isFinite(r) || r <= 0) return 1;
  return Math.max(ar.min, Math.min(ar.max, 1 + (ar.center - r) * ar.slope));
}

// ── Aggregation helpers ──
export function stdev(arr) {
  if (arr.length < 2) return 0;
  const m = arr.reduce((a, b) => a + b, 0) / arr.length;
  return Math.sqrt(arr.reduce((a, b) => a + (b - m) * (b - m), 0) / arr.length);
}

export function harmonicMean(arr) {
  const v = arr.filter((x) => x > 0);
  if (!v.length) return 0;
  return v.length / v.reduce((a, b) => a + 1 / b, 0);
}

export function weightedMean(vals, wts) {
  let sw = 0, swv = 0;
  for (let i = 0; i < vals.length; i++) { sw += wts[i]; swv += wts[i] * vals[i]; }
  return sw > 0 ? swv / sw : (vals.reduce((a, b) => a + b, 0) / (vals.length || 1));
}

export function powerMean(vals, wts, p, floor = 0) {
  let sw = 0, s = 0;
  for (let i = 0; i < vals.length; i++) {
    const v = Math.max(1e-6, Math.max(floor, vals[i]));
    sw += wts[i];
    s += wts[i] * Math.pow(v, p);
  }
  return sw > 0 ? Math.pow(s / sw, 1 / p) : 0;
}

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

export function learnedAccuracy(accs, vols, a) {
  const vals = accs.map((v) => Math.max(a.floor || 0, v));
  const wts = a.useVol ? vols : vals.map(() => 1);
  let acc = 0;
  a.learnedFeatures.forEach((f, i) => {
    acc += (AGG_FEATURES[f] ? AGG_FEATURES[f](vals, wts) : 0) * a.learnedWeights[i];
  });
  return Math.max(0, Math.min(100, acc));
}

// ── Per-rating-band additive bias correction ──
export function calAccBias(acc, rating) {
  const ab = CALIB.accBias; if (acc == null || !ab?.on) return acc;
  const r = Number(rating); if (!Number.isFinite(r) || r <= 0) return acc;
  let idx = ab.edges.length;
  for (let i = 0; i < ab.edges.length; i++) {
    if (r < ab.edges[i]) { idx = i; break; }
  }
  return Math.max(0, Math.min(100, acc - (ab.bias[idx] || 0)));
}

// ── Elo estimation ──
const ELO_ANCHORS = [
  [30, 550], [40, 800], [50, 1100], [58, 1300], [65, 1450],
  [72, 1600], [78, 1750], [85, 2000], [91, 2200], [96, 2450], [100, 2750]
];
const round50 = (v) => Math.round(v / 50) * 50;

export function estimateEloFromAcc(acc) {
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

export function estimateElo(acc, rating) {
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

// ── Per-side accuracies ──
export function sideAccuracies(movesArray, whiteRating, blackRating) {
  const N = movesArray.length;
  if (N === 0) return { w: null, b: null };

  const wp = new Array(N + 1).fill(50);
  for (let i = 0; i < N; i++) {
    const m = movesArray[i];
    const preScore = m.preScore;
    if (preScore != null) {
      const preCp = scoreToCp(preScore);
      wp[i] = m.color === 'w' ? winPct(preCp) : winPct(-preCp);
    } else if (i > 0) {
      wp[i] = wp[i - 1];
    }
  }

  const lastMove = movesArray[N - 1];
  if (lastMove.postScore != null) {
    const postCp = scoreToCp(lastMove.postScore);
    wp[N] = lastMove.color === 'w' ? winPct(postCp) : winPct(-postCp);
  } else {
    wp[N] = wp[N - 1];
  }

  const win = Math.max(2, Math.min(8, Math.floor(N / 10)));
  const weight = new Array(N + 1).fill(1);
  for (let i = 1; i <= N; i++) {
    const seg = [];
    for (let j = Math.max(0, i - win); j <= Math.min(N, i); j++) seg.push(wp[j]);
    weight[i] = Math.max(CALIB.volatility.clampMin, Math.min(CALIB.volatility.clampMax, stdev(seg)));
  }

  const acc = { w: [], b: [] }, wts = { w: [], b: [] };
  for (let i = 0; i < N; i++) {
    const m = movesArray[i];

    const preCp = scoreToCp(m.preScore);
    const postCp = scoreToCp(m.postScore);

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

    const plyIndex = i + 1;
    acc[m.color].push(moveAcc);
    wts[m.color].push(weight[plyIndex]);
  }

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

// ── Main game accuracy calculator ──
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
    const biasedAcc = calAccBias(rawAcc, rating);
    const elo = estimateElo(biasedAcc, rating);

    result[side] = {
      accuracy: biasedAcc != null ? Math.round(biasedAcc * 10) / 10 : 100,
      rawAccuracy: rawAcc != null ? Math.round(rawAcc * 10) / 10 : 100,
      estimatedRating: elo
    };
  }

  return result;
}
