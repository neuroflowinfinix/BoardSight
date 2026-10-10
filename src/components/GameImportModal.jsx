import React, { useState } from 'react';
import { fetchLichessGames, fetchChessComGames } from '../utils/gameFetcher';

// --- Component ---
export default function GameImportModal({ isOpen, onClose, onAnalyze }) {
    const [username, setUsername] = useState('');
    const [platform, setPlatform] = useState('chesscom');
    const [loading, setLoading] = useState(false);
    const [games, setGames] = useState([]);
    const [error, setError] = useState('');
    const [infoMsg, setInfoMsg] = useState('');

    if (!isOpen) return null;

    const handleFetch = async () => {
        if (!username.trim()) return;
        setLoading(true);
        setError('');
        setInfoMsg('');
        setGames([]);

        try {
            const fetched = platform === 'chesscom'
                ? await fetchChessComGames(username, 5)
                : await fetchLichessGames(username, 5);

            if (fetched.length === 0) {
                setError('User exists, but no recent games were found.');
            } else {
                if (fetched.length < 5) {
                    setInfoMsg(`Found only ${fetched.length} game${fetched.length > 1 ? 's' : ''}.`);
                }
                setGames(fetched);
            }
        } catch (err) {
            if (err.message === 'USER_NOT_FOUND') {
                setError('User does not exist.');
            } else {
                setError('Failed to fetch games. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const extractHeader = (pgn, header) => {
        if (!pgn) return '?';
        const match = pgn.match(new RegExp(`\\[${header} "(.*?)"\\]`));
        return match ? match[1] : '?';
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-100 dark:border-slate-700 flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="bg-gray-50 dark:bg-slate-800 px-5 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between rounded-t-2xl shrink-0">
                    <h2 className="text-lg font-black text-gray-800 dark:text-slate-100 flex items-center gap-2">
                        <svg className="w-5 h-5 text-[#4a7c59]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Import Recent Games
                    </h2>
                    <button onClick={onClose} className="text-gray-400 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-300 bg-gray-200/50 dark:bg-slate-700/50 hover:bg-gray-200 dark:hover:bg-slate-700 p-1.5 rounded-full transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Input Area */}
                <div className="p-5 border-b border-gray-100 dark:border-slate-700 shrink-0">
                    <div className="flex flex-col gap-3">
                        <input
                            type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                            placeholder="Chess username..."
                            className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 rounded-xl px-4 py-2.5 text-base font-medium focus:border-[#4a7c59] focus:ring-2 focus:ring-[#4a7c59]/20 outline-none transition-all"
                            onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
                        />
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex bg-gray-100 dark:bg-slate-700 rounded-xl p-1 shrink-0">
                                <button onClick={() => setPlatform('chesscom')} className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-colors ${platform === 'chesscom' ? 'bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 shadow-sm' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'}`}>chess.com</button>
                                <button onClick={() => setPlatform('lichess')} className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-colors ${platform === 'lichess' ? 'bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 shadow-sm' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'}`}>lichess.org</button>
                            </div>
                            <button onClick={handleFetch} disabled={loading || !username} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-2.5 px-6 rounded-xl text-base transition-colors shrink-0 flex justify-center items-center shadow-sm min-w-[110px]">
                                {loading ? (
                                    <div className="flex items-center gap-2">
                                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        <span>Wait</span>
                                    </div>
                                ) : 'Search'}
                            </button>
                        </div>
                    </div>
                    {error && <p className="text-sm font-bold text-red-500 mt-3 ml-1">{error}</p>}
                </div>

                {/* Results Area */}
                <div className="p-5 overflow-y-auto bg-gray-50/50 dark:bg-slate-950 rounded-b-2xl">
                    {games.length === 0 && !loading && !error && (
                        <div className="text-center text-gray-400 dark:text-slate-500 text-base font-medium py-8">Enter a username to fetch their last 5 games.</div>
                    )}

                    {infoMsg && !loading && games.length > 0 && (
                        <div className="mb-3 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-sm font-bold rounded-lg text-center">
                            {infoMsg}
                        </div>
                    )}

                    <div className="flex flex-col gap-2.5">
                        {games.map((g, i) => {
                            const white = extractHeader(g.pgn, 'White');
                            const black = extractHeader(g.pgn, 'Black');
                            const result = extractHeader(g.pgn, 'Result');
                            const date = extractHeader(g.pgn, 'Date').replace(/\./g, '-');

                            // Smart Time Control Parsing
                            let tcRaw = extractHeader(g.pgn, 'TimeControl');
                            let tcDisplay = tcRaw;
                            if (tcRaw === '-') tcDisplay = 'Daily';
                            else if (tcRaw !== '?') {
                                const [secStr, incStr] = tcRaw.split('+');
                                const secs = parseInt(secStr, 10);
                                if (!isNaN(secs)) {
                                    const mins = Math.floor(secs / 60);
                                    const rem = secs % 60;
                                    const base = mins > 0 ? (rem > 0 ? `${mins}m ${rem}s` : `${mins}m`) : `${secs}s`;
                                    tcDisplay = incStr ? `${base} +${incStr}s` : base;
                                }
                            }

                            return (
                                <div key={i} className="flex items-center justify-between bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-3.5 rounded-xl shadow-sm hover:border-[#4a7c59]/40 transition-colors group">
                                    <div className="flex flex-col min-w-0 pr-4">
                                        <span className="text-[15px] font-bold text-gray-800 dark:text-slate-200 truncate">
                                            {white} <span className="text-gray-400 dark:text-slate-500 font-normal mx-1">vs</span> {black}
                                        </span>
                                        <div className="flex items-center flex-wrap gap-2 mt-1.5">
                                            <span className={`text-xs font-black px-2 py-0.5 rounded ${result === '1-0' ? 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-slate-200' : result === '0-1' ? 'bg-gray-800 dark:bg-slate-900 text-gray-200 dark:text-slate-400' : 'bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-slate-300'}`}>
                                                {result}
                                            </span>
                                            {tcDisplay !== '?' && (
                                                <div className="flex items-center gap-1 text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-slate-700 px-2 py-0.5 rounded border border-gray-100 dark:border-slate-600">
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                    <span className="text-[11px] font-bold tracking-wide">{tcDisplay}</span>
                                                </div>
                                            )}
                                            <span className="text-[11px] font-semibold text-gray-400 tracking-wide">{date}</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => onAnalyze(g.pgn)}
                                        className="shrink-0 bg-[#4a7c59] hover:bg-[#3d6b4a] text-white text-sm font-bold px-4 py-2.5 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                        Import
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}