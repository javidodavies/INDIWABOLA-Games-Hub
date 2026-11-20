import React, { useEffect, useState } from 'react';
import { Clock, Eraser, Lightbulb, Pencil, Redo2, Undo2 } from 'lucide-react';
import { isSudokuPlacementValid } from '../utils/gameRules';
import { soundEngine } from '../utils/sound';
import { GameComponentProps } from './common';

type SudokuTier = 'easy' | 'medium' | 'hard';

interface SudokuPreset {
  tier: SudokuTier;
  label: string;
  size: number;
  boxRows: number;
  boxCols: number;
  solution: number[][];
  mask: number[][];
}

const SUDOKU_PRESETS: Record<SudokuTier, SudokuPreset> = {
  easy: {
    tier: 'easy',
    label: 'Easy 4×4',
    size: 4,
    boxRows: 2,
    boxCols: 2,
    solution: [
      [1, 2, 3, 4],
      [3, 4, 1, 2],
      [2, 1, 4, 3],
      [4, 3, 2, 1],
    ],
    mask: [
      [1, 0, 3, 0],
      [0, 4, 0, 2],
      [2, 0, 0, 3],
      [0, 3, 2, 0],
    ],
  },
  medium: {
    tier: 'medium',
    label: 'Medium 6×6',
    size: 6,
    boxRows: 2,
    boxCols: 3,
    solution: [
      [1, 2, 3, 4, 5, 6],
      [4, 5, 6, 1, 2, 3],
      [2, 3, 1, 6, 4, 5],
      [5, 6, 4, 3, 1, 2],
      [3, 1, 2, 5, 6, 4],
      [6, 4, 5, 2, 3, 1],
    ],
    mask: [
      [1, 0, 3, 0, 5, 0],
      [0, 5, 0, 1, 0, 3],
      [2, 0, 0, 6, 4, 0],
      [0, 6, 4, 0, 0, 2],
      [3, 0, 2, 0, 6, 0],
      [0, 4, 0, 2, 0, 1],
    ],
  },
  hard: {
    tier: 'hard',
    label: 'Hard 9×9',
    size: 9,
    boxRows: 3,
    boxCols: 3,
    solution: [
      [5, 3, 4, 6, 7, 8, 9, 1, 2],
      [6, 7, 2, 1, 9, 5, 3, 4, 8],
      [1, 9, 8, 3, 4, 2, 5, 6, 7],
      [8, 5, 9, 7, 6, 1, 4, 2, 3],
      [4, 2, 6, 8, 5, 3, 7, 9, 1],
      [7, 1, 3, 9, 2, 4, 8, 5, 6],
      [9, 6, 1, 5, 3, 7, 2, 8, 4],
      [2, 8, 7, 4, 1, 9, 6, 3, 5],
      [3, 4, 5, 2, 8, 6, 1, 7, 9],
    ],
    mask: [
      [5, 3, 0, 0, 7, 0, 0, 0, 0],
      [6, 0, 0, 1, 9, 5, 0, 0, 0],
      [0, 9, 8, 0, 0, 0, 0, 6, 0],
      [8, 0, 0, 0, 6, 0, 0, 0, 3],
      [4, 0, 0, 8, 0, 3, 0, 0, 1],
      [7, 0, 0, 0, 2, 0, 0, 0, 6],
      [0, 6, 0, 0, 0, 0, 2, 8, 0],
      [0, 0, 0, 4, 1, 9, 0, 0, 5],
      [0, 0, 0, 0, 8, 0, 0, 7, 9],
    ],
  },
};

function cloneBoard(b: number[][]): number[][] {
  return b.map((row) => [...row]);
}

function emptyNotes(size: number): number[][][] {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => []));
}

