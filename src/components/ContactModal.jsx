import React from 'react';

export default function ContactModal({ isOpen, onClose }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-xl border border-gray-100 dark:border-slate-700 overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="bg-[#5865F2]/10 dark:bg-slate-800 px-6 py-5 border-b border-[#5865F2]/20 dark:border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="bg-[#5865F2]/20 dark:bg-[#5865F2]/30 p-1.5 rounded-lg">
                            <svg className="w-5 h-5 text-[#5865F2] dark:text-[#5865F2]" fill="currentColor" viewBox="0 0 127.14 96.36">
                                <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.31,60,73.31,53s5-12.74,11.43-12.74S96.33,46,96.22,53,91.08,65.69,84.69,65.69Z" />
                            </svg>
                        </div>
                        <h2 className="text-lg font-black text-[#5865F2] dark:text-slate-100 tracking-tight">Community & Contact</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 bg-gray-100 dark:bg-slate-700/50 hover:bg-gray-200 dark:hover:bg-slate-700 p-1.5 rounded-full transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 bg-white dark:bg-slate-900 flex flex-col gap-6">

                    {/* Discord Section */}
                    <div className="flex flex-col gap-3">
                        <h3 className="font-bold text-gray-800 dark:text-slate-200 text-sm">Join the Discord Server</h3>
                        <p className="text-[13px] text-gray-600 dark:text-slate-400 leading-relaxed font-medium">
                            Join to stay updated about BoardSight improvements! It's the best place to report bugs, request new features, and engage in chess-talk. You can also share your games, and posts about chess are always invited.
                        </p>
                        <a href="https://discord.gg/EDZMXXDvJN" target="_blank" rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold py-2.5 rounded-xl transition-colors shadow-sm mt-1">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 127.14 96.36">
                                <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.31,60,73.31,53s5-12.74,11.43-12.74S96.33,46,96.22,53,91.08,65.69,84.69,65.69Z" />
                            </svg>
                            Accept Invite
                        </a>
                    </div>

                    <hr className="border-gray-100 dark:border-slate-800" />

                    {/* Email Section */}
                    <div className="flex flex-col gap-2 text-center">
                        <h3 className="font-bold text-gray-800 dark:text-slate-200 text-sm">Direct Contact</h3>
                        <p className="text-[13px] text-gray-600 dark:text-slate-400 font-medium">Reach me out via email below or send me a message on Discord.</p>
                        <a href="mailto:neuroflow_infinix@outlook.in" className="inline-flex items-center justify-center gap-2 text-orange-600 dark:text-orange-400 font-bold hover:underline bg-orange-50 dark:bg-orange-900/20 py-2 px-4 rounded-lg border border-orange-100 dark:border-orange-800/30 transition-colors mx-auto mt-1">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            neuroflow_infinix@outlook.in
                        </a>
                    </div>

                </div>
            </div>
        </div>
    );
}