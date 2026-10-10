import React, { useRef, useEffect } from 'react';

export default function StudyBar({
  studyTitle,
  chapters = [],
  currentChapterIndex = 0,
  currentMoveIndex = -1,
  totalMoves = 0,
  onSelectChapter,
  onExitStudy,
}) {
  const currentChapter = chapters[currentChapterIndex] || null;
  const hasMultipleChapters = chapters.length > 1;
  const isLastChapter = currentChapterIndex >= chapters.length - 1;
  const activeChapterRef = useRef(null);

  // Auto-scroll to the active chapter in the list
  useEffect(() => {
    if (activeChapterRef.current) {
      activeChapterRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [currentChapterIndex]);

  // Progress calculation
  const progress = totalMoves > 0 ? Math.max(0, Math.min(100, ((currentMoveIndex + 1) / totalMoves) * 100)) : 0;
  const isAtEnd = totalMoves > 0 && currentMoveIndex >= totalMoves - 1;

  return (
    <div className="w-full h-full flex flex-col rounded-2xl overflow-hidden shadow-md border border-orange-200/60 dark:border-orange-900/50 transition-all">
      
      {/* Top Section: Study Info + Controls */}
      <div className="bg-gray-50 dark:bg-slate-800 px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          
          {/* Left: Study Badge & Title */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="flex flex-col min-w-0 flex-1 gap-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-[#4a7c59] dark:text-emerald-400 bg-[#4a7c59]/8 dark:bg-emerald-950/60 px-1.5 py-[1px] rounded-md border border-[#4a7c59]/15 dark:border-emerald-800/50 leading-tight">
                  Study
                </span>
                {hasMultipleChapters && (
                  <span className="text-[11px] text-gray-400 dark:text-slate-500 font-semibold">
                    {chapters.length} chapters
                  </span>
                )}
              </div>
              <h1 className="text-[15px] font-bold text-gray-800 dark:text-slate-100 truncate leading-tight">
                {studyTitle || 'Chess Study'}
              </h1>
            </div>
          </div>

          {/* Right: Exit Button */}
          <button
            onClick={onExitStudy}
            className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-gray-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 bg-white/60 hover:bg-red-50 dark:bg-slate-700/50 dark:hover:bg-red-950/40 border border-gray-200/60 dark:border-slate-600/50 rounded-xl transition-all active:scale-95 shadow-sm backdrop-blur-sm"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span className="hidden sm:inline">Exit</span>
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      {totalMoves > 0 && (
        <div className="relative h-1 bg-gray-100 dark:bg-slate-700/50">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#4a7c59] to-[#65b07a] dark:from-emerald-600 dark:to-emerald-400 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
          {progress > 0 && progress < 100 && (
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"
              style={{ width: `${progress}%` }}
            />
          )}
        </div>
      )}

      {/* Chapter List (always visible, scrollable) */}
      {hasMultipleChapters && (
        <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-t border-gray-100/80 dark:border-slate-700/50 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
          {chapters.map((ch, idx) => {
            const isActive = idx === currentChapterIndex;
            return (
              <button
                key={ch.chapterId || idx}
                ref={isActive ? activeChapterRef : null}
                onClick={() => onSelectChapter(idx)}
                className={`w-full text-left px-3 py-2 flex items-center gap-2.5 transition-all border-b border-gray-50 dark:border-slate-700/30 last:border-b-0 ${
                  isActive
                    ? 'bg-[#4a7c59]/8 dark:bg-emerald-900/25'
                    : 'hover:bg-gray-50 dark:hover:bg-slate-700/40'
                }`}
              >
                {/* Chapter number badge */}
                <span className={`text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-md shrink-0 transition-colors ${
                  isActive
                    ? 'bg-[#4a7c59] text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-slate-500'
                }`}>
                  {idx + 1}
                </span>

                {/* Chapter title */}
                <span className={`text-[14px] flex-1 truncate transition-colors ${
                  isActive
                    ? 'font-bold text-[#4a7c59] dark:text-emerald-400'
                    : 'font-medium text-gray-600 dark:text-slate-300'
                }`}>
                  {ch.title || `Chapter ${idx + 1}`}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* End of Chapter: Next Chapter CTA */}
      {isAtEnd && !isLastChapter && (
        <div className="bg-gradient-to-r from-[#4a7c59]/5 via-[#4a7c59]/10 to-[#4a7c59]/5 dark:from-emerald-900/20 dark:via-emerald-800/30 dark:to-emerald-900/20 border-t border-[#4a7c59]/15 dark:border-emerald-800/30 px-3 py-2.5">
          <button
            onClick={() => onSelectChapter(currentChapterIndex + 1)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-[#4a7c59] to-[#3d6b4a] hover:from-[#3d6b4a] hover:to-[#345c40] text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.98] group"
          >
            <span>Next Chapter: {chapters[currentChapterIndex + 1]?.title || `Chapter ${currentChapterIndex + 2}`}</span>
            <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