function buildSeededSudoku(base: SudokuPreset, seed: number): SudokuPreset {
  const s = Math.abs(Math.floor(seed));
  // Deterministic Fisher-Yates using LCG
  let rng = (s * 1664525 + 1013904223) >>> 0;
  const nextRand = (max: number) => {
    rng = (rng * 1664525 + 1013904223) >>> 0;
    return rng % max;
  };
  const permuteArr = <T,>(arr: T[]): T[] => {
    const out = [...arr];
    for (let i = out.length - 1; i > 0; i--) {
      const j = nextRand(i + 1);
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };

  // 1. Digit relabeling 1..size
  const digits = permuteArr(Array.from({ length: base.size }, (_, i) => i + 1));
  const mapVal = (v: number) => (v === 0 ? 0 : digits[v - 1]);

  // 2. Permute rows within each band and bands themselves
  const bandCount = base.size / base.boxRows;
  const bandOrder = permuteArr(Array.from({ length: bandCount }, (_, i) => i));
  const rowOrder: number[] = [];
  for (const b of bandOrder) {
    const rowsInBand = permuteArr(
      Array.from({ length: base.boxRows }, (_, k) => b * base.boxRows + k)
    );
    rowOrder.push(...rowsInBand);
  }

  // 3. Permute cols within each stack and stacks themselves
  const stackCount = base.size / base.boxCols;
  const stackOrder = permuteArr(Array.from({ length: stackCount }, (_, i) => i));
  const colOrder: number[] = [];
  for (const st of stackOrder) {
    const colsInStack = permuteArr(
      Array.from({ length: base.boxCols }, (_, k) => st * base.boxCols + k)
    );
    colOrder.push(...colsInStack);
  }

  const solution = rowOrder.map((r) => colOrder.map((c) => mapVal(base.solution[r][c])));
  const mask = rowOrder.map((r) => colOrder.map((c) => mapVal(base.mask[r][c])));

  return {
    ...base,
    solution,
    mask,
  };
}

export const BolaSudokuGame: React.FC<GameComponentProps> = ({
  seedOffset,
  isPaused,
  juniorMode = false,
  onScoreChange,
  onFinish,
}) => {
  const [tier, setTier] = useState<SudokuTier>(juniorMode ? 'easy' : 'medium');
  const preset = React.useMemo(
    () => buildSeededSudoku(SUDOKU_PRESETS[tier], seedOffset),
    [tier, seedOffset]
  );

  const [board, setBoard] = useState<number[][]>(() => cloneBoard(preset.mask));
  const [notes, setNotes] = useState<number[][][]>(() => emptyNotes(preset.size));
  const [undoStack, setUndoStack] = useState<number[][][]>([]);
  const [redoStack, setRedoStack] = useState<number[][][]>([]);
  const [notesMode, setNotesMode] = useState(false);
  const [selected, setSelected] = useState<{ r: number; c: number } | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [finished, setFinished] = useState(false);

  const baseMax = tier === 'hard' ? 1000 : tier === 'medium' ? 900 : 750;
  const penalty = juniorMode ? 0 : 35;
  const score = Math.max(200, baseMax - mistakes * 35 - hintsUsed * penalty);

  useEffect(() => {
    if (juniorMode && tier !== 'easy') {
      switchTier('easy');
    }
  }, [juniorMode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (finished || isPaused) return;
    const t = window.setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [finished, isPaused]);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  useEffect(() => {
    const total = preset.size * preset.size;
    const filled = board.flat().filter((v) => v > 0).length;
    onScoreChange(score, `${filled}/${total} · ${formatTimer(elapsedSec)}`);
  }, [board, elapsedSec, preset.size, score, onScoreChange]);

  const switchTier = (nextTier: SudokuTier) => {
    const nextPreset = buildSeededSudoku(SUDOKU_PRESETS[nextTier], seedOffset);
    soundEngine.playClick();
    setTier(nextTier);
    setBoard(cloneBoard(nextPreset.mask));
    setNotes(emptyNotes(nextPreset.size));
    setUndoStack([]);
    setRedoStack([]);
    setSelected(null);
    setMistakes(0);
    setHintsUsed(0);
    setElapsedSec(0);
    setFinished(false);
  };

  const commitBoard = (next: number[][]) => {
    setUndoStack((prev) => [...prev.slice(-24), cloneBoard(board)]);
    setRedoStack([]);
    setBoard(next);

    const isSolved = next.every((row, ri) =>
      row.every((val, ci) => val === preset.solution[ri][ci])
    );
    if (isSolved) {
      soundEngine.playVictory();
      setFinished(true);
      onFinish({
        won: true,
        score,
        accuracy: Math.max(50, 100 - mistakes * 6 - hintsUsed * 4),
        attempts: 1 + mistakes,
        summaryLine: `Completed ${preset.label} Sudoku in ${formatTimer(elapsedSec)} (${mistakes} mistakes, ${hintsUsed} hints).`,
        shareGrid: `BOLA Sudoku (${preset.label}) · ${formatTimer(elapsedSec)}\nMistakes: ${mistakes}\n🟩🟩🟩🟩🟩`,
      });
    }
  };

  const placeNumber = (num: number) => {
    if (!selected || finished || isPaused) return;
    const { r, c } = selected;
    if (preset.mask[r][c] !== 0) return;

    if (notesMode && num > 0) {
      soundEngine.playClick();
      setNotes((prev) =>
        prev.map((row, ri) =>
          row.map((cell, ci) => {
            if (ri !== r || ci !== c) return cell;
            return cell.includes(num) ? cell.filter((x) => x !== num) : [...cell, num].sort();
          })
        )
      );
      return;
    }

    if (num === 0) {
      soundEngine.playClick();
      const next = cloneBoard(board);
      next[r][c] = 0;
      setNotes((prev) =>
        prev.map((row, ri) => row.map((cell, ci) => (ri === r && ci === c ? [] : cell)))
      );
      commitBoard(next);
      return;
    }

    const ruleValid = isSudokuPlacementValid(board, r, c, num, preset.boxRows, preset.boxCols);
    if (!ruleValid || num !== preset.solution[r][c]) {
      soundEngine.playWrong();
      setMistakes((m) => m + 1);
    } else {
      soundEngine.playCorrect();
    }

    const next = cloneBoard(board);
    next[r][c] = num;
    setNotes((prev) =>
      prev.map((row, ri) => row.map((cell, ci) => (ri === r && ci === c ? [] : cell)))
    );
    commitBoard(next);
  };

  const handleUndo = () => {
    if (undoStack.length === 0 || finished) return;
    soundEngine.playClick();
    const prev = undoStack[undoStack.length - 1];
    setRedoStack((r) => [...r, cloneBoard(board)]);
    setUndoStack((u) => u.slice(0, -1));
    setBoard(prev);
  };

  const handleRedo = () => {
    if (redoStack.length === 0 || finished) return;
    soundEngine.playClick();
    const next = redoStack[redoStack.length - 1];
    setUndoStack((u) => [...u, cloneBoard(board)]);
    setRedoStack((r) => r.slice(0, -1));
    setBoard(next);
  };

  const handleHint = () => {
    if (finished || isPaused) return;
    let targetR = selected?.r ?? -1;
    let targetC = selected?.c ?? -1;
    if (targetR === -1 || preset.mask[targetR][targetC] !== 0 || board[targetR][targetC] === preset.solution[targetR][targetC]) {
      outer: for (let r = 0; r < preset.size; r++) {
        for (let c = 0; c < preset.size; c++) {
          if (board[r][c] !== preset.solution[r][c]) {
            targetR = r;
            targetC = c;
            break outer;
          }
        }
      }
    }
    if (targetR === -1) return;
    soundEngine.playMove();
    setHintsUsed((h) => h + 1);
    setSelected({ r: targetR, c: targetC });
    const next = cloneBoard(board);
    next[targetR][targetC] = preset.solution[targetR][targetC];
    commitBoard(next);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (finished || isPaused) return;
      const n = Number(e.key);
      if (n >= 1 && n <= preset.size) {
        placeNumber(n);
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        placeNumber(0);
      } else if (e.key.toLowerCase() === 'n') {
        setNotesMode((v) => !v);
      } else if ((e.metaKey || e.ctrlKey || e.key.toLowerCase() === 'z') && !e.shiftKey) {
        handleUndo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const gridColsClass =
    preset.size === 4 ? 'grid-cols-4' : preset.size === 6 ? 'grid-cols-6' : 'grid-cols-9';

  return (
    <div className="w-full max-w-lg space-y-4">
      <div className="bg-[#1C1C1C] border border-white/10 rounded-xl p-4 sm:p-5 space-y-4">
        {/* Difficulty + Timer Row */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1 bg-[#0A0A0A] p-1 rounded-lg border border-white/10">
            {(['easy', 'medium', 'hard'] as SudokuTier[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => switchTier(t)}
                className={`px-2.5 py-1.5 rounded-md text-xs font-semibold min-h-[34px] ${
                  tier === t ? 'bg-[#B6FF00] text-[#0A0A0A]' : 'text-white/70 hover:text-white'
                }`}
              >
                {SUDOKU_PRESETS[t].label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 text-xs font-mono-tabular">
            <span className="text-white/65">Mistakes: {mistakes}</span>
            <span className="inline-flex items-center gap-1 font-bold text-[#B6FF00]">
              <Clock className="w-3.5 h-3.5" />
              {formatTimer(elapsedSec)}
            </span>
          </div>
        </div>

        {/* Sudoku Grid */}
        <div className={`grid ${gridColsClass} gap-1 bg-[#0A0A0A] p-2 rounded-xl border border-white/15`}>
          {board.map((row, r) =>
            row.map((val, c) => {
              const isLocked = preset.mask[r][c] !== 0;
              const isSelected = selected?.r === r && selected?.c === c;
              const ruleViolation =
                val !== 0 && !isSudokuPlacementValid(board, r, c, val, preset.boxRows, preset.boxCols);
              const wrongSolution = val !== 0 && val !== preset.solution[r][c];
              const isConflict = ruleViolation || wrongSolution;

              const boxBorderRight =
                (c + 1) % preset.boxCols === 0 && c < preset.size - 1
                  ? 'border-r-2 border-r-[#B6FF00]/55'
                  : '';
              const boxBorderBottom =
                (r + 1) % preset.boxRows === 0 && r < preset.size - 1
                  ? 'border-b-2 border-b-[#B6FF00]/55'
                  : '';

              const cellNotes = notes[r]?.[c] || [];

              return (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setSelected({ r, c });
                  }}
                  className={`aspect-square ${
                    preset.size === 9 ? 'min-h-[34px] text-sm sm:text-base' : 'min-h-[44px] text-lg'
                  } rounded-md font-mono-tabular font-bold flex items-center justify-center relative transition-colors ${boxBorderRight} ${boxBorderBottom} ${
                    isSelected
                      ? 'bg-[#B6FF00] text-[#0A0A0A]'
                      : isConflict
                      ? 'bg-red-500/25 text-red-300 border border-red-500'
                      : isLocked
                      ? 'bg-white/10 text-white'
                      : 'bg-[#1C1C1C] text-[#B6FF00] hover:bg-white/10'
                  }`}
                >
                  {val > 0 ? (
                    val
                  ) : cellNotes.length > 0 ? (
                    <span className="text-[9px] leading-tight text-white/60 px-0.5 text-center break-all">
                      {cellNotes.join(' ')}
                    </span>
                  ) : (
                    ''
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Utility Toolbar: Notes, Undo, Redo, Hint */}
        <div className="grid grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setNotesMode((v) => !v);
            }}
            className={`min-h-[40px] rounded-lg border text-xs font-semibold inline-flex items-center justify-center gap-1.5 ${
              notesMode
                ? 'bg-[#B6FF00] border-[#B6FF00] text-[#0A0A0A]'
                : 'bg-[#0A0A0A] border-white/15 text-white/80 hover:border-white/40'
            }`}
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>Notes</span>
          </button>
          <button
            type="button"
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            className="min-h-[40px] rounded-lg bg-[#0A0A0A] border border-white/15 disabled:opacity-35 text-xs font-semibold inline-flex items-center justify-center gap-1 text-white/80"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Undo</span>
          </button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            className="min-h-[40px] rounded-lg bg-[#0A0A0A] border border-white/15 disabled:opacity-35 text-xs font-semibold inline-flex items-center justify-center gap-1 text-white/80"
          >
            <Redo2 className="w-3.5 h-3.5" />
            <span>Redo</span>
          </button>
          <button
            type="button"
            onClick={handleHint}
            className="min-h-[40px] rounded-lg bg-[#0A0A0A] border border-amber-400/40 text-xs font-semibold inline-flex items-center justify-center gap-1 text-amber-300"
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span>Hint</span>
          </button>
        </div>

        {/* Number Keypad */}
        <div className="flex flex-wrap justify-center gap-2">
          {Array.from({ length: preset.size }, (_, idx) => idx + 1).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => placeNumber(n)}
              className="w-11 sm:w-12 min-h-[46px] rounded-lg bg-[#0A0A0A] border border-white/15 hover:border-[#B6FF00] font-mono-tabular text-lg font-bold text-white"
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            onClick={() => placeNumber(0)}
            aria-label="Clear cell"
            className="w-12 min-h-[46px] rounded-lg bg-[#0A0A0A] border border-white/15 hover:border-red-400 flex items-center justify-center text-white/75"
          >
            <Eraser className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
