import React from 'react';

export default function FAQModal({ isOpen, onClose }) {
    if (!isOpen) return null;

    const faqs = [
        { q: "How do I switch engines ?", a: "Engines can be selected between Berserk v4.3.0 and Stockfish 18 through the settings button." },
        { q: "How to see accuracy and game rating?", a: "For PC screens, the game summary UI has been moved to the Game Report button for better user experience, which appears after a game analysis is complete." },
        { q: "How to report an issue with the website I found?", a: "We recommend reporting issues and bugs on our Discord, while you may also report directly on our e-mail provided in community and contact." },
        { q: "How do I request a feature?", a: "Feature requests can be made at our Discord or through e-mail. We would like to mention you in the credits for the feature additions and bug discoveries, it's your choice if you'd like to opt out." },
        { q: "How can I change settings of my analysis?", a: "Engine depth and time per move can be changed through the settings button, additionally it allows you to change board theme and piece set." },
        { q: "Is dark mode available?", a: "Yes, dark theme is available and can be accessed through the settings button." },
        { q: "How do I toggle sounds off?", a: "Sounds can be turned off through the settings button." },
        { q: "How do I see engine lines?", a: "Live evaluation support and engine lines are available when engine lines have been toggled on through the settings button." },
        { q: "I find loading engine is stuck for long, what do I do?", a: "Try reloading the page and check your internet connection." },
        { q: "How do I share my reviewed game?", a: "Once analysis is complete, hit the Share button at the top. A compact link is instantly copied to your clipboard. Anyone who opens it will see your full game with evaluations, classifications, and coach explanations." }
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm lg:max-w-2xl border border-gray-100 dark:border-slate-700 overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="bg-amber-50 dark:bg-slate-800 px-6 py-5 border-b border-amber-100 dark:border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="bg-amber-200 dark:bg-amber-900/30 p-1.5 rounded-lg">
                            <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h2 className="text-lg font-black text-amber-900 dark:text-slate-100 tracking-tight">FAQ's</h2>
                    </div>
                    <button onClick={onClose} className="text-amber-400 dark:text-slate-500 hover:text-amber-700 dark:hover:text-slate-300 bg-amber-100/50 dark:bg-slate-700/50 hover:bg-amber-200 dark:hover:bg-slate-700 p-1.5 rounded-full transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="px-6 py-4 max-h-[65vh] overflow-y-auto bg-white dark:bg-slate-900">
                    <div className="flex flex-col gap-3">
                        {faqs.map((faq, i) => (
                            <div key={i} className="flex flex-col gap-1.5 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-600 p-4 rounded-xl hover:border-amber-200 dark:hover:border-amber-500 transition-colors shadow-sm">
                                <h3 className="text-sm font-black text-gray-800 dark:text-slate-200 leading-tight">
                                    {faq.q}
                                </h3>
                                <p className="text-[13px] font-medium text-gray-600 dark:text-slate-400 leading-relaxed mt-1">
                                    {faq.a}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}