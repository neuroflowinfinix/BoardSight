import React from 'react';

/**
 * PlayButton Component
 * Renders the play / pause toggle button for auto-playing game moves in the move list.
 * Positioned to the left of the move annotation symbol in the main move bar.
 */
export default function PlayButton({
  isPlaying,
  onToggle,
  disabled = false,
  className = '',
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-label={isPlaying ? 'Pause auto-play' : 'Play moves'}
      title={disabled ? 'No moves to play' : isPlaying ? 'Pause auto-play' : 'Play moves'}
      className={`shrink-0 flex items-center justify-center rounded-lg transition-all focus:outline-none select-none ${
        isPlaying
          ? 'bg-[#4a7c59] text-white hover:bg-[#3d6b4a] shadow-sm'
          : 'text-gray-600 dark:text-slate-400 hover:text-[#4a7c59] dark:hover:text-[#5fa371] hover:bg-gray-100 dark:hover:bg-slate-700/60 active:scale-95'
      } disabled:opacity-30 disabled:pointer-events-none p-1.5 sm:p-2 ${className}`}
    >
      {isPlaying ? (
        // Pause Icon
        <svg
          className="w-4 h-4 sm:w-5 sm:h-5 fill-current"
          viewBox="0 0 24 24"
        >
          <path d="M6 4h4v16H6zm8 0h4v16h-4z" />
        </svg>
      ) : (
        // Play Icon (with slight optical centering offset)
        <svg
          className="w-4 h-4 sm:w-5 sm:h-5 fill-current translate-x-[0.5px]"
          viewBox="0 0 24 24"
        >
          <path d="M8 5v14l11-7z" />
        </svg>
      )}
    </button>
  );
}
