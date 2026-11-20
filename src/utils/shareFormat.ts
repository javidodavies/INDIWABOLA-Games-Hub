import { GameCategory } from '../types';

export interface ShareMetadata {
  gameTitle: string;
  gameCategory?: GameCategory;
  score: number;
  accuracy?: number;
  won?: boolean;
  isDailyMode?: boolean;
  shareGrid?: string;
  summaryLine?: string;
  customUrl?: string;
}

export function formatShareMessage(
  meta: ShareMetadata,
  originFallback = 'https://indiwabola.com'
): {
  title: string;
  url: string;
  text: string;
} {
  const gamePath = meta.isDailyMode
    ? '/games/daily'
    : meta.gameCategory === 'multiplayer'
    ? '/games/multiplayer'
    : '/games/football';

  const resolvedOrigin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : originFallback;

  const url = meta.customUrl || `${resolvedOrigin}${gamePath}`;
  const title = `INDIWABOLA ${meta.isDailyMode ? 'Daily BOLA Challenge' : 'Games Hub'} — ${meta.gameTitle}`;
  const outcomeLabel = meta.won === false ? '⚽ Match Complete' : '🏆 Victory';
  const accuracyPart = meta.accuracy !== undefined ? ` · Accuracy: *${meta.accuracy}%*` : '';

  const lines = [
    `*${title}*`,
    `${outcomeLabel} · Score: *${meta.score} pts*${accuracyPart}`,
  ];

  if (meta.shareGrid) {
    lines.push(meta.shareGrid);
  } else if (meta.summaryLine) {
    lines.push(meta.summaryLine);
  }

  lines.push(`Play now: ${url}`);

  return {
    title,
    url,
    text: lines.join('\n'),
  };
}
