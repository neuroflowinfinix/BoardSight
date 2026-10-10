import React from 'react';

export default function BugFixesModal({ isOpen, onClose }) {
    if (!isOpen) return null;

    // Array containing bug fix records
    const bugFixes = [
        { date: "2026-10-03", source: "Developer", desc: "Patched engine logic for quick loading." },
        { date: "2026-10-01", source: "Developer", desc: "Added a play button in current move display to play moves of game." },
        { date: "2026-10-01", source: "Developer", desc: "Calibrated the accuracy and elo calculations for better results, while also refining move classifications." },
        { date: "2026-09-25", source: "Developer", desc: "Added Stockfish 19." },
        { date: "2026-07-23", source: "Developer", desc: "Fixed text formatting logic to accurately bold and highlight key chess notations." },
        { date: "2026-07-21", source: "Developer", desc: "Patched move repetition feedback loop to prevent duplicate explanations." },
        { date: "2026-07-18", source: "Developer", desc: "Synchronized evaluation badges and icon states with live engine playback." },
        { date: "2026-07-10", source: "Developer", desc: "Fixed engine loading issues, added simultaneous explanation generation and loading for custom edits." },
        { date: "2026-07-09", source: "Developer", desc: "Fixed UI resizing due to captured pieces." },
        { date: "2026-07-07", source: "User Suggestion", desc: "Improved opening explanations." },
        { date: "2026-06-11", source: "Developer", desc: "Fixed share link corruption — encoding and decoding moved fully client-side (no server roundtrip). Links now generate instantly and load reliably with zero API dependency." },
        { date: "2026-06-11", source: "Developer", desc: "Added player score and captured pieces." },
        { date: "2026-06-10", source: "User Suggestion", desc: "Added position eval in move bar." },
        { date: "2026-06-09", source: "Developer", desc: "Fixed issue where move sounds played multiple times due to background engine evaluations continuously retriggering sound hooks. Fixed using move signatures to deduplicate sound events." },
        { date: "2026-06-05", source: "Developer", desc: "Fixed UI zoom/jitter on tablets during analysis. Root causes: (1) replaced unstable 100vh board sizing with 100svh (small viewport height, unaffected by browser chrome); (2) added CSS-level touch-action and text-size-adjust to prevent iOS auto-scaling; (3) smoothed AnalysisProgress bar appearance with max-height transition to eliminate layout shift." },
        { date: "2026-06-04", source: "Developer", desc: "v21.7.9 — Removed Lc0 engine (WASM performance constraints). Analysis is now powered exclusively by Stockfish 18 and Berserk v4.3.0. Minor engine stability improvements." },
        { date: "2026-06-04", source: "Developer", desc: "Minor enhancements in uci/uciok handling for Berserk, integrated auto hash setting for engines to improve speed and performance." },
        { date: "2026-05-30", source: "Developer", desc: "Minor enhancements in coach logic." },
        { date: "2026-05-28", source: "Developer", desc: "Fixed compatibility and caching issues occuring on some devices." },
        { date: "2026-05-26", source: "Developer", desc: "Added new classes to more section for better organization and support, integration of new engine : Berserk v4.3.0 (experimental)" },
        { date: "2026-05-25", source: "User Suggestion", desc: "Fixed player header colours, reduced footer size and NaN returns regarding missing elo." },
        { date: "2026-05-23", source: "Developer", desc: "Increased moves box height for phone screens, minor improvements in  coach explanations and finalised engine playback with an idle state." },
        { date: "2026-05-22", source: "Developer", desc: "Added multiple engine lines feature as per selected multipv in settings." },
        { date: "2026-05-21", source: "Developer", desc: "Implemented system-wide Dark Mode, carefully ensuring perfect contrast across all analysis components." },
        { date: "2026-05-18", source: "Developer", desc: "Various UI and QoL improvements:\n1. Prevented board auto-jump after analysis completes\n2. Added scroll support to coach explanation box\n3. Added animated accuracy rings and an interactive game graph with tooltips to the Summary Panel\n4. Implemented time-aware dynamic welcome messages" },
        { date: "2026-05-16", source: "Developer", desc: "Restructured UI exclusively for accesibility in PC screens, fixed incomplete engine lines in phone screens." },
        { date: "2026-05-14", source: "Developer", desc: "Upgraded the coach explanation to v6.2" },
        { date: "2026-05-13", source: "Developer", desc: "Improved UI for PC screens." },
        { date: "2026-05-12", source: "Developer", desc: "Moved flip board functionality to a more accessible location." },
        { date: "2026-05-12", source: "User - Sergio Daroca Fernández", desc: "Fixed issue with piece transparency- Monarchy piece set." },
        { date: "2026-05-02", source: "Developer", desc: "Adding animation to coach icon." },
        { date: "2026-04-30", source: "Developer", desc: "Piece set addition and Improvement of game explanations." },
        { date: "2026-04-26", source: "Developer", desc: "Major UI restructuring" },
        { date: "2026-04-26", source: "Developer", desc: "Redrawing of UI components, that caused rendering issues and significant lag.\n\n1. Explanation Text Truncation\n2. Move Box Grid Misalignment\n3. Engine Playback Highlighting the\n   Wrong Squares" },
        { date: "2026-04-25", source: "Developer", desc: "Instantaneous loading of book moves in fraction of sec during game analysis" },
        { date: "2026-04-23", source: "User Suggestion", desc: "Improved the discounting method for better representation of player's average strength." },
        { date: "2026-04-20", source: "User Suggestion", desc: "Resolved elo estimation bug for specific edge cases." },
        { date: "2026-04-18", source: "Developer", desc: "Patched PGN parsing timestamp overflow." },
        { date: "2026-04-10", source: "Developer", desc: "Fixed Stockfish evaluation display rendering." }
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
            {/* Modal */}
            <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm lg:max-w-2xl border border-gray-100 dark:border-slate-700 overflow-hidden" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="bg-red-50 dark:bg-slate-800 px-6 py-5 border-b border-red-100 dark:border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="bg-red-200 dark:bg-red-900/30 p-1.5 rounded-lg">
                            <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.246.623.518 1.554.913-.457a1 1 0 11.894 1.79l-1.324.662L17 12v.5a1 1 0 11-2 0V12l-.226-1.13-1.638.819L14 13.5a1 1 0 11-2 0v-1.118l-2 .999v2.296a1 1 0 11-2 0v-2.296l-2-.999V13.5a1 1 0 11-2 0l.864-1.811-1.638-.819L5 12v.5a1 1 0 11-2 0V12l-.224-1.118-1.324-.662a1 1 0 01.894-1.79l.913.457.518-1.554-1.246-.623a1 1 0 11.894-1.79l1.599.8L9 4.323V3a1 1 0 011-1zm-1 6.845V13.5a.5.5 0 001 0V8.845l2-1V6.323L9 7.5 5 5.9v1.946l4 2z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <h2 className="text-lg font-black text-red-900 dark:text-slate-100 tracking-tight">Bug Fixes & Improvements</h2>
                    </div>
                    <button onClick={onClose} className="text-red-400 dark:text-slate-500 hover:text-red-700 dark:hover:text-slate-300 bg-red-100/50 dark:bg-slate-700/50 hover:bg-red-200 dark:hover:bg-slate-700 p-1.5 rounded-full transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="px-6 py-4 max-h-[60vh] overflow-y-auto bg-white dark:bg-slate-900">
                    <p className="text-sm text-gray-600 dark:text-slate-400 font-medium mb-4 leading-relaxed">
                        A log of recent squashings to keep the website running smoothly...
                    </p>

                    <div className="flex flex-col gap-6">
                        {(() => {
                            const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
                            // Group fixes by month while preserving order
                            const grouped = [];
                            const seen = {};
                            bugFixes.forEach(fix => {
                                const [y, m] = fix.date.split('-');
                                const key = `${y}-${m}`;
                                if (!seen[key]) {
                                    seen[key] = { label: `${monthNames[parseInt(m, 10) - 1]} ${y}`, items: [] };
                                    grouped.push(seen[key]);
                                }
                                seen[key].items.push(fix);
                            });
                            return grouped.map((group, gi) => (
                                <div key={gi} className="flex flex-col gap-2.5">
                                    {/* Month header */}
                                    <div className="flex items-center gap-2.5 sticky top-0 z-10 bg-white dark:bg-slate-900 py-1">
                                        <span className="text-xs font-black text-red-600 dark:text-red-400 uppercase tracking-widest whitespace-nowrap">{group.label}</span>
                                        <div className="flex-1 h-px bg-red-200/60 dark:bg-red-800/40" />
                                        <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500">{group.items.length}</span>
                                    </div>
                                    {/* Entries for this month */}
                                    {group.items.map((fix, fi) => (
                                        <div key={fi} className="flex flex-col gap-1 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-600 p-3 rounded-xl hover:border-red-200 dark:hover:border-red-500 transition-colors shadow-sm">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-black text-red-500 dark:text-red-400/70 uppercase tracking-wider">{fix.date}</span>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${fix.source === 'Developer' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'}`}>
                                                    {fix.source}
                                                </span>
                                            </div>
                                            <p className="text-sm font-bold text-gray-800 dark:text-slate-200 leading-tight mt-1 whitespace-pre-wrap">{fix.desc}</p>
                                        </div>
                                    ))}
                                </div>
                            ));
                        })()}
                    </div>
                </div>

            </div>
        </div>
    );
}