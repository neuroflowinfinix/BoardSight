// ─────────────────────────────────────────────────────────────────────────────
// BoardSight — Smart Service Worker with File-Level Change Tracking
//
// How it works (similar to "git status"):
//   1. At build time, Vite generates /file-manifest.json with MD5 hashes
//   2. On SW install, we fetch the new manifest and compare against the
//      previously cached manifest
//   3. Only CHANGED files (hash mismatch) and NEW files are fetched
//   4. DELETED files (in old manifest but not new) are removed from cache
//   5. UNCHANGED files are left untouched — zero network traffic
//
// This ensures users get updates without re-downloading the 7MB+ Stockfish
// WASM on every deployment.
// ─────────────────────────────────────────────────────────────────────────────

const CACHE_NAME = 'boardsight-assets-v15'; // bumped: clear caches and apply pthread worker URL fix
const MANIFEST_URL = '/file-manifest.json';

// ── Install: Diff the manifest and update only changed files ────────────────
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(diffAndUpdate());
});

async function diffAndUpdate() {
  try {
    // 1. Fetch the new manifest (always bypass cache)
    const res = await fetch(MANIFEST_URL + '?t=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) {
      console.warn('[SW] Could not fetch file manifest — clearing engine caches for freshness');
      // In dev mode file-manifest.json doesn't exist. Clear berserk so stale WASM is never served.
      const cache = await caches.open(CACHE_NAME);
      const keys = await cache.keys();
      for (const key of keys) {
        const p = new URL(key.url).pathname;
        if (p.includes('/berserk')) {
          await cache.delete(key);
          console.log(`[SW] Cleared stale engine cache: ${p}`);
        }
      }
      return;
    }
    const newManifest = await res.json();
    const newFiles = newManifest.files || {};

    // 2. Load the old manifest from cache (if it exists)
    const cache = await caches.open(CACHE_NAME);
    let oldFiles = {};
    try {
      const oldManifestRes = await cache.match(new Request('/__manifest_snapshot__'));
      if (oldManifestRes) {
        const oldData = await oldManifestRes.json();
        oldFiles = oldData.files || {};
      }
    } catch (e) {
      // No old manifest — treat everything as new
    }

    // 3. Compute the diff
    const toFetch = []; // Files that are new or changed
    const toDelete = []; // Files that were removed

    const ONDEMAND_ENGINES = ['berserk', 'stockfish'];

    for (const [path, hash] of Object.entries(newFiles)) {
      if (!oldFiles[path] || oldFiles[path] !== hash) {
        const isOnDemand = ONDEMAND_ENGINES.some(sub => path.includes(sub));
        if (!isOnDemand) {
          toFetch.push(path);
        } else if (oldFiles[path]) {
          // If it changed, delete the old version from cache so it's fresh next time it's demanded
          toDelete.push(path);
        }
      }
    }

    for (const path of Object.keys(oldFiles)) {
      if (!newFiles[path]) {
        toDelete.push(path);
      }
    }

    // 4. Log the diff (git-status style)
    if (toFetch.length > 0 || toDelete.length > 0) {
      console.log(`[SW] File manifest diff:`);
      for (const p of toFetch) {
        const status = oldFiles[p] ? 'modified' : 'new';
        console.log(`  ${status === 'new' ? '+' : '~'} ${p} (${status})`);
      }
      for (const p of toDelete) {
        console.log(`  - ${p} (deleted)`);
      }
    } else {
      console.log('[SW] No file changes detected — cache is up to date');
    }

    // 5. Fetch and cache changed/new files
    if (toFetch.length > 0) {
      const results = await Promise.allSettled(
        toFetch.map(async (path) => {
          try {
            const response = await fetch(path, { cache: 'no-store' });
            if (response.ok) {
              await cache.put(new Request(path), response);
              return { path, status: 'ok' };
            }
            return { path, status: 'http-error', code: response.status };
          } catch (err) {
            return { path, status: 'fetch-error', error: err.message };
          }
        })
      );

      const succeeded = results.filter(r => r.status === 'fulfilled' && r.value.status === 'ok').length;
      const failed = results.filter(r => r.status === 'rejected' || r.value?.status !== 'ok').length;
      console.log(`[SW] Fetched ${succeeded} files, ${failed} failed`);
    }

    // 6. Delete removed files from cache
    for (const path of toDelete) {
      await cache.delete(new Request(path)).catch(() => {});
    }

    // 7. Save the new manifest snapshot for next comparison
    await cache.put(
      new Request('/__manifest_snapshot__'),
      new Response(JSON.stringify(newManifest), {
        headers: { 'Content-Type': 'application/json' }
      })
    );

    console.log(`[SW] Manifest updated to version ${newManifest.version}`);
  } catch (err) {
    console.error('[SW] diffAndUpdate failed:', err);
    // Always clear engine caches on failure so stale WASM is never served
    try {
      const cache = await caches.open(CACHE_NAME);
      const keys = await cache.keys();
      for (const key of keys) {
        const p = new URL(key.url).pathname;
        if (p.includes('/berserk')) {
          await cache.delete(key);
        }
      }
    } catch { /* ignore */ }
  }
}

// ── Activate: Clean up old-style caches from previous SW versions ───────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== 'lichess-pieces-v1')
          .map((k) => {
            console.log(`[SW] Deleting old cache: ${k}`);
            return caches.delete(k);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: Smart routing based on request type ──────────────────────────────
self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  const urlPath = new URL(url).pathname;

  // ── Never cache or intercept the version/manifest markers ──
  if (url.includes('/version.json') || url.includes('/file-manifest.json')) {
    event.respondWith(
      fetch(event.request.url + (event.request.url.includes('?') ? '&' : '?') + 't=' + Date.now(), { cache: 'no-store' })
        .catch(() => new Response('{}', { status: 503, headers: { 'Content-Type': 'application/json' } }))
    );
    return;
  }

  // ── Vite-hashed assets (JS/CSS with content hashes in filename) ──
  // These are immutable by design — cache-first is safe & fast
  if (urlPath.startsWith('/assets/')) {
    event.respondWith(
      caches.match(event.request, { ignoreSearch: true }).then((cached) => cached || fetch(event.request).then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return res;
      }))
    );
    return;
  }

  // ── Sound effects (.mp3 files): Cache-first for instant audio playback ──
  if (urlPath.startsWith('/sounds/') || urlPath.endsWith('.mp3')) {
    event.respondWith(
      caches.match(event.request, { ignoreSearch: true }).then((cached) => cached || fetch(event.request).then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return res;
      }))
    );
    return;
  }

  // ── Engine/WASM files: Serve from manifest cache, cache on demand ──
  // Stockfish is pre-cached on install. Berserk is cached on first use.
  // Responses MUST include Cross-Origin-Resource-Policy so COEP doesn't block importScripts.
  if (
    url.includes('/stockfish-') ||
    url.includes('/berserk.js')   || url.includes('/berserk.wasm') ||
    url.includes('/berserkWorker.js')
  ) {
    event.respondWith(
      caches.match(event.request, { ignoreSearch: true }).then((cached) => {
        const addCORP = (response) => {
          // If headers already include CORP, return as-is
          if (response.headers.get('Cross-Origin-Resource-Policy')) return response;
          // Clone and add the required header for COEP compatibility
          const headers = new Headers(response.headers);
          headers.set('Cross-Origin-Resource-Policy', 'same-origin');
          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers,
          });
        };
        if (cached) return addCORP(cached);
        return fetch(event.request).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return addCORP(res);
        });
      })
    );
    return;
  }

  // ── Local Pieces & Databases: Cache-first, store on demand ──
  if (
    urlPath.startsWith('/pieces/') || 
    url.endsWith('.tsv') || 
    url.includes('/openings.json') || 
    url.includes('/ECO.pgn')
  ) {
    event.respondWith(
      caches.match(event.request, { ignoreSearch: true }).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return res;
        });
      })
    );
    return;
  }

  // ── Never intercept worker or dynamic script requests ──
  // (Note: /assets/ bundles were already handled above)
  if (event.request.destination === 'worker' || event.request.destination === 'script') {
    event.respondWith(fetch(event.request));
    return;
  }

  // ── Cache Lichess pieces dynamically (External) ──
  if (event.request.url.includes('lichess1.org/assets/piece')) {
    event.respondWith(
      caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse.clone()));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // ── Network-first for HTML navigation — always fetch fresh app shell ──
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // ── Default: Network-first with cache fallback for same-origin ──
  if (!url.startsWith(self.location.origin)) return;
  event.respondWith(
    fetch(event.request)
      .then((res) => res)
      .catch(() => caches.match(event.request, { ignoreSearch: true }).then((cached) => cached || new Response('', { status: 408 })))
  );
});