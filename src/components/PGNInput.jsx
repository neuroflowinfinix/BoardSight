import React, { useState } from 'react';
import GameImport from './GameImport';
import { extractStudyInfo } from '../study/studyFetcher';

const ENGINE_LABELS = {
  stockfish: 'Stockfish 19',
  'stockfish-19': 'Stockfish 19',
  'stockfish-18': 'Stockfish 18',
  berserk: 'Berserk v4.3.0 (experimental)',
};

export default function PGNInput({
  onAnalyze, disabled, engineReady, engineError, onRetryEngine, onOpenSettings, pgnError, isChess960, onToggle960, onOpenImport, engineName = 'stockfish',
  dbReady = false, engineLoadingStatus = null, onLoadCge, onOpenStudy, showStudyModal: showStudyModalProp, setShowStudyModal: setShowStudyModalProp
}) {
  const [pgn, setPgn] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [showStudyModalLocal, setShowStudyModalLocal] = useState(false);
  const [studyUrl, setStudyUrl] = useState('');

  const isStudyModalOpen = showStudyModalProp !== undefined ? showStudyModalProp : showStudyModalLocal;

  const handleOpenLearnModal = () => {
    if (setShowStudyModalProp) {
      setShowStudyModalProp(true);
    } else {
      setShowStudyModalLocal(true);
    }
    if (!window.location.pathname.toLowerCase().startsWith('/learn')) {
      window.history.pushState({ modal: '/learn' }, '', '/learn');
    }
  };

  const handleCloseLearnModal = () => {
    if (setShowStudyModalProp) {
      setShowStudyModalProp(false);
    } else {
      setShowStudyModalLocal(false);
    }
    if (window.location.pathname.toLowerCase() === '/learn') {
      window.history.pushState({}, '', '/');
    }
  };

  const handleStudySubmit = (e) => {
    e.preventDefault();
    if (!studyUrl.trim()) return;
    
    const info = extractStudyInfo(studyUrl);
    
    if (info && info.studyId) {
      const studyId = info.studyId;
      if (setShowStudyModalProp) {
        setShowStudyModalProp(false);
      } else {
        setShowStudyModalLocal(false);
      }
      
      const newPath = info.chapterId ? `/learn/${studyId}/${info.chapterId}` : `/learn/${studyId}`;
      window.history.pushState({ modal: newPath }, '', newPath);
      window.dispatchEvent(new Event('popstate'));
      
      if (onOpenStudy) {
        onOpenStudy(studyId, info.chapterId);
      }
    } else {
      alert("Please enter a valid Lichess Study URL or ID (e.g., https://lichess.org/study/AXx2pMBm/Swl0PxS6)");
    }
  };

  const label = ENGINE_LABELS[engineName] || engineName;

  const handleFile = (file) => {
    if (!file.name.endsWith('.cge')) {
      alert('Please select a valid .cge (Chess Game Export) file');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (onLoadCge) onLoadCge(data);
      } catch (err) {
        console.error("Failed to parse .cge file", err);
        alert('Failed to parse .cge file. It might be corrupted.');
      }
    };
    reader.readAsText(file);
  };

  const allReady = dbReady && engineReady;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm p-3 flex-1 flex flex-col min-h-0 h-full overflow-y-auto custom-scrollbar">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-bold text-gray-800 dark:text-slate-200 tracking-tight">Paste PGN</h2>
        </div>
        <div className="flex items-center gap-2">

          {/* Variant Toggle: Only show when textarea is empty */}
          {!pgn.trim() && (
            <button
              onClick={onToggle960}
              disabled={disabled}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-all shadow-sm
                ${isChess960
                  ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400 border border-orange-200 dark:border-orange-800/50 hover:bg-orange-200 dark:hover:bg-orange-900/50'
                  : 'font-semibold bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
            >
              {isChess960 ? (
                <span className="font-black tracking-wide text-orange-600">Chess960</span>
              ) : 'Standard Variant'}
            </button>
          )}
        </div>
      </div>

      {/* ── Engine Loading Status Flow ── */}
      {engineError ? (
        <div className="mb-3 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-red-600 dark:text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01M21 12A9 9 0 1112 3a9 9 0 019 9z" />
          </svg>
          <span className="text-xs font-medium text-red-700 dark:text-red-300">{label} failed to load</span>
          <span className="text-xs text-red-600 dark:text-red-400 ml-2 truncate">{engineError}</span>
          <button onClick={onRetryEngine} className="ml-auto text-xs font-semibold text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 px-2 py-1 rounded-lg border border-red-100 dark:border-red-800/50 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors">Retry</button>
        </div>
      ) : allReady ? (
        <div className="mb-3 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-lg flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300" id="engine-status">
            {engineLoadingStatus?.engineLabel || label} Ready
          </span>
        </div>
      ) : (
        <div className="mb-3 px-3 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 rounded-lg">
          <div className="flex flex-col gap-1.5">
            {/* Stage 1: Detecting */}
            <div className="flex items-center gap-2">
              {engineLoadingStatus?.stage === 'detecting' ? (
                <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shrink-0" />
              ) : (
                <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              )}
              <span className={`text-xs font-medium ${
                engineLoadingStatus?.stage === 'detecting'
                  ? 'text-blue-700 dark:text-blue-300'
                  : 'text-emerald-700 dark:text-emerald-400'
              }`}>
                {engineLoadingStatus?.stage === 'detecting'
                  ? 'Finding the best engine for you...'
                  : `Found: ${engineLoadingStatus?.detectedFlavor || label}`
                }
              </span>
            </div>

            {/* Stage 2: Testing (only visible after detection) */}
            {(engineLoadingStatus?.stage === 'testing' || engineLoadingStatus?.stage === 'ready') && (
              <div className="flex items-center gap-2">
                {engineLoadingStatus?.stage === 'testing' ? (
                  <div className="w-3 h-3 border-2 border-amber-500 border-t-transparent rounded-full animate-spin shrink-0" />
                ) : (
                  <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                <span className={`text-xs font-medium ${
                  engineLoadingStatus?.stage === 'testing'
                    ? 'text-amber-700 dark:text-amber-300'
                    : 'text-emerald-700 dark:text-emerald-400'
                }`}>
                  {engineLoadingStatus?.stage === 'testing'
                    ? 'Testing engine...'
                    : `Loaded: ${engineLoadingStatus?.engineLabel || label}`
                  }
                </span>
              </div>
            )}

            {/* Database readiness (subtle, secondary) */}
            {!dbReady && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin shrink-0" />
                <span className="text-xs font-medium text-gray-500 dark:text-slate-400">Loading openings database...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SMART PGN ERROR BANNER */}
      {pgnError && (
        <div className="mb-3 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-800/50 rounded-lg flex items-start gap-2 shadow-sm">
          <svg className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-xs font-semibold text-red-800 dark:text-red-300 leading-tight">{pgnError}</span>
        </div>
      )}

      <textarea
        className="w-full lg:flex-1 min-h-[80px] lg:max-h-40 shrink p-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg font-mono text-sm sm:text-xs
          resize-none focus:ring-2 focus:ring-[#4a7c59]/30 focus:border-[#4a7c59] focus:outline-none
          transition-all text-gray-700 dark:text-slate-200 placeholder-gray-400 dark:placeholder-slate-400"
        placeholder={`Paste your PGN here…\n\ne.g.  1. e4 e5 2. Nf3 Nc6 ...`}
        value={pgn}
        onChange={(e) => setPgn(e.target.value)}
        disabled={disabled}
      />

      <button
        onClick={() => onAnalyze(pgn)}
        disabled={disabled || !engineReady || !pgn.trim()}
        className={`mt-2 shrink-0 w-full active:scale-[0.98] text-white py-2 px-3 rounded-lg transition-all text-sm disabled:opacity-40 disabled:cursor-not-allowed shadow-sm
          ${isChess960 ? 'bg-orange-500 hover:bg-orange-600' : 'font-bold bg-[#4a7c59] hover:bg-[#3d6b4a]'}`}
      >
        {disabled ? 'Analyzing…' : (isChess960 ? (
          <span>Start <span className="font-black tracking-wide">Chess960</span> Review</span>
        ) : 'Start Review')}
      </button>

      <div className="mt-3 flex-1 flex flex-col shrink-0 lg:shrink">
        <GameImport onAnalyze={onAnalyze} />
      </div>

      <div className="mt-2 shrink-0 w-full flex flex-row gap-3">
        {/* Study Area */}
        <div 
          onClick={handleOpenLearnModal}
          className="flex-1 border-2 border-dashed border-gray-300 dark:border-slate-700 hover:border-[#4a7c59] dark:hover:border-[#4a7c59] bg-gray-50/50 dark:bg-slate-800/50 hover:bg-[#4a7c59]/5 dark:hover:bg-[#4a7c59]/10 rounded-lg p-3 sm:p-4 text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[70px]"
        >
          <svg className="w-6 h-6 text-gray-400 dark:text-slate-500 mb-1" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.477 2 2 6.477 2 12c0 5.522 4.477 10 10 10s10-4.478 10-10C22 6.477 17.523 2 12 2zm1 14h-2v-2h2v2zm0-4h-2V7h2v5z"/>
          </svg>
          <span className="text-sm font-bold text-gray-600 dark:text-slate-400 leading-tight">
            Learn
          </span>
          <span className="text-[10px] font-semibold text-gray-400 dark:text-slate-500 mt-1">
            Import Lichess Study
          </span>
        </div>

        {/* CGE Area */}
        <div 
          className={`flex-1 border-2 border-dashed rounded-lg p-3 sm:p-4 text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[70px]
            ${isDragging ? 'border-[#4a7c59] bg-[#4a7c59]/10' : 'border-gray-300 dark:border-slate-700 hover:border-gray-400 dark:hover:border-slate-500 bg-gray-50/50 dark:bg-slate-800/50'}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
          }}
          onClick={() => document.getElementById('cge-upload').click()}
        >
          <input 
            type="file" 
            id="cge-upload" 
            className="hidden" 
            accept=".cge" 
            onChange={(e) => {
              if (e.target.files[0]) handleFile(e.target.files[0]);
              e.target.value = ''; // Reset to allow same file again
            }} 
          />
          <svg className="w-6 h-6 text-gray-400 dark:text-slate-500 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          <span className="text-sm font-bold text-gray-600 dark:text-slate-400 leading-tight">
            Load .cge file
          </span>
          <span className="text-[10px] font-semibold text-gray-400 dark:text-slate-500 mt-1">
            Drag & Drop to browse
          </span>
        </div>
      </div>

      {/* Lichess Study Modal Overlay */}
      {isStudyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-100 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50">
              <h3 className="text-xl font-bold text-gray-800 dark:text-slate-200 flex items-center gap-3">
                <svg className="w-6 h-6 text-[#4a7c59]" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12c0 5.522 4.477 10 10 10s10-4.478 10-10C22 6.477 17.523 2 12 2zm1 14h-2v-2h2v2zm0-4h-2V7h2v5z"/></svg>
                Import Lichess Study
              </h3>
              <button 
                onClick={handleCloseLearnModal}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors p-1"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <form onSubmit={handleStudySubmit} className="p-6">
              <label className="block text-sm font-semibold text-gray-600 dark:text-slate-400 mb-2">
                Paste your Lichess Study URL
              </label>
              <input
                type="url"
                autoFocus
                required
                value={studyUrl}
                onChange={(e) => setStudyUrl(e.target.value)}
                placeholder="e.g. https://lichess.org/study/vR4s213G/9p1d0rZ2"
                className="w-full bg-white dark:bg-slate-900 border-2 border-gray-200 dark:border-slate-700 rounded-xl p-4 text-base focus:ring-4 focus:ring-[#4a7c59]/20 focus:border-[#4a7c59] focus:outline-none transition-all text-gray-800 dark:text-slate-200 mb-6 shadow-inner"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleCloseLearnModal}
                  className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-xl text-base font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!studyUrl.trim()}
                  className="flex-1 px-4 py-3 bg-[#4a7c59] hover:bg-[#3d6b4a] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-base font-bold transition-all shadow-md active:scale-95"
                >
                  Start Learning
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}