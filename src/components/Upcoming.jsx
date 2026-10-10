import React from 'react';

export default function Upcoming({ isOpen, onClose }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-md" onClick={onClose} />
            
            <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 w-full max-w-[500px] lg:max-w-[700px] max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-slate-700" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-300 transition-colors bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 p-1.5 rounded-full">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <h2 className="text-xl md:text-2xl font-black text-gray-800 dark:text-slate-100 mb-6 border-b border-gray-100 dark:border-slate-700 pb-3 flex items-center gap-2">
                    <span className="text-2xl md:text-3xl">🚀</span> Upcoming Features
                </h2>

                <div className="mb-4 bg-gray-50 dark:bg-slate-800 p-5 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm">
                    <h3 className="text-amber-500 dark:text-amber-400 font-black text-xl mb-1 flex items-center gap-1.5">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        Roadmap
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mb-4 ml-8 font-medium">
                        (Reach me for feature requests, see Community and Contact in More)
                    </p>
                    <ol className="text-[14px] text-gray-700 dark:text-slate-300 space-y-3 font-medium list-decimal list-inside pl-1">
                        <li>Featured study lessons with curated game explanations.</li>
                        <li>Opening Explorer & Master Database.</li>
                        <li>User Accounts & Cloud Sync ☁️.</li>
                        <li>Position Setup / Board Editor.</li>
                        <li>Position complexity: based on the number of moves available on the board.</li>
                    </ol>
                </div>

                <div className="mt-5 flex flex-col items-center shrink-0 gap-2">
                    <button onClick={onClose} className="w-full bg-[#4a7c59] hover:bg-[#3a6346] text-white font-bold py-2.5 rounded-xl transition-colors shadow-sm">
                        Got it !
                    </button>
                </div>

            </div>
        </div>
    );
}