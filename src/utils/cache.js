/**
 * cache.js — IndexedDB caching utility for large JSON files
 *
 * Usage:
 *   const data = await cacheManager.get('openings.json');
 *   if (!data) {
 *     data = await fetch('/openings.json').then(r => r.json());
 *     await cacheManager.set('openings.json', data);
 *   }
 *
 * Benefits over localStorage:
 *   - Supports large files (openings.json is ~1.5 MB)
 *   - Asynchronous (doesn't block UI)
 *   - Per-file versioning
 *   - Automatic cleanup on version mismatch
 */

const DB_NAME = 'boardsight-cache';
const STORE_NAME = 'files';

class CacheManager {
  constructor() {
    this.db = null;
    this.initialized = false;
  }

  /**
   * Initialize the IndexedDB database (happens once)
   * @returns {Promise<IDBDatabase>}
   */
  async init() {
    if (this.initialized) return this.db;

    // Clean up legacy database if it exists
    try {
      if (typeof indexedDB !== 'undefined' && indexedDB.databases) {
        indexedDB.databases().then(dbs => {
          if (dbs && dbs.some(db => db.name === 'chess-review-cache')) {
            indexedDB.deleteDatabase('chess-review-cache');
          }
        }).catch(() => {});
      }
    } catch (e) {}

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);

      request.onerror = () => {
        console.error('[Cache] IndexedDB init failed:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.initialized = true;
        console.log('[Cache] IndexedDB initialized');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'fileName' });
          console.log('[Cache] Object store created');
        }
      };
    });
  }

  /**
   * Store data in cache with timestamp and optional version
   * @param {string} fileName - Key (e.g., 'openings.json')
   * @param {any} data - The data to cache (will be JSON stringified)
   * @param {string} version - Optional version string for invalidation
   * @returns {Promise<void>}
   */
  async set(fileName, data, version = null) {
    try {
      await this.init();

      const cacheEntry = {
        fileName,
        data,
        version,
        timestamp: Date.now(),
      };

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(cacheEntry);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          console.log(`[Cache] Stored ${fileName} (${(JSON.stringify(data).length / 1024).toFixed(1)} KB)`);
          resolve();
        };
      });
    } catch (err) {
      console.error('[Cache] Failed to set cache:', err);
      throw err;
    }
  }

  /**
   * Retrieve data from cache
   * @param {string} fileName - Key (e.g., 'openings.json')
   * @param {string} expectedVersion - Optional version to validate against
   * @returns {Promise<any|null>} - Cached data or null if not found / version mismatch
   */
  async get(fileName, expectedVersion = null) {
    try {
      await this.init();

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(fileName);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const entry = request.result;

          if (!entry) {
            console.log(`[Cache] ${fileName} not found in cache`);
            resolve(null);
            return;
          }

          // Version mismatch? Invalidate cache
          if (expectedVersion && entry.version !== expectedVersion) {
            console.log(`[Cache] ${fileName} version mismatch (cached: ${entry.version}, expected: ${expectedVersion}) — invalidating`);
            this.remove(fileName).catch(() => {}); // Async cleanup
            resolve(null);
            return;
          }

          const age = (Date.now() - entry.timestamp) / 1000 / 60; // minutes
          console.log(`[Cache] Hit: ${fileName} (${age.toFixed(1)} min old, ${(JSON.stringify(entry.data).length / 1024).toFixed(1)} KB)`);
          resolve(entry.data);
        };
      });
    } catch (err) {
      console.error('[Cache] Failed to get cache:', err);
      return null; // Graceful fallback
    }
  }

  /**
   * Remove a file from cache
   * @param {string} fileName
   * @returns {Promise<void>}
   */
  async remove(fileName) {
    try {
      await this.init();

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(fileName);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          console.log(`[Cache] Removed ${fileName}`);
          resolve();
        };
      });
    } catch (err) {
      console.error('[Cache] Failed to remove from cache:', err);
    }
  }

  /**
   * Clear entire cache
   * @returns {Promise<void>}
   */
  async clear() {
    try {
      await this.init();

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          console.log('[Cache] Cleared all cache');
          resolve();
        };
      });
    } catch (err) {
      console.error('[Cache] Failed to clear cache:', err);
    }
  }

  /**
   * Get cache statistics
   * @returns {Promise<{count: number, size: string}>}
   */
  async stats() {
    try {
      await this.init();

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const entries = request.result;
          const size = entries.reduce((sum, e) => sum + JSON.stringify(e.data).length, 0);
          resolve({
            count: entries.length,
            size: (size / 1024 / 1024).toFixed(2) + ' MB',
            entries: entries.map(e => ({ fileName: e.fileName, version: e.version })),
          });
        };
      });
    } catch (err) {
      console.error('[Cache] Failed to get stats:', err);
      return { count: 0, size: '0 MB', entries: [] };
    }
  }
}

// Singleton instance
export const cacheManager = new CacheManager();

/**
 * Manual cache clearing function (for dev/debugging)
 * Call in console: window.clearChessCache()
 */
if (typeof window !== 'undefined') {
  window.clearBoardSightCache = async () => {
    await cacheManager.clear();
    console.log('Cache cleared. Refresh the page.');
  };
  window.clearChessCache = window.clearBoardSightCache;

  window.getCacheStats = async () => {
    const stats = await cacheManager.stats();
    console.table(stats);
    return stats;
  };
}
