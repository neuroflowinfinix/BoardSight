/**
 * engineDetector.js
 *
 * Instant browser feature detection to select the best Stockfish.js flavor
 * WITHOUT downloading anything first. Prevents wasted bandwidth and failed loads.
 *
 * Detection hierarchy (per engine version):
 *   1. Lite Multi-threaded  (WASM + SharedArrayBuffer + crossOriginIsolated + sufficient cores)
 *   2. Lite Single-threaded (WASM only — works on ~98% of modern browsers)
 *   3. ASM.js fallback      (pure JS — for ancient browsers without WASM)
 */

/**
 * Engine registry: maps engine family IDs to their file paths and capabilities.
 */
const ENGINE_REGISTRY = {
  'stockfish-19': {
    displayName: 'Stockfish 19',
    flavors: {
      'lite-multi':  { js: '/stockfish-v19/stockfish-19-lite.js',        wasm: '/stockfish-v19/stockfish-19-lite.wasm',        requiresWasm: true,  requiresSharedMemory: true,  supportsThreads: true  },
      'lite-single': { js: '/stockfish-v19/stockfish-19-lite-single.js', wasm: '/stockfish-v19/stockfish-19-lite-single.wasm', requiresWasm: true,  requiresSharedMemory: false, supportsThreads: false },
      'asm':         { js: '/stockfish-v19/stockfish-19-asm.js',         wasm: null,                                           requiresWasm: false, requiresSharedMemory: false, supportsThreads: false },
    },
  },
  'stockfish-18': {
    displayName: 'Stockfish 18',
    flavors: {
      'lite-multi':  { js: '/stockfish-v18/stockfish-18-lite.js',        wasm: '/stockfish-v18/stockfish-18-lite.wasm',        requiresWasm: true,  requiresSharedMemory: true,  supportsThreads: true  },
      'lite-single': { js: '/stockfish-v18/stockfish-18-lite-single.js', wasm: '/stockfish-v18/stockfish-18-lite-single.wasm', requiresWasm: true,  requiresSharedMemory: false, supportsThreads: false },
      'asm':         { js: '/stockfish-v18/stockfish-18-asm.js',         wasm: null,                                           requiresWasm: false, requiresSharedMemory: false, supportsThreads: false },
    },
  },
  'berserk': {
    displayName: 'Berserk v4.3.0',
    flavors: {
      'default': { js: '/berserk-v4.3.0/berserkWorker.js', wasm: '/berserk-v4.3.0/berserk.wasm', requiresWasm: true, requiresSharedMemory: false, supportsThreads: false },
    },
  },
};

/**
 * Minimum number of logical cores required to select the multi-threaded build.
 *
 * Rationale: on devices with fewer cores than this, thread-spawning overhead
 * makes lite-multi measurably slower than lite-single. 3 is the minimum that
 * leaves 1 core for the UI thread and still gives Stockfish 2 dedicated cores.
 *
 * Callers that know their environment better can override this by passing a
 * custom threshold to detectCapabilities().
 */
const DEFAULT_MIN_CORES_FOR_MULTI = 3;

/**
 * Probe whether the browser's WASM engine supports SIMD (v128) instructions.
 *
 * The module below is the *minimal* valid WASM binary that uses v128.const and
 * actually passes validation: one function of type () -> v128 whose body loads a
 * v128.const and returns it. Browsers without SIMD support will return false
 * from WebAssembly.validate(); browsers with SIMD return true.
 *
 * Encoding breakdown:
 *   magic + version
 *   type section:     1 type, () -> v128  (0x7b = v128 valtype)
 *   function section: 1 function, type index 0
 *   export section:   export "f" as function 0  (optional but makes it a valid, complete module)
 *   code section:     body = v128.const (16 zero bytes) + end
 */
