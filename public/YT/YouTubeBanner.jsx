import React, { useState, useEffect } from 'react';
import './youtubeAnimation.css';

/**
 * YouTubeBanner
 * 
 * Alternates every 9 seconds between:
 *   1. "/ built for you by neuroflow_infinix"
 *   2. "[yt.png] [channel_icon.png] Chess Catalyst (sub count)"
 * 
 * Features smooth wipe-from-left entrance and wipe-to-right exit animations.
 * Fetches latest YouTube subscriber count from URL on initial load.
 */
export default function YouTubeBanner() {
  // 0: "built for you", 1: "YouTube channel"
  const [current, setCurrent] = useState(0);
  // 'enter' | 'visible' | 'exit'
  const [phase, setPhase] = useState('enter');

  // Subscriber count state with localStorage cache
  const [subCount, setSubCount] = useState(() => {
    try {
      return localStorage.getItem('chess_catalyst_subs') || '149 subs';
    } catch {
      return '149 subs';
    }
  });

  // Fetch live YouTube subscriber count when user loads the website
  useEffect(() => {
    let isMounted = true;

    async function fetchSubscriberCount() {
      // 1. Primary: Cloudflare Pages serverless API
      try {
        const res = await fetch('/api/youtube-subs');
        if (res.ok) {
          const data = await res.json();
          if (data?.subCount && isMounted) {
            setSubCount(data.subCount);
            try {
              localStorage.setItem('chess_catalyst_subs', data.subCount);
            } catch {}
            return;
          }
        }
      } catch {
        // Fall through to secondary fallback
      }

      // 2. Secondary fallback for standalone Vite development without backend running
      try {
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent('https://www.youtube.com/@neuroflow_infinix')}`;
        const res = await fetch(proxyUrl);
        if (res.ok) {
          const data = await res.json();
          if (data?.contents) {
            const match = data.contents.match(/"text":\s*\{\s*"content":\s*"([^"]*subscribers?)"\s*\}/i) ||
                          data.contents.match(/(\d+(?:\.\d+)?[KMB]?)\s+subscribers/i);
            if (match && isMounted) {
              const count = (match[1] || match[0]).replace(/subscribers?/i, 'subs').trim();
              setSubCount(count);
              try {
                localStorage.setItem('chess_catalyst_subs', count);
              } catch {}
            }
          }
        }
      } catch {
        // Gracefully retain current/cached subscriber count
      }
    }

    fetchSubscriberCount();

    return () => {
      isMounted = false;
    };
  }, []);

  // 9-second alternating animation loop with wipe transitions
  useEffect(() => {
    let timer;

    if (phase === 'enter') {
      // Wipe-in entrance duration: 750ms
      timer = setTimeout(() => {
        setPhase('visible');
      }, 750);
    } else if (phase === 'visible') {
      // Stay visible for 9 seconds (updated from 7s as requested)
      timer = setTimeout(() => {
        setPhase('exit');
      }, 9000);
    } else if (phase === 'exit') {
      // Wipe-out exit duration: 750ms
      timer = setTimeout(() => {
        setCurrent(prev => (prev === 0 ? 1 : 0));
        setPhase('enter');
      }, 750);
    }

    return () => clearTimeout(timer);
  }, [phase]);

  const animationClass = 
    phase === 'enter' 
      ? 'animate-wipe-enter' 
      : phase === 'exit' 
        ? 'animate-wipe-exit' 
        : 'opacity-100 translate-x-0';

  return (
    <div className="relative h-9 sm:h-11 flex items-center justify-center lg:justify-end overflow-visible w-full lg:w-auto">
      <div className={`transition-all duration-300 flex items-center justify-center lg:justify-end w-full lg:w-auto ${animationClass}`}>
        
        {/* ── State 0: Built for you signature ── */}
        {current === 0 && (
          <p className="text-[17px] sm:text-[19px] font-medium text-gray-400/80 drop-shadow-sm select-none pointer-events-none text-center lg:text-right whitespace-nowrap">
            / built for you by{' '}
            <span 
              className="font-black text-[#4a7c59] bg-clip-text text-transparent bg-gradient-to-r from-[#4a7c59] via-[#65a377] to-[#4a7c59] animate-text-shimmer"
            >
              neuroflow_infinix
            </span>
          </p>
        )}

        {/* ── State 1: YouTube Channel Promo (w-full on mobile, auto on desktop) ── */}
        {current === 1 && (
          <a
            href="https://www.youtube.com/@neuroflow_infinix"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-center w-full lg:w-auto gap-2 sm:gap-2.5 px-3 sm:px-3.5 py-1 rounded-full bg-gray-50/80 dark:bg-slate-800/80 hover:bg-red-50/90 dark:hover:bg-red-950/40 border border-gray-200/70 dark:border-slate-700/70 hover:border-red-300 dark:hover:border-red-800 transition-all duration-300 shadow-xs hover:shadow-md hover:-translate-y-0.5"
            title="Visit Chess Catalyst on YouTube"
          >
            {/* YouTube Logo (yt.png) - Sized strictly to fit mobile and desktop */}
            <img
              src="/YT/yt.png"
              alt="YouTube"
              className="yt-logo-image shrink-0 group-hover:scale-105 transition-transform duration-300 drop-shadow-xs"
              loading="eager"
            />

            {/* Channel Avatar (channel_icon.png) - Sized strictly to fit mobile and desktop */}
            <img
              src="/YT/channel_icon.png"
              alt="Chess Catalyst"
              className="yt-channel-avatar shrink-0 ring-1.5 ring-gray-200 dark:ring-slate-700 group-hover:ring-red-500 shadow-sm"
              loading="eager"
            />

            {/* Channel Title */}
            <span className="font-bold text-gray-800 dark:text-slate-100 text-[13px] sm:text-[15px] tracking-tight group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors whitespace-nowrap">
              Chess Catalyst
            </span>

            {/* Subscriber Count Badge */}
            {subCount && (
              <span className="text-[11px] sm:text-[12px] font-extrabold text-gray-600 dark:text-slate-300 bg-white dark:bg-slate-900 group-hover:bg-red-600 group-hover:text-white px-2 sm:px-2.5 py-0.5 rounded-full border border-gray-200 dark:border-slate-700 group-hover:border-red-600 transition-all duration-300 shadow-xs whitespace-nowrap animate-yt-pulse">
                {subCount}
              </span>
            )}
          </a>
        )}

      </div>
    </div>
  );
}
