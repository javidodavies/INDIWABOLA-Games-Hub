import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Delete,
  Lightbulb,
  RotateCcw,
  RotateCw,
  Undo2,
} from 'lucide-react';
import { FOOTBALL_VOCAB_SET, WORD_DICTIONARY } from '../data/wordDictionary';
import { soundEngine } from '../utils/sound';
import {
  findLetterBoxHintWords,
  generateLetterBoxPuzzle,
  getAllBoardLetters,
  getLetterSide,
  isValidLetterBoxWord,
  LetterBoxBoard,
  scoreLetterBoxChain,
} from '../utils/wordPuzzles';
import { GameComponentProps } from './common';

type LetterBoxMode = 'daily' | 'practice' | 'timed' | 'expert';

// Exact SVG coordinates (0..100) matching the 4 sides × 3 letters around the pitch frame
function getLetterPoint(board: LetterBoxBoard, ch: string): { x: number; y: number } | null {
  const upper = ch.toUpperCase();
  const offsets = [26, 50, 74];
  for (let s = 0; s < 4; s++) {
    const idx = board.sides[s].indexOf(upper);
    if (idx === -1) continue;
    const pos = offsets[idx];
    if (s === 0) return { x: pos, y: 12 }; // Top
    if (s === 1) return { x: 88, y: pos }; // Right
    if (s === 2) return { x: pos, y: 88 }; // Bottom
    return { x: 12, y: pos }; // Left
  }
  return null;
}

