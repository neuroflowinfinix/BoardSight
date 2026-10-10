export class UciController {
  constructor(workerPaths, onEvalUpdate, onReady, engineName = 'stockfish', threads = 2, engineDetection = null) {
    this.engineName = engineName;
    this.threads = threads;
    this.engineDetection = engineDetection; // { flavorId, flavorInfo, displayName } from engineDetector
    this.status = 'LOADING_WASM'; // LOADING_WASM → WAIT_UCIOK → INITIALIZING → IDLE → SEARCHING → STOPPING
    this.queue = [];
    this.currentResolve = null;
    this.onEvalUpdate = onEvalUpdate;
    this.onReady = onReady;
    this.onError = null;

    this.lastUIUpdate = 0;
    this.throttleMs = 250;
    
    // We maintain an array of top moves for your multiPV "Minefield" detector
    this.latestEval = { depth: 0, topMoves: [] };
    this.worker = null;
    this.activeWorkerPath = null;
    this._destroyed = false;
    this._searchTimeout = null;

    // Ensure workerPaths is an array
    const paths = Array.isArray(workerPaths) ? workerPaths : [workerPaths];

    // Start the fallback chain asynchronously
    this._initChain(paths);
  }

  async _initChain(paths) {
    let lastErr = null;
    for (const path of paths) {
      if (this._destroyed) return;
      try {
        console.log(`[UciController] Attempting to load engine: ${path}`);
        await this._tryWorker(path);
        // If we reach here, the worker successfully handshook!
        this.activeWorkerPath = path;
        console.log(`[UciController] Successfully started engine: ${path}`);
        
        this.status = 'IDLE';
        if (this.onReady) this.onReady(true, null, path);
        this.processQueue();
        return; // Success, break the chain
      } catch (err) {
        console.warn(`[UciController] Engine ${path} failed to load:`, err);
        lastErr = err;
        if (this.worker) {
          try { this.worker.terminate(); } catch (e) {}
          this.worker = null;
        }
      }
    }
    
    if (this._destroyed) return;
    this.status = 'ERROR';
    if (this.onReady) this.onReady(false, `All compatible engines failed to load. Last error: ${lastErr?.message || 'Unknown error'}`);
  }

  _tryWorker(path) {
    return new Promise((resolve, reject) => {
      // 1. Give Stockfish the explicit wasm path via the URL hash (mirroring repo logic).
      // We dynamically infer the wasm path from the current JS path being attempted in the chain.
      // This prevents 404s when the worker tries to resolve .wasm from the wrong base URL or if it fell back.
      let wasmPath = null;
      if (!path.endsWith('.asm.js')) {
        wasmPath = path.replace(/\.js$/, '.wasm');
      }
      
      const workerUrl = wasmPath ? `${path}#${wasmPath}` : path;

      try {
        this.worker = new Worker(workerUrl);
      } catch (err) {
        return reject(err);
      }

      const isBerserk = path.includes('berserk');
      let currentPhase = 'INITIALIZING'; 
      let bannerSeen = false;

      // 2. Dynamic Timeout: WASM engines get 15s. The 10MB asm.js file gets 45s.
      // Failing WASM faster prevents the user from staring at 'testing engine' for 45s if a WASM worker silently hangs.
      const timeoutMs = path.includes('asm.js') ? 45000 : 15000;
      const timeout = setTimeout(() => {
        reject(new Error(`Handshake timed out (${timeoutMs/1000}s)`));
      }, timeoutMs);

      this.worker.onerror = (err) => {
        clearTimeout(timeout);
        const errMsg = err?.message || err?.filename ? `${err.message} (${err.filename}:${err.lineno})` : 'Worker load error';
        reject(new Error(errMsg));
      };

      this.worker.onmessage = (e) => {
        const msg = typeof e.data === 'string' ? e.data : (e.data?.data || "");
        if (!msg) return;

        if (msg === 'uciok') {
          if (!isBerserk) {
            // Only send Threads if the detected flavor supports multi-threading
            const supportsThreads = this.engineDetection?.flavorInfo?.supportsThreads !== false;
            if (supportsThreads && this.threads > 1) {
              this.worker.postMessage(`setoption name Threads value ${this.threads}`);
            }
            const deviceMemory = navigator.deviceMemory || 0;
            let hashSize = deviceMemory >= 8 ? 512 : deviceMemory >= 4 ? 128 : 32;
            this.worker.postMessage(`setoption name Hash value ${hashSize}`);
          }
          this.worker.postMessage('isready');
          return;
        }

        if (msg === 'readyok') {
          if (currentPhase !== 'DONE') {
            clearTimeout(timeout);
            currentPhase = 'DONE';
            this._attachNormalListeners();
            resolve();
          }
          return;
        }

        // If we receive a string (like a banner) but haven't received uciok, the worker is alive.
        // BUGFIX: Some WASM compilations of Stockfish drop any stdin messages sent *before* 
        // the C++ main() fully boots. We re-send 'uci' immediately after seeing the first banner line!
        if (currentPhase !== 'DONE' && !bannerSeen && !msg.startsWith('id ') && !msg.startsWith('option ')) {
          bannerSeen = true;
          this.worker.postMessage('uci');
        }
      };

      // 3. Send "uci" immediately (works for Berserk and synchronous engines like asm.js)
      this.worker.postMessage('uci');
    });
  }

  _attachNormalListeners() {
    this.worker.onerror = (err) => {
      console.error(`[UciController] Worker error during normal operation:`, err);
      if (this._searchTimeout) {
        clearTimeout(this._searchTimeout);
        this._searchTimeout = null;
      }
      this.status = 'ERROR';
      if (this.currentResolve) {
        this.currentResolve({ bestMove: null, score: 0, topMoves: [] });
        this.currentResolve = null;
      }
      while (this.queue.length > 0) {
        const task = this.queue.shift();
        if (task.resolve) task.resolve({ bestMove: null, score: 0, topMoves: [] });
      }
    };
    this.worker.onmessage = (e) => {
      const msg = typeof e.data === 'string' ? e.data : (e.data?.data || "");
      if (msg) this.handleMessage(msg);
    };
  }

  evaluatePosition(fen, depth = 13, movetime = null, multiPV = 3, nodes = null) {
    return new Promise((resolve) => {
      if (this.status === 'ERROR' || this._destroyed || !this.worker) {
        return resolve({ bestMove: null, score: 0, topMoves: [] });
      }

      this.queue.push({ fen, depth, movetime, multiPV, nodes, resolve });
      this.processQueue();
    });
  }

  processQueue() {
    if (this.queue.length === 0) return;

    if (this.status === 'ERROR' || this._destroyed) {
      while (this.queue.length > 0) {
        const task = this.queue.shift();
        if (task.resolve) task.resolve({ bestMove: null, score: 0, topMoves: [] });
      }
      return;
    }

    // Handshake Halt: Stop the engine, wait for bestmove
    if (this.status === 'SEARCHING') {
      this.status = 'STOPPING';
      try { this.worker.postMessage('stop'); } catch (_) {}
      return; 
    }

    if (this.status === 'STOPPING' || this.status === 'LOADING_WASM' || 
        this.status === 'WAIT_UCIOK' || this.status === 'INITIALIZING') {
      return;
    }

    const task = this.queue.shift();
    this.status = 'SEARCHING';
    this.currentResolve = task.resolve;
    this.latestEval = { depth: 0, topMoves: [], fen: task.fen };

    // Watchdog timer: If engine ever hangs or deadlocks, prevent freezing analysis at 0%
    if (this._searchTimeout) clearTimeout(this._searchTimeout);
    const watchdogMs = Math.max(15000, (task.movetime || 0) + 10000);
    this._searchTimeout = setTimeout(() => {
      if (this.status === 'SEARCHING' && this.currentResolve) {
        console.warn(`[UciController] Search timed out (${watchdogMs / 1000}s) on position ${task.fen}. Emitting fallback.`);
        const fallback = {
          bestMove: this.latestEval.topMoves[0]?.move || null,
          score: this.latestEval.topMoves[0]?.score ?? 0,
          topMoves: this.latestEval.topMoves
        };
        const res = this.currentResolve;
        this.currentResolve = null;
        this.status = 'IDLE';
        res(fallback);
        this.processQueue();
      }
    }, watchdogMs);

    // Stockfish / Berserk — standard UCI order
    const isBerserk = this.activeWorkerPath && this.activeWorkerPath.includes('berserk');
    if (!isBerserk) {
      this.worker.postMessage(`setoption name MultiPV value ${task.multiPV || 1}`);
    }
    this.worker.postMessage(`position fen ${task.fen}`);

    if (task.depth && task.movetime) {
      this.worker.postMessage(`go depth ${task.depth} movetime ${task.movetime}`);
    } else {
      this.worker.postMessage(`go depth ${task.depth}`);
    }
  }

  // Call once before analyzing a new game to reset the engine's hash table
  newGame() {
    if (this.worker && (this.status === 'IDLE' || this.status === 'SEARCHING' || this.status === 'STOPPING')) {
      if (this.status === 'SEARCHING') {
        this.status = 'STOPPING';
        try { this.worker.postMessage('stop'); } catch (_) {}
      }
      try {
        this.worker.postMessage('ucinewgame');
        this.worker.postMessage('isready');
      } catch (_) {}
    }
  }

  handleMessage(msg) {
    // ── Normal operation: parse info and bestmove lines ──
    if (msg.startsWith('info') && msg.includes('depth')) {
      this.parseInfoString(msg);

      // Throttler: Protect React from engine spam
      const now = Date.now();
      if (now - this.lastUIUpdate > this.throttleMs) {
        this.lastUIUpdate = now;
        if (this.onEvalUpdate && this.latestEval.topMoves[0]) {
          this.onEvalUpdate(this.latestEval);
        }
      }
    } else if (msg.startsWith('bestmove')) {
      if (this._searchTimeout) {
        clearTimeout(this._searchTimeout);
        this._searchTimeout = null;
      }
      this.status = 'IDLE';
      const bestMoveMatch = msg.match(/bestmove\s+(\S+)/);
      const bestMove = bestMoveMatch ? (bestMoveMatch[1] === '(none)' ? null : bestMoveMatch[1]) : null;

      // Normal bestmove: force one final UI update, then resolve
      if (this.onEvalUpdate && this.latestEval.topMoves[0]) {
        this.onEvalUpdate(this.latestEval);
      }
      if (this.currentResolve) {
        this.currentResolve({
          bestMove,
          score: this.latestEval.topMoves[0]?.score ?? 0,
          topMoves: this.latestEval.topMoves
        });
        this.currentResolve = null;
      }
      this.processQueue();
    }
  }

  parseInfoString(msg) {
    const depthMatch = msg.match(/depth\s+(\d+)/);
    if (depthMatch) {
      this.latestEval.depth = parseInt(depthMatch[1], 10);
    }

    const mpvMatch = msg.match(/multipv\s+(\d+)/);
    const pvNum = mpvMatch ? parseInt(mpvMatch[1], 10) : 1;

    while (this.latestEval.topMoves.length < pvNum) {
      this.latestEval.topMoves.push({ score: 0, move: null, pv: '', mate: null });
    }
    const entry = this.latestEval.topMoves[pvNum - 1];

    const cpMatch = msg.match(/score cp (-?\d+)/);
    const mateMatch = msg.match(/score mate (-?\d+)/);

    // Convert raw UCI scores into your exact internal integer format
    if (cpMatch) {
      entry.score = parseInt(cpMatch[1], 10);
      entry.mate = null;
    } else if (mateMatch) {
      const m = parseInt(mateMatch[1], 10);
      entry.mate = m;
      entry.score = m > 0 ? 10000 - Math.abs(m) : -10000 + Math.abs(m);
    }

    const pvMatch = msg.match(/\bpv\s+(.*)/);
    if (pvMatch) {
      entry.pv = pvMatch[1].trim();
      entry.move = entry.pv.split(' ')[0];
    }
  }

  halt() {
    if (this._searchTimeout) {
      clearTimeout(this._searchTimeout);
      this._searchTimeout = null;
    }
    if (this.status === 'SEARCHING') {
      this.status = 'STOPPING';
      try { this.worker?.postMessage('stop'); } catch (_) {}
    }
    if (this.currentResolve) {
      this.currentResolve({ bestMove: null, score: 0, topMoves: [] });
      this.currentResolve = null;
    }
    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (task.resolve) task.resolve({ bestMove: null, score: 0, topMoves: [] });
    }
  }

  destroy() {
    this._destroyed = true;
    this.halt();
    if (this.worker) {
      try { this.worker.terminate(); } catch (_) {}
      this.worker = null;
    }
  }
}