/**
 * botvinnikController.js
 *
 * Dedicated UCI Controller for GM Mikhail Botvinnik Engine v1.0.
 * Runs `public/botvinnik/botvinnik_engine.js` in a Web Worker (or synchronous fallback).
 * Trained on 919 games & 32,617 positions from GM Botvinnik's career.
 */

export class BotvinnikController {
  constructor(onReady, onLog) {
    this.worker = null;
    this.isReady = false;
    this.onReady = onReady;
    this.onLog = onLog;
    this.pendingMoveResolve = null;
    this.lastBookInfo = null;
    this.init();
  }

  init() {
    try {
      this.worker = new Worker('/botvinnik/botvinnik_engine.js');
      
      this.worker.onerror = (err) => {
        console.error('[BotvinnikController] Worker error:', err);
      };

      this.worker.onmessage = (e) => {
        const line = typeof e === 'string' ? e : (typeof e.data === 'string' ? e.data : (e.data?.data || ''));
        if (!line) return;
        this._handleLine(line.trim());
      };

      this.worker.postMessage('uci');
      this.worker.postMessage('isready');
    } catch (err) {
      console.error('[BotvinnikController] Failed to initialize worker:', err);
      if (this.onReady) this.onReady(false, err.message);
    }
  }

  _handleLine(line) {
    if (this.onLog) this.onLog(line);

    if (line === 'readyok') {
      this.isReady = true;
      if (this.onReady) this.onReady(true);
      return;
    }

    // Check for Botvinnik book announcement:
    // e.g. "info string Move selected from Botvinnik PGN book (211 games in repertoire)"
    if (line.includes('Botvinnik PGN book')) {
      const match = line.match(/\((\d+)\s+games\s+in\s+repertoire\)/i);
      this.lastBookInfo = {
        isBook: true,
        gamesCount: match ? parseInt(match[1], 10) : null,
        raw: line,
      };
    } else if (line.includes('Position not found in Botvinnik PGN book')) {
      this.lastBookInfo = null;
    }

    // Check for bestmove:
    // e.g. "bestmove c7c5 ponder g1f3"
    if (line.startsWith('bestmove ')) {
      const parts = line.split(/\s+/);
      const moveUci = parts[1];
      const ponder = parts[3] || null;

      if (this.pendingMoveResolve) {
        const resolve = this.pendingMoveResolve;
        this.pendingMoveResolve = null;

        const book = this.lastBookInfo;
        this.lastBookInfo = null;

        resolve({
          uci: moveUci,
          from: moveUci ? moveUci.slice(0, 2) : '',
          to: moveUci ? moveUci.slice(2, 4) : '',
          promotion: moveUci && moveUci.length > 4 ? moveUci[4] : '',
          ponder,
          isBook: !!book?.isBook,
          bookGames: book?.gamesCount || null,
        });
      }
    }
  }

  newGame() {
    this.lastBookInfo = null;
    if (this.worker) {
      this.worker.postMessage('ucinewgame');
      this.worker.postMessage('isready');
    }
  }

  /**
   * Request engine move for the given sequence of moves or starting position.
   * @param {string[]} movesArray - list of UCI moves (e.g. ['e2e4', 'c7c5'])
   * @param {number} depth - search depth (default 5, Botvinnik engine optimal)
   * @param {number} movetime - max thinking time in ms (default 800ms)
   * @returns {Promise<{ uci, from, to, promotion, ponder, isBook, bookGames }>}
   */
  getMove(movesArray = [], depth = 5, movetime = 800) {
    return new Promise((resolve) => {
      this.pendingMoveResolve = resolve;
      this.lastBookInfo = null;

      if (!this.worker) {
        resolve({ uci: null });
        return;
      }

      if (movesArray.length > 0) {
        this.worker.postMessage(`position startpos moves ${movesArray.join(' ')}`);
      } else {
        this.worker.postMessage('position startpos');
      }

      // Small depth search with movetime bound
      this.worker.postMessage(`go depth ${depth} movetime ${movetime}`);
    });
  }

  terminate() {
    if (this.worker) {
      try {
        this.worker.postMessage('quit');
        this.worker.terminate();
      } catch (e) {}
      this.worker = null;
    }
    this.pendingMoveResolve = null;
    this.isReady = false;
  }
}