function probeWasmSimd() {
  try {
    return WebAssembly.validate(new Uint8Array([
      // ---- magic + version ----
      0x00, 0x61, 0x73, 0x6d,  // \0asm
      0x01, 0x00, 0x00, 0x00,  // version 1

      // ---- type section (id=1) ----
      0x01,                    // section id
      0x05,                    // section size: 5 bytes
      0x01,                    // 1 type entry
      0x60,                    // func type
      0x00,                    // 0 params
      0x01, 0x7b,              // 1 result: v128

      // ---- function section (id=3) ----
      0x03,                    // section id
      0x02,                    // section size: 2 bytes
      0x01,                    // 1 function
      0x00,                    // type index 0

      // ---- export section (id=7) ----
      0x07,                    // section id
      0x05,                    // section size: 5 bytes
      0x01,                    // 1 export
      0x01, 0x66,              // name length 1, "f"
      0x00,                    // export kind: function
      0x00,                    // function index 0

      // ---- code section (id=10) ----
      0x0a,                    // section id
      0x13,                    // section size: 19 bytes
      0x01,                    // 1 function body
      0x11,                    // body size: 17 bytes
      0x00,                    // 0 locals
      0xfd, 0x0c,              // v128.const
      0x00, 0x00, 0x00, 0x00,  // 16-byte immediate (all zeros)
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
      0x0b,                    // end
    ]));
  } catch {
    return false;
  }
}

/**
 * Known-broken Safari/iOS versions that shipped SharedArrayBuffer with a
 * defective implementation causing silent deadlocks in multi-threaded WASM.
 *
 * iOS 15.2 and 15.3 are the confirmed affected range. We detect via the UA
 * string (ugly but the only option — no feature flag distinguishes the bug).
 * Returns true if the current browser is a known-broken iOS Safari.
 */
function isKnownBrokenSafariSharedMemory() {
  try {
    const ua = globalThis.navigator?.userAgent ?? '';
    // Match "iPhone OS 15_2" or "iPhone OS 15_3" / "CPU OS 15_2" etc.
    const match = ua.match(/(?:iPhone OS|CPU OS)\s+(\d+)_(\d+)/);
    if (!match) return false;
    const major = parseInt(match[1], 10);
    const minor = parseInt(match[2], 10);
    // iOS 15.2 and 15.3 have the broken SAB implementation.
    return major === 15 && (minor === 2 || minor === 3);
  } catch {
    return false;
  }
}

/**
 * Detect browser capabilities synchronously (no network requests).
 * Result is memoized — capabilities never change after page load, and the
 * SIMD probe (WebAssembly.validate) is non-trivial to run on every call.
 *
 * @param {number} [minCoresForMulti] - Override the core-count threshold for
 *   multi-thread selection. Defaults to DEFAULT_MIN_CORES_FOR_MULTI (3).
 */
let _cachedCaps = null;
function detectCapabilities(minCoresForMulti = DEFAULT_MIN_CORES_FOR_MULTI) {
  // Cache is keyed on the default threshold only. Callers passing a custom
  // threshold always get a fresh result (rare, and correctness > perf there).
  if (_cachedCaps && minCoresForMulti === DEFAULT_MIN_CORES_FOR_MULTI) {
    return _cachedCaps;
  }

  const hasWasm = typeof WebAssembly === 'object' &&
                  typeof WebAssembly.validate === 'function';

  const hasSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined';

  // Use globalThis — works correctly in Window, Dedicated Worker, and
  // Service Worker scopes. (`window` is undefined in workers;
  // `navigator` exists in Dedicated Workers via WorkerNavigator but NOT
  // in Service Workers, hence the optional chain below.)
  const isCrossOriginIsolated = globalThis.crossOriginIsolated === true;

  // navigator.hardwareConcurrency is available in Window and Dedicated Worker
  // (WorkerNavigator) but absent in Service Workers — hence the optional chain.
  const logicalCores = globalThis.navigator?.hardwareConcurrency ?? 1;
  const hasSufficientCores = logicalCores >= minCoresForMulti;

  // SharedArrayBuffer on iOS 15.2–15.3 Safari is present but broken (silent
  // deadlock in multi-threaded WASM). Treat it as absent.
  const hasWorkingSharedMemory = hasSharedArrayBuffer && !isKnownBrokenSafariSharedMemory();

  const hasWasmSimd = hasWasm ? probeWasmSimd() : false;

  const caps = {
    hasWasm,
    // Multi-thread needs WASM + working SAB + COI + sufficient cores.
    hasSharedMemory: hasWasm && hasWorkingSharedMemory && isCrossOriginIsolated && hasSufficientCores,
    // Exposed for callers that want to gate SIMD-optimised builds.
    // Not currently used in flavor selection (no SIMD-specific flavor exists yet).
    hasWasmSimd,
    logicalCores,
  };

  if (minCoresForMulti === DEFAULT_MIN_CORES_FOR_MULTI) {
    _cachedCaps = caps;
  }

  return caps;
}

