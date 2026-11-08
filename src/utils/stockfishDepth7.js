/**
 * stockfishDepth7.js
 *
 * Ultra-fast Stockfish depth 7 real-time analyzer for live play vs engine.
 * Computes centipawns / mate evaluation, best move, and move classifications
 * in ~20-50ms per move without lagging the UI.
 */

import { cpToWinPct } from './moveClassifier';
import { getEngineConfig } from './engineDetector';

export class StockfishDepth7Analyzer {
  constructor(onReady) {
    this.worker = null;
    this.isReady = false;
    this.onReady = onReady;
    this.pendingResolve = null;
    this.lastInfo = null;
    this._init();
  }

  _init() {
    try {
      const { workerPaths } = getEngineConfig('stockfish-19');
      const candidatePaths = workerPaths && workerPaths.length > 0 
        ? workerPaths 
        : ['/stockfish-v19/stockfish-19-lite-single.js', '/stockfish-v18/stockfish-18-lite-single.js'];

      this._tryInitWorker(candidatePaths, 0);
    } catch (err) {
      console.warn('[StockfishDepth7] Detection fallback error:', err);
      this._tryInitWorker(['/stockfish-v19/stockfish-19-lite-single.js'], 0);
    }
  }

  _tryInitWorker(paths, index) {
    if (index >= paths.length) {
      console.error('[StockfishDepth7] All candidate paths failed to initialize.');
      if (this.onReady) this.onReady(false);
      return;
    }

    const path = paths[index];
    let wasmPath = null;
    if (!path.endsWith('.asm.js')) {
      wasmPath = path.replace(/\.js$/, '.wasm');
    }
    const workerUrl = wasmPath ? `${path}#${wasmPath}` : path;

    try {
      this.worker = new Worker(workerUrl);

      this.worker.onerror = (err) => {
        console.warn(`[StockfishDepth7] Worker failed at ${path}:`, err);
        if (this.worker) {
          try { this.worker.terminate(); } catch (e) {}
          this.worker = null;
        }
        this._tryInitWorker(paths, index + 1);
      };

      this.worker.onmessage = (e) => {
        const line = typeof e === 'string' ? e : (typeof e.data === 'string' ? e.data : (e.data?.data || ''));
        if (!line) return;
        this._handleLine(line.trim());
      };

      this.worker.postMessage('uci');
      this.worker.postMessage('setoption name Threads value 1');
      this.worker.postMessage('setoption name Hash value 16');
      this.worker.postMessage('isready');
    } catch (err) {
      console.warn(`[StockfishDepth7] Direct worker creation failed for ${path}:`, err);
      this._tryInitWorker(paths, index + 1);
    }
  }

  _handleLine(line) {
    if (line === 'readyok') {
      this.isReady = true;
      if (this.onReady) this.onReady(true);
      return;
    }

    // Parse info line:
    // e.g. "info depth 7 seldepth 9 multipv 1 score cp 23 nodes 2966 ... pv b1c3 b8c6"
    // e.g. "info depth 7 ... score mate -3 ..."
    if (line.startsWith('info ') && line.includes('score ')) {
      const depthMatch = line.match(/\bdepth\s+(\d+)/);
      const cpMatch = line.match(/\bscore\s+cp\s+(-?\d+)/);
      const mateMatch = line.match(/\bscore\s+mate\s+(-?\d+)/);
      const pvMatch = line.match(/\bpv\s+([a-h1-8qrbn\s]+)/);

      const depth = depthMatch ? parseInt(depthMatch[1], 10) : 0;
      let scoreCp = cpMatch ? parseInt(cpMatch[1], 10) : null;
      let mateIn = mateMatch ? parseInt(mateMatch[1], 10) : null;
      const pv = pvMatch ? pvMatch[1].trim().split(/\s+/) : [];

      this.lastInfo = {
        depth,
        scoreCp,
        mateIn,
        pv,
        bestMoveUci: pv[0] || null,
        raw: line,
      };
    }

    // Parse bestmove line:
    // e.g. "bestmove b1c3 ponder b8c6"
    if (line.startsWith('bestmove ')) {
      const parts = line.split(/\s+/);
      const bestMoveUci = parts[1];
      const ponder = parts[3] || null;

      if (this.pendingResolve) {
        const resolve = this.pendingResolve;
        this.pendingResolve = null;

        const info = this.lastInfo || {};
        this.lastInfo = null;

        resolve({
          depth: info.depth || 7,
          scoreCp: info.scoreCp ?? 0,
          mateIn: info.mateIn ?? null,
          pv: info.pv || (bestMoveUci ? [bestMoveUci] : []),
          bestMoveUci: bestMoveUci || info.bestMoveUci,
          ponder,
        });
      }
    }
  }

  /**
   * Run depth 7 analysis on the position formed by movesArray.
   * @param {string[]} movesArray - list of UCI moves
   * @param {string} turn - 'w' or 'b' side to move in current position
   * @returns {Promise<{ depth, scoreCp, mateIn, whiteRelativeScore, evalStr, bestMoveUci, pv }>}
   */
  analyze(movesArray = [], turn = 'w') {
    return new Promise((resolve) => {
      this.pendingResolve = (rawResult) => {
        // Stockfish reports score from the moving side's perspective
        // Convert to White-relative score
        const sideScore = rawResult.scoreCp ?? 0;
        let whiteRelativeScore = turn === 'w' ? sideScore : -sideScore;
        let evalStr = '0.00';

        if (rawResult.mateIn !== null) {
          const whiteMate = turn === 'w' ? rawResult.mateIn : -rawResult.mateIn;
          evalStr = whiteMate > 0 ? `+M${Math.abs(whiteMate)}` : `-M${Math.abs(whiteMate)}`;
          whiteRelativeScore = whiteMate > 0 ? 10000 - whiteMate : -10000 - whiteMate;
        } else {
          const val = (whiteRelativeScore / 100).toFixed(2);
          evalStr = whiteRelativeScore > 0 ? `+${val}` : `${val}`;
        }

        resolve({
          ...rawResult,
          sideRelativeScore: sideScore,
          whiteRelativeScore,
          evalStr,
        });
      };

      this.lastInfo = null;

      if (!this.worker) {
        resolve({
          depth: 7,
          scoreCp: 0,
          mateIn: null,
          whiteRelativeScore: 0,
          evalStr: '0.00',
          bestMoveUci: null,
          pv: [],
        });
        return;
      }

      if (movesArray.length > 0) {
        this.worker.postMessage(`position startpos moves ${movesArray.join(' ')}`);
      } else {
        this.worker.postMessage('position startpos');
      }

      this.worker.postMessage('go depth 7');
    });
  }

  /**
   * Classify a move based on win probability loss and depth 7 analysis.
   */
  classifyMove({
    preScoreMovingPov,
    postScoreMovingPov,
    isBookMove,
    isEngineBest,
    san,
    isBotvinnik,
    bookGames,
    evalStr,
    bestMoveSan,
  }) {
    if (isBookMove) {
      return {
        id: 'book',
        label: 'Book Move',
        symbol: '',
        commentary: isBotvinnik
          ? (bookGames
              ? `GM Botvinnik plays ${san} from his opening repertoire (recorded in ${bookGames} historical games).`
              : `GM Botvinnik follows established master theory with ${san}.`)
          : `Theoretical opening move (${san}). Maintaining solid theoretical balance.`,
      };
    }

    const preWin = cpToWinPct(preScoreMovingPov);
    const postWin = cpToWinPct(postScoreMovingPov);
    const winDrop = preWin - postWin;

    // Check classification
    if (isEngineBest && winDrop <= 0) {
      // If significant gain or great find
      if (winDrop < -8 || (postScoreMovingPov > 200 && preScoreMovingPov < 100)) {
        return {
          id: 'brilliant',
          label: 'Brilliant',
          symbol: '!!',
          commentary: `Brilliant move (${san})! Stockfish depth 7 confirms an outstanding positional breakthrough (${evalStr}).`,
        };
      }
      return {
        id: 'best',
        label: 'Best Move',
        symbol: '⊕',
        commentary: `Best move! Stockfish depth 7 rates ${san} as the top choice (${evalStr}).`,
      };
    }

    if (winDrop <= 3) {
      return {
        id: 'best',
        label: 'Best Move',
        symbol: '⊕',
        commentary: `Best move! Accurate play with ${san} (${evalStr}).`,
      };
    }

    if (winDrop <= 8) {
      return {
        id: 'excellent',
        label: 'Excellent',
        symbol: '✓',
        commentary: `Excellent find (${san})! Keeps a firm grip on the position (${evalStr}).`,
      };
    }

    if (winDrop <= 18) {
      return {
        id: 'good',
        label: 'Good',
        symbol: '',
        commentary: `Good, solid move (${san}). Stockfish depth 7 evaluation: ${evalStr}.`,
      };
    }

    if (winDrop <= 38) {
      return {
        id: 'inaccuracy',
        label: 'Inaccuracy',
        symbol: '?!',
        commentary: bestMoveSan
          ? `Inaccuracy (${san}). Stockfish depth 7 preferred ${bestMoveSan} (${evalStr}).`
          : `Inaccuracy (${san}). Slight concession of initiative (${evalStr}).`,
      };
    }

    if (winDrop <= 75) {
      return {
        id: 'mistake',
        label: 'Mistake',
        symbol: '?',
        commentary: bestMoveSan
          ? `Mistake (${san}). Stockfish depth 7 recommends ${bestMoveSan} (${evalStr}).`
          : `Mistake (${san}). Hands the advantage over (${evalStr}).`,
      };
    }

    return {
      id: 'blunder',
      label: 'Blunder',
      symbol: '??',
      commentary: bestMoveSan
        ? `Blunder (${san})! Sharp evaluation swing to ${evalStr}. Critical move was ${bestMoveSan}.`
        : `Blunder (${san})! Major shift in evaluation (${evalStr}).`,
    };
  }

  terminate() {
    if (this.worker) {
      try {
        this.worker.postMessage('quit');
        this.worker.terminate();
      } catch (e) {}
      this.worker = null;
    }
    this.pendingResolve = null;
    this.isReady = false;
  }
}
