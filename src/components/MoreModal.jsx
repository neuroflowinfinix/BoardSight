import React from 'react';

export default function MoreModal({ isOpen, onClose, onOpenWhatsNew, onOpenBugFixes, onOpenThanks, onOpenContact, onOpenDevNote, onOpenAbout, onOpenFAQ, onOpenAnalysis, onOpenVersionInfo }) {
  if (!isOpen) return null;

  const menuItems = [
    { 
      label: "About BoardSight", action: onOpenAbout, 
      icon: <svg className="w-5 h-5 text-white drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, 
      desc: "Why we stand out", color: "from-violet-400 to-purple-500", borderHover: "hover:border-violet-300 dark:hover:border-violet-400" 
    },
    { 
      label: "Game Analysis", action: onOpenAnalysis, 
      icon: <svg className="w-5 h-5 text-white drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>, 
      desc: "Engine capabilities", color: "from-indigo-400 to-blue-500", borderHover: "hover:border-indigo-300 dark:hover:border-indigo-400" 
    },
    { 
      label: "FAQ's", action: onOpenFAQ, 
      icon: <svg className="w-5 h-5 text-white drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, 
      desc: "Common questions", color: "from-amber-300 to-orange-400", borderHover: "hover:border-amber-300 dark:hover:border-amber-400" 
    },
    { 
      label: "What's New?", action: onOpenWhatsNew, 
      icon: <svg className="w-5 h-5 text-white drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.45c.019-.104.039-.208.06-.311m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.438 4.438 0 002.946 2.946 4.493 4.493 0 004.306-1.758c.195-.195.39-.39.586-.586l-5.492-5.492c-.195.196-.39.39-.586.586z" /></svg>, 
      desc: "Latest updates", color: "from-cyan-300 to-blue-400", borderHover: "hover:border-cyan-300 dark:hover:border-cyan-400" 
    },
    { 
      label: "Bug Fixes and improvements", action: onOpenBugFixes, 
      icon: <svg className="w-5 h-5 text-white drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>, 
      desc: "Squashed bugs", color: "from-red-400 to-rose-500", borderHover: "hover:border-red-300 dark:hover:border-red-400" 
    },
    { 
      label: "Special Thanks", action: onOpenThanks, 
      icon: <svg className="w-5 h-5 text-white drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>, 
      desc: "Community props", color: "from-pink-400 to-rose-400", borderHover: "hover:border-pink-300 dark:hover:border-pink-400" 
    },
    { 
      label: "Community and contact", action: onOpenContact, 
      icon: <svg className="w-5 h-5 text-white drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>, 
      desc: "Discord & Email", color: "from-emerald-300 to-teal-400", borderHover: "hover:border-emerald-300 dark:hover:border-emerald-400" 
    },
    { 
      label: "Version Info", action: onOpenVersionInfo, 
      icon: <svg className="w-5 h-5 text-white drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, 
      desc: "App version details", color: "from-sky-300 to-blue-400", borderHover: "hover:border-sky-300 dark:hover:border-sky-400" 
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Local animation styles ensuring motion only plays when mounted */}
      <style>{`
        @keyframes exploreGradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes explorePattern {
          0% { background-position: 0px 0px; }
          100% { background-position: 40px 40px; }
        }
      `}</style>
      
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-sm lg:max-w-2xl border border-gray-100 dark:border-slate-700 overflow-hidden flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
        
        {/* Decorative Header */}
        <div 
          className="relative h-24 bg-gradient-to-br from-indigo-400 via-purple-400 to-blue-400 p-5 overflow-hidden shrink-0"
          style={{ backgroundSize: '200% 200%', animation: 'exploreGradient 8s ease infinite' }}
        >
          <div 
            className="absolute inset-0 opacity-30 pointer-events-none z-0"
            style={{ 
              backgroundImage: "url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjIiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')",
              animation: 'explorePattern 20s linear infinite'
            }}
          ></div>
          <button 
            type="button"
            onClick={onClose} 
            aria-label="Close"
            className="absolute top-3 right-3 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors z-20 backdrop-blur-md"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h2 className="relative z-10 text-2xl font-black text-white tracking-tight mt-2 flex items-center gap-2">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" /></svg>
            Explore More
          </h2>
        </div>

        {/* Grid Content */}
        <div className="p-4 grid grid-cols-2 gap-3 overflow-y-auto custom-scrollbar">
          {menuItems.map((item, idx) => (
            <button key={idx} onClick={() => { item.action(); onClose(); }}
              className={`flex flex-col items-start gap-2 p-4 rounded-2xl bg-white dark:bg-slate-700 border-2 border-gray-100 dark:border-slate-600 ${item.borderHover} transition-all shadow-sm hover:shadow-md group text-left h-full`}>
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-inner shrink-0 transform group-hover:scale-110 transition-transform`}>
                <span className="text-xl drop-shadow-md">{item.icon}</span>
              </div>
              <div className="flex flex-col mt-1">
                {/* Increased Text Sizes */}
                <span className="text-[15px] lg:text-lg font-black text-gray-800 dark:text-slate-100 leading-tight">{item.label}</span>
                <span className="text-xs lg:text-sm font-bold text-gray-500 dark:text-slate-400 mt-1 leading-tight">{item.desc}</span>
              </div>
            </button>
          ))}

          <button onClick={() => { onOpenDevNote(); onClose(); }}
            className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-slate-700 border-2 border-gray-100 dark:border-slate-600 hover:border-amber-400 dark:hover:border-amber-500 transition-all shadow-sm hover:shadow-md group text-left">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 via-amber-400 to-yellow-400 flex items-center justify-center shadow-md shrink-0 transform group-hover:scale-105 transition-transform">
              <span className="text-2xl drop-shadow-md">🍁</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[16px] lg:text-xl font-black text-gray-800 dark:text-slate-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors leading-tight">Developer's Note</span>
              <span className="text-[13px] lg:text-base font-bold text-gray-400 dark:text-slate-500 mt-1 leading-tight">A word from the dev</span>
            </div>
          </button>


        </div>

      </div>
    </div>
  );
}