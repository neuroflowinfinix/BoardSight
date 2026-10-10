// src/components/GameImport.jsx
import React, { useState } from 'react';
import { fetchLichessGames, fetchChessComGames } from '../utils/gameFetcher';

export default function GameImport({ onAnalyze }) {
    const [username, setUsername] = useState('');
    const [platform, setPlatform] = useState('chesscom');
    const [loading, setLoading] = useState(false);
    const [games, setGames] = useState([]);
    const [error, setError] = useState('');

    const handleFetch = async () => {
        if (!username.trim()) return;
        setLoading(true);
        setError('');
        setGames([]);

        try {
            const fetchedGames = platform === 'chesscom'
                ? await fetchChessComGames(username, 5)
                : await fetchLichessGames(username, 5);

            if (!fetchedGames || fetchedGames.length === 0) {
                setError('No recent games found for this username.');
            } else {
                setGames(fetchedGames);
            }
        } catch (err) {
            if (err.message === 'USER_NOT_FOUND') {
                setError('User does not exist.');
            } else {
                setError('Failed to fetch games. Please verify the username.');
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
        <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex-1 flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-wider text-gray-800 dark:text-slate-200 flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-[#4a7c59]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Fetch Recent Games
                </h3>
                <span className="text-xs font-semibold text-gray-500 dark:text-slate-400">Last 5 games</span>
            </div>

            <div className="flex flex-wrap gap-2">
                <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter chess username..."
                    className="flex-1 min-w-[140px] border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:border-[#4a7c59] focus:ring-1 focus:ring-[#4a7c59] outline-none transition-all placeholder-gray-400 dark:placeholder-slate-500"
                    onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
                />

                <div className="flex bg-gray-200/70 dark:bg-slate-700 rounded-lg p-0.5 flex-shrink">
                    <button
                        type="button"
                        onClick={() => setPlatform('chesscom')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${platform === 'chesscom' ? 'bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 shadow-sm' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'}`}
                    >
                        Chess.com
                    </button>
                    <button
                        type="button"
                        onClick={() => setPlatform('lichess')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${platform === 'lichess' ? 'bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 shadow-sm' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'}`}
                    >
                        Lichess.org
                    </button>
                </div>

                <button
                    type="button"
                    onClick={handleFetch}
                    disabled={loading || !username.trim()}
                    className="bg-[#4a7c59] hover:bg-[#3d6b4a] disabled:opacity-50 text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors flex-shrink flex justify-center items-center gap-1.5 shadow-sm"
                >
                    {loading ? (
                        <>
                            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Fetching...</span>
                        </>
                    ) : 'Fetch'}
                </button>
            </div>

            <div className="flex-1 min-h-[120px] overflow-y-auto custom-scrollbar flex flex-col justify-start gap-2 mt-1 bg-white/60 dark:bg-slate-800/40 rounded-lg p-2.5 border border-gray-200/60 dark:border-slate-700/60">
                {loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-2 text-gray-500 dark:text-slate-400">
                        <svg className="animate-spin h-6 w-6 text-[#4a7c59]" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="text-sm font-semibold">Fetching recent games...</span>
                    </div>
                ) : error ? (
                    <div className="flex-1 flex items-center justify-center p-3 text-center">
                        <p className="text-sm font-bold text-red-500 dark:text-red-400">{error}</p>
                    </div>
                ) : games.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-3 text-center text-gray-500 dark:text-slate-400">
                        <svg className="w-7 h-7 mb-1.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <span className="text-sm font-semibold">Enter a username above to fetch recent games</span>
                    </div>
                ) : (
                    games.map((g, i) => {
                        const white = extractHeader(g.pgn, 'White');
                        const black = extractHeader(g.pgn, 'Black');
                        const result = extractHeader(g.pgn, 'Result');
                        const date = extractHeader(g.pgn, 'Date').replace(/\./g, '-');

                        return (
                            <button
                                key={i}
                                type="button"
                                onClick={() => onAnalyze(g.pgn)}
                                className="text-left w-full flex items-center justify-between bg-white dark:bg-slate-800 hover:bg-[#4a7c59]/10 dark:hover:bg-[#4a7c59]/20 border border-gray-200 dark:border-slate-700 hover:border-[#4a7c59]/40 p-2.5 rounded-lg transition-all group shadow-sm shrink-0"
                            >
                                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                    <span className="text-xs font-black text-gray-400 dark:text-slate-500 w-4 text-right shrink-0 select-none">
                                        {i + 1}.
                                    </span>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-sm font-bold text-gray-800 dark:text-slate-200 truncate">
                                            {white} <span className="text-gray-400 dark:text-slate-500 font-normal mx-0.5">vs</span> {black}
                                        </span>
                                        <span className="text-xs font-semibold text-gray-400 dark:text-slate-400 tracking-wide mt-0.5">
                                            {date}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2.5 shrink-0">
                                    <span className={`text-xs font-black px-2 py-0.5 rounded ${result === '1-0' ? 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-slate-200' : result === '0-1' ? 'bg-gray-800 dark:bg-slate-900 text-gray-200 dark:text-slate-300' : 'bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-slate-400'}`}>
                                        {result}
                                    </span>
                                    <span className="text-sm font-bold text-[#4a7c59] dark:text-[#65a377] group-hover:underline flex items-center gap-0.5">
                                        Analyze →
                                    </span>
                                </div>
                            </button>
                        );
                    })
                )}
            </div>
        </div>
    );
}
