import React from 'react';

export default function AboutModal({ isOpen, onClose }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm lg:max-w-xl border border-gray-100 dark:border-slate-700 overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="bg-violet-50 dark:bg-slate-800 px-6 py-5 border-b border-violet-100 dark:border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="bg-violet-200 dark:bg-violet-900/30 p-1.5 rounded-lg">
                            <svg className="w-5 h-5 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h2 className="text-lg font-black text-violet-900 dark:text-slate-100 tracking-tight">About BoardSight</h2>
                    </div>
                    <button onClick={onClose} className="text-violet-400 dark:text-slate-500 hover:text-violet-700 dark:hover:text-slate-300 bg-violet-100/50 dark:bg-slate-700/50 hover:bg-violet-200 dark:hover:bg-slate-700 p-1.5 rounded-full transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 bg-white dark:bg-slate-900 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    <div className="flex flex-col gap-4">
                        <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed font-medium">
                            Welcome to <span className="font-bold text-violet-600 dark:text-violet-400">BoardSight!</span> While many other platforms heavily restrict comprehensive game reviews and lock powerful analysis tools behind strict paywalls, our mission is to provide you with top-tier chess insights completely free.
                        </p>
                        
                        <div className="bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl p-4 shadow-sm">
                            <h3 className="font-bold text-gray-800 dark:text-slate-200 text-sm mb-2 flex items-center gap-2">
                                <svg className="w-4 h-4 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                                Our Superiority
                            </h3>
                            <p className="text-[13px] text-gray-600 dark:text-slate-400 leading-relaxed font-medium">
                                We pride ourselves on the superiority of our platform. Enjoy highly configurable analysis settings that you control. All of our features are fully available to every user right out of the box, ensuring you have the absolute best tools to learn, analyze, and master your games.
                            </p>
                        </div>

                        <div className="bg-violet-50/50 dark:bg-violet-900/10 border border-violet-100 dark:border-violet-800/30 rounded-xl p-4 shadow-sm">
                            <h3 className="font-bold text-violet-800 dark:text-violet-300 text-sm mb-2 flex items-center gap-2">
                                <svg className="w-4 h-4 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                </svg>
                                Spread the Word
                            </h3>
                            <p className="text-[13px] text-gray-700 dark:text-slate-300 leading-relaxed font-medium">
                                We rely 100% on the chess community to help us grow. We're expanding rapidly, but for now, we're still a bit of a hidden gem! If you enjoy analyzing your games here, please feel free to share BoardSight with your friends and fellow players.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}