/**
 * stockfishDepth7.js
 *
 * Real-time Stockfish 19 depth 7 analyzer for live play vs GM Botvinnik.
 * Uses Stockfish 19 (/stockfish-v19/stockfish-19-lite-single.js) Web Worker.
 *
 * Strictly adheres to BoardSight's original evaluation and annotation system
 * (src/utils/moveClassifier.js):
 *   - Uses cpToWinPct() for win-rate calculations
 *   - Uses classifyMove() for move classifications (Blunder ??, Mistake ?, Inaccuracy ?!, Good, Excellent ✓, Best ⊕, Great !, Brilliant !!)
 *   - Accurately tracks preScore and postScore from the moving player's perspective
 */

import { classifyMove, CLASSIFICATIONS, cpToWinPct } from './moveClassifier';
import { getEngineConfig } from './engineDetector';

export class StockfishDepth7Analyzer {
  constructor(onReady) {
    this.worker = null;
    this.isReady = false;
    this.onReady = onReady;
    this.pendingResolve = null;
    this.lastInfo = null;
    this.searchTimeout = null;
    this._init();
  }

  _init() {
    try {
      const { workerPaths } = getEngineConfig('stockfish-19');
      const candidatePaths =
        workerPaths && workerPaths.length > 0
          ? workerPaths
          : [
              '/stockfish-v19/stockfish-19-lite-single.js',
              '/stockfish-v19/stockfish-19-lite.js',
              '/stockfish-v18/stockfish-18-lite-single.js',
            ];

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
          try {
            this.worker.terminate();
          } catch (e) {}
          this.worker = null;
        }
        this._tryInitWorker(paths, index + 1);
      };

      this.worker.onmessage = (e) => {
        const line =
          typeof e === 'string'
            ? e
            : typeof e.data === 'string'
            ? e.data
            : e.data?.data || '';
        if (!line) return;
        this._handleLine(line.trim());
      };

