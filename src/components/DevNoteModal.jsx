import React from 'react';

export default function DevNoteModal({ isOpen, onClose }) {
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
                    <span>🍁</span> Developer's Note
                </h2>

                <div className="text-green-700 dark:text-green-400 font-bold text-center text-[15px] mb-6 leading-relaxed bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-100 dark:border-green-800/30 shadow-sm">
                    <p>We are committed to improve your experience.</p>
                    <p>Keep learning! Keep improving!</p>
                </div>



            </div>
        </div>
    );
}