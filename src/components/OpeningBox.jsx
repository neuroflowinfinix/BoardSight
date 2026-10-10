import React, { useState } from 'react';
import EvalBadge from './EvalBadge';

export default function OpeningBox({ gameInfo, analyzedMoves, whiteLabel = 'White', blackLabel = 'Black', isCollapsible = false, startCollapsed = false }) {
  const [isCollapsed, setIsCollapsed] = useState(startCollapsed);

  React.useEffect(() => {
    setIsCollapsed(startCollapsed);
  }, [startCollapsed]);

  const bookMoves = analyzedMoves.filter(m => m.isBookMove);
  const whiteBook = bookMoves.filter(m => m.color === 'w');
  const blackBook = bookMoves.filter(m => m.color === 'b');

  const whiteOp = gameInfo?.whiteOpeningInfo;
  const blackOp = gameInfo?.blackOpeningInfo;

  if (!whiteOp && !blackOp && bookMoves.length === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm px-2.5 py-1.5">
      {/* Header row */}
      <div 
        className={`flex items-center justify-between pb-1 border-b border-gray-50 dark:border-slate-800/60 mb-2 ${isCollapsible ? 'cursor-pointer select-none' : ''}`}
        onClick={() => { if (isCollapsible) setIsCollapsed(!isCollapsed); }}
      >
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 shrink-0"><EvalBadge type="book" /></div>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-slate-400 leading-none mt-0.5">Opening</p>
        </div>
        {isCollapsible && (
          <button className="p-0.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-md transition-colors text-gray-500">
            <svg className={`w-4 h-4 transform transition-transform ${isCollapsed ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>

      <div className={`grid grid-cols-2 lg:grid-cols-1 gap-2.5 lg:gap-3 transition-all duration-300 ease-in-out ${
        isCollapsed ? 'max-h-0 opacity-0 overflow-hidden' : 'max-h-[500px] opacity-100'
      }`}>
        
        {/* ── WHITE SECTION ── */}
        <div className="flex flex-col gap-1.5">
          {/* White Opening Name */}
          {whiteOp && (
            <div className="flex items-start gap-1.5 mb-1 mt-0.5">
              <div className="w-3.5 h-3.5 shrink-0 inline-flex mt-0.5"><EvalBadge type="book" /></div>
              <h4 className="text-sm font-bold text-gray-900 dark:text-slate-100 leading-tight">
                {whiteOp.opening}
              </h4>
              {whiteOp.variation && <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5 leading-snug">{whiteOp.variation}</p>}
            </div>
          )}
          
          {/* White Stats */}
          <div className="flex-1 bg-gray-50 dark:bg-slate-800 rounded-lg px-2.5 py-2 border border-gray-100 dark:border-slate-700 flex flex-col">
            <div className="flex items-center gap-1.5 mb-1.5">
              {gameInfo?.whiteUrl ? (
                <img
                  src={gameInfo.whiteUrl}
                  alt="White"
                  className="w-6 h-6 rounded-sm object-cover shrink-0 shadow-sm"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : (
                <span className="w-5 h-5 rounded-full bg-white border-2 border-gray-300
                  flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5 text-gray-700" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 3v2H7v2h2v1H5l-1 5h1l1 3h12l1-3h1l-1-5h-4V7h2V5h-2V3H9z" />
                  </svg>
                </span>
              )}
              <span className="text-sm font-bold text-gray-800 dark:text-slate-200 truncate flex items-center">
                {gameInfo?.whiteTitle && <span className="text-red-700 dark:text-red-400 font-black mr-1">{gameInfo.whiteTitle}</span>}
                {whiteLabel}
              </span>
            </div>
            <div className="text-xl font-black text-gray-800 dark:text-slate-100 leading-none">{whiteBook.length}</div>
            <div className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">book move{whiteBook.length !== 1 ? 's' : ''}</div>
            {whiteBook.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {whiteBook.slice(0, 6).map((m, i) => (
                  <span key={i} className="text-[11px] font-semibold bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 px-1.5 py-0.5 rounded-md border border-purple-100 dark:border-purple-700">
                    {m.san}
                  </span>
                ))}
                {whiteBook.length > 6 && <span className="text-[11px] text-gray-400 dark:text-slate-500">+{whiteBook.length - 6}</span>}
              </div>
            )}
          </div>
        </div>

        {/* ── BLACK SECTION ── */}
        <div className="flex flex-col gap-1.5">
          {/* Black Opening Name */}
          {blackOp && (
            <div className="flex items-start gap-1.5 mb-1 mt-0.5">
              <div className="w-3.5 h-3.5 shrink-0 inline-flex mt-0.5"><EvalBadge type="book" /></div>
              <h4 className="text-sm font-bold text-gray-900 dark:text-slate-100 leading-tight">
                {blackOp.opening}
              </h4>
              {blackOp.variation && <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5 leading-snug">{blackOp.variation}</p>}
            </div>
          )}
          
          {/* Black Stats */}
          <div className="flex-1 bg-gray-50 dark:bg-slate-700 rounded-lg px-2.5 py-2 border border-gray-100 dark:border-slate-600 flex flex-col">
            <div className="flex items-center gap-1.5 mb-1.5">
              {gameInfo?.blackUrl ? (
                <img
                  src={gameInfo.blackUrl}
                  alt="Black"
                  className="w-6 h-6 rounded-sm object-cover shrink-0 shadow-sm"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : (
                <span className="w-5 h-5 rounded-full bg-white dark:bg-slate-600 border-2 border-gray-300 dark:border-slate-400
                  flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5 text-gray-700 dark:text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 3v2H7v2h2v1H5l-1 5h1l1 3h12l1-3h1l-1-5h-4V7h2V5h-2V3H9z" />
                  </svg>
                </span>
              )}
              <span className="text-sm font-bold text-gray-800 dark:text-slate-200 truncate flex items-center">
                {gameInfo?.blackTitle && <span className="text-red-700 dark:text-red-300 font-black mr-1">{gameInfo.blackTitle}</span>}
                {blackLabel}
              </span>
            </div>
            <div className="text-xl font-black text-gray-800 dark:text-slate-100 leading-none">{blackBook.length}</div>
            <div className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">book move{blackBook.length !== 1 ? 's' : ''}</div>
            {blackBook.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {blackBook.slice(0, 6).map((m, i) => (
                  <span key={i} className="text-[11px] font-semibold bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded-md border border-purple-100 dark:border-purple-700">
                    {m.san}
                  </span>
                ))}
                {blackBook.length > 6 && <span className="text-[11px] text-slate-400 dark:text-slate-500">+{blackBook.length - 6}</span>}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}