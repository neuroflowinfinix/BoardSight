import React from 'react';

export default function WhatsNew({ onClose }) {
    return (
        <>
            {/* ── Main "What's New" Modal ── */}
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 md:p-8 w-[90vw] sm:w-[600px] md:w-[640px] mx-4 relative flex flex-col min-h-[450px] max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-slate-700" onClick={e => e.stopPropagation()}>
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-300 transition-colors bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 p-1.5 rounded-full">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    <h2 className="text-xl md:text-2xl font-black text-gray-800 dark:text-slate-100 mb-6 flex items-center gap-2">
                        <span className="text-2xl md:text-3xl">🎉</span> What's New
                    </h2>

                    <div className="space-y-4 flex-1">
                        {[
                            { title: "New Stockfish 19", new: true, desc: "The new Stockfish 19 release has been applied for analysis purposes, while also keeping Stockfish 18." },
                            { title: "Interactive Lichess Study Mode", icon: "📖", new: true, desc: "Paste any Lichess study link to load and study interactive chapters! Features chapter list scrolling, automatic chapter transition on completion, chapter intro notes, and opening database integration." },
                            { title: "Animated Coach Reactions", icon: "🎭", new: true, desc: "The coach now features dynamic, fully animated reactions that respond to your best moves and blunders!" },
                            { title: "Explanation Engine Upgrade", icon: "⚡", new: false, desc: "Refactored explainer logic. Integrated advanced positional trackers (rooks, streaks) for deeper analysis context." },
                            { title: "Repetition & Opening Logic", icon: "🔄", new: false, desc: "Enhanced move repetition detection. Added dynamic phrasing and randomized feedback for opening book moves." },
                            { title: "Bug Fixes & Polish", icon: "🐛", new: false, desc: "Squashed text formatting bugs, synced UI evaluation badges with the engine, and optimized tracker execution." },
                            { title: "Multi-engine integration", icon: "⚙️", new: false, desc: "Berserk v4.3.0 is available alongside Stockfish 18, select your preferred engine in settings." },
                            { title: "Live engine lines support", icon: "e4 e5...", new: false, desc: "Check the new engine-lines feature, toggle it on in settings during analysis." },
                            { title: "System-Wide Dark Mode", icon: "🌙", new: false, desc: "BoardSight now features a meticulously crafted dark mode! Perfect for late-night analysis sessions, it reduces eye strain while maintaining perfect contrast. Toggle it anytime from the settings." },
                            { title: "Minefield & Novelty Detection", icon: "💣", new: false, desc: "Detects highly complex positions where only one move works, and introduces the 'Novelty' badge for the exact move leaving opening theory." },
                            { title: "Advanced Coach Logic", icon: "🧠", new: false, desc: "The coach now understands positional geometry (forks, doubled/passed pawns) and profiles your time management in critical minefields." },
                            { title: "Smart PGN Validation", icon: "✅", new: false, desc: "No more generic errors. The engine now steps through your game and tells you exactly which move caused the PGN to break." }
                        ].map((feature, i) => (
                            <div key={i} className="flex flex-col gap-1.5 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-600 p-4 rounded-xl hover:border-blue-200 dark:hover:border-blue-500 transition-colors shadow-sm relative overflow-hidden">
                                {feature.new && <div className="absolute top-0 right-0 bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300 text-[10px] font-black px-2 py-1 rounded-bl-lg tracking-wider uppercase">NEW</div>}
                                <h3 className="font-bold text-gray-900 dark:text-slate-100 text-sm md:text-base flex items-center gap-2">
                                    <span>{feature.icon}</span> {feature.title}
                                </h3>
                                <p className="text-xs md:text-sm text-gray-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{feature.desc}</p>
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 p-4 rounded-2xl border-2 border-blue-200 dark:border-slate-600 bg-blue-50/40 dark:bg-blue-900/10 flex flex-col gap-4 shrink-0 shadow-sm">
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-200 text-center leading-relaxed">
                            You can suggest us with features you'd like to see in upcoming versions, please reach us out ! (details in Community and contact)
                        </p>
                        <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-xl border border-red-100 dark:border-slate-600 shadow-sm">
                            <h3 className="font-bold text-red-800 dark:text-red-300 text-sm mb-1 flex items-center gap-1.5">
                                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-[#ff0000]">
                                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                                </svg>
                                Watch the Intro!
                            </h3>
                            <p className="text-xs text-red-700 dark:text-red-400 mb-2.5 leading-relaxed">
                                Check out the quick introduction video to BoardSight to see it in action.
                            </p>
                            <a
                                href="https://youtu.be/hXViEPSIBbQ?si=1RMHmJrvB-V6TIKb"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 w-full bg-[#ff0000] hover:bg-[#cc0000] text-white font-bold py-2 rounded-lg text-xs transition-colors shadow-sm"
                            >
                                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                                </svg>
                                Watch on YouTube
                            </a>
                        </div>
                    </div>

                    <div className="mt-5 flex flex-col items-center shrink-0 gap-2">
                        <button onClick={onClose} className="w-full bg-[#4a7c59] hover:bg-[#3a6346] text-white font-bold py-2.5 rounded-xl transition-colors shadow-sm">
                            Awesome !
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