/**
 * Internal: select the single best compatible flavor given pre-computed caps.
 * Single source of truth — both detectBestFlavor and getEngineConfig use this.
 *
 * @param {string} engineId
 * @param {ReturnType<typeof detectCapabilities>} caps
 * @returns {{ workerPath, flavorId, flavorInfo, displayName } | null}
 */
function _selectBestFlavor(engineId, caps) {
  const engine = ENGINE_REGISTRY[engineId];
  if (!engine) return null;

  if (engineId === 'berserk') {
    const flavor = engine.flavors['default'];
    if (flavor.requiresWasm && !caps.hasWasm) return null;
    return { workerPath: flavor.js, flavorId: 'default', flavorInfo: flavor, displayName: engine.displayName };
  }

  // Upstream nmrugg/stockfish.js documentation:
  // "most likely, you should use the lite single-threaded engine because it is fast and does not require any complicated setup."
  // Lite single-threaded runs reliably across 100% of browsers (desktop, mobile iOS/Android) without requiring COOP/COEP headers,
  // SharedArrayBuffer, or nested worker pthreads.
  const priorityOrder = ['lite-single', 'lite-multi', 'asm'];
  for (const flavorId of priorityOrder) {
    const flavor = engine.flavors[flavorId];
    if (!flavor) continue;
    if (flavor.requiresWasm && !caps.hasWasm) continue;
    if (flavor.requiresSharedMemory && !caps.hasSharedMemory) continue;
    return { workerPath: flavor.js, flavorId, flavorInfo: flavor, displayName: engine.displayName };
  }

  return null;
}

/**
 * Select the best engine flavor for a given engine family.
 *
 * @param {string} engineId - One of 'stockfish-19', 'stockfish-18', 'berserk'
 * @returns {{ workerPath, flavorId, flavorInfo, displayName } | null}
 */
export function detectBestFlavor(engineId) {
  return _selectBestFlavor(engineId, detectCapabilities());
}

/**
 * Get a human-readable label for the detected flavor.
 * e.g. "Stockfish 19 (Multi-threaded)"
 */
export function getFlavorLabel(detection) {
  if (!detection) return 'Unknown Engine';
  const flavorLabels = {
    'lite-multi':  'Multi-threaded',
    'lite-single': 'Single-threaded',
    'asm':         'ASM.js',
    'default':     '',
  };
  const suffix = flavorLabels[detection.flavorId] || '';
  return suffix ? `${detection.displayName} (${suffix})` : detection.displayName;
}

/**
 * Maps the settings engine ID to the internal registry key.
 */
export function resolveEngineId(settingsEngine) {
  if (settingsEngine === 'stockfish' || settingsEngine === 'stockfish-19') return 'stockfish-19';
  if (settingsEngine === 'stockfish-18') return 'stockfish-18';
  if (settingsEngine === 'berserk') return 'berserk';
  return 'stockfish-19';
}

/**
 * Build the optimal worker path(s) for a given engine setting.
 *
 * Returns { detection, workerPaths } where:
 *   - detection: best-flavor descriptor for UI labelling
 *   - workerPaths: fallback chain for UciController, starting from the best
 *     flavor and going downward only — never includes a tier above what is
 *     confirmed available, so the controller won't waste a load attempt on an
 *     impossible flavor or fall back to ASM.js when WASM is confirmed present.
 *
 * Fallback chain examples:
 *   lite-multi is best  → [lite-multi, lite-single]  (not asm: WASM confirmed)
 *   lite-single is best → [lite-single, asm]
 *   asm is best         → [asm]
 *   berserk             → [berserkWorker.js]
 */
export function getEngineConfig(settingsEngine) {
  const engineId = resolveEngineId(settingsEngine);
  const caps = detectCapabilities();
  const engine = ENGINE_REGISTRY[engineId];

  if (!engine) return { detection: null, workerPaths: [] };

  const bestDetection = _selectBestFlavor(engineId, caps);
  if (!bestDetection) return { detection: null, workerPaths: [] };

  if (engineId === 'berserk') {
    return { detection: bestDetection, workerPaths: [bestDetection.workerPath] };
  }

  // Build downward-only fallback chain from best flavor.
  const priorityOrder = ['lite-single', 'lite-multi', 'asm'];
  const bestIndex = priorityOrder.indexOf(bestDetection.flavorId);
  const workerPaths = priorityOrder
    .slice(bestIndex)
    .map(id => engine.flavors[id]?.js)
    .filter(Boolean);

  return { detection: bestDetection, workerPaths };
}

export { ENGINE_REGISTRY, detectCapabilities };
