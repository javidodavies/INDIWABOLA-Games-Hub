import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Delete, Lightbulb, RefreshCw } from 'lucide-react';
import { BOLA_WORD_BANK, filterByRegion } from '../data/footballData';
import { evaluateWordGuess, WordLetterState } from '../utils/gameRules';
import { soundEngine } from '../utils/sound';
import { GameComponentProps } from './common';

const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'DEL'],
];

export const BolaWordGame: React.FC<GameComponentProps> = ({
  region,
  seedOffset,
  isPaused,
  juniorMode = false,
  onScoreChange,
  onFinish,
}) => {
  const [playMode, setPlayMode] = useState<'daily' | 'practice'>('daily');
  const [wordLength, setWordLength] = useState<5 | 6>(5);
  const [practiceIdx, setPracticeIdx] = useState(0);

  const effectiveLength: 5 | 6 = juniorMode ? 5 : wordLength;

  const pool = useMemo(() => {
    const regional = filterByRegion(BOLA_WORD_BANK, region);
    const sized = regional.filter((w) => w.length === effectiveLength);
    if (sized.length > 0) return sized;
    const fallback = BOLA_WORD_BANK.filter((w) => w.length === effectiveLength);
    return fallback.length > 0 ? fallback : BOLA_WORD_BANK;
  }, [region, effectiveLength]);

  const puzzle =
    playMode === 'daily'
      ? pool[seedOffset % pool.length]
      : pool[(seedOffset + practiceIdx) % pool.length];
  const target = puzzle.word.toUpperCase();

  const [guesses, setGuesses] = useState<{ word: string; evals: WordLetterState[] }[]>([]);
  const [current, setCurrent] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [notice, setNotice] = useState('');
  const [finished, setFinished] = useState(false);

  const hintPenalty = juniorMode ? 0 : 60;
  const possibleScore = Math.max(180, 900 - guesses.length * 120 - (showHint ? hintPenalty : 0));

  useEffect(() => {
    onScoreChange(
      possibleScore,
      `${playMode === 'daily' ? 'Daily' : 'Practice'} ${effectiveLength}L · Attempt ${Math.min(
        6,
        guesses.length + 1
      )}/6`
    );
  }, [possibleScore, guesses.length, playMode, effectiveLength, onScoreChange]);

  const resetRound = useCallback(() => {
    setGuesses([]);
    setCurrent('');
    setShowHint(false);
    setNotice('');
    setFinished(false);
  }, []);

  const handleModeSwitch = (mode: 'daily' | 'practice') => {
    soundEngine.playClick();
    setPlayMode(mode);
    resetRound();
  };

  const handleLengthSwitch = (len: 5 | 6) => {
    if (juniorMode) return;
    soundEngine.playClick();
    setWordLength(len);
    resetRound();
  };

  const handleNextPracticeWord = () => {
    soundEngine.playMove();
    setPlayMode('practice');
    setPracticeIdx((i) => i + 1);
    resetRound();
  };

  const keyStatuses = useMemo(() => {
    const map: Record<string, WordLetterState> = {};
    for (const g of guesses) {
      g.word.split('').forEach((ch, idx) => {
        const nextState = g.evals[idx];
        const prev = map[ch];
        if (prev === 'correct') return;
        if (prev === 'present' && nextState === 'absent') return;
        map[ch] = nextState;
      });
    }
    return map;
  }, [guesses]);

  const submitRow = useCallback(() => {
    if (finished || isPaused) return;
    if (current.length !== effectiveLength) {
      soundEngine.playWrong();
      setNotice(`Enter ${effectiveLength} letters before submitting.`);
      return;
    }
    setNotice('');
    const evals = evaluateWordGuess(current, target);
    const nextGuesses = [...guesses, { word: current, evals }];
    setGuesses(nextGuesses);
    setCurrent('');

    const won = current === target;
    if (won) {
      soundEngine.playVictory();
      setFinished(true);
      const earned = Math.max(
        200,
        900 - (nextGuesses.length - 1) * 120 - (showHint ? hintPenalty : 0) + (effectiveLength === 6 ? 60 : 0)
      );
      const share = nextGuesses
        .map((row) =>
          row.evals.map((e) => (e === 'correct' ? '🟩' : e === 'present' ? '🟨' : '⬛')).join('')
        )
        .join('\n');
      onFinish({
        won: true,
        score: Math.min(900, earned),
        accuracy: Math.round(((7 - nextGuesses.length) / 6) * 100),
        attempts: nextGuesses.length,
        summaryLine: `Decoded ${target} (${effectiveLength}-letter ${playMode}) in ${nextGuesses.length}/6 attempts. ${puzzle.hint}`,
        shareGrid: `BOLA Word (${effectiveLength}L) ${nextGuesses.length}/6\n${share}`,
      });
    } else if (nextGuesses.length >= 6) {
      soundEngine.playWrong();
      setFinished(true);
      const share = nextGuesses
        .map((row) =>
          row.evals.map((e) => (e === 'correct' ? '🟩' : e === 'present' ? '🟨' : '⬛')).join('')
        )
        .join('\n');
      onFinish({
        won: false,
        score: 0,
        accuracy: 0,
        attempts: 6,
        summaryLine: `Full time! The pitch word was ${target}. ${puzzle.hint}`,
        shareGrid: `BOLA Word (${effectiveLength}L) X/6\n${share}`,
      });
    } else {
      soundEngine.playMove();
    }
  }, [
    current,
    effectiveLength,
    finished,
    guesses,
    hintPenalty,
    isPaused,
    onFinish,
    playMode,
    puzzle.hint,
    showHint,
    target,
  ]);

  const handleKey = useCallback(
    (key: string) => {
      if (finished || isPaused) return;
      if (key === 'ENTER') {
        submitRow();
      } else if (key === 'DEL' || key === 'BACKSPACE') {
        soundEngine.playClick();
        setCurrent((c) => c.slice(0, -1));
        setNotice('');
      } else if (/^[A-Z]$/.test(key) && current.length < effectiveLength) {
        soundEngine.playClick();
        setCurrent((c) => c + key);
        setNotice('');
      }
    },
    [current.length, effectiveLength, finished, isPaused, submitRow]
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toUpperCase();
      if (k === 'ENTER' || k === 'BACKSPACE' || /^[A-Z]$/.test(k)) {
        handleKey(k);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleKey]);

  return (
    <div className="w-full max-w-lg flex flex-col items-center gap-4">
      {/* Mode & Difficulty Controls */}
      <div className="w-full flex flex-wrap items-center justify-between gap-2 bg-[#1C1C1C] border border-white/10 rounded-xl p-2.5">
        <div className="flex items-center gap-1">
          {(['daily', 'practice'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => handleModeSwitch(m)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold min-h-[36px] ${
                playMode === m ? 'bg-[#B6FF00] text-[#0A0A0A]' : 'text-white/70 hover:text-white'
              }`}
            >
              {m === 'daily' ? 'Daily Seed' : 'Unlimited Practice'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          {!juniorMode && (
            <div className="flex items-center gap-1 bg-[#0A0A0A] p-0.5 rounded-lg border border-white/10">
              {([5, 6] as const).map((len) => (
                <button
                  key={len}
                  type="button"
                  onClick={() => handleLengthSwitch(len)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold min-h-[32px] ${
                    effectiveLength === len ? 'bg-white text-[#0A0A0A]' : 'text-white/65'
                  }`}
                >
                  {len}L {len === 6 ? 'Expert' : ''}
                </button>
              ))}
            </div>
          )}

          {playMode === 'practice' && (
            <button
              type="button"
              onClick={handleNextPracticeWord}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-semibold min-h-[34px]"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#B6FF00]" />
              <span>New Word</span>
            </button>
          )}
        </div>
      </div>

      <div className="w-full flex items-center justify-between text-xs text-white/65 px-1">
        <span>
          {juniorMode
            ? 'Junior Mode · 5-Letter Pitch Words'
            : region === 'zambia'
            ? 'Zambian Football Lexicon'
            : 'Global Pitch Lexicon'}
        </span>
        <button
          type="button"
          onClick={() => {
            soundEngine.playClick();
            setShowHint(true);
          }}
          disabled={showHint}
          className="inline-flex items-center gap-1.5 text-[#B6FF00] disabled:text-white/40 hover:underline min-h-[36px]"
        >
          <Lightbulb className="w-3.5 h-3.5" />
          <span>
            {showHint
              ? 'Clue Revealed'
              : juniorMode
              ? 'Free Clue'
              : 'Show Clue (-60 pts)'}
          </span>
        </button>
      </div>

      {showHint && (
        <div className="w-full bg-[#1C1C1C] border border-[#B6FF00]/30 rounded-lg px-4 py-2.5 text-xs text-white/85">
          Clue: {puzzle.hint}
        </div>
      )}

      {notice && (
        <div className="text-xs font-medium text-amber-300" role="status">
          {notice}
        </div>
      )}

      {/* 6 x N Board */}
      <div className="grid grid-rows-6 gap-2">
        {Array.from({ length: 6 }, (_, rowIdx) => {
          const submitted = guesses[rowIdx];
          const isCurrent = rowIdx === guesses.length && !finished;
          return (
            <div
              key={rowIdx}
              className={`grid gap-2 ${effectiveLength === 6 ? 'grid-cols-6' : 'grid-cols-5'}`}
            >
              {Array.from({ length: effectiveLength }, (_, colIdx) => {
                const letter = submitted
                  ? submitted.word[colIdx]
                  : isCurrent
                  ? current[colIdx] || ''
                  : '';
                const state = submitted?.evals[colIdx];

                let tileClass = 'bg-[#1C1C1C] border-white/15 text-white';
                let marker = '';
                if (state === 'correct') {
                  tileClass = 'bg-[#B6FF00] border-[#B6FF00] text-[#0A0A0A] animate-tile-pop';
                  marker = '✓';
                } else if (state === 'present') {
                  tileClass = 'bg-amber-400 border-amber-400 text-[#0A0A0A] animate-tile-pop';
                  marker = '•';
                } else if (state === 'absent') {
                  tileClass = 'bg-white/10 border-white/10 text-white/55 animate-tile-pop';
                } else if (letter) {
                  tileClass = 'bg-[#1C1C1C] border-white/45 text-white';
                }

                return (
                  <div
                    key={colIdx}
                    className={`${
                      effectiveLength === 6 ? 'w-11 h-11 sm:w-12 sm:h-12 text-xl' : 'w-12 h-12 sm:w-14 sm:h-14 text-2xl'
                    } rounded-lg border-2 flex items-center justify-center relative font-display font-extrabold transition-colors ${tileClass}`}
                  >
                    <span>{letter}</span>
                    {marker && (
                      <span className="absolute bottom-0.5 right-1 text-[9px] font-sans font-bold opacity-75">
                        {marker}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* On-screen Keyboard */}
      <div className="w-full space-y-1.5 pt-2">
        {KEYBOARD_ROWS.map((row, rIdx) => (
          <div key={rIdx} className="flex justify-center gap-1 sm:gap-1.5">
            {row.map((key) => {
              const status = keyStatuses[key];
              let bg = 'bg-[#1C1C1C] hover:bg-white/15 text-white border-white/15';
              if (status === 'correct') bg = 'bg-[#B6FF00] text-[#0A0A0A] border-[#B6FF00]';
              else if (status === 'present') bg = 'bg-amber-400 text-[#0A0A0A] border-amber-400';
              else if (status === 'absent') bg = 'bg-white/5 text-white/35 border-white/5';

              const isWide = key === 'ENTER' || key === 'DEL';
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleKey(key)}
                  className={`${
                    isWide ? 'px-2.5 sm:px-3.5 text-xs' : 'w-8 sm:w-10 text-sm'
                  } h-12 rounded-md border font-semibold flex items-center justify-center transition-colors ${bg}`}
                >
                  {key === 'DEL' ? <Delete className="w-4 h-4" /> : key}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
