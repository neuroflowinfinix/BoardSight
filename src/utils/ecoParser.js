/**
 * ECO.pgn parser - ENHANCED with TSV-based openings database
 * 
 * This is a backward-compatible wrapper that now uses the enhanced
 * openings database from en-croissant (TSV format) instead of ECO.pgn.
 *
 * Usage:
 *   const eco = await loadECO();
 *   const openingInfo = eco.lookup(["e4","e5","Nf3"]);
 *   // Returns the deepest matching entry or null
 */

import { loadOpeningsDatabase } from './openingsDatabase.js';

let ecoCache = null;

export async function loadECO() {
  if (ecoCache) return ecoCache;

  console.log('[ECO Parser] Loading enhanced openings database...');

  try {
    // Load the new TSV-based opening database
    const openingsDb = await loadOpeningsDatabase();

    /**
     * Backward compatible lookup by moves
     * Returns deepest matching opening with bookDepth
     */
    function lookup(sanMoves) {
      if (!Array.isArray(sanMoves) || sanMoves.length === 0) {
        return null;
      }

      const result = openingsDb.lookupByMoves(sanMoves);
      if (!result) return null;

      return {
        eco: result.eco,
        opening: result.name,
        variation: '',
        tokens: sanMoves.slice(0, result.bookDepth),
        key: sanMoves.slice(0, result.bookDepth).join(' '),
        bookDepth: result.bookDepth,
      };
    }

    /** How many leading moves are in the opening book */
    function bookDepth(sanMoves) {
      const result = lookup(sanMoves);
      return result ? result.bookDepth : 0;
    }

    ecoCache = {
      lookup,
      bookDepth,
      size: openingsDb.size,
      version: 'enhanced-tsv'
    };

    console.log('[ECO Parser] Enhanced database loaded successfully');
    return ecoCache;
  } catch (err) {
    console.error('[ECO Parser] Failed to load enhanced database:', err);

    // Fallback to empty database
    return {
      lookup: () => null,
      bookDepth: () => 0,
      size: 0,
      version: 'fallback'
    };
  }
}
