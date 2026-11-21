import React from 'react';
import './youtubeAnimation.css';

/**
 * SignatureBanner
 * 
 * Displays the signature:
 *   "/ built for you by neuroflow_infinix"
 */
export default function YouTubeBanner() {
  return (
    <div className="relative h-9 sm:h-11 flex items-center justify-center lg:justify-end overflow-visible w-full lg:w-auto">
      <div className="flex items-center justify-center lg:justify-end w-full lg:w-auto">
        <p className="text-[17px] sm:text-[19px] font-medium text-gray-400/80 drop-shadow-sm select-none pointer-events-none text-center lg:text-right whitespace-nowrap">
          / built for you by{' '}
          <span 
            className="font-black text-[#4a7c59] bg-clip-text text-transparent bg-gradient-to-r from-[#4a7c59] via-[#65a377] to-[#4a7c59] animate-text-shimmer"
          >
            neuroflow_infinix
          </span>
        </p>
      </div>
    </div>
  );
}
