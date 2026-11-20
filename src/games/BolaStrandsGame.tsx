import React, { useEffect, useMemo, useState } from 'react';
import { Lightbulb, RotateCcw, Sparkles } from 'lucide-react';
import { STRANDS_BANK } from '../data/footballData';
import { soundEngine } from '../utils/sound';
import { GameComponentProps } from './common';

interface CellCoord {
  r: number;
  c: number;
}

const BONUS_FOOTBALL_WORDS = new Set([
  'CUP', 'WIN', 'WINN', 'BOL', 'BOLA', 'GOAL', 'PASS', 'SAVE', 'FOUL', 'CLUB',
  'STAR', 'KICK', 'TEAM', 'POST', 'WING', 'LINE', 'BOOT', 'BALL', 'NETS', 'CAGE',
  'CAP', 'SIDE', 'PLAY', 'DRAW', 'AWAY', 'HOME', 'HALF', 'TIME', 'FAST', 'PACE',
  'SHOT', 'CROSS', 'CARD', 'BANE', 'CHIP', 'RUN', 'ACES', 'GIFT', 'LUCK', 'BEST',
]);

function findWordStartInGrid(grid: string[][], word: string): CellCoord | null {
  const rows = grid.length;
  const cols = grid[0]?.length || 0;
  const target = word.toUpperCase();

  const dfs = (r: number, c: number, idx: number, visited: Set<string>): boolean => {
    if (grid[r][c] !== target[idx]) return false;
    if (idx === target.length - 1) return true;
    const nextVisited = new Set(visited);
    nextVisited.add(`${r},${c}`);
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !nextVisited.has(`${nr},${nc}`)) {
          if (dfs(nr, nc, idx + 1, nextVisited)) return true;
        }
      }
    }
    return false;
  };

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === target[0] && dfs(r, c, 0, new Set())) {
        return { r, c };
      }
    }
  }
  return null;
}

