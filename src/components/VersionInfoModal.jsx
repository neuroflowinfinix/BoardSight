import React from 'react';

export default function VersionInfoModal({ isOpen, onClose }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm lg:max-w-xl border border-gray-100 dark:border-slate-700 overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="bg-sky-50 dark:bg-slate-800 px-6 py-5 border-b border-sky-100 dark:border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="bg-sky-200 dark:bg-sky-900/30 p-1.5 rounded-lg">
                            <svg className="w-5 h-5 text-sky-600 dark:text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h2 className="text-lg font-black text-sky-900 dark:text-slate-100 tracking-tight">Version Info</h2>
                    </div>
                    <button onClick={onClose} className="text-sky-400 dark:text-slate-500 hover:text-sky-700 dark:hover:text-slate-300 bg-sky-100/50 dark:bg-slate-700/50 hover:bg-sky-200 dark:hover:bg-slate-700 p-1.5 rounded-full transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 bg-white dark:bg-slate-900 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    <div className="flex flex-col gap-4">
                        <div className="bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl p-4 shadow-sm text-center">
                            <h3 className="font-bold text-gray-800 dark:text-slate-200 text-lg mb-2">
                                Current Version
                            </h3>
                            <p className="text-xl text-sky-600 dark:text-sky-400 font-black">
                                Version 23.3.1
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
