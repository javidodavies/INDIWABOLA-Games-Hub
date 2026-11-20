import React, { useEffect, useState } from 'react';
import { Flame, ArrowRight } from 'lucide-react';
import { soundEngine } from '../utils/sound';
import { GameComponentProps } from './common';

const TileSvgIcon: React.FC<{ id: number; active: boolean }> = ({ id, active }) => {
  const stroke = active ? '#0A0A0A' : undefined;
  switch (id) {
    case 0: // Football
      return (
        <svg viewBox="0 0 32 32" className="w-7 h-7" fill="none" aria-hidden="true">
          <circle cx="16" cy="16" r="11" stroke={stroke || '#FFFFFF'} strokeWidth="2.2" />
          <polygon points="16,9 21,13 19,19 13,19 11,13" fill={stroke || '#FFFFFF'} />
          <path d="M16 5V9M26 13L21 13M22 24L19 19M10 24L13 19M6 13L11 13" stroke={stroke || '#FFFFFF'} strokeWidth="1.6" />
        </svg>
      );
    case 1: // Trophy
      return (
        <svg viewBox="0 0 32 32" className="w-7 h-7" fill="none" aria-hidden="true">
          <path d="M9 6H23V14C23 18 20 21 16 21C12 21 9 18 9 14V6Z" stroke={stroke || '#FBBF24'} strokeWidth="2.2" fill={active ? 'none' : 'rgba(251,191,36,0.2)'} />
          <path d="M9 8H5V12C5 14 7 15 9 15M23 8H27V12C27 14 25 15 23 15" stroke={stroke || '#FBBF24'} strokeWidth="2" strokeLinecap="round" />
          <path d="M16 21V26M11 26H21" stroke={stroke || '#FBBF24'} strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
    case 2: // Club Jersey
      return (
        <svg viewBox="0 0 32 32" className="w-7 h-7" fill="none" aria-hidden="true">
          <path d="M11 6L6 10L9 15L11 13V26H21V13L23 15L26 10L21 6L18 8H14L11 6Z" stroke={stroke || '#38BDF8'} strokeWidth="2.1" fill={active ? 'none' : 'rgba(56,189,248,0.2)'} strokeLinejoin="round" />
          <text x="16" y="20" textAnchor="middle" fontSize="8" fontWeight="bold" fill={stroke || '#38BDF8'}>11</text>
        </svg>
      );
    case 3: // Striker Silhouette
      return (
        <svg viewBox="0 0 32 32" className="w-7 h-7" fill="none" aria-hidden="true">
          <circle cx="16" cy="8" r="3.5" fill={stroke || '#B6FF00'} />
          <path d="M10 15L16 13L23 16M16 13L14 21L9 26M15 20L21 26" stroke={stroke || '#B6FF00'} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    default: // Stadium Floodlight
      return (
        <svg viewBox="0 0 32 32" className="w-7 h-7" fill="none" aria-hidden="true">
          <ellipse cx="16" cy="21" rx="11" ry="5.5" stroke={stroke || '#FB7185'} strokeWidth="2" />
          <path d="M8 10H12L11 16M20 10H24L21 16M16 6V15" stroke={stroke || '#FB7185'} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
  }
};

const SYMBOLS = [
  { id: 0, name: 'Match Ball', bg: 'bg-white/10 border-white/25' },
  { id: 1, name: 'Trophy', bg: 'bg-amber-400/15 border-amber-400/50' },
  { id: 2, name: 'Club Jersey', bg: 'bg-sky-400/15 border-sky-400/50' },
  { id: 3, name: 'Player', bg: 'bg-[#B6FF00]/15 border-[#B6FF00]/60' },
  { id: 4, name: 'Stadium', bg: 'bg-rose-400/15 border-rose-400/50' },
];

const LEVELS = [
  { level: 1, target: 600, moves: 15, label: 'Level 1 · Cup Qualifier' },
  { level: 2, target: 950, moves: 16, label: 'Level 2 · Semi-Final' },
  { level: 3, target: 1350, moves: 18, label: 'Level 3 · Championship Final' },
];

const SIZE = 6;

function findMatches(grid: number[][]): Set<string> {
  const matched = new Set<string>();
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c <= SIZE - 3; c++) {
      const v = grid[r][c];
      if (v >= 0 && v === grid[r][c + 1] && v === grid[r][c + 2]) {
        matched.add(`${r},${c}`);
        matched.add(`${r},${c + 1}`);
        matched.add(`${r},${c + 2}`);
      }
    }
  }
  for (let c = 0; c < SIZE; c++) {
    for (let r = 0; r <= SIZE - 3; r++) {
      const v = grid[r][c];
      if (v >= 0 && v === grid[r + 1][c] && v === grid[r + 2][c]) {
        matched.add(`${r},${c}`);
        matched.add(`${r + 1},${c}`);
        matched.add(`${r + 2},${c}`);
      }
    }
  }
  return matched;
}

function createCleanBoard(): number[][] {
  const grid = Array.from({ length: SIZE }, () =>
    Array.from({ length: SIZE }, () => Math.floor(Math.random() * SYMBOLS.length))
  );
  let safety = 0;
  while (findMatches(grid).size > 0 && safety < 25) {
    const m = findMatches(grid);
    m.forEach((k) => {
      const [r, c] = k.split(',').map(Number);
      grid[r][c] = Math.floor(Math.random() * SYMBOLS.length);
    });
    safety++;
  }
  return grid;
}

export const BolaTilesGame: React.FC<GameComponentProps> = ({
  onScoreChange,
  onFinish,
}) => {
  const [levelIdx, setLevelIdx] = useState(0);
  const currentLevel = LEVELS[levelIdx];

  const [grid, setGrid] = useState<number[][]>(() => createCleanBoard());
  const [selected, setSelected] = useState<{ r: number; c: number } | null>(null);
  const [movesLeft, setMovesLeft] = useState(currentLevel.moves);
  const [score, setScore] = useState(0);
  const [lastCombo, setLastCombo] = useState<number>(0);
  const [levelCleared, setLevelCleared] = useState(false);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    onScoreChange(score, `Lvl ${currentLevel.level} · ${movesLeft} Moves · Target ${currentLevel.target}`);
  }, [score, movesLeft, currentLevel, onScoreChange]);

  const finishMatch = (finalScore: number, won: boolean, movesUsedTotal: number) => {
    setFinished(true);
    if (won) soundEngine.playVictory();
    else soundEngine.playWrong();
    onFinish({
      won,
      score: Math.min(1500, finalScore),
      accuracy: Math.min(100, Math.round((finalScore / currentLevel.target) * 100)),
      attempts: Math.max(1, movesUsedTotal),
      summaryLine: won
        ? `Cleared ${currentLevel.label} with ${finalScore} combo points!`
        : `Full time on ${currentLevel.label} at ${finalScore} points (target ${currentLevel.target}).`,
      shareGrid: `BOLA Tiles (${currentLevel.label}): ${finalScore} pts\n${won ? '🟩🟩🟩🟩🟩' : '🟨🟨🟨⬛⬛'}`,
    });
  };

  const advanceNextLevel = () => {
    if (levelIdx >= LEVELS.length - 1) return;
    const nextLvl = LEVELS[levelIdx + 1];
    soundEngine.playWhistle();
    setLevelIdx(levelIdx + 1);
    setGrid(createCleanBoard());
    setSelected(null);
    setMovesLeft(nextLvl.moves);
    setLastCombo(0);
    setLevelCleared(false);
  };

  const resolveBoard = (initial: number[][], currentScore: number, nextMoves: number) => {
    const working = initial.map((r) => [...r]);
    let gained = 0;
    let combo = 0;

    while (true) {
      const matches = findMatches(working);
      if (matches.size === 0) break;
      combo++;
      gained += matches.size * 30 * combo;
      matches.forEach((k) => {
        const [r, c] = k.split(',').map(Number);
        working[r][c] = -1;
      });

      for (let c = 0; c < SIZE; c++) {
        const colVals: number[] = [];
        for (let r = SIZE - 1; r >= 0; r--) {
          if (working[r][c] !== -1) colVals.push(working[r][c]);
        }
        for (let r = SIZE - 1; r >= 0; r--) {
          const val = colVals[SIZE - 1 - r];
          working[r][c] = val !== undefined ? val : Math.floor(Math.random() * SYMBOLS.length);
        }
      }
    }

    const totalScore = currentScore + gained;
    setGrid(working);
    setScore(totalScore);
    setLastCombo(combo);

    if (gained > 0) soundEngine.playCorrect();

    if (totalScore >= currentLevel.target) {
      if (levelIdx < LEVELS.length - 1) {
        soundEngine.playVictory();
        setLevelCleared(true);
      } else {
        finishMatch(totalScore, true, currentLevel.moves - nextMoves);
      }
      return;
    }

    if (nextMoves <= 0) {
      finishMatch(totalScore, false, currentLevel.moves);
    }
  };

  const handleTileClick = (r: number, c: number) => {
    if (finished || levelCleared) return;
    if (!selected) {
      soundEngine.playClick();
      setSelected({ r, c });
      return;
    }
    if (selected.r === r && selected.c === c) {
      setSelected(null);
      return;
    }

    const isAdjacent = Math.abs(selected.r - r) + Math.abs(selected.c - c) === 1;
    if (!isAdjacent) {
      soundEngine.playClick();
      setSelected({ r, c });
      return;
    }

    const swapped = grid.map((row) => [...row]);
    const tmp = swapped[r][c];
    swapped[r][c] = swapped[selected.r][selected.c];
    swapped[selected.r][selected.c] = tmp;

    if (findMatches(swapped).size === 0) {
      soundEngine.playWrong();
      setSelected(null);
      return;
    }

    soundEngine.playMove();
    const nextMoves = movesLeft - 1;
    setMovesLeft(nextMoves);
    setSelected(null);
    resolveBoard(swapped, score, nextMoves);
  };

  return (
    <div className="w-full max-w-md space-y-4">
      <div className="bg-[#1C1C1C] border border-white/10 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div>
            <div className="font-bold text-white">{currentLevel.label}</div>
            <div className="text-white/60 font-mono-tabular">
              Score {score} / {currentLevel.target} pts
            </div>
          </div>
          <div className="flex items-center gap-2">
            {lastCombo >= 2 && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#B6FF00] text-[#0A0A0A] font-bold animate-tile-pop">
                <Flame className="w-3.5 h-3.5" />
                ×{lastCombo} Cascade
              </span>
            )}
            <span className="font-mono-tabular font-bold text-[#B6FF00]">
              Moves: {movesLeft}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 rounded-full bg-[#0A0A0A] overflow-hidden">
          <div
            className="h-full bg-[#B6FF00] transition-all duration-300"
            style={{ width: `${Math.min(100, Math.round((score / currentLevel.target) * 100))}%` }}
          />
        </div>

        {levelCleared ? (
          <div className="bg-[#0A0A0A] border border-[#B6FF00]/50 rounded-xl p-5 text-center space-y-3 animate-tile-pop">
            <div className="text-xs font-bold uppercase text-[#B6FF00]">Stage Complete</div>
            <h3 className="font-display text-2xl font-extrabold text-white">
              {currentLevel.label} Cleared!
            </h3>
            <p className="text-xs text-white/70">
              Advance to {LEVELS[levelIdx + 1].label} with fresh moves or bank your {score} points now.
            </p>
            <div className="flex flex-wrap gap-2 justify-center pt-1">
              <button
                type="button"
                onClick={advanceNextLevel}
                className="inline-flex items-center gap-1.5 px-4 min-h-[44px] rounded-lg bg-[#B6FF00] text-[#0A0A0A] font-bold text-xs"
              >
                <span>Advance to Level {levelIdx + 2}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => finishMatch(score, true, currentLevel.moves - movesLeft)}
                className="px-4 min-h-[44px] rounded-lg bg-white/10 hover:bg-white/15 text-white font-semibold text-xs"
              >
                Claim {score} pts & Finish
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-6 gap-2 bg-[#0A0A0A] p-2.5 rounded-xl border border-white/10">
            {grid.map((row, r) =>
              row.map((val, c) => {
                const sym = SYMBOLS[val] || SYMBOLS[0];
                const isSelected = selected?.r === r && selected?.c === c;
                return (
                  <button
                    key={`${r}-${c}`}
                    type="button"
                    onClick={() => handleTileClick(r, c)}
                    aria-label={sym.name}
                    className={`aspect-square min-h-[44px] rounded-lg border flex items-center justify-center transition-transform ${
                      isSelected
                        ? 'bg-[#B6FF00] border-[#B6FF00] scale-95'
                        : `${sym.bg} hover:scale-[1.03]`
                    }`}
                  >
                    <TileSvgIcon id={sym.id} active={isSelected} />
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};
