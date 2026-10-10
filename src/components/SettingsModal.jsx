import React, { useState, useEffect } from 'react';
import LottieAvatar from './LottieAvatar';

const PIECE_SETS = ['Staunty', 'Infinix', 'Cooke', 'Monarchy', 'Maya-4', 'Trinity-4'];

export default function SettingsModal({ isOpen, onClose, settings, onSave, pieceSet, onPieceSetChange, activeEngineName }) {
  const [local, setLocal] = useState(settings);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const isSingleThreaded = activeEngineName && activeEngineName.toLowerCase().includes('single');
  const maxThreads = typeof navigator !== 'undefined' && navigator.hardwareConcurrency ? navigator.hardwareConcurrency : 8;
  const defaultThreads = typeof navigator !== 'undefined' && navigator.hardwareConcurrency ? Math.max(1, Math.floor(navigator.hardwareConcurrency * 0.75)) : 4;

  // Sync the toggle state with the actual DOM and global settings whenever the modal opens
  useEffect(() => {
    if (isOpen) {
      setLocal(settings);
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(local);
    onClose();
  };

  const previewPiece = (set) => `/pieces/${set}/wN.svg`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md md:max-w-2xl lg:max-w-4xl border border-gray-100 dark:border-slate-700 overflow-hidden flex flex-col md:max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-[#4a7c59]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            <h2 className="text-base font-bold text-gray-800 dark:text-slate-100 tracking-tight">Analysis Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors rounded-full p-1 hover:bg-gray-100 dark:hover:bg-slate-800"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 overflow-y-auto max-h-[75vh] md:max-h-none bg-white dark:bg-slate-900">
          {/* Warning/Info Banner */}
          <div className="flex gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl p-3.5 mb-6">
              <svg className="w-5 h-5 text-amber-500 dark:text-amber-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <p className="text-amber-700 dark:text-amber-300 text-sm leading-relaxed break-words">
                <span className="font-bold">Note:</span> Higher depth &amp; MultiPV settings provide deeper insights, but they require more processing power. <br className="hidden md:block" />
                If you notice any lag, try lowering them for a smoother experience.
              </p>
            </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
            {/* Left Column: Engine Settings */}
            <div className="flex flex-col gap-6">
              {/* Depth */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-slate-300">Search Depth</label>
                  <span className="text-sm font-bold text-[#4a7c59] bg-[#4a7c59]/10 px-2.5 py-0.5 rounded-full">
                    {local.depth}
                  </span>
                </div>
                <input
                  type="range"
                  min="6" max="24" step="1"
                  value={local.depth}
                  onChange={(e) => setLocal(p => ({ ...p, depth: +e.target.value }))}
                  className="w-full h-2 bg-gray-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer accent-[#4a7c59]"
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-slate-400 mt-1">
                  <span>6 — Fast</span><span>24 — Deep</span>
                </div>
              </div>

              {/* Time per Move */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-slate-300">Time per Move</label>
                  <span className="text-sm font-bold text-[#4a7c59] bg-[#4a7c59]/10 px-2.5 py-0.5 rounded-full">
                    {local.movetime >= 1000 ? `${(local.movetime / 1000).toFixed(1)}s` : `${local.movetime}ms`}
                  </span>
                </div>
                <input
                  type="range"
                  min="300" max="5000" step="100"
                  value={local.movetime}
                  onChange={(e) => setLocal(p => ({ ...p, movetime: +e.target.value }))}
                  className="w-full h-2 bg-gray-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer accent-[#4a7c59]"
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-slate-400 mt-1">
                  <span>0.3s — Quick</span><span>5s — Thorough</span>
                </div>
              </div>


              {/* MultiPV */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className={`text-sm font-semibold ${local.engine === 'berserk' ? 'text-gray-400 dark:text-slate-500' : 'text-gray-700 dark:text-slate-300'}`}>MultiPV Lines</label>
                  <span className={`text-sm font-bold ${local.engine === 'berserk' ? 'text-gray-400 bg-gray-100 dark:text-slate-500 dark:bg-slate-800' : 'text-[#4a7c59] bg-[#4a7c59]/10'} px-2.5 py-0.5 rounded-full`}>
                    {local.multiPV}
                  </span>
                </div>
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map(v => (
                    <button
                      key={v}
                      onClick={() => local.engine !== 'berserk' && setLocal(p => ({ ...p, multiPV: v }))}
                      disabled={local.engine === 'berserk'}
                      className={`flex-1 py-2 rounded-lg text-sm font-bold border-2 transition-all ${local.engine === 'berserk'
                          ? 'bg-gray-100 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-400 dark:text-slate-500 cursor-not-allowed opacity-50'
                          : local.multiPV === v
                          ? 'bg-[#4a7c59] border-[#4a7c59] text-white shadow-sm'
                          : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:border-[#4a7c59]/50 dark:hover:border-[#4a7c59]'
                        }`}
                      title={local.engine === 'berserk' ? 'MultiPV is not supported by Berserk v4.3.0' : ''}
                    >
                      {v}
                    </button>
                  ))}
                </div>
                <p className={`text-xs mt-1.5 ${local.engine === 'berserk' ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-gray-500 dark:text-slate-400'}`}>
                  {local.engine === 'berserk' 
                    ? 'MultiPV is not supported by Berserk v4.3.0 (use Stockfish)' 
                    : 'Number of candidate lines evaluated per position'}
                </p>
              </div>

              {/* Threads */}
              <div className={isSingleThreaded ? "opacity-50" : ""}>
                <div className="flex justify-between items-center mb-2">
                  <label className={`text-sm font-semibold ${isSingleThreaded ? 'text-gray-400 dark:text-slate-500' : 'text-gray-700 dark:text-slate-300'}`}>CPU Threads</label>
                  <span className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${isSingleThreaded ? 'text-gray-400 bg-gray-100 dark:text-slate-500 dark:bg-slate-800' : 'text-[#4a7c59] bg-[#4a7c59]/10'}`}>
                    {local.threads || defaultThreads}
                  </span>
                </div>
                <input
                  type="range"
                  min="1" max={maxThreads} step="1"
                  value={local.threads || defaultThreads}
                  onChange={(e) => setLocal(p => ({ ...p, threads: +e.target.value }))}
                  disabled={isSingleThreaded}
                  className={`w-full h-2 rounded-full appearance-none accent-[#4a7c59] ${isSingleThreaded ? 'bg-gray-100 dark:bg-slate-800 cursor-not-allowed' : 'bg-gray-200 dark:bg-slate-700 cursor-pointer'}`}
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-slate-400 mt-1">
                  <span>1 — Min</span><span>{maxThreads} — Max</span>
                </div>
                <p className={`text-xs mt-1.5 ${isSingleThreaded ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-gray-500 dark:text-slate-400'}`}>
                  {isSingleThreaded 
                    ? "Currently running a single-threaded fallback engine. Multi-threading is disabled."
                    : "Reload required after changing threads, more threads cause higher CPU usage."}
                </p>
              </div>

              {/* Engine Selection */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-slate-300">Engine</label>
                  <span className="text-sm font-bold text-[#4a7c59] bg-[#4a7c59]/10 px-2.5 py-0.5 rounded-full">
                    {local.engine === 'berserk' ? 'Berserk 4.3.0' : local.engine === 'stockfish-18' ? 'Stockfish 18' : 'Stockfish 19'}
                  </span>
                </div>
                <div className="flex gap-2">
                  {[
                    { id: 'stockfish', label: 'Stockfish 19' },
                    { id: 'stockfish-18', label: 'Stockfish 18' },
                    { id: 'berserk',   label: 'Berserk 4.3.0' },
                  ].map(({ id, label }) => (
                    <button
                      key={id}
                      onClick={() => setLocal(p => ({ ...p, engine: id }))}
                      className={`flex-1 py-2 rounded-lg text-sm font-bold border-2 transition-all ${
                        local.engine === id
                          ? 'bg-[#4a7c59] border-[#4a7c59] text-white shadow-sm'
                          : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:border-[#4a7c59]/50 dark:hover:border-[#4a7c59]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1.5">Reload required after switching engine</p>
              </div>

              {/* Auto-Orient Board by Perspective Toggle */}
              <div className="flex items-center justify-between bg-gray-50 dark:bg-slate-800 p-3 rounded-xl border border-gray-100 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white dark:bg-slate-900 rounded-lg flex items-center justify-center shadow-sm border border-gray-100 dark:border-slate-700">
                    <svg className="w-4 h-4 text-[#4a7c59]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-700 dark:text-slate-200">Orient Board by Perspective</p>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400 font-medium">Auto-flip board to perspective after analysis (OFF = White default)</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setLocal(p => ({ ...p, autoFlipByPerspective: p.autoFlipByPerspective === false ? true : false }))}
                  className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-1 ${local.autoFlipByPerspective !== false ? 'bg-[#4a7c59]' : 'bg-gray-300 dark:bg-slate-600'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${local.autoFlipByPerspective !== false ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Coach Glow Toggle */}
              <div className="flex items-center justify-between bg-gray-50 dark:bg-slate-800 p-3 rounded-xl border border-gray-100 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white dark:bg-slate-900 rounded-lg flex items-center justify-center shadow-sm border border-gray-100 dark:border-slate-700">
                    <svg className="w-4 h-4 text-[#4a7c59]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-700 dark:text-slate-300">Coach Glow Effect</p>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400 font-medium">Colorful background behind coach</p>
                  </div>
                </div>
                <button
                  onClick={() => setLocal(p => ({ ...p, showCoachGlow: p.showCoachGlow === false ? true : false }))}
                  className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-1 ${local.showCoachGlow !== false ? 'bg-[#4a7c59]' : 'bg-gray-300 dark:bg-slate-600'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${local.showCoachGlow !== false ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>

            {/* Right Column: UI & System Settings */}
            <div className="flex flex-col gap-6">
              {/* Perspective Selection */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-slate-300">Explainer Perspective</label>
                  <span className="text-sm font-bold text-[#4a7c59] bg-[#4a7c59]/10 px-2.5 py-0.5 rounded-full">
                    {local.perspective === 'b' ? 'Black' : 'White'}
                  </span>
                </div>
                <div className="flex gap-2">
                  {[
                    { id: 'w', label: 'White' },
                    { id: 'b', label: 'Black' },
                  ].map(({ id, label }) => (
                    <button
                      key={id}
                      onClick={() => setLocal(p => ({ ...p, perspective: id }))}
                      className={`flex-1 py-2 rounded-lg text-sm font-bold border-2 transition-all ${
                        local.perspective === id
                          ? 'bg-[#4a7c59] border-[#4a7c59] text-white shadow-sm'
                          : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:border-[#4a7c59]/50 dark:hover:border-[#4a7c59]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1.5">Who the coach is talking to ("You" vs "Opponent")</p>
              </div>

              {/* Piece Set */}
              <div>
                <label className="text-sm font-semibold text-gray-700 dark:text-slate-300 block mb-2">Piece Set</label>
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                  {PIECE_SETS.map(set => (
                    <button
                      key={set}
                      onClick={() => onPieceSetChange(set)}
                      className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all ${pieceSet === set
                        ? 'border-[#4a7c59] bg-[#4a7c59]/5 dark:bg-[#4a7c59]/10 shadow-sm'
                        : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-gray-300 dark:hover:border-slate-600'
                        }`}
                    >
                      <img
                        src={previewPiece(set)}
                        alt={set}
                        className="w-8 h-8 object-contain"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                      <span className={`text-xs font-semibold leading-none ${pieceSet === set ? 'text-[#4a7c59]' : 'text-gray-500 dark:text-slate-400'
                        }`}>{set}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Board Theme */}
              <div>
                <label className="text-sm font-semibold text-gray-700 dark:text-slate-300 block mb-2">Board Theme</label>
                <div className="flex gap-3">
                  {[
                    { id: 'green', dark: '#769656', light: '#eeeed2', label: 'Green' },
                    { id: 'wood', dark: '#b58863', light: '#f0d9b5', label: 'Wood' },
                  ].map(theme => (
                    <button
                      key={theme.id}
                      onClick={() => setLocal(p => ({ ...p, boardTheme: theme.id }))}
                      className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all ${local.boardTheme === theme.id
                        ? 'border-[#4a7c59] bg-[#4a7c59]/5 dark:bg-[#4a7c59]/10 shadow-sm'
                        : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-gray-300 dark:hover:border-slate-600'
                        }`}
                    >
                      {/* Mini 2×2 board preview */}
                      <div className="grid grid-cols-2 rounded overflow-hidden w-10 h-10 shadow-sm">
                        <div style={{ backgroundColor: theme.light }} />
                        <div style={{ backgroundColor: theme.dark }} />
                        <div style={{ backgroundColor: theme.dark }} />
                        <div style={{ backgroundColor: theme.light }} />
                      </div>
                      <span className={`text-xs font-semibold leading-none ${local.boardTheme === theme.id ? 'text-[#4a7c59]' : 'text-gray-500 dark:text-slate-400'
                        }`}>{theme.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dark Mode Toggle */}
              <div className="flex items-center justify-between bg-gray-50 dark:bg-slate-800 p-3 rounded-xl border border-gray-100 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white dark:bg-slate-900 rounded-lg flex items-center justify-center shadow-sm border border-gray-100 dark:border-slate-700">
                    <svg className="w-4 h-4 text-[#4a7c59]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-700 dark:text-slate-200">Dark Mode</p>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400 font-medium">Toggle dark theme</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const newTheme = !isDarkMode;
                    setIsDarkMode(newTheme);
                    document.documentElement.classList.toggle('dark', newTheme);
                    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
                  }}
                  className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-1 ${isDarkMode ? 'bg-[#4a7c59]' : 'bg-gray-300 dark:bg-slate-600'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${isDarkMode ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Sound Toggle */}
              <div className="flex items-center justify-between bg-gray-50 dark:bg-slate-800 p-3 rounded-xl border border-gray-100 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white dark:bg-slate-900 rounded-lg flex items-center justify-center shadow-sm border border-gray-100 dark:border-slate-700">
                    <svg className="w-4 h-4 text-[#4a7c59]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-700 dark:text-slate-300">Sound Effects</p>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400 font-medium">Enable board move sounds</p>
                  </div>
                </div>
                <button
                  onClick={() => setLocal(p => ({ ...p, enableSound: !p.enableSound }))}
                  className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-1 ${local.enableSound ? 'bg-[#4a7c59]' : 'bg-gray-300 dark:bg-slate-600'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${local.enableSound ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Move Play Interval */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-slate-300">Move Play Interval</label>
                  <span className="text-sm font-bold text-[#4a7c59] bg-[#4a7c59]/10 px-2.5 py-0.5 rounded-full">
                    {local.playInterval ?? 2} sec
                  </span>
                </div>
                <input
                  type="range"
                  min="1" max="10" step="1"
                  value={local.playInterval ?? 2}
                  onChange={(e) => setLocal(p => ({ ...p, playInterval: Math.max(1, +e.target.value) }))}
                  className="w-full h-2 bg-gray-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer accent-[#4a7c59]"
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-slate-400 mt-1">
                  <span>1s — Fast</span><span>5s — Standard</span><span>10s — Slow</span>
                </div>
                <div className="flex gap-2 mt-2">
                  {[1, 2, 3, 5, 10].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setLocal(p => ({ ...p, playInterval: sec }))}
                      className={`flex-1 py-1 rounded-lg text-xs font-bold border transition-all ${
                        (local.playInterval ?? 2) === sec
                          ? 'bg-[#4a7c59] border-[#4a7c59] text-white shadow-sm'
                          : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:border-[#4a7c59]/50 dark:hover:border-[#4a7c59]'
                      }`}
                    >
                      {sec}s
                    </button>
                  ))}
                </div>
                <div className="mt-2.5 flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200/80 dark:border-amber-800/40 rounded-xl p-2.5 text-xs text-amber-800 dark:text-amber-300">
                  <svg className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="leading-relaxed">
                    <span className="font-bold">Instruction:</span> Coach explanations are disabled for play time interval less than 5 sec.
                  </p>
                </div>
              </div>

              {/* Engine Lines Toggle */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between bg-gray-50 dark:bg-slate-800 p-3 rounded-xl border border-gray-100 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white dark:bg-slate-900 rounded-lg flex items-center justify-center shadow-sm border border-gray-100 dark:border-slate-700">
                      <svg className="w-4 h-4 text-[#4a7c59]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-700 dark:text-slate-300">Engine Lines</p>
                      <p className="text-[11px] text-gray-500 dark:text-slate-400 font-medium">Show live evaluation lines</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setLocal(p => ({ ...p, showEngineLines: p.showEngineLines === false ? true : false }))}
                    className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-1 ${local.showEngineLines !== false ? 'bg-[#4a7c59]' : 'bg-gray-300 dark:bg-slate-600'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${local.showEngineLines !== false ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
                {local.showEngineLines !== false && (
                  <p className="text-xs text-gray-500 dark:text-slate-400 italic">
                    Realtime engine lines are limited by the selected Depth and MultiPV above.
                  </p>
                )}
              </div>

              {/* Collapse Footer Toggle */}
              <div className="hidden md:flex flex-col gap-2">
                <div className="flex items-center justify-between bg-gray-50 dark:bg-slate-800 p-3 rounded-xl border border-gray-100 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white dark:bg-slate-900 rounded-lg flex items-center justify-center shadow-sm border border-gray-100 dark:border-slate-700">
                      <svg className="w-4 h-4 text-[#4a7c59]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-700 dark:text-slate-300">Collapse Footer</p>
                      <p className="text-[11px] text-gray-500 dark:text-slate-400 font-medium">Hide thanks footer on PC/Tablet</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setLocal(p => ({ ...p, collapseFooter: !p.collapseFooter }))}
                    className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-1 ${local.collapseFooter ? 'bg-[#4a7c59]' : 'bg-gray-300 dark:bg-slate-600'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${local.collapseFooter ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-700 flex gap-3 bg-white dark:bg-slate-900">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 font-semibold text-sm hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 rounded-xl bg-[#4a7c59] text-white font-bold text-sm hover:bg-[#3d6b4a] transition-colors shadow-sm"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
