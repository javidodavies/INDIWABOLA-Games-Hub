import React from 'react';
import { GameId } from '../types';

interface GameEmblemProps {
  gameId: GameId;
  color?: string;
  size?: number;
}

export const GameEmblem: React.FC<GameEmblemProps> = ({ gameId, color = '#B6FF00', size = 40 }) => {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 48 48',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
    'aria-hidden': true as const,
  };

  switch (gameId) {
    case 'who-am-i':
      return (
        <svg {...common}>
          <rect x="4" y="4" width="40" height="40" rx="10" stroke={color} strokeWidth="2" />
          <circle cx="24" cy="18" r="6" stroke={color} strokeWidth="2" />
          <path d="M13 36c1.8-5.5 6-8 11-8s9.2 2.5 11 8" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <path d="M35 12h4v4" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'bola-trivia':
      return (
        <svg {...common}>
          <rect x="4" y="4" width="40" height="40" rx="10" stroke={color} strokeWidth="2" />
          <path d="M19 18a5 5 0 0 1 10 0c0 3.5-5 4.2-5 8" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="24" cy="33" r="1.8" fill="#FFFFFF" />
        </svg>
      );
    case 'predict-score':
      return (
        <svg {...common}>
          <rect x="4" y="10" width="40" height="28" rx="6" stroke={color} strokeWidth="2" />
          <line x1="24" y1="10" x2="24" y2="38" stroke="#FFFFFF" strokeWidth="1.5" strokeDasharray="3 3" />
          <rect x="10" y="17" width="8" height="14" rx="2" stroke={color} strokeWidth="2" />
          <rect x="30" y="17" width="8" height="14" rx="2" stroke={color} strokeWidth="2" />
        </svg>
      );
    case 'bola-word':
      return (
        <svg {...common}>
          <rect x="6" y="10" width="10" height="10" rx="2" fill={color} />
          <rect x="19" y="10" width="10" height="10" rx="2" stroke="#FFFFFF" strokeWidth="2" />
          <rect x="32" y="10" width="10" height="10" rx="2" stroke={color} strokeWidth="2" />
          <rect x="6" y="24" width="10" height="10" rx="2" stroke="#FFFFFF" strokeWidth="2" />
          <rect x="19" y="24" width="10" height="10" rx="2" fill={color} />
          <rect x="32" y="24" width="10" height="10" rx="2" fill={color} />
        </svg>
      );
    case 'mini-crossword':
      return (
        <svg {...common}>
          <rect x="7" y="7" width="34" height="34" rx="4" stroke={color} strokeWidth="2" />
          <line x1="18.3" y1="7" x2="18.3" y2="41" stroke={color} strokeWidth="1.5" />
          <line x1="29.6" y1="7" x2="29.6" y2="41" stroke={color} strokeWidth="1.5" />
          <line x1="7" y1="18.3" x2="41" y2="18.3" stroke={color} strokeWidth="1.5" />
          <line x1="7" y1="29.6" x2="41" y2="29.6" stroke={color} strokeWidth="1.5" />
          <rect x="18.3" y="18.3" width="11.3" height="11.3" fill={color} />
        </svg>
      );
    case 'bola-connections':
      return (
        <svg {...common}>
          <rect x="6" y="8" width="16" height="14" rx="3" fill={color} />
          <rect x="26" y="8" width="16" height="14" rx="3" stroke={color} strokeWidth="2" />
          <rect x="6" y="26" width="16" height="14" rx="3" stroke="#FFFFFF" strokeWidth="2" />
          <rect x="26" y="26" width="16" height="14" rx="3" fill={color} fillOpacity="0.45" stroke={color} strokeWidth="2" />
        </svg>
      );
    case 'bola-strands':
      return (
        <svg {...common}>
          <circle cx="12" cy="14" r="4" stroke={color} strokeWidth="2" />
          <circle cx="24" cy="24" r="4" fill={color} />
          <circle cx="36" cy="14" r="4" stroke={color} strokeWidth="2" />
          <circle cx="36" cy="34" r="4" stroke="#FFFFFF" strokeWidth="2" />
          <path d="M15 17l6 4m6 0l6-4m3 2v10" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'bola-sudoku':
      return (
        <svg {...common}>
          <rect x="7" y="7" width="34" height="34" rx="5" stroke={color} strokeWidth="2" />
          <line x1="24" y1="7" x2="24" y2="41" stroke={color} strokeWidth="2" />
          <line x1="7" y1="18" x2="41" y2="18" stroke="#FFFFFF" strokeWidth="1.5" />
          <line x1="7" y1="30" x2="41" y2="30" stroke="#FFFFFF" strokeWidth="1.5" />
        </svg>
      );
    case 'bola-tiles':
      return (
        <svg {...common}>
          <polygon points="24,6 40,24 24,42 8,24" stroke={color} strokeWidth="2" />
          <polygon points="24,14 32,24 24,34 16,24" fill={color} />
        </svg>
      );
    case 'match-replay':
      return (
        <svg {...common}>
          <rect x="6" y="8" width="36" height="32" rx="6" stroke={color} strokeWidth="2" />
          <polygon points="20,17 32,24 20,31" fill={color} />
        </svg>
      );
    case 'bola-draft':
      return (
        <svg {...common}>
          <path d="M14 10l5-3h10l5 3 6 7-5 5-3-3v20H16V19l-3 3-5-5 6-7z" stroke={color} strokeWidth="2" strokeLinejoin="round" />
          <line x1="24" y1="14" x2="24" y2="32" stroke="#FFFFFF" strokeWidth="2" />
        </svg>
      );
    case 'memory-grid':
      return (
        <svg {...common}>
          <rect x="8" y="8" width="14" height="18" rx="3" stroke={color} strokeWidth="2" />
          <rect x="26" y="22" width="14" height="18" rx="3" fill={color} />
          <path d="M27 14h10M12 34h10" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'bola-letters':
      return (
        <svg {...common}>
          <circle cx="24" cy="24" r="6" fill={color} />
          <circle cx="24" cy="10" r="4" stroke={color} strokeWidth="2" />
          <circle cx="36" cy="17" r="4" stroke="#FFFFFF" strokeWidth="2" />
          <circle cx="36" cy="31" r="4" stroke={color} strokeWidth="2" />
          <circle cx="24" cy="38" r="4" stroke="#FFFFFF" strokeWidth="2" />
          <circle cx="12" cy="31" r="4" stroke={color} strokeWidth="2" />
          <circle cx="12" cy="17" r="4" stroke="#FFFFFF" strokeWidth="2" />
        </svg>
      );
    case 'bola-letter-box':
      return (
        <svg {...common}>
          <rect x="9" y="9" width="30" height="30" rx="4" stroke={color} strokeWidth="2" />
          <line x1="17" y1="9" x2="39" y2="24" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
          <line x1="39" y1="24" x2="17" y2="39" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <circle cx="17" cy="9" r="3" fill={color} />
          <circle cx="39" cy="24" r="3" fill="#FFFFFF" />
          <circle cx="17" cy="39" r="3" fill={color} />
        </svg>
      );
    case 'bola-ludo':
      return (
        <svg {...common}>
          <rect x="6" y="6" width="36" height="36" rx="6" stroke={color} strokeWidth="2" />
          <rect x="10" y="10" width="11" height="11" rx="2" fill={color} />
          <rect x="27" y="10" width="11" height="11" rx="2" stroke="#EF4444" strokeWidth="2" />
          <rect x="10" y="27" width="11" height="11" rx="2" stroke="#38BDF8" strokeWidth="2" />
          <rect x="27" y="27" width="11" height="11" rx="2" stroke="#F59E0B" strokeWidth="2" />
        </svg>
      );
    case 'road-to-glory':
      return (
        <svg {...common}>
          <path d="M10 38L20 26L28 30L38 10" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points="30,10 38,10 38,18" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="10" cy="38" r="3" fill="#FFFFFF" />
        </svg>
      );
    case 'four-goals':
      return (
        <svg {...common}>
          <rect x="6" y="8" width="36" height="32" rx="5" stroke={color} strokeWidth="2" />
          <circle cx="15" cy="31" r="3.5" fill={color} />
          <circle cx="21" cy="25" r="3.5" fill={color} />
          <circle cx="27" cy="19" r="3.5" fill={color} />
          <circle cx="33" cy="13" r="3.5" stroke="#EF4444" strokeWidth="2" />
        </svg>
      );
  }
};