export const BolaLetterBoxGame: React.FC<GameComponentProps> = ({
  seedOffset,
  isPaused,
  juniorMode = false,
  onScoreChange,
  onFinish,
}) => {
  const [mode, setMode] = useState<LetterBoxMode>('daily');
  const [practiceStep, setPracticeStep] = useState(0);

  const activeSeed =
    mode === 'daily'
      ? seedOffset
      : seedOffset + practiceStep * 3 + (mode === 'expert' ? 7 : mode === 'timed' ? 4 : 1);

  const puzzle = useMemo(
    () => generateLetterBoxPuzzle(activeSeed, juniorMode, mode === 'expert'),
    [activeSeed, juniorMode, mode]
  );

  const boardLetters = useMemo(() => getAllBoardLetters(puzzle.board), [puzzle.board]);

  const [submittedWords, setSubmittedWords] = useState<string[]>([]);
  const [currentWord, setCurrentWord] = useState('');
  const [feedback, setFeedback] = useState<{ text: string; tone: 'good' | 'bad' | 'info' } | null>(null);
  const [hintText, setHintText] = useState<string | null>(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [timeLeftSec, setTimeLeftSec] = useState(180);
  const [finished, setFinished] = useState(false);

  // Reset board cleanly whenever puzzle or mode changes
  useEffect(() => {
    setSubmittedWords([]);
    setCurrentWord('');
    setFeedback(null);
    setHintText(null);
    setHintsUsed(0);
    setTimeLeftSec(180);
    setFinished(false);
  }, [puzzle]);

  const prevWord = submittedWords.length > 0 ? submittedWords[submittedWords.length - 1] : undefined;
  const requiredStartLetter = prevWord ? prevWord[prevWord.length - 1] : null;

  // Keep draft synchronized with requiredStartLetter when a previous word exists
  const activeDraft =
    currentWord.length > 0 ? currentWord : requiredStartLetter ? requiredStartLetter : '';

  const coveredSet = useMemo(() => {
    const s = new Set<string>();
    for (const w of submittedWords) {
      for (const ch of w) s.add(ch);
    }
    return s;
  }, [submittedWords]);

  const draftSet = useMemo(() => new Set(activeDraft.split('')), [activeDraft]);

  const lastTypedChar = activeDraft.length > 0 ? activeDraft[activeDraft.length - 1] : null;
  const lockedSide = lastTypedChar ? getLetterSide(puzzle.board, lastTypedChar) : -1;

  const projectedScore = useMemo(() => {
    if (coveredSet.size < 12) return 0;
    return scoreLetterBoxChain({
      wordsCount: submittedWords.length,
      completed: true,
      isTimed: mode === 'timed',
      timeLeftSec,
      hintsUsed,
      juniorMode,
    });
  }, [coveredSet.size, hintsUsed, juniorMode, mode, submittedWords.length, timeLeftSec]);

  useEffect(() => {
    const label =
      mode === 'timed'
        ? `${coveredSet.size}/12 · ${timeLeftSec}s`
        : `${coveredSet.size}/12 Letters · ${submittedWords.length}w`;
    onScoreChange(projectedScore, label);
  }, [coveredSet.size, mode, onScoreChange, projectedScore, submittedWords.length, timeLeftSec]);

  const finishIncomplete = useCallback(
    (reasonLine: string) => {
      if (finished) return;
      setFinished(true);
      soundEngine.playWrong();
      onFinish({
        won: false,
        score: 0,
        accuracy: Math.round((coveredSet.size / 12) * 100),
        attempts: Math.max(1, submittedWords.length),
        summaryLine: `${reasonLine} Covered ${coveredSet.size}/12 letters (0 competitive pts for incomplete puzzle).`,
        shareGrid: `BOLA Letter Box · Incomplete (${coveredSet.size}/12)\nSample Par: ${puzzle.parWords} words`,
        verificationPayload: {
          seed: activeSeed,
          juniorMode,
          expertMode: mode === 'expert',
          isTimed: mode === 'timed',
          timeLeftSec,
          hintsUsed,
          words: submittedWords,
        },
      });
    },
    [
      activeSeed,
      coveredSet.size,
      finished,
      hintsUsed,
      juniorMode,
      mode,
      onFinish,
      puzzle.parWords,
      submittedWords,
      timeLeftSec,
    ]
  );

  // Timed challenge countdown
  useEffect(() => {
    if (mode !== 'timed' || finished || isPaused) return;
    if (timeLeftSec <= 0) {
      finishIncomplete('Time expired before all 12 letters were covered.');
      return;
    }
    const timer = window.setInterval(() => {
      setTimeLeftSec((t) => Math.max(0, t - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [finishIncomplete, finished, isPaused, mode, timeLeftSec]);

  const selectLetter = useCallback(
    (ch: string) => {
      if (finished || isPaused) return;
      const upper = ch.toUpperCase();
      const side = getLetterSide(puzzle.board, upper);
      if (side === -1) {
        soundEngine.playWrong();
        setFeedback({ text: `"${upper}" is not on this pitch frame.`, tone: 'bad' });
        return;
      }

      if (activeDraft.length === 0) {
        soundEngine.playClick();
        setCurrentWord(upper);
        setFeedback(null);
        return;
      }

      if (side === lockedSide) {
        soundEngine.playWrong();
        setFeedback({
          text: `Same touchline blocked! Pick a letter from one of the other 3 sides.`,
          tone: 'bad',
        });
        return;
      }

      if (activeDraft.length >= 14) return;
      soundEngine.playClick();
      setCurrentWord(activeDraft + upper);
      setFeedback(null);
    },
    [activeDraft, finished, isPaused, lockedSide, puzzle.board]
  );

  const backspaceLetter = useCallback(() => {
    if (finished || isPaused) return;
    // Cannot erase the chained mandatory starting letter if locked to prevWord
    const minLen = requiredStartLetter ? 1 : 0;
    if (activeDraft.length <= minLen) return;
    soundEngine.playClick();
    setCurrentWord(activeDraft.slice(0, -1));
  }, [activeDraft, finished, isPaused, requiredStartLetter]);

  const undoLastWord = () => {
    if (finished || isPaused || submittedWords.length === 0) return;
    soundEngine.playClick();
    const removed = submittedWords[submittedWords.length - 1];
    setSubmittedWords((prev) => prev.slice(0, -1));
    setCurrentWord('');
    setFeedback({ text: `Removed "${removed}" from chain.`, tone: 'info' });
  };

  const resetChain = () => {
    if (finished || isPaused) return;
    soundEngine.playClick();
    setSubmittedWords([]);
    setCurrentWord('');
    setHintText(null);
    setFeedback({ text: 'Chain cleared back to kickoff.', tone: 'info' });
  };

  const submitWord = useCallback(() => {
    if (finished || isPaused) return;
    const candidate = activeDraft.trim().toUpperCase();
    if (!candidate) return;

    if (submittedWords.includes(candidate)) {
      soundEngine.playWrong();
      setFeedback({ text: `"${candidate}" was already used in this chain.`, tone: 'bad' });
      return;
    }

    const check = isValidLetterBoxWord(puzzle.board, candidate, prevWord, WORD_DICTIONARY);
    if (!check.valid) {
      soundEngine.playWrong();
      setFeedback({ text: check.reason || 'Invalid transition or word.', tone: 'bad' });
      return;
    }

    const nextWords = [...submittedWords, check.cleanWord];
    const nextCovered = new Set<string>();
    for (const w of nextWords) {
      for (const ch of w) nextCovered.add(ch);
    }

    const isFootball = FOOTBALL_VOCAB_SET.has(check.cleanWord);
    setSubmittedWords(nextWords);
    setCurrentWord('');
    setHintText(null);

    if (nextCovered.size === 12) {
      const finalScore = scoreLetterBoxChain({
        wordsCount: nextWords.length,
        completed: true,
        isTimed: mode === 'timed',
        timeLeftSec,
        hintsUsed,
        juniorMode,
      });
      soundEngine.playVictory();
      setFinished(true);
      setFeedback({
        text: `All 12 letters solved in ${nextWords.length} word${nextWords.length === 1 ? '' : 's'}! (+${finalScore} pts)`,
        tone: 'good',
      });

      const footballHits = nextWords.filter((w) => FOOTBALL_VOCAB_SET.has(w)).length;
      window.setTimeout(() => {
        onFinish({
          won: true,
          score: finalScore,
          accuracy: Math.min(100, Math.round((puzzle.parWords / nextWords.length) * 100)),
          attempts: nextWords.length,
          summaryLine: `Completed 12/12 pitch frame in ${nextWords.length} word${nextWords.length === 1 ? '' : 's'} (Par ${puzzle.parWords})${footballHits > 0 ? ` · ${footballHits} football bonus term${footballHits === 1 ? '' : 's'}` : ''}.`,
          shareGrid: `BOLA Letter Box · ${nextWords.length} Words (Par ${puzzle.parWords})\n${nextWords.map(() => '🟩').join('')} 12/12`,
          verificationPayload: {
            seed: activeSeed,
            juniorMode,
            expertMode: mode === 'expert',
            isTimed: mode === 'timed',
            timeLeftSec,
            hintsUsed,
            words: nextWords,
          },
        });
      }, 950);
    } else {
      soundEngine.playCorrect();
      setFeedback({
        text: isFootball
          ? `Football word "${check.cleanWord}" chained! Next starts with "${check.cleanWord[check.cleanWord.length - 1]}".`
          : `"${check.cleanWord}" chained (${nextCovered.size}/12). Next starts with "${check.cleanWord[check.cleanWord.length - 1]}".`,
        tone: 'good',
      });
    }
  }, [
    activeDraft,
    activeSeed,
    finished,
    hintsUsed,
    isPaused,
    juniorMode,
    mode,
    onFinish,
    prevWord,
    puzzle.board,
    puzzle.parWords,
    submittedWords,
    timeLeftSec,
  ]);

  const handleHint = () => {
    if (finished || isPaused) return;
    const uncovered = new Set(boardLetters.filter((l) => !coveredSet.has(l)));
    const suggestions = findLetterBoxHintWords(
      puzzle.board,
      prevWord,
      submittedWords,
      uncovered,
      puzzle.sampleSolution,
      3
    );
    if (suggestions.length === 0) {
      setFeedback({ text: 'No direct continuation left—try Undo Word to reroute!', tone: 'info' });
      return;
    }
    soundEngine.playMove();
    setHintsUsed((h) => h + 1);
    const tip = suggestions[0];
    setHintText(
      `Hint: Try "${tip.slice(0, 3)}..." (${tip.length} letters, starts on "${tip[0]}")`
    );
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (finished || isPaused) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key.toUpperCase();
      if (/^[A-Z]$/.test(key) && key.length === 1) {
        e.preventDefault();
        selectLetter(key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        backspaceLetter();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        submitWord();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [backspaceLetter, finished, isPaused, selectLetter, submitWord]);

  // Precompute SVG polylines for submitted chain + active draft
  const submittedSegments = useMemo(() => {
    return submittedWords.map((w) => {
      const pts = w
        .split('')
        .map((ch) => getLetterPoint(puzzle.board, ch))
        .filter((p): p is { x: number; y: number } => Boolean(p));
      return pts.map((p) => `${p.x},${p.y}`).join(' ');
    });
  }, [puzzle.board, submittedWords]);

  const activePoints = useMemo(() => {
    return activeDraft
      .split('')
      .map((ch) => getLetterPoint(puzzle.board, ch))
      .filter((p): p is { x: number; y: number } => Boolean(p));
  }, [activeDraft, puzzle.board]);

  const renderSideButton = (ch: string) => {
    const side = getLetterSide(puzzle.board, ch);
    const isCurrentLast = lastTypedChar === ch;
    const isSideLocked = lockedSide !== -1 && side === lockedSide;
    const isCovered = coveredSet.has(ch) || draftSet.has(ch);

    return (
      <button
        key={ch}
        type="button"
        onClick={() => selectLetter(ch)}
        aria-label={`Select letter ${ch}${isSideLocked ? ' (same side disabled)' : ''}`}
        className={`w-12 h-12 sm:w-13 sm:h-13 rounded-full font-display text-xl font-extrabold flex items-center justify-center relative transition-all active:scale-95 ${
          isCurrentLast
            ? 'bg-[#B6FF00] text-[#0A0A0A] ring-4 ring-[#B6FF00]/30 scale-105'
            : isSideLocked
            ? 'bg-[#0A0A0A] border border-white/10 text-white/30 cursor-not-allowed'
            : isCovered
            ? 'bg-[#1C1C1C] border-2 border-[#B6FF00] text-[#B6FF00]'
            : 'bg-[#0A0A0A] border-2 border-white/35 hover:border-[#B6FF00] text-white'
        }`}
      >
        {ch}
        {coveredSet.has(ch) && !isCurrentLast && (
          <span
            className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#B6FF00] border border-[#0A0A0A]"
            aria-hidden="true"
          />
        )}
      </button>
    );
  };

  return (
    <div className="w-full max-w-4xl space-y-5">
      {/* Mode & Controls Header */}
      <div className="bg-[#1C1C1C] border border-white/10 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 bg-[#0A0A0A] p-1 rounded-lg border border-white/10">
          {(
            [
              { id: 'daily', label: 'Daily Box' },
              { id: 'practice', label: 'Practice' },
              { id: 'timed', label: 'Timed 180s' },
              { id: 'expert', label: 'Expert' },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setMode(m.id);
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold min-h-[36px] transition-colors ${
                mode === m.id ? 'bg-[#B6FF00] text-[#0A0A0A]' : 'text-white/70 hover:text-white'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="text-white/60 hidden sm:inline">
            {puzzle.title} · Par {puzzle.parWords} words
          </span>
          {mode !== 'daily' && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setPracticeStep((s) => s + 1);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/15 font-semibold text-white min-h-[36px]"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>New Frame</span>
            </button>
          )}
          {mode === 'timed' && (
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-mono-tabular font-bold border ${
                timeLeftSec <= 25
                  ? 'bg-red-500/20 border-red-400 text-red-300'
                  : 'bg-[#0A0A0A] border-white/15 text-[#B6FF00]'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{timeLeftSec}s</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Interactive 12-Letter Pitch Square */}
        <div className="lg:col-span-7 bg-[#1C1C1C] border border-white/10 rounded-xl p-5 sm:p-6 space-y-4">
          {/* Active Word Input Display */}
          <div className="min-h-[54px] rounded-xl bg-[#0A0A0A] border border-white/15 px-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1 font-display text-2xl sm:text-3xl font-extrabold tracking-widest text-white">
              {activeDraft ? (
                activeDraft.split('').map((ch, idx) => (
                  <span
                    key={`${ch}-${idx}`}
                    className={
                      idx === 0 && requiredStartLetter
                        ? 'text-[#B6FF00]'
                        : 'text-white'
                    }
                  >
                    {ch}
                  </span>
                ))
              ) : (
                <span className="text-sm font-sans font-normal tracking-normal text-white/40">
                  Tap letters across different sides
                </span>
              )}
              {!finished && <span className="w-0.5 h-6 bg-[#B6FF00] animate-pulse ml-0.5" />}
            </div>
            <span className="font-mono-tabular text-xs text-white/55 shrink-0">
              {coveredSet.size}/12 Covered
            </span>
          </div>

          {/* Feedback / Rule Hint */}
          <div className="min-h-[26px] flex items-center justify-center text-center">
            {feedback ? (
              <span
                className={`text-xs font-semibold px-3 py-1 rounded-md ${
                  feedback.tone === 'good'
                    ? 'bg-[#B6FF00]/15 text-[#B6FF00]'
                    : feedback.tone === 'bad'
                    ? 'bg-red-500/15 text-red-300'
                    : 'bg-white/10 text-white/80'
                }`}
                role="status"
              >
                {feedback.text}
              </span>
            ) : hintText ? (
              <span className="text-xs font-medium text-amber-300 bg-amber-500/10 border border-amber-400/25 px-3 py-1 rounded-md">
                {hintText}
              </span>
            ) : (
              <span className="text-xs text-white/45">
                {requiredStartLetter
                  ? `Chain Rule: next word must start with "${requiredStartLetter}"`
                  : '3+ letters · Consecutive letters must cross to a different side'}
              </span>
            )}
          </div>

          {/* 4-Sided Square Frame with Live SVG Connection Lines */}
          <div className="relative w-full max-w-[330px] sm:max-w-[360px] aspect-square mx-auto select-none">
            {/* Pitch & Word-Chain SVG Layer */}
            <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none">
              <rect
                x="12"
                y="12"
                width="76"
                height="76"
                rx="4"
                fill="#0A0A0A"
                stroke="rgba(255,255,255,0.16)"
                strokeWidth="0.9"
              />
              {/* Pitch center markings */}
              <circle cx="50" cy="50" r="14" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.6" />
              <line x1="12" y1="50" x2="88" y2="50" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />

              {/* Submitted chain dashed lines */}
              {submittedSegments.map((ptsStr, i) => (
                <polyline
                  key={i}
                  points={ptsStr}
                  fill="none"
                  stroke="rgba(255,255,255,0.22)"
                  strokeWidth="1.2"
                  strokeDasharray="2 2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}

              {/* Active draft solid Electric Lime line */}
              {activePoints.length >= 2 && (
                <polyline
                  points={activePoints.map((p) => `${p.x},${p.y}`).join(' ')}
                  fill="none"
                  stroke="#B6FF00"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </svg>

            {/* Top Side (Side 0) */}
            <div className="absolute top-[12%] left-0 right-0 -translate-y-1/2 flex items-center justify-center gap-6 sm:gap-7 px-14">
              {puzzle.board.sides[0].map((ch) => renderSideButton(ch))}
            </div>

            {/* Right Side (Side 1) */}
            <div className="absolute right-[12%] top-0 bottom-0 translate-x-1/2 flex flex-col items-center justify-center gap-6 sm:gap-7 py-14">
              {puzzle.board.sides[1].map((ch) => renderSideButton(ch))}
            </div>

            {/* Bottom Side (Side 2) */}
            <div className="absolute bottom-[12%] left-0 right-0 translate-y-1/2 flex items-center justify-center gap-6 sm:gap-7 px-14">
              {puzzle.board.sides[2].map((ch) => renderSideButton(ch))}
            </div>

            {/* Left Side (Side 3) */}
            <div className="absolute left-[12%] top-0 bottom-0 -translate-x-1/2 flex flex-col items-center justify-center gap-6 sm:gap-7 py-14">
              {puzzle.board.sides[3].map((ch) => renderSideButton(ch))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-5 gap-2 pt-1">
            <button
              type="button"
              onClick={backspaceLetter}
              disabled={activeDraft.length <= (requiredStartLetter ? 1 : 0)}
              aria-label="Backspace letter"
              className="min-h-[46px] rounded-lg bg-[#0A0A0A] border border-white/15 hover:border-white/35 disabled:opacity-35 text-xs font-semibold text-white inline-flex items-center justify-center"
            >
              <Delete className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={undoLastWord}
              disabled={submittedWords.length === 0 || finished}
              aria-label="Undo last word"
              className="min-h-[46px] rounded-lg bg-[#0A0A0A] border border-white/15 hover:border-white/35 disabled:opacity-35 text-xs font-semibold text-white inline-flex items-center justify-center gap-1"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Undo</span>
            </button>
            <button
              type="button"
              onClick={resetChain}
              disabled={submittedWords.length === 0 && currentWord.length === 0}
              aria-label="Reset chain"
              className="min-h-[46px] rounded-lg bg-[#0A0A0A] border border-white/15 hover:border-white/35 disabled:opacity-35 text-xs font-semibold text-white inline-flex items-center justify-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
            <button
              type="button"
              onClick={handleHint}
              className="min-h-[46px] rounded-lg bg-[#0A0A0A] border border-amber-400/40 hover:border-amber-300 text-xs font-semibold text-amber-300 inline-flex items-center justify-center gap-1"
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Hint</span>
            </button>
            <button
              type="button"
              onClick={submitWord}
              disabled={activeDraft.length < 3 || finished}
              className="min-h-[46px] rounded-lg bg-[#B6FF00] hover:bg-[#c8ff3d] disabled:opacity-40 text-[#0A0A0A] font-bold text-xs sm:text-sm inline-flex items-center justify-center"
            >
              Enter
            </button>
          </div>
        </div>

        {/* Right: Word Chain Progress & Letter Coverage */}
        <div className="lg:col-span-5 bg-[#1C1C1C] border border-white/10 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <h2 className="font-display text-xl font-bold text-white">Pitch Word Chain</h2>
              <p className="text-xs text-white/55">
                {puzzle.themeTag} · Target {puzzle.parWords} words
              </p>
            </div>
            <span className="font-mono-tabular text-lg font-bold text-[#B6FF00]">
              {coveredSet.size}/12
            </span>
          </div>

          {/* 12-Letter Coverage Checklist */}
          <div className="grid grid-cols-6 gap-1.5">
            {boardLetters.map((ch) => {
              const hit = coveredSet.has(ch);
              return (
                <div
                  key={ch}
                  className={`py-2 rounded-md text-center font-mono-tabular text-sm font-bold border ${
                    hit
                      ? 'bg-[#B6FF00]/15 border-[#B6FF00] text-[#B6FF00]'
                      : 'bg-[#0A0A0A] border-white/10 text-white/40'
                  }`}
                >
                  {ch}
                </div>
              );
            })}
          </div>

          {/* Submitted Chain */}
          <div className="space-y-2">
            <div className="text-xs text-white/55">Submitted Chain ({submittedWords.length} words)</div>
            {submittedWords.length === 0 ? (
              <div className="p-4 rounded-lg bg-[#0A0A0A] border border-white/10 text-xs text-white/45">
                No words chained yet. Solve all 12 letters in 2 words for 100 pts, 3 words for 80 pts, or 4 words for 60 pts.
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg bg-[#0A0A0A] border border-white/10">
                {submittedWords.map((w, idx) => (
                  <React.Fragment key={`${w}-${idx}`}>
                    {idx > 0 && <ArrowRight className="w-3.5 h-3.5 text-[#B6FF00]" />}
                    <span
                      className={`px-2.5 py-1 rounded-md font-mono-tabular text-xs font-bold border ${
                        FOOTBALL_VOCAB_SET.has(w)
                          ? 'bg-[#B6FF00]/15 border-[#B6FF00]/50 text-[#B6FF00]'
                          : 'bg-[#1C1C1C] border-white/15 text-white'
                      }`}
                    >
                      {w}
                    </span>
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-white/10 space-y-2.5 text-xs text-white/60">
            <div className="flex items-center justify-between">
              <span>Scoring (Completed Only)</span>
              <span className="font-mono-tabular text-white/80">2w=100 · 3w=80 · 4w=60 · 5+w=40</span>
            </div>
            {!finished && (
              <button
                type="button"
                onClick={() => finishIncomplete('Ended match incomplete.')}
                className="w-full min-h-[40px] rounded-lg border border-white/15 hover:border-white/35 text-white/70 hover:text-white font-medium text-xs inline-flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>End Run Incomplete (0 pts)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