      // Standard UCI initialization
      this.worker.postMessage('uci');
    } catch (err) {
      console.warn(`[StockfishDepth7] Worker creation failed for ${path}:`, err);
      this._tryInitWorker(paths, index + 1);
    }
  }

  _handleLine(line) {
    if (line === 'uciok') {
      if (this.worker) {
        this.worker.postMessage('setoption name Threads value 1');
        this.worker.postMessage('setoption name Hash value 16');
        this.worker.postMessage('setoption name MultiPV value 2');
        this.worker.postMessage('isready');
      }
      return;
    }

    if (line === 'readyok') {
      this.isReady = true;
      if (this.onReady) this.onReady(true);
      return;
    }

    // Capture depth 7 search info line (score cp / mate, pv, best move)
    if (line.startsWith('info ') && line.includes('score ')) {
      const depthMatch = line.match(/\bdepth\s+(\d+)/);
      const cpMatch = line.match(/\bscore\s+cp\s+(-?\d+)/);
      const mateMatch = line.match(/\bscore\s+mate\s+(-?\d+)/);
      const pvMatch = line.match(/\bpv\s+([a-h1-8qrbn\s]+)/);
      const mpvMatch = line.match(/\bmultipv\s+(\d+)/);

      const depth = depthMatch ? parseInt(depthMatch[1], 10) : 0;
      let scoreCp = cpMatch ? parseInt(cpMatch[1], 10) : null;
      let mateIn = mateMatch ? parseInt(mateMatch[1], 10) : null;
      const pv = pvMatch ? pvMatch[1].trim().split(/\s+/) : [];
      const mpv = mpvMatch ? parseInt(mpvMatch[1], 10) : 1;

      if (scoreCp !== null || mateIn !== null) {
        const computedCp =
          scoreCp !== null
            ? scoreCp
            : mateIn > 0
            ? 10000 - mateIn
            : -10000 - mateIn;

        const entry = {
          depth,
          scoreCp: computedCp,
          mateIn,
          pv,
          bestMoveUci: pv[0] || null,
          raw: line,
        };

        if (!this.multiPvMap) this.multiPvMap = {};
        this.multiPvMap[mpv] = entry;

        if (mpv === 1) {
          this.lastInfo = entry;
        }
      }
    }

    // Search completed: bestmove <uci> ponder <uci>
    if (line.startsWith('bestmove ')) {
      const parts = line.split(/\s+/);
      const bestMoveUci = parts[1];
      const ponder = parts[3] || null;

      if (this.searchTimeout) {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = null;
      }

      if (this.pendingResolve) {
        const resolve = this.pendingResolve;
        this.pendingResolve = null;

        const info = this.lastInfo || {};
        this.lastInfo = null;

        const mpvList = [];
        if (this.multiPvMap) {
          if (this.multiPvMap[1]) mpvList.push(this.multiPvMap[1]);
          if (this.multiPvMap[2]) mpvList.push(this.multiPvMap[2]);
        }
        this.multiPvMap = {};

        const scoreCp = info.scoreCp ?? 0;
        const mateIn = info.mateIn ?? null;
        const finalBest =
          bestMoveUci && bestMoveUci !== '(none)'
            ? bestMoveUci
            : info.bestMoveUci || null;

        resolve({
          depth: info.depth || 7,
          scoreCp,
          mateIn,
          pv: info.pv || (finalBest ? [finalBest] : []),
          bestMoveUci: finalBest,
          topMoves: mpvList,
          ponder,
        });
      }
    }
  }

  /**
   * Run depth 7 analysis on a board position using Stockfish 19.
   * @param {object} params
   * @param {string} [params.fen] - Full FEN string of the position to evaluate
   * @param {string[]} [params.uciMoves] - UCI move history
   * @param {string} [params.turn='w'] - 'w' or 'b' side whose turn it is to move
   * @returns {Promise<{ depth, scoreCp, mateIn, whiteRelativeScore, evalStr, bestMoveUci, pv }>}
   */
  analyze({ fen, uciMoves = [], turn = 'w' }) {
    return new Promise((resolve) => {
      // Clear any pending resolve
      if (this.pendingResolve) {
        const prev = this.pendingResolve;
        this.pendingResolve = null;
        if (this.searchTimeout) clearTimeout(this.searchTimeout);
        prev({
          depth: 7,
          scoreCp: 0,
          mateIn: null,
          pv: [],
          bestMoveUci: null,
          sideRelativeScore: 0,
          whiteRelativeScore: 0,
          evalStr: '0.00',
        });
      }

      this.pendingResolve = (rawResult) => {
        const sideScore = rawResult.scoreCp ?? 0;
        // In UCI: Stockfish reports score from the POV of the side whose turn it is
        // Convert to White-relative score (+ = White better, - = Black better)
        let whiteRelativeScore = turn === 'w' ? sideScore : -sideScore;
        let evalStr = '0.00';

        if (rawResult.mateIn !== null) {
          const whiteMate = turn === 'w' ? rawResult.mateIn : -rawResult.mateIn;
          evalStr =
            whiteMate > 0
              ? `+M${Math.abs(whiteMate)}`
              : `-M${Math.abs(whiteMate)}`;
          whiteRelativeScore =
            whiteMate > 0 ? 10000 - whiteMate : -10000 - whiteMate;
        } else {
          const absVal = (Math.abs(whiteRelativeScore) / 100).toFixed(2);
          evalStr =
            whiteRelativeScore > 0
              ? `+${absVal}`
              : whiteRelativeScore < 0
              ? `-${absVal}`
              : '0.00';
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
        const fallback = this.pendingResolve;
        this.pendingResolve = null;
        fallback({
          depth: 7,
          scoreCp: 0,
          mateIn: null,
          pv: [],
          bestMoveUci: null,
        });
        return;
      }

      // Safety watchdog: resolve after 3500ms if engine takes unusually long
      this.searchTimeout = setTimeout(() => {
        if (this.pendingResolve) {
          const fallback = this.pendingResolve;
          this.pendingResolve = null;
          const mpvList = [];
          if (this.multiPvMap) {
            if (this.multiPvMap[1]) mpvList.push(this.multiPvMap[1]);
            if (this.multiPvMap[2]) mpvList.push(this.multiPvMap[2]);
          }
          this.multiPvMap = {};
          fallback({
            depth: 7,
            scoreCp: this.lastInfo?.scoreCp ?? 0,
            mateIn: this.lastInfo?.mateIn ?? null,
            pv: this.lastInfo?.pv ?? [],
            bestMoveUci: this.lastInfo?.bestMoveUci ?? null,
            topMoves: mpvList,
          });
        }
      }, 3500);

      // Send UCI commands to Stockfish 19
      if (fen) {
        this.worker.postMessage(`position fen ${fen}`);
      } else if (uciMoves.length > 0) {
        this.worker.postMessage(`position startpos moves ${uciMoves.join(' ')}`);
      } else {
        this.worker.postMessage('position startpos');
      }

      this.worker.postMessage('go depth 7');
    });
  }

  /**
   * Strictly classify a move using BoardSight's original moveClassifier logic.
   *
   * @param {object} p
   * @param {number} p.preScore - Eval of the position before the move (moving player POV in cp)
   * @param {number} p.postScore - Eval of the position after the move (moving player POV in cp)
   * @param {string} [p.engineBestMove] - UCI move recommended by Stockfish 19 before this move
   * @param {string} [p.playerMoveUCI] - UCI of the move played
   * @param {boolean} [p.isBookMove=false] - Whether move is in the opening book
   * @param {string} [p.san] - Standard algebraic notation of move played
   * @param {boolean} [p.isBotvinnik=false] - Whether this move was played by GM Botvinnik
   * @param {number} [p.bookGames] - Number of games in Botvinnik's book repertoire
   * @param {string} [p.evalStr] - Evaluation string after the move (e.g. "+0.35", "-M1")
   * @param {string} [p.bestMoveSan] - SAN of the recommended engine move
   * @returns {object} Full classification object with id, label, symbol, color, bg, commentary, winDrop
   */
  classify({
    preScore,
    postScore,
    engineBestMove,
    playerMoveUCI,
    isBookMove = false,
    san = '',
    isBotvinnik = false,
    bookGames = null,
    evalStr = '0.00',
    bestMoveSan = null,
  }) {
    // 1. Run BoardSight's official classification algorithm
    const baseClassification = classifyMove({
      preScore,
      postScore,
      engineBestMove,
      playerMoveUCI,
      isBookMove,
      isNovelty: false,
    });

    // 2. Compute accurate win chance drop
    const CP_CEILING = 1000;
    const clamp = (v) =>
      Math.max(-CP_CEILING, Math.min(CP_CEILING, typeof v === 'number' ? v : 0));
    const preWin = cpToWinPct(clamp(preScore));
    const postWin = cpToWinPct(clamp(postScore));
    const winDrop = Math.max(0, preWin - postWin);

    // 3. Generate high-fidelity commentary strictly matching the classification
    let commentary = '';
    const id = baseClassification.id;

    if (id === 'book') {
      commentary = isBotvinnik
        ? bookGames
          ? `GM Botvinnik plays ${san} from master repertoire (${bookGames} historical games).`
          : `GM Botvinnik follows master opening theory with ${san}.`
        : `Book move with ${san}. Following established opening theory.`;
    } else if (id === 'blunder') {
      commentary = bestMoveSan
        ? `Blunder with ${san}. Win chance dropped by ${winDrop.toFixed(0)}% (${evalStr}). Stockfish preferred ${bestMoveSan}.`
        : `Blunder with ${san}. Major evaluation shift to ${evalStr} (win chance dropped by ${winDrop.toFixed(0)}%).`;
    } else if (id === 'mistake') {
      commentary = bestMoveSan
        ? `Mistake with ${san}. Stockfish 19 preferred ${bestMoveSan} (${evalStr}).`
        : `Mistake with ${san}. Concedes the advantage (${evalStr}).`;
    } else if (id === 'inaccuracy') {
      commentary = bestMoveSan
        ? `Inaccuracy with ${san}. ${bestMoveSan} was more accurate (${evalStr}).`
        : `Inaccuracy with ${san}. Slight concession of initiative (${evalStr}).`;
    } else if (id === 'good') {
      commentary = `Good move with ${san}. Solid positional play (${evalStr}).`;
    } else if (id === 'excellent') {
      commentary = `Excellent move with ${san}. Keeps a firm grip on the position (${evalStr}).`;
    } else if (id === 'best') {
      commentary = `Best move with ${san}. Matches Stockfish 19's top engine choice (${evalStr}).`;
    } else if (id === 'great') {
      commentary = `Great move with ${san}. A sharp, critical continuation (${evalStr}).`;
    } else if (id === 'brilliant') {
      commentary = `Brilliant move with ${san}. Outstanding tactical breakthrough (${evalStr}).`;
    } else {
      commentary = `${baseClassification.label} with ${san}. Evaluation: ${evalStr}.`;
    }

    return {
      ...baseClassification,
      commentary,
      winDrop,
      preScore,
      postScore,
    };
  }

  terminate() {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = null;
    }
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
