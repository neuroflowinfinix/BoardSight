import React, { useState, useEffect } from 'react';

const NAMES = ["Sergio Daroca Fernández", "ItzEpicSpin", "Ryan", "Arjun", "Vaibhav", "Maria"];

export default function SpecialThanksToast() {
  const [mode, setMode] = useState(0); // 0: enter, 1: names, 2: exit
  const [nameIndex, setNameIndex] = useState(0);

  useEffect(() => {
    let timeout;
    if (mode === 0) {
      timeout = setTimeout(() => {
        setMode(1);
        setNameIndex(0);
      }, 1400); 
    } else if (mode === 1) {
      timeout = setTimeout(() => {
        if (nameIndex === NAMES.length - 1) {
          setMode(2);
        } else {
          setNameIndex(prev => prev + 1);
        }
      }, 4500);
    } else if (mode === 2) {
      timeout = setTimeout(() => {
        setMode(0); // Loop restarts directly
      }, 2000); 
    }
    return () => clearTimeout(timeout);
  }, [mode, nameIndex]);

  return (
    <div className="relative h-9 sm:h-11 flex items-center justify-center lg:justify-start overflow-visible perspective-[1000px] w-full lg:w-auto">
      <style>{`
        @keyframes stHeartEnter {
          0% { opacity: 0; transform: scale(0.3) translateY(30px) translateX(120px) rotate(-25deg); filter: blur(5px); }
          40% { opacity: 1; transform: scale(1.15) translateY(-5px) translateX(60px) rotate(15deg); filter: blur(0px); }
          100% { opacity: 1; transform: scale(1) translateY(0) translateX(0) rotate(0deg); filter: blur(0px); }
        }
        @keyframes stHeartExit {
          0% { opacity: 1; transform: translateX(0) scale(1) rotate(0deg); filter: blur(0px); }
          18% { opacity: 1; transform: translateX(-20px) scale(0.9) rotate(-12deg); filter: blur(0px); }
          45% { opacity: 1; transform: translateX(250px) scale(1.1) rotate(20deg); filter: blur(3px); }
          80% { opacity: 1; transform: translateX(5px) scale(1.05) rotate(-5deg); filter: blur(0px); }
          100% { opacity: 0; transform: translateX(0) translateY(30px) scale(0.5) rotate(0deg); filter: blur(5px); }
        }
        .animate-heart-enter {
          animation: stHeartEnter 1.4s cubic-bezier(0.25, 1, 0.3, 1) forwards;
        }
        .animate-heart-exit {
          animation: stHeartExit 2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        .name-transition {
          transition: transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), 
                      opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1),
                      filter 0.6s ease-out;
        }
      `}</style>

      {/* ── Thanks State Container ── */}
      <div className="flex items-center justify-center lg:justify-start gap-2.5 sm:gap-3 text-gray-500 dark:text-slate-400 select-none w-full">
        
        {/* Playful Heart */}
        <div 
          className={`bg-gradient-to-br from-pink-100 to-pink-50 dark:from-pink-900/40 dark:to-pink-900/10 p-2 sm:p-2.5 rounded-full flex-shrink-0 shadow-[inset_0_2px_4px_rgba(0,0,0,0.06),_0_4px_12px_rgba(236,72,153,0.15)] dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2),_0_4px_12px_rgba(236,72,153,0.1)] flex items-center justify-center z-10
            ${mode === 0 ? 'animate-heart-enter' : ''}
            ${mode === 1 ? 'opacity-100 translate-x-0 scale-100' : ''}
            ${mode === 2 ? 'animate-heart-exit' : ''}
          `}
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-pink-500 dark:text-pink-400 drop-shadow-sm" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
          </svg>
        </div>

        {/* Thanks Label & Names */}
        <div className={`flex items-center gap-1.5 transition-all duration-1000 ease-[cubic-bezier(0.25,1,0.3,1)] ${mode === 1 ? 'opacity-100 translate-x-0 blur-none' : 'opacity-0 translate-x-8 blur-[2px]'}`}>
          <span className="text-[14px] sm:text-[16px] font-black uppercase tracking-wider bg-clip-text text-transparent bg-gradient-to-br from-gray-500 to-gray-400 dark:from-slate-400 dark:to-slate-500 whitespace-nowrap">
            Thanks:
          </span>
          
          <div className="relative h-6 sm:h-8 w-[210px] sm:w-[240px] flex items-center overflow-visible">
            {NAMES.map((name, i) => {
              let positionClass = '';
              let opacityClass = '';
              let blurClass = '';
              
              if (mode === 1) {
                if (i === nameIndex) {
                  positionClass = 'translate-y-0 scale-100';
                  opacityClass = 'opacity-100';
                  blurClass = 'blur-none';
                } else if (i === (nameIndex - 1 + NAMES.length) % NAMES.length) {
                  positionClass = '-translate-y-8 scale-90 rotate-[-2deg]';
                  opacityClass = 'opacity-0';
                  blurClass = 'blur-[4px]';
                } else {
                  positionClass = 'translate-y-8 scale-90 rotate-[2deg]';
                  opacityClass = 'opacity-0';
                  blurClass = 'blur-[4px]';
                }
              } else {
                positionClass = 'translate-y-8 scale-90';
                opacityClass = 'opacity-0';
                blurClass = 'blur-[4px]';
              }

              return (
                <span
                  key={name}
                  className={`absolute inset-y-0 w-full flex items-center justify-start text-[15px] sm:text-[18px] font-black text-gray-800 dark:text-slate-100 name-transition whitespace-nowrap ${positionClass} ${opacityClass} ${blurClass}`}
                >
                  {name}
                </span>
              );
            })}
          </div>
        </div>
      </div>
      
    </div>
  );
}
