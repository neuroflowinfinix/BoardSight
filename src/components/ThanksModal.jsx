import React from 'react';

export default function ThanksModal({ isOpen, onClose }) {
    if (!isOpen) return null;

    const contributions = 
    [
                {
            name: "ItzEpicSpin",
            items: [
                "Suggestion for improving explanations and box UI",
                "Critical findings in opening explanations",
                "Fork engine lines feature debugging"
            ]
        },
        {
            name: "Sergio Daroca Fernández",
            items: [
                "Piece sets : Maya-4 and Trinity-4",
                "Stateless URL Sharing Link",
                "Suggestions for customised share game feature"
            ]
        },
        {
            name: "Other Contributions by Users",
            items: [
                "Helping for dark theme support.",
                "PGN timestamp integration.",
                "Elo estimation improvement.",
                "Suggestions on opening database features."
            ]
        }
    ];

    const credits = [
        {
            name: "lichess.org  (lila)",
            description: "For high quality audio assets."
        },
        {
            name: "lichess.org  (opening-explorer)",
            description: "For their comprehensive opening explorer and database, which serves as a backbone for our opening analysis."
        },
        {
            name: "GitHub/nmrugg",
            description: "For providing Stockfish-18 lite to the community."
        },
        {
            name: "GitHub/franciscoBSalgueiro",
            description: "For great, blunder move classifications."
        },
        {
            name: "GitHub/T-Julsgaard",
            description: "For better calibrations with the review."
        },
        {
            name: "GitHub/neuroflowinfinix",
            description: "Berserk engine under 150 KB."
        }
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm lg:max-w-xl border border-gray-100 dark:border-slate-700 overflow-hidden" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="bg-pink-50 dark:bg-slate-800 px-6 py-5 border-b border-pink-100 dark:border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="bg-pink-200 dark:bg-pink-900/30 p-1.5 rounded-lg">
                            <svg className="w-5 h-5 text-pink-600 dark:text-pink-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <h2 className="text-lg font-black text-pink-900 dark:text-slate-100 tracking-tight">Special Thanks!</h2>
                    </div>
                    <button onClick={onClose} className="text-pink-400 dark:text-slate-500 hover:text-pink-700 dark:hover:text-slate-300 bg-pink-100/50 dark:bg-slate-700/50 hover:bg-pink-200 dark:hover:bg-slate-700 p-1.5 rounded-full transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="px-6 py-4 max-h-[60vh] overflow-y-auto bg-white dark:bg-slate-900">
                    <p className="text-sm text-gray-600 dark:text-slate-400 font-medium mb-4 leading-relaxed">
                        BoardSight is built for the community, shaped by the community. A huge thank you to everyone who has suggested features and helped improve the tool!
                    </p>

                    <h3 className="text-[13px] font-black text-pink-800 dark:text-pink-400 uppercase tracking-wider mb-3">
                        User Contributions:
                    </h3>

                    <div className="flex flex-col gap-4">
                        {contributions.map((group, groupIndex) => (
                            <div key={groupIndex} className="flex flex-col gap-2.5">
                                <h4 className="text-base font-black text-pink-700 dark:text-pink-300 mb-1">{group.name}</h4>
                                {group.items.map((feature, i) => (
                                    <div key={`${groupIndex}-${i}`} className="flex items-center gap-3 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-600 p-3 rounded-xl hover:border-pink-200 dark:hover:border-pink-500 transition-colors shadow-sm">
                                        <div className="w-8 h-8 rounded-full bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 flex items-center justify-center font-black text-sm shrink-0 border border-pink-200 dark:border-pink-800/50">
                                            {i + 1}
                                        </div>
                                        <p className="text-sm font-bold text-gray-800 dark:text-slate-200 leading-tight">{feature}</p>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>

                    <h3 className="text-[13px] font-black text-pink-800 dark:text-pink-400 uppercase tracking-wider mb-3 mt-6">
                        Credits & Acknowledgments:
                    </h3>

                    <div className="flex flex-col gap-2.5">
                        {credits.map((credit, i) => (
                            <div key={i} className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 p-3 rounded-xl hover:border-blue-300 dark:hover:border-blue-700 transition-colors shadow-sm">
                                <p className="text-sm font-bold text-blue-900 dark:text-blue-300 mb-1">{credit.name}</p>
                                <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">{credit.description}</p>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}