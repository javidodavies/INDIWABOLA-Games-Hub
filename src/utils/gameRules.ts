export type WordLetterState = 'correct' | 'present' | 'absent';

export function evaluateWordGuess(guess: string, target: string): WordLetterState[] {
  const len = target.length;
  const g = guess.toUpperCase();
  const t = target.toUpperCase();
  const result: WordLetterState[] = Array(len).fill('absent');
  const used = Array(len).fill(false);

  for (let i = 0; i < len; i++) {
    if (g[i] === t[i]) {
      result[i] = 'correct';
      used[i] = true;
    }
  }
  for (let i = 0; i < len; i++) {
    if (result[i] === 'correct') continue;
    for (let j = 0; j < len; j++) {
      if (!used[j] && g[i] === t[j]) {
        result[i] = 'present';
        used[j] = true;
        break;
      }
    }
  }
  return result;
}

export type FourGoalsCell = 0 | 1 | 2;

export function checkFourGoalsWin(
  board: FourGoalsCell[][]
): { winner: 1 | 2; line: [number, number][] } | null {
  const rows = board.length;
  const cols = board[0]?.length || 0;
  const dirs = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const p = board[r][c];
      if (p === 0) continue;
      for (const [dr, dc] of dirs) {
        const line: [number, number][] = [[r, c]];
        for (let step = 1; step < 4; step++) {
          const nr = r + dr * step;
          const nc = c + dc * step;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc] === p) {
            line.push([nr, nc]);
          } else {
            break;
          }
        }
        if (line.length === 4) {
          return { winner: p, line };
        }
      }
    }
  }
  return null;
}

export function isSudokuPlacementValid(
  board: number[][],
  row: number,
  col: number,
  val: number,
  boxRows: number,
  boxCols: number
): boolean {
  const size = board.length;
  if (val < 1 || val > size) return false;
  for (let i = 0; i < size; i++) {
    if (i !== col && board[row][i] === val) return false;
    if (i !== row && board[i][col] === val) return false;
  }
  const startR = Math.floor(row / boxRows) * boxRows;
  const startC = Math.floor(col / boxCols) * boxCols;
  for (let r = startR; r < startR + boxRows; r++) {
    for (let c = startC; c < startC + boxCols; c++) {
      if ((r !== row || c !== col) && board[r][c] === val) return false;
    }
  }
  return true;
}

export const LUDO_START_TRACK_INDEX = [0, 13, 26, 39];
export const LUDO_SAFE_TRACK_INDICES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

export function getLudoGlobalTrackIndex(cornerIdx: number, progress: number): number | null {
  if (progress < 0 || progress > 50) return null;
  return (LUDO_START_TRACK_INDEX[cornerIdx] + progress) % 52;
}

export function canLudoTokenMove(progress: number, die: number, offsideBlocked = false): boolean {
  if (progress === 56) return false;
  if (offsideBlocked && die > 3) return false;
  if (progress === -1) return die === 6;
  return progress + die <= 56;
}

export function calculateDraftChemistry(
  players: { club: string; nation: string; rating: number }[]
): { baseRating: number; chemistry: number; total: number } {
  const baseRating = players.reduce((s, p) => s + p.rating, 0);
  const clubs: Record<string, number> = {};
  const nations: Record<string, number> = {};
  players.forEach((p) => {
    clubs[p.club] = (clubs[p.club] || 0) + 1;
    nations[p.nation] = (nations[p.nation] || 0) + 1;
  });

  let chemistry = 0;
  Object.values(clubs).forEach((cnt) => {
    if (cnt >= 2) chemistry += (cnt - 1) * 16;
  });
  Object.values(nations).forEach((cnt) => {
    if (cnt >= 2) chemistry += (cnt - 1) * 6;
  });

  return { baseRating, chemistry, total: baseRating + chemistry };
}
