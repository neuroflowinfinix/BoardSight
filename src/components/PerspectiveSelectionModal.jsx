import React, { useEffect } from 'react';

export default function PerspectiveSelectionModal({ isOpen, onSelect, gameInfo }) {
  if (!isOpen) return null;

  // Render player avatar based on gameInfo (copied from OpeningBox logic)
  const renderAvatar = (url) => {
    if (url) {
      return (
        <img
          src={url}
          alt="Avatar"
          className="w-10 h-10 rounded-md object-cover shadow-sm"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
      );
    }
    return (
      <span className="w-10 h-10 rounded-full bg-white dark:bg-slate-600 border-2 border-gray-300 dark:border-slate-400 flex items-center justify-center shrink-0">
        <svg className="w-5 h-5 text-gray-700 dark:text-white" viewBox="0 0 24 24" fill="currentColor">
          <path d="M9 3v2H7v2h2v1H5l-1 5h1l1 3h12l1-3h1l-1-5h-4V7h2V5h-2V3H9z" />
        </svg>
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-850 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-200 dark:border-slate-700 animate-in fade-in zoom-in duration-200">
        <div className="p-6">
          <h2 className="text-2xl font-black text-gray-800 dark:text-slate-100 text-center mb-2">
            Select Your Perspective
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 text-center mb-6">
            Who should the coach talk to?
          </p>

          <div className="flex flex-col gap-4">
            {/* White Button */}
            <button
              onClick={() => onSelect('w')}
              className="flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-slate-800 transition-all text-left group"
            >
              {renderAvatar(gameInfo?.whiteUrl)}
              <div className="flex-1">
                <div className="text-lg font-bold text-gray-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center">
                  {gameInfo?.whiteTitle && <span className="text-red-600 dark:text-red-400 mr-1 text-sm">{gameInfo.whiteTitle}</span>}
                  {gameInfo?.white || 'White'}
                </div>
                <div className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">
                  Played as White
                </div>
              </div>
            </button>

            {/* Black Button */}
            <button
              onClick={() => onSelect('b')}
              className="flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-slate-800 transition-all text-left group"
            >
              {renderAvatar(gameInfo?.blackUrl)}
              <div className="flex-1">
                <div className="text-lg font-bold text-gray-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center">
                  {gameInfo?.blackTitle && <span className="text-red-600 dark:text-red-400 mr-1 text-sm">{gameInfo.blackTitle}</span>}
                  {gameInfo?.black || 'Black'}
                </div>
                <div className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">
                  Played as Black
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
