import React from 'react';

export default function AnalysisInfoModal({ isOpen, onClose }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm lg:max-w-2xl border border-gray-100 dark:border-slate-700 overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="bg-teal-50 dark:bg-slate-800 px-6 py-5 border-b border-teal-100 dark:border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="bg-teal-200 dark:bg-teal-900/30 p-1.5 rounded-lg">
                            <svg className="w-5 h-5 text-teal-600 dark:text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
                            </svg>
                        </div>
                        <h2 className="text-lg font-black text-teal-900 dark:text-slate-100 tracking-tight">Game Analysis</h2>
                    </div>
                    <button onClick={onClose} className="text-teal-400 dark:text-slate-500 hover:text-teal-700 dark:hover:text-slate-300 bg-teal-100/50 dark:bg-slate-700/50 hover:bg-teal-200 dark:hover:bg-slate-700 p-1.5 rounded-full transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 bg-white dark:bg-slate-900 max-h-[60vh] overflow-y-auto">
                    <div className="flex flex-col gap-4">
                        <p className="text-[13px] text-gray-700 dark:text-slate-300 leading-relaxed font-medium">
                            BoardSight supports best free and unlimited game analysis powered by Berserk v4.3.0 (experimental) and the industry-leading <span className="font-bold text-teal-600 dark:text-teal-400">Stockfish 18</span>. You can fully customize the engine's depth and calculation time per move through the settings menu.
                        </p>

                        <div className="flex flex-col gap-3">
                            <div className="bg-gray-50 dark:bg-slate-800 p-3 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm">
                                <h3 className="text-sm font-bold text-gray-800 dark:text-slate-200 mb-1">Live Evaluation & Insights</h3>
                                <p className="text-[12px] text-gray-600 dark:text-slate-400 font-medium leading-relaxed">
                                    Enable the "Engine Lines" feature to see real-time evaluations as you navigate the game. A hallmark of our app is the dynamic move explanation feature, which analyzes the exact board state and provides a game graph with distinct phase classifications.
                                </p>
                            </div>

                            <div className="bg-orange-50 dark:bg-orange-900/10 p-3 rounded-xl border border-orange-100 dark:border-orange-800/30 shadow-sm">
                                <h3 className="text-sm font-bold text-orange-800 dark:text-orange-400 mb-1 flex items-center gap-1.5">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    Performance Note
                                </h3>
                                <p className="text-[12px] text-orange-700 dark:text-orange-300 font-medium leading-relaxed">
                                    Higher engine depth or more time per move may slow down analysis, especially on older devices. Try lowering these parameters if you experience lag.
                                </p>
                            </div>
                        </div>

                        <p className="text-[13px] text-gray-700 dark:text-slate-300 leading-relaxed font-bold mt-1 text-center">
                            Don't forget: You can share your game directly with friends after the analysis is complete!
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}