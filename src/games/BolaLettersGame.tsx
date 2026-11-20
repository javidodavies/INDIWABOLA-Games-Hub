import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Delete,
  Flag,
  Lightbulb,
  RotateCw,
  Shuffle,
  Sparkles,
  Star,
} from 'lucide-react';
import { FOOTBALL_VOCAB_SET, WORD_DICTIONARY } from '../data/wordDictionary';
import { soundEngine } from '../utils/sound';
import {
  generateBolaLettersPuzzle,
  isValidBolaLettersWord,
  scoreBolaLettersWord,
} from '../utils/wordPuzzles';
import { GameComponentProps } from './common';

type LettersMode = 'daily' | 'practice' | 'timed';

const OUTER_COORDS = [
  { x: 50, y: 15 },
  { x: 80.3, y: 32.5 },
  { x: 80.3, y: 67.5 },
  { x: 50, y: 85 },
  { x: 19.7, y: 67.5 },
  { x: 19.7, y: 32.5 },
];

function getRankLabel(ratio: number): string {
  if (ratio >= 0.9) return 'Pitch Legend';
  if (ratio >= 0.7) return 'Captain';
  if (ratio >= 0.45) return 'Playmaker';
  if (ratio >= 0.25) return 'Starter';
  if (ratio >= 0.1) return 'Reserve';
  return 'Kickoff';
}

