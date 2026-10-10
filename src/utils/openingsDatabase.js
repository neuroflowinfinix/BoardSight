/**
 * openingsDatabase.js  —  OPTIMISED v4 (with IndexedDB caching)
 *
 * Loads pre-built openings.json with smart caching:
 *   1. Check IndexedDB cache first (instant, no network)
 *   2. If not cached or version mismatch, fetch from server
 *   3. Cache on-device for future loads
 *
 * User experience:
 *   - First load: ~2 seconds (fetch from server + store to IndexedDB)
 *   - Subsequent loads: ~50ms (load from IndexedDB)
 *   - Reload/offline: instant (uses cached data)
 */

import { cacheManager } from './cache.js';

let openingsCache = null;

/**
 * Load the openings database with smart caching
 * @returns {Promise<Object>}
 */
export async function loadOpeningsDatabase() {
  if (openingsCache) return openingsCache;

  console.log('[Openings DB] Starting load with caching strategy...');
  const t0 = performance.now();

  let byFen     = {};
  let byMoveKey = {};
  let version   = 'unknown';
  let size      = 0;
  let fromCache = false;

  try {
    // ── Step 1: Try to load from IndexedDB cache ────────────────────────────
    console.log('[Openings DB] Checking IndexedDB cache...');
    const cached = await cacheManager.get('openings.json', '3.1-prebuilt');
    
    if (cached) {
      console.log('[Openings DB] ✅ Cache hit! Using IndexedDB data');
      byFen      = cached.byFen     ?? {};
      byMoveKey  = cached.byMoveKey ?? {};
      version    = cached.version   ?? 'cached';
      size       = cached.size      ?? Object.keys(byFen).length;
      fromCache  = true;
    } else {
      // ── Step 2: Cache miss — fetch from server ──────────────────────────
      console.log('[Openings DB] Cache miss. Fetching from server...');
      const res = await fetch('/openings.json?v=' + Date.now());
      if (!res.ok) throw new Error(`HTTP ${res.status} fetching /openings.json`);

      const data = await res.json();
      byFen      = data.byFen     ?? {};
      byMoveKey  = data.byMoveKey ?? {};
      version    = data.version   ?? 'unknown';
      size       = data.size      ?? Object.keys(byFen).length;

      // ── Step 3: Store to IndexedDB for future loads ──────────────────────
      console.log('[Openings DB] Caching to IndexedDB...');
      await cacheManager.set('openings.json', data, '3.1-prebuilt');
    }

    const elapsed = (performance.now() - t0).toFixed(0);
    const source  = fromCache ? 'IndexedDB' : 'HTTP fetch';
    console.log(
      `[Openings DB] ✅ Loaded ${size} positions in ${elapsed}ms (source: ${source})`
    );
  } catch (err) {
    console.error('[Openings DB] Failed to load:', err);
    console.error('  → Check /openings.json exists, or run:  npm run prebuild');
  }

  // ── Lookup helpers ──────────────────────────────────────────────────────────

  /**
   * Exact FEN lookup (strips clock / halfmove fields for transposition matching)
   * @param {string} fen
   * @returns {Object|null}
   */
  function lookupByFen(fen) {
    if (!fen) return null;
    const key = fen.split(' ').slice(0, 4).join(' ');
    return byFen[key] ?? null;
  }

  /**
   * Move-sequence lookup — tries the longest prefix first, then walks back
   * @param {string[]} sanMoves  Chess.js-normalised SAN array
   * @returns {Object|null}
   */
  function lookupByMoves(sanMoves) {
    if (!Array.isArray(sanMoves) || sanMoves.length === 0) return null;

    for (let depth = sanMoves.length; depth >= 1; depth--) {
      const entry = byMoveKey[sanMoves.slice(0, depth).join(' ')];
      if (entry) return entry;
    }
    return null;
  }

  /**
   * FEN-array lookup — returns the deepest matching opening
   * @param {string[]} fens
   * @returns {Object|null}
   */
  function lookupByFens(fens) {
    if (!Array.isArray(fens) || fens.length === 0) return null;
    for (let i = fens.length - 1; i >= 0; i--) {
      const entry = lookupByFen(fens[i]);
      if (entry) return entry;
    }
    return null;
  }

  /**
   * How many leading moves are covered by the opening book
   * @param {string[]} moves
   * @returns {number}
   */
  function getBookDepth(moves) {
    return lookupByMoves(moves)?.bookDepth ?? 0;
  }

  /** Returns all opening entries as an array */
  function getAllOpenings() {
    return Object.values(byFen);
  }

  openingsCache = {
    lookup:       lookupByFen,
    lookupByFen,
    lookupByMoves,
    lookupByFens,
    getBookDepth,
    getAllOpenings,
    size,
    version,
  };

  return openingsCache;
}

// ── Utility helpers (unchanged) ─────────────────────────────────────────────

export function isBookMove(sanMoves, moveIndex, opening) {
  if (!opening?.bookDepth) return false;
  return moveIndex < opening.bookDepth;
}

export function getOpeningInfoByColor(sanMoves, opening) {
  if (!opening) return { white: null, black: null };

  const depth      = opening.bookDepth ?? 0;
  const whiteDepth = depth % 2 === 1 ? depth : depth - 1;
  const blackDepth = depth % 2 === 0 ? depth : depth - 1;

  const base = { eco: opening.eco, name: opening.name };
  return {
    white: whiteDepth > 0 ? { ...base, bookDepth: whiteDepth } : null,
    black: blackDepth > 0 ? { ...base, bookDepth: blackDepth } : null,
  };
}
