import { GameId } from '../types';

export function getLusakaDateString(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Lusaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

export function getLusakaTimeParts(date: Date = new Date()): {
  dateStr: string;
  hours: number;
  minutes: number;
  seconds: number;
  formattedTime: string;
  msUntilMidnight: number;
} {
  const dateStr = getLusakaDateString(date);
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lusaka',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const getNum = (type: string) => Number(parts.find((p) => p.type === type)?.value || 0);
  const hours = getNum('hour');
  const minutes = getNum('minute');
  const seconds = getNum('second');

  const elapsedSecondsToday = hours * 3600 + minutes * 60 + seconds;
  const remainingSeconds = Math.max(1, 86400 - elapsedSecondsToday);

  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    dateStr,
    hours,
    minutes,
    seconds,
    formattedTime: `${pad(hours)}:${pad(minutes)}:${pad(seconds)} CAT`,
    msUntilMidnight: remainingSeconds * 1000,
  };
}

export function formatCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

const DAILY_ROTATION_POOL: { gameId: GameId; title: string; subtitle: string; bonusMultiplier: number }[] = [
  { gameId: 'who-am-i', title: 'Who Am I?', subtitle: 'Career Clue Identity', bonusMultiplier: 1.5 },
  { gameId: 'bola-word', title: 'BOLA Word', subtitle: '5-Letter Pitch Puzzle', bonusMultiplier: 1.5 },
  { gameId: 'bola-connections', title: 'BOLA Connections', subtitle: '4x4 Tactical Grouping', bonusMultiplier: 1.5 },
  { gameId: 'bola-trivia', title: 'BOLA Trivia', subtitle: 'Daily Matchday Quiz', bonusMultiplier: 1.5 },
  { gameId: 'mini-crossword', title: 'BOLA Mini Crossword', subtitle: '5x5 Football Grid', bonusMultiplier: 1.5 },
  { gameId: 'match-replay', title: 'Match Replay', subtitle: 'Iconic Timeline Order', bonusMultiplier: 1.5 },
  { gameId: 'bola-letters', title: 'BOLA Letters', subtitle: '7-Letter Captain Hive', bonusMultiplier: 1.5 },
  { gameId: 'bola-letter-box', title: 'BOLA Letter Box', subtitle: '12-Letter Pitch Frame', bonusMultiplier: 1.5 },
];

export function getDailyRotationForDate(lusakaDate: string) {
  let hash = 0;
  for (let i = 0; i < lusakaDate.length; i++) {
    hash = (hash * 31 + lusakaDate.charCodeAt(i)) % 100000;
  }
  const picks: typeof DAILY_ROTATION_POOL = [];
  for (let i = 0; i < 3; i++) {
    picks.push(DAILY_ROTATION_POOL[(hash + i * 3) % DAILY_ROTATION_POOL.length]);
  }
  return picks;
}

export function getDailyArchiveDates(todayLusakaDate: string, days = 7): string[] {
  const [y, m, d] = todayLusakaDate.split('-').map(Number);
  if (!y || !m || !d) return [];
  const baseUtc = Date.UTC(y, m - 1, d, 12, 0, 0);
  const dates: string[] = [];
  for (let i = 1; i <= days; i++) {
    const dt = new Date(baseUtc - i * 86400000);
    dates.push(getLusakaDateString(dt));
  }
  return dates;
}

export function getDailySeedIndex(lusakaDate: string, modulo: number): number {
  let hash = 7;
  for (let i = 0; i < lusakaDate.length; i++) {
    hash = (hash * 37 + lusakaDate.charCodeAt(i)) % 999983;
  }
  return modulo > 0 ? hash % modulo : 0;
}