export const BolaLettersGame: React.FC<GameComponentProps> = ({
  region,
  seedOffset,
  isPaused,
  juniorMode = false,
  onScoreChange,
  onFinish,
}) => {
  const [mode, setMode] = useState<LettersMode>('daily');
  const [practiceStep, setPracticeStep] = useState(0);

  const activeSeed = mode === 'daily' ? seedOffset : seedOffset + practiceStep * 3 + (mode === 'timed' ? 5 : 1);
  const puzzle = useMemo(
    () => generateBolaLettersPuzzle(activeSeed, region, juniorMode),
    [activeSeed, region, juniorMode]
  );

  const allowedSet = useMemo(() => new Set(puzzle.allLetters), [puzzle.allLetters]);

  const [outerOrder, setOuterOrder] = useState<string[]>(puzzle.outerLetters);
  const [currentInput, setCurrentInput] = useState('');
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<{ text: string; tone: 'good' | 'bad' | 'info' } | null>(null);
  const [hintClue, setHintClue] = useState<string | null>(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [timeLeftSec, setTimeLeftSec] = useState(90);
  const [finished, setFinished] = useState(false);

  // Reset board when puzzle seed or mode changes
  useEffect(() => {
    setOuterOrder([...puzzle.outerLetters]);
    setCurrentInput('');
    setFoundWords([]);
    setFeedback(null);
    setHintClue(null);
    setHintsUsed(0);
    setTimeLeftSec(90);
    setFinished(false);
  }, [puzzle]);

  const earnedScore = useMemo(
    () => foundWords.reduce((sum, w) => sum + scoreBolaLettersWord(w, allowedSet), 0),
    [foundWords, allowedSet]
  );

  const pangramsFound = useMemo(
    () => foundWords.filter((w) => puzzle.pangrams.includes(w)),
    [foundWords, puzzle.pangrams]
  );

  const progressRatio = puzzle.maxAchievableScore > 0 ? earnedScore / puzzle.maxAchievableScore : 0;
  const rankLabel = getRankLabel(progressRatio);

  useEffect(() => {
    const status =
      mode === 'timed'
        ? `${rankLabel} · ${timeLeftSec}s`
        : `${rankLabel} · ${foundWords.length}/${puzzle.validWords.length} words`;
    onScoreChange(earnedScore, status);
  }, [earnedScore, foundWords.length, mode, onScoreChange, puzzle.validWords.length, rankLabel, timeLeftSec]);

  const finishMatch = useCallback(
    (wordsToSubmit: string[], scoreToSubmit: number, timedOut = false) => {
      if (finished) return;
      setFinished(true);
      const won = wordsToSubmit.length >= (juniorMode ? 3 : 5) || scoreToSubmit >= 15;
      if (won) soundEngine.playVictory();
      const accuracy =
        puzzle.maxAchievableScore > 0
          ? Math.min(100, Math.round((scoreToSubmit / puzzle.maxAchievableScore) * 100))
          : 0;
      const pCount = wordsToSubmit.filter((w) => puzzle.pangrams.includes(w)).length;
      const fCount = wordsToSubmit.filter((w) => FOOTBALL_VOCAB_SET.has(w)).length;

      onFinish({
        won,
        score: scoreToSubmit,
        accuracy,
        attempts: wordsToSubmit.length || 1,
        summaryLine: `${timedOut ? '90s Blitz ended! ' : ''}Found ${wordsToSubmit.length}/${puzzle.validWords.length} words (${pCount} pangram${pCount === 1 ? '' : 's'}, ${fCount} football terms) for ${scoreToSubmit}/${puzzle.maxAchievableScore} pts.`,
        shareGrid: `BOLA Letters · ${rankLabel} (${scoreToSubmit}/${puzzle.maxAchievableScore} pts)\nWords: ${wordsToSubmit.length}/${puzzle.validWords.length} · Pangrams: ${pCount}\n${pCount > 0 ? '🟨🟩🟩🟩🟩' : '🟩🟩🟩⬜⬜'}`,
        verificationPayload: {
          seed: activeSeed,
          region,
          juniorMode,
          foundWords: wordsToSubmit,
        },
      });
    },
    [activeSeed, finished, juniorMode, onFinish, puzzle.maxAchievableScore, puzzle.pangrams, puzzle.validWords.length, rankLabel, region]
  );

  // Timed blitz countdown
  useEffect(() => {
    if (mode !== 'timed' || finished || isPaused) return;
    if (timeLeftSec <= 0) {
      finishMatch(foundWords, earnedScore, true);
      return;
    }
    const timer = window.setInterval(() => {
      setTimeLeftSec((t) => Math.max(0, t - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [earnedScore, finishMatch, finished, foundWords, isPaused, mode, timeLeftSec]);

  const shuffleOuter = useCallback(() => {
    soundEngine.playClick();
    setOuterOrder((prev) => {
      const next = [...prev];
      for (let i = next.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [next[i], next[j]] = [next[j], next[i]];
      }
      return next;
    });
  }, []);

  const appendLetter = useCallback(
    (letter: string) => {
      if (finished || isPaused) return;
      const upper = letter.toUpperCase();
      if (!allowedSet.has(upper)) {
        soundEngine.playWrong();
        setFeedback({ text: `"${upper}" is not in today’s 7 letters.`, tone: 'bad' });
        return;
      }
      if (currentInput.length >= 14) return;
      soundEngine.playClick();
      setCurrentInput((prev) => prev + upper);
      setFeedback(null);
    },
    [allowedSet, currentInput.length, finished, isPaused]
  );

  const deleteLetter = useCallback(() => {
    if (finished || isPaused || currentInput.length === 0) return;
    soundEngine.playClick();
    setCurrentInput((prev) => prev.slice(0, -1));
  }, [currentInput.length, finished, isPaused]);

  const submitWord = useCallback(() => {
    if (finished || isPaused) return;
    const raw = currentInput.trim().toUpperCase();
    if (!raw) return;

    if (foundWords.includes(raw)) {
      soundEngine.playWrong();
      setFeedback({ text: `"${raw}" already found!`, tone: 'info' });
      setCurrentInput('');
      return;
    }

    const validation = isValidBolaLettersWord(raw, puzzle.centerLetter, allowedSet, WORD_DICTIONARY);
    if (!validation.valid) {
      soundEngine.playWrong();
      setFeedback({ text: validation.reason || 'Invalid word.', tone: 'bad' });
      return;
    }

    const pts = scoreBolaLettersWord(validation.cleanWord, allowedSet);
    const isPangram = puzzle.pangrams.includes(validation.cleanWord);
    const isFootball = FOOTBALL_VOCAB_SET.has(validation.cleanWord);

    if (isPangram) {
      soundEngine.playVictory();
    } else {
      soundEngine.playCorrect();
    }

    const nextWords = [validation.cleanWord, ...foundWords];
    const nextScore = earnedScore + pts;
    setFoundWords(nextWords);
    setCurrentInput('');
    setHintClue(null);

    if (isPangram) {
      setFeedback({ text: `PANGRAM! ${validation.cleanWord} (+${pts} pts)`, tone: 'good' });
    } else if (isFootball) {
      setFeedback({ text: `Football Vocab! ${validation.cleanWord} (+${pts} pts)`, tone: 'good' });
    } else {
      setFeedback({ text: `${validation.cleanWord} accepted (+${pts} pts)`, tone: 'good' });
    }

    if (nextWords.length >= puzzle.validWords.length) {
      window.setTimeout(() => finishMatch(nextWords, nextScore, false), 650);
    }
  }, [
    allowedSet,
    currentInput,
    earnedScore,
    finishMatch,
    finished,
    foundWords,
    isPaused,
    puzzle.centerLetter,
    puzzle.pangrams,
    puzzle.validWords.length,
  ]);

  const handleHint = () => {
    if (finished || isPaused) return;
    const unfound = puzzle.validWords.filter((w) => !foundWords.includes(w));
    if (unfound.length === 0) return;

    // Prefer unfound pangram or football word first
    const pick =
      unfound.find((w) => puzzle.pangrams.includes(w)) ||
      unfound.find((w) => FOOTBALL_VOCAB_SET.has(w)) ||
      unfound[0];

    soundEngine.playMove();
    setHintsUsed((h) => h + 1);
    const tag = puzzle.pangrams.includes(pick)
      ? 'Pangram'
      : FOOTBALL_VOCAB_SET.has(pick)
      ? 'Football Word'
      : 'Dictionary Word';
    setHintClue(
      `Clue (${tag}): Starts with "${pick.slice(0, 2)}" · ${pick.length} letters (${scoreBolaLettersWord(pick, allowedSet)} pts)`
    );
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (finished || isPaused) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key.toUpperCase();
      if (/^[A-Z]$/.test(key) && key.length === 1) {
        e.preventDefault();
        appendLetter(key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        deleteLetter();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        submitWord();
      } else if (e.key === ' ') {
        e.preventDefault();
        shuffleOuter();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [appendLetter, deleteLetter, finished, isPaused, shuffleOuter, submitWord]);

  return (
    <div className="w-full max-w-4xl space-y-5">
      {/* Mode & Theme Control Bar */}
      <div className="bg-[#1C1C1C] border border-white/10 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 bg-[#0A0A0A] p-1 rounded-lg border border-white/10">
          {(
            [
              { id: 'daily', label: 'Daily Letters' },
              { id: 'practice', label: 'Practice' },
              { id: 'timed', label: '90s Blitz' },
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
            {puzzle.title} · <span className="text-[#B6FF00]">{puzzle.themeTag}</span>
          </span>
          {mode === 'practice' && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setPracticeStep((s) => s + 1);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/15 font-semibold text-white min-h-[36px]"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>New Hive</span>
            </button>
          )}
          {mode === 'timed' && (
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-mono-tabular font-bold border ${
                timeLeftSec <= 15
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

      {/* Main Split Stadium Arena */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Captain's Hive & Controls */}
        <div className="lg:col-span-7 bg-[#1C1C1C] border border-white/10 rounded-xl p-5 sm:p-6 space-y-5">
          {/* Score Progress Toward Exact Maximum */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#B6FF00] flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 fill-current" />
                <span>{rankLabel}</span>
              </span>
              <span className="font-mono-tabular text-white/75">
                {earnedScore} / {puzzle.maxAchievableScore} pts ({Math.round(progressRatio * 100)}%)
              </span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-[#0A0A0A] overflow-hidden border border-white/10">
              <div
                className="h-full bg-[#B6FF00] transition-all duration-300"
                style={{ width: `${Math.min(100, Math.round(progressRatio * 100))}%` }}
              />
            </div>
          </div>

          {/* Typed Word Preview */}
          <div className="min-h-[58px] rounded-xl bg-[#0A0A0A] border border-white/15 px-4 flex items-center justify-center">
            {currentInput.length === 0 ? (
              <span className="text-sm text-white/35 tracking-wide">
                Spell 4+ letter words with &ldquo;{puzzle.centerLetter}&rdquo;
              </span>
            ) : (
              <div className="flex flex-wrap items-center justify-center gap-0.5 font-display text-3xl sm:text-4xl font-extrabold tracking-widest">
                {currentInput.split('').map((ch, idx) => (
                  <span
                    key={`${ch}-${idx}`}
                    className={ch === puzzle.centerLetter ? 'text-[#B6FF00]' : 'text-white'}
                  >
                    {ch}
                  </span>
                ))}
                <span className="w-0.5 h-7 bg-[#B6FF00] animate-pulse ml-0.5" />
              </div>
            )}
          </div>

          {/* Feedback / Clue Banner */}
          <div className="min-h-[28px] flex items-center justify-center text-center">
            {feedback ? (
              <div
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
              </div>
            ) : hintClue ? (
              <div className="text-xs font-medium text-amber-300 bg-amber-500/10 border border-amber-400/25 px-3 py-1 rounded-md">
                {hintClue}
              </div>
            ) : (
              <span className="text-xs text-white/45">
                4L = 1 · 5L = 5 · 6L = 6 · 7+L = length · Pangram = +7
              </span>
            )}
          </div>

          {/* Circular Stadium Captain's Hive */}
          <div className="relative w-full max-w-[290px] sm:max-w-[320px] aspect-square mx-auto select-none">
            {/* Subtle Pitch Center Circle Background */}
            <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
              <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.6" />
              <circle cx="50" cy="50" r="24" fill="none" stroke="rgba(182,255,0,0.14)" strokeWidth="0.6" strokeDasharray="2 2" />
              <line x1="4" y1="50" x2="96" y2="50" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
            </svg>

            {/* 6 Outer Letters */}
            {outerOrder.map((letter, idx) => {
              const coord = OUTER_COORDS[idx];
              return (
                <button
                  key={`${letter}-${idx}`}
                  type="button"
                  onClick={() => appendLetter(letter)}
                  aria-label={`Select letter ${letter}`}
                  style={{ left: `${coord.x}%`, top: `${coord.y}%`, transform: 'translate(-50%, -50%)' }}
                  className={`absolute ${
                    juniorMode ? 'w-16 h-16 text-2xl' : 'w-14 h-14 sm:w-16 sm:h-16 text-xl sm:text-2xl'
                  } rounded-full bg-[#0A0A0A] border-2 border-white/25 hover:border-[#B6FF00] active:scale-95 font-display font-extrabold text-white flex items-center justify-center shadow-lg transition-all`}
                >
                  {letter}
                </button>
              );
            })}

            {/* Mandatory Central Captain Letter */}
            <button
              type="button"
              onClick={() => appendLetter(puzzle.centerLetter)}
              aria-label={`Select mandatory center letter ${puzzle.centerLetter}`}
              style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
              className={`absolute ${
                juniorMode ? 'w-20 h-20 text-3xl' : 'w-16 h-16 sm:w-20 sm:h-20 text-2xl sm:text-3xl'
              } rounded-full bg-[#B6FF00] hover:bg-[#c8ff3d] active:scale-95 text-[#0A0A0A] font-display font-extrabold flex items-center justify-center shadow-xl ring-4 ring-[#B6FF00]/25 transition-all`}
            >
              {puzzle.centerLetter}
            </button>
          </div>

          {/* Primary Action Buttons */}
          <div className="grid grid-cols-4 gap-2 pt-1">
            <button
              type="button"
              onClick={deleteLetter}
              disabled={currentInput.length === 0}
              className="min-h-[46px] rounded-lg bg-[#0A0A0A] border border-white/15 hover:border-white/35 disabled:opacity-35 text-xs font-semibold text-white inline-flex items-center justify-center gap-1"
            >
              <Delete className="w-4 h-4" />
              <span className="hidden sm:inline">Delete</span>
            </button>
            <button
              type="button"
              onClick={shuffleOuter}
              className="min-h-[46px] rounded-lg bg-[#0A0A0A] border border-white/15 hover:border-white/35 text-xs font-semibold text-white inline-flex items-center justify-center gap-1"
            >
              <Shuffle className="w-4 h-4" />
              <span className="hidden sm:inline">Shuffle</span>
            </button>
            <button
              type="button"
              onClick={handleHint}
              className="min-h-[46px] rounded-lg bg-[#0A0A0A] border border-amber-400/40 hover:border-amber-300 text-xs font-semibold text-amber-300 inline-flex items-center justify-center gap-1"
            >
              <Lightbulb className="w-4 h-4" />
              <span>Hint{hintsUsed > 0 ? ` (${hintsUsed})` : ''}</span>
            </button>
            <button
              type="button"
              onClick={submitWord}
              disabled={currentInput.length < 4}
              className="min-h-[46px] rounded-lg bg-[#B6FF00] hover:bg-[#c8ff3d] disabled:opacity-40 text-[#0A0A0A] font-bold text-sm inline-flex items-center justify-center"
            >
              Submit
            </button>
          </div>
        </div>

        {/* Right: Found Words Board & Claim Button */}
        <div className="lg:col-span-5 bg-[#1C1C1C] border border-white/10 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <h2 className="font-display text-xl font-bold text-white">Found Words</h2>
              <p className="text-xs text-white/55">
                {foundWords.length} of {puzzle.validWords.length} verified · {pangramsFound.length}/{puzzle.pangrams.length} pangram
              </p>
            </div>
            <span className="font-mono-tabular text-xl font-bold text-[#B6FF00]">
              {earnedScore} pts
            </span>
          </div>

          {foundWords.length === 0 ? (
            <div className="py-10 text-center text-xs text-white/45 space-y-2">
              <Sparkles className="w-6 h-6 text-[#B6FF00]/40 mx-auto" />
              <p>Start building 4+ letter words around &ldquo;{puzzle.centerLetter}&rdquo;.</p>
              <p>Look out for football terms and the 7-letter Pangram!</p>
            </div>
          ) : (
            <div className="max-h-[280px] overflow-y-auto grid grid-cols-2 gap-2 pr-1">
              {foundWords.map((word) => {
                const isPan = puzzle.pangrams.includes(word);
                const isFootball = FOOTBALL_VOCAB_SET.has(word);
                const pts = scoreBolaLettersWord(word, allowedSet);
                return (
                  <div
                    key={word}
                    className={`px-3 py-2 rounded-lg border text-xs flex items-center justify-between gap-2 ${
                      isPan
                        ? 'bg-[#B6FF00]/15 border-[#B6FF00] text-[#B6FF00]'
                        : isFootball
                        ? 'bg-sky-500/10 border-sky-400/35 text-sky-200'
                        : 'bg-[#0A0A0A] border-white/10 text-white/90'
                    }`}
                  >
                    <span className="font-mono-tabular font-bold truncate">
                      {isPan ? '★ ' : ''}
                      {word}
                    </span>
                    <span className="font-mono-tabular text-white/60 shrink-0">+{pts}</span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="pt-2 border-t border-white/10 space-y-2.5">
            <button
              type="button"
              onClick={() => finishMatch(foundWords, earnedScore, false)}
              disabled={foundWords.length === 0 || finished}
              className="w-full min-h-[46px] rounded-lg bg-[#B6FF00] hover:bg-[#c8ff3d] disabled:opacity-40 text-[#0A0A0A] font-bold text-sm inline-flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Claim {earnedScore} Points &amp; Finish</span>
            </button>
            <div className="flex items-center justify-between text-xs text-white/50">
              <span>{puzzle.footballWords.length} football terms hidden in hive</span>
              <span className="inline-flex items-center gap-1">
                <Flag className="w-3 h-3 text-[#B6FF00]" />
                {region === 'zambia' ? 'Zambia Set' : 'Global Set'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
