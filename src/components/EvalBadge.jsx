import React from 'react';

export default function EvalBadge({ type, text }) {
  if (!type) return null;

  if (type === 'tracker' && text) {
      let display = text.replace(/[FACPD]/g, '');
      if (!display) return null;
      let size = 15;
      if (display.length === 2) size = 13;
      else if (display.length === 3) size = 10;
      else if (display.length >= 4) size = 8;
      return (
          <svg viewBox="0 0 24 24" className="w-full h-full drop-shadow-md">
              <circle cx="12" cy="12" r="11" fill="#FFFFFF" stroke="#000000" strokeWidth="1.5" />
              <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle" fill="black" fontSize={size} fontWeight="900" fontFamily="sans-serif">{display}</text>
          </svg>
      );
  }

  const ICONS = {
    brilliant:  { bg: '#13ccc6', content: <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="15" fontWeight="900" fontFamily="sans-serif">!!</text> },
    great:      { bg: '#5C8BB0', content: <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="15" fontWeight="900" fontFamily="sans-serif">!</text> },
    best:       { bg: '#96BC4B', content: <path d="M12,4 L13.881,9.412 L19.608,9.528 L15.044,12.989 L16.702,18.472 L12,15.2 L7.298,18.472 L8.956,12.989 L4.392,9.528 L10.119,9.412 Z" fill="white"/> },
    excellent: {
      bg: '#96BC4B',
      content: (
        <g transform="translate(4.2,3.2) scale(0.68)">
          <path
            d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14zm-7 11H5a2 2 0 01-2-2v-7a2 2 0 012-2h2v11z"
            fill="white"
          />
        </g>
      )
    },
    good:       { bg: '#96BC4B', content: <path d="M6 13l4 4 8-8" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/> }, // Checkmark
    inaccuracy: { bg: '#F0C45D', content: <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="14" fontWeight="900" fontFamily="sans-serif">?!</text> },
    miss:       { bg: '#E8706A', content: <path d="M7 7l10 10M17 7L7 17" stroke="white" strokeWidth="3.5" strokeLinecap="round" fill="none"/> }, // X mark
    mistake:    { bg: '#E07832', content: <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="15" fontWeight="900" fontFamily="sans-serif">?</text> },
    blunder: { bg: '#C93832', content: <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="14" fontWeight="900" fontFamily="sans-serif">??</text> },
    book: { bg: '#C8956C', content: <path d="M12 6.5C10.5 5.5 8.5 5 7 5H4v13h3c1.5 0 3.5.5 5 1.5V6.5zm0 0c1.5-1 3.5-1.5 5-1.5h3v13h-3c-1.5 0-3.5.5-5 1.5V6.5z" fill="white" /> },
    novelty: { bg: '#3B82F6', content: <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="15" fontWeight="900" fontFamily="sans-serif">N</text> },

    // Coach explanation icons
    tactical: { bg: '#10B981', content: <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="white" /> }, // Trophy/Star
    blunder_coach: { bg: '#EF4444', content: <path d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" /> }, // Warning circle
    missed_coach: { bg: '#F59E0B', content: <path d="M13 10V3L4 14h7v7l9-11h-7z" fill="white" /> }, // Lightning bolt
  };

  const config = ICONS[type];
  if (!config) return null;

  return (
    <svg viewBox="0 0 24 24" className="w-full h-full drop-shadow-md">
      <circle cx="12" cy="12" r="11" fill={config.bg} stroke={config.stroke || "white"} strokeWidth="1.5" />
      {config.content}
    </svg>
  );
}