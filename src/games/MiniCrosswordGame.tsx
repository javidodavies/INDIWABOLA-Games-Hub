import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock, Eye } from 'lucide-react';
import { CrosswordData, filterByRegion, VERIFIED_CROSSWORDS } from '../data/footballData';
import { soundEngine } from '../utils/sound';
import { GameComponentProps } from './common';

export const MiniCrosswordGame: React.FC<GameComponentProps> = ({
  region,
  seedOffset,
  isPaused,
  onScoreChange,
  onFinish,
}) => {
  const pool = useMemo(() => {
    const regional = filterByRegion(VERIFIED_CROSSWORDS, region);
    return regional.length >= 2 ? regional : VERIFIED_CROSSWORDS;
  }, [region]);

  const [puzzleIdx, setPuzzleIdx] = useState(() => seedOffset % pool.length);
  const puzzle: CrosswordData = pool[puzzleIdx % pool.length];

  const [entries, setEntries] = useState<string[][]>(() =>
    puzzle.grid.map((row) => row.map((cell) => (cell === null ? '#' : '')))
  );
  const [selected, setSelected] = useState<{ r: number; c: number }>({ r: 0, c: 0 });
  const [direction, setDirection] = useState<'across' | 'down'>('across');
  const [hintsUsed, setHintsUsed] = useState(0);
  const [checkedErrors, setCheckedErrors] = useState<Record<string, boolean>>({});
  const [elapsedSec, setElapsedSec] = useState(0);
  const [finished, setFinished] = useState(false);

  const speedBonus = Math.max(0, Math.min(100, 120 - elapsedSec));
  const currentScore = Math.max(200, Math.min(900, 800 + speedBonus - hintsUsed * 40));

  useEffect(() => {
    if (finished || isPaused) return;
    const timer = window.setInterval(() => {
      setElapsedSec((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [finished, isPaused]);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  useEffect(() => {
    const totalWhite = puzzle.grid.flat().filter(Boolean).length;
    const filled = entries.flat().filter((v) => v && v !== '#').length;
    onScoreChange(currentScore, `${filled}/${totalWhite} · ${formatTimer(elapsedSec)}`);
  }, [currentScore, elapsedSec, entries, puzzle.grid, onScoreChange]);

  const switchPuzzle = (nextIdx: number) => {
    const targetPuzzle = pool[nextIdx % pool.length];
    soundEngine.playClick();
    setPuzzleIdx(nextIdx);
    setEntries(targetPuzzle.grid.map((row) => row.map((cell) => (cell === null ? '#' : ''))));
    setSelected({ r: 0, c: 0 });
    setDirection('across');
    setHintsUsed(0);
    setCheckedErrors({});
    setElapsedSec(0);
    setFinished(false);
  };

  const clueNumbers = useMemo(() => {
    const map: Record<string, number> = {};
    [...puzzle.across, ...puzzle.down].forEach((cl) => {
      map[`${cl.row},${cl.col}`] = cl.number;
    });
    return map;
  }, [puzzle]);

  const moveNext = (r: number, c: number, dir: 'across' | 'down', step: 1 | -1) => {
    let nr = r;
    let nc = c;
    for (let i = 0; i < 25; i++) {
      if (dir === 'across') {
        nc += step;
        if (nc >= 5) {
          nc = 0;
          nr = (nr + 1) % 5;
        } else if (nc < 0) {
          nc = 4;
          nr = (nr + 4) % 5;
        }
      } else {
        nr += step;
        if (nr >= 5) {
          nr = 0;
          nc = (nc + 1) % 5;
        } else if (nr < 0) {
          nr = 4;
          nc = (nc + 4) % 5;
        }
      }
      if (puzzle.grid[nr][nc] !== null) {
        setSelected({ r: nr, c: nc });
        return;
      }
    }
  };

  const checkSolved = (gridToCheck: string[][]) => {
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const expected = puzzle.grid[r][c];
        if (expected !== null && gridToCheck[r][c] !== expected) {
          return false;
        }
      }
    }
    return true;
  };

  const setCellLetter = (r: number, c: number, letter: string) => {
    if (finished || isPaused || puzzle.grid[r][c] === null) return;
    soundEngine.playClick();
    const next = entries.map((row) => [...row]);
    next[r][c] = letter;
    setEntries(next);
    setCheckedErrors((prev) => {
      const copy = { ...prev };
      delete copy[`${r},${c}`];
      return copy;
    });

    if (checkSolved(next)) {
      soundEngine.playVictory();
      setFinished(true);
      onFinish({
        won: true,
        score: currentScore,
        accuracy: Math.max(60, 100 - hintsUsed * 5),
        attempts: 1 + hintsUsed,
        summaryLine: `Solved "${puzzle.title}" in ${formatTimer(elapsedSec)} with ${hintsUsed} hints used.`,
        shareGrid: `Mini Crossword 5x5 (${formatTimer(elapsedSec)})\n🟩🟩🟩🟩🟩\n🟩⬛⬛⬛🟩\n🟩🟩🟩🟩🟩`,
      });
    } else if (letter) {
      moveNext(r, c, direction, 1);
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (finished || isPaused) return;
      const k = e.key.toUpperCase();
      if (/^[A-Z]$/.test(k)) {
        e.preventDefault();
        setCellLetter(selected.r, selected.c, k);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        if (entries[selected.r][selected.c]) {
          setCellLetter(selected.r, selected.c, '');
        } else {
          moveNext(selected.r, selected.c, direction, -1);
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setDirection('across');
        moveNext(selected.r, selected.c, 'across', 1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setDirection('across');
        moveNext(selected.r, selected.c, 'across', -1);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setDirection('down');
        moveNext(selected.r, selected.c, 'down', 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setDirection('down');
        moveNext(selected.r, selected.c, 'down', -1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const handleRevealCell = () => {
    if (finished || isPaused) return;
    const expected = puzzle.grid[selected.r][selected.c];
    if (!expected) return;
    soundEngine.playMove();
    setHintsUsed((h) => h + 1);
    setCellLetter(selected.r, selected.c, expected);
  };

  const handleCheckGrid = () => {
    if (finished || isPaused) return;
    const errs: Record<string, boolean> = {};
    let errCount = 0;
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const exp = puzzle.grid[r][c];
        if (exp && entries[r][c] && entries[r][c] !== exp) {
          errs[`${r},${c}`] = true;
          errCount++;
        }
      }
    }
    setCheckedErrors(errs);
    if (errCount > 0) {
      soundEngine.playWrong();
      setHintsUsed((h) => h + 1);
    } else {
      soundEngine.playCorrect();
    }
  };

  const activeWordClue = useMemo(() => {
    const list = direction === 'across' ? puzzle.across : puzzle.down;
    return (
      list.find((cl) =>
        direction === 'across'
          ? cl.row === selected.r && selected.c >= cl.col && selected.c < cl.col + cl.answer.length
          : cl.col === selected.c && selected.r >= cl.row && selected.r < cl.row + cl.answer.length
      ) || list[0]
    );
  }, [direction, puzzle, selected]);

  return (
    <div className="w-full max-w-4xl space-y-4">
      {/* Edition & Timer Strip */}
      <div className="bg-[#1C1C1C] border border-white/10 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {pool.map((cw, idx) => (
            <button
              key={cw.id}
              type="button"
              onClick={() => switchPuzzle(idx)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold min-h-[36px] ${
                puzzleIdx % pool.length === idx
                  ? 'bg-[#B6FF00] text-[#0A0A0A]'
                  : 'bg-[#0A0A0A] text-white/70 hover:text-white border border-white/10'
              }`}
            >
              {cw.title} ({cw.difficulty})
            </button>
          ))}
        </div>
        <div className="inline-flex items-center gap-1.5 font-mono-tabular text-sm font-bold text-[#B6FF00]">
          <Clock className="w-4 h-4" />
          <span>{formatTimer(elapsedSec)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-6 bg-[#1C1C1C] border border-white/10 rounded-xl p-5 flex flex-col items-center gap-4">
          <div className="w-full flex items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-2xl font-bold">{puzzle.title}</h2>
              <p className="text-xs text-[#B6FF00]">
                {direction.toUpperCase()} {activeWordClue?.number}: {activeWordClue?.clue}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDirection((d) => (d === 'across' ? 'down' : 'across'))}
              className="px-3 py-1.5 rounded-md bg-white/10 text-xs font-semibold hover:bg-white/15 whitespace-nowrap"
            >
              Dir: {direction === 'across' ? 'Across' : 'Down'}
            </button>
          </div>

          {/* 5x5 Grid */}
          <div className="grid grid-cols-5 gap-1.5 bg-[#0A0A0A] p-2.5 rounded-xl border border-white/10">
            {puzzle.grid.map((row, r) =>
              row.map((cell, c) => {
                if (cell === null) {
                  return <div key={`${r}-${c}`} className="w-12 h-12 sm:w-14 sm:h-14 rounded-md bg-[#0A0A0A]" />;
                }
                const isSelected = selected.r === r && selected.c === c;
                const isError = checkedErrors[`${r},${c}`];
                const num = clueNumbers[`${r},${c}`];

                return (
                  <button
                    key={`${r}-${c}`}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setDirection((d) => (d === 'across' ? 'down' : 'across'));
                      } else {
                        setSelected({ r, c });
                      }
                    }}
                    className={`w-12 h-12 sm:w-14 sm:h-14 rounded-md relative flex items-center justify-center font-display text-2xl font-bold transition-colors ${
                      isSelected
                        ? 'bg-[#B6FF00] text-[#0A0A0A]'
                        : isError
                        ? 'bg-red-500/25 border border-red-500 text-red-200'
                        : 'bg-white text-[#0A0A0A] hover:bg-[#F2F2F2]'
                    }`}
                  >
                    {num && (
                      <span className="absolute top-0.5 left-1 font-mono-tabular text-[10px] font-bold opacity-65">
                        {num}
                      </span>
                    )}
                    <span>{entries[r][c]}</span>
                  </button>
                );
              })
            )}
          </div>

          {/* Mobile Letter Bar + Actions */}
          <div className="w-full flex flex-wrap items-center justify-between gap-2.5 pt-1">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCheckGrid}
                className="inline-flex items-center gap-1.5 px-3.5 min-h-[44px] rounded-lg bg-white/10 hover:bg-white/15 text-xs font-semibold"
              >
                <CheckCircle2 className="w-4 h-4 text-[#B6FF00]" />
                <span>Check Letters</span>
              </button>
              <button
                type="button"
                onClick={handleRevealCell}
                className="inline-flex items-center gap-1.5 px-3.5 min-h-[44px] rounded-lg bg-white/10 hover:bg-white/15 text-xs font-semibold"
              >
                <Eye className="w-4 h-4 text-amber-400" />
                <span>Reveal Cell (-40)</span>
              </button>
            </div>
            <input
              type="text"
              aria-label="Mobile letter keyboard input"
              placeholder="Tap to type"
              value=""
              onChange={(e) => {
                const ch = e.target.value.slice(-1).toUpperCase();
                if (/^[A-Z]$/.test(ch)) setCellLetter(selected.r, selected.c, ch);
              }}
              className="w-28 min-h-[44px] px-3 rounded-lg bg-[#0A0A0A] border border-white/20 text-xs text-white placeholder:text-white/40 sm:hidden"
            />
          </div>
        </div>

        {/* Clue Columns */}
        <div className="lg:col-span-6 bg-[#1C1C1C] border border-white/10 rounded-xl p-5 space-y-5">
          <div>
            <h3 className="text-xs font-semibold text-[#B6FF00] mb-2.5">ACROSS</h3>
            <div className="space-y-2">
              {puzzle.across.map((cl) => (
                <button
                  key={`a-${cl.number}`}
                  type="button"
                  onClick={() => {
                    setDirection('across');
                    setSelected({ r: cl.row, c: cl.col });
                  }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors min-h-[44px] ${
                    direction === 'across' && activeWordClue?.number === cl.number
                      ? 'bg-[#B6FF00]/15 text-white border border-[#B6FF00]/50'
                      : 'bg-[#0A0A0A] text-white/75 hover:text-white'
                  }`}
                >
                  <span className="font-mono-tabular font-bold text-[#B6FF00] mr-2">{cl.number}A</span>
                  <span>{cl.clue}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-[#B6FF00] mb-2.5">DOWN</h3>
            <div className="space-y-2">
              {puzzle.down.map((cl) => (
                <button
                  key={`d-${cl.number}`}
                  type="button"
                  onClick={() => {
                    setDirection('down');
                    setSelected({ r: cl.row, c: cl.col });
                  }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors min-h-[44px] ${
                    direction === 'down' && activeWordClue?.number === cl.number
                      ? 'bg-[#B6FF00]/15 text-white border border-[#B6FF00]/50'
                      : 'bg-[#0A0A0A] text-white/75 hover:text-white'
                  }`}
                >
                  <span className="font-mono-tabular font-bold text-[#B6FF00] mr-2">{cl.number}D</span>
                  <span>{cl.clue}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