export const BolaStrandsGame: React.FC<GameComponentProps> = ({
  region,
  juniorMode = false,
  onScoreChange,
  onFinish,
}) => {
  const availablePuzzles = useMemo(() => {
    if (juniorMode) return [STRANDS_BANK[0]];
    return region === 'zambia' ? STRANDS_BANK : [...STRANDS_BANK].reverse();
  }, [juniorMode, region]);

  const [puzzleIdx, setPuzzleIdx] = useState(0);
  const puzzle = availablePuzzles[puzzleIdx % availablePuzzles.length];

  const [path, setPath] = useState<CellCoord[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [bonusWords, setBonusWords] = useState<string[]>([]);
  const [hintMeter, setHintMeter] = useState<number>(juniorMode ? 3 : 1);
  const [hintedCell, setHintedCell] = useState<CellCoord | null>(null);
  const [lockedCells, setLockedCells] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState('Drag across or tap adjacent letters to trace theme words.');
  const [finished, setFinished] = useState(false);

  const currentWord = path.map((p) => puzzle.grid[p.r][p.c]).join('');
  const score = foundWords.length * 100 + bonusWords.length * 25;

  useEffect(() => {
    onScoreChange(score, `${foundWords.length}/${puzzle.words.length} Words · ${bonusWords.length} Bonus`);
  }, [score, foundWords.length, bonusWords.length, puzzle.words.length, onScoreChange]);

  const switchPuzzle = (idx: number) => {
    soundEngine.playClick();
    setPuzzleIdx(idx);
    setPath([]);
    setIsDragging(false);
    setFoundWords([]);
    setBonusWords([]);
    setHintMeter(juniorMode ? 3 : 1);
    setHintedCell(null);
    setLockedCells(new Set());
    setMessage('Drag across or tap adjacent letters to trace theme words.');
    setFinished(false);
  };

  const isAdjacent = (a: CellCoord, b: CellCoord) =>
    Math.abs(a.r - b.r) <= 1 && Math.abs(a.c - b.c) <= 1 && !(a.r === b.r && a.c === b.c);

  const submitPath = (cells: CellCoord[]) => {
    if (cells.length < 3 || finished) {
      setPath([]);
      return;
    }
    const word = cells.map((p) => puzzle.grid[p.r][p.c]).join('');
    if (puzzle.words.includes(word) && !foundWords.includes(word)) {
      soundEngine.playCorrect();
      const nextFound = [...foundWords, word];
      setFoundWords(nextFound);
      setHintedCell(null);
      const nextLocked = new Set(lockedCells);
      cells.forEach((p) => nextLocked.add(`${p.r},${p.c}`));
      setLockedCells(nextLocked);
      setPath([]);
      setMessage(word === puzzle.spangram ? `Spangram locked: ${word}!` : `Found ${word}!`);

      if (nextFound.length === puzzle.words.length) {
        soundEngine.playVictory();
        setFinished(true);
        const finalScore = Math.min(900, nextFound.length * 100 + bonusWords.length * 25 + 100);
        onFinish({
          won: true,
          score: finalScore,
          accuracy: 100,
          attempts: nextFound.length,
          summaryLine: `Uncovered all ${puzzle.words.length} words (+${bonusWords.length} bonus words) on "${puzzle.theme}"!`,
          shareGrid: `BOLA Strands (${nextFound.length}/${puzzle.words.length})\n🟦🟩🟩🟩🟩🟩🟩🟩`,
        });
      }
      return;
    }

    if (word.length >= 3 && BONUS_FOOTBALL_WORDS.has(word) && !bonusWords.includes(word) && !foundWords.includes(word)) {
      soundEngine.playMove();
      setBonusWords((prev) => [...prev, word]);
      setHintMeter((h) => Math.min(3, h + 1));
      setMessage(`Bonus pitch word "${word}" (+25 pts & +1 Hint Charge)!`);
      setPath([]);
      return;
    }

    soundEngine.playWrong();
    setMessage(
      foundWords.includes(word) || bonusWords.includes(word)
        ? `${word} already found.`
        : `"${word}" is not on the theme sheet.`
    );
    setPath([]);
  };

  useEffect(() => {
    const onGlobalPointerUp = () => {
      if (isDragging) {
        setIsDragging(false);
        if (path.length >= 3) {
          submitPath(path);
        }
      }
    };
    window.addEventListener('pointerup', onGlobalPointerUp);
    return () => window.removeEventListener('pointerup', onGlobalPointerUp);
  });

  const handleCellPointerDown = (r: number, c: number) => {
    if (finished) return;
    const key = `${r},${c}`;
    if (lockedCells.has(key)) return;
    setIsDragging(true);

    const existingIdx = path.findIndex((p) => p.r === r && p.c === c);
    if (existingIdx !== -1) {
      if (existingIdx === path.length - 1 && path.length >= 3) {
        setIsDragging(false);
        submitPath(path);
      } else {
        soundEngine.playClick();
        setPath(path.slice(0, existingIdx + 1));
      }
      return;
    }

    if (path.length === 0 || isAdjacent(path[path.length - 1], { r, c })) {
      soundEngine.playClick();
      setPath([...path, { r, c }]);
    } else {
      soundEngine.playClick();
      setPath([{ r, c }]);
    }
  };

  const handleCellPointerEnter = (r: number, c: number) => {
    if (!isDragging || finished) return;
    const key = `${r},${c}`;
    if (lockedCells.has(key)) return;
    const already = path.some((p) => p.r === r && p.c === c);
    if (already) return;
    const last = path[path.length - 1];
    if (last && isAdjacent(last, { r, c })) {
      soundEngine.playClick();
      setPath((prev) => [...prev, { r, c }]);
    }
  };

  const triggerHint = () => {
    if (finished) return;
    if (!juniorMode && hintMeter < 1) return;
    const missing = puzzle.words.find((w) => !foundWords.includes(w));
    if (!missing) return;
    const coord = findWordStartInGrid(puzzle.grid, missing);
    if (coord) {
      soundEngine.playMove();
      setHintedCell(coord);
      if (!juniorMode) setHintMeter((h) => Math.max(0, h - 1));
      setMessage(`Hint spotlighted the first letter of a ${missing.length}-letter word (${missing[0]}...)!`);
    }
  };

  return (
    <div className="w-full max-w-2xl space-y-4">
      <div className="bg-[#1C1C1C] border border-white/10 rounded-xl p-5 space-y-4">
        {/* Puzzle & Hint Meter Header */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-2xl font-bold">Theme: {puzzle.theme}</h2>
              {availablePuzzles.length > 1 && (
                <div className="flex gap-1">
                  {availablePuzzles.map((p, i) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => switchPuzzle(i)}
                      className={`px-2 py-1 rounded text-[11px] font-bold ${
                        puzzleIdx % availablePuzzles.length === i
                          ? 'bg-[#B6FF00] text-[#0A0A0A]'
                          : 'bg-[#0A0A0A] text-white/60 border border-white/10'
                      }`}
                    >
                      {p.difficulty === 'easy' ? 'Board A' : 'Board B'}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-[#B6FF00] mt-0.5">{message}</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={triggerHint}
              disabled={!juniorMode && hintMeter < 1}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0A0A0A] border border-amber-400/40 disabled:opacity-40 text-xs font-semibold text-amber-300 min-h-[38px]"
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span>{juniorMode ? 'Free Hint' : `Hint (${hintMeter}/3)`}</span>
            </button>
            <span className="font-mono-tabular text-sm font-bold text-white/80">
              {foundWords.length}/{puzzle.words.length}
            </span>
          </div>
        </div>

        {/* Active Word Preview */}
        <div className="h-11 bg-[#0A0A0A] border border-white/10 rounded-lg px-4 flex items-center justify-between">
          <span className="font-display text-2xl font-extrabold tracking-widest text-white">
            {currentWord || '—'}
          </span>
          <div className="flex items-center gap-2">
            {path.length > 0 && (
              <button
                type="button"
                onClick={() => setPath([])}
                className="p-2 text-white/60 hover:text-white"
                aria-label="Clear path"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              disabled={path.length < 3}
              onClick={() => submitPath(path)}
              className="px-4 py-1.5 rounded-md bg-[#B6FF00] disabled:bg-white/10 disabled:text-white/40 text-[#0A0A0A] font-bold text-xs"
            >
              Submit Word
            </button>
          </div>
        </div>

        {/* 6x8 Drag-Capable Letter Grid */}
        <div className="grid grid-cols-8 gap-1.5 sm:gap-2 touch-none select-none">
          {puzzle.grid.map((row, r) =>
            row.map((letter, c) => {
              const key = `${r},${c}`;
              const isLocked = lockedCells.has(key);
              const pathIdx = path.findIndex((p) => p.r === r && p.c === c);
              const isSelected = pathIdx !== -1;
              const isHinted = hintedCell?.r === r && hintedCell?.c === c;

              return (
                <button
                  key={key}
                  type="button"
                  onPointerDown={() => handleCellPointerDown(r, c)}
                  onPointerEnter={() => handleCellPointerEnter(r, c)}
                  className={`aspect-square min-h-[40px] rounded-lg font-display text-xl sm:text-2xl font-extrabold transition-colors ${
                    isLocked
                      ? 'bg-[#B6FF00]/25 border border-[#B6FF00]/60 text-[#B6FF00]'
                      : isSelected
                      ? 'bg-[#B6FF00] text-[#0A0A0A]'
                      : isHinted
                      ? 'bg-amber-400/30 border-2 border-amber-400 text-amber-200 animate-pulse'
                      : 'bg-[#0A0A0A] border border-white/15 text-white hover:border-white/40'
                  }`}
                >
                  {letter}
                </button>
              );
            })
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-white/55 pt-1">
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            <span>Theme Words:</span>
            {puzzle.words.map((w) => (
              <span
                key={w}
                className={foundWords.includes(w) ? 'text-[#B6FF00] font-semibold' : 'text-white/25'}
              >
                {foundWords.includes(w) ? w : '•'.repeat(w.length)}
              </span>
            ))}
          </div>
          {bonusWords.length > 0 && (
            <span className="inline-flex items-center gap-1 text-sky-300 font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              Bonus: {bonusWords.join(', ')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
