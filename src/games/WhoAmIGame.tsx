import React, { useEffect, useMemo, useState } from 'react';
import { Eye, Search, Send } from 'lucide-react';
import { filterByRegion, WHO_AM_I_BANK } from '../data/footballData';
import { soundEngine } from '../utils/sound';
import { GameComponentProps } from './common';

export const WhoAmIGame: React.FC<GameComponentProps> = ({
  region,
  seedOffset,
  onScoreChange,
  onFinish,
}) => {
  const [difficulty, setDifficulty] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');

  const pool = useMemo(() => {
    const regional = filterByRegion(WHO_AM_I_BANK, region);
    if (difficulty === 'all') return regional;
    const filtered = regional.filter((p) => p.difficulty === difficulty);
    return filtered.length > 0 ? filtered : regional;
  }, [region, difficulty]);

  const puzzle = pool[seedOffset % pool.length];

  const [revealedCount, setRevealedCount] = useState(1);
  const [guessInput, setGuessInput] = useState('');
  const [wrongGuesses, setWrongGuesses] = useState<string[]>([]);
  const [finished, setFinished] = useState(false);

  const currentPossibleScore = Math.max(180, 900 - (revealedCount - 1) * 120);

  useEffect(() => {
    onScoreChange(currentPossibleScore, `Clue ${revealedCount}/6 · Attempts ${wrongGuesses.length}/6`);
  }, [currentPossibleScore, revealedCount, wrongGuesses.length, onScoreChange]);

  const suggestions = useMemo(() => {
    const q = guessInput.trim().toLowerCase();
    if (!q) return [];
    return WHO_AM_I_BANK.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.aliases.some((a) => a.toLowerCase().includes(q))
    ).slice(0, 5);
  }, [guessInput]);

  const submitGuess = (raw: string) => {
    if (finished) return;
    const cleaned = raw.trim().toLowerCase();
    if (!cleaned) return;

    const isMatch =
      cleaned === puzzle.name.toLowerCase() ||
      puzzle.aliases.some((a) => a.toLowerCase() === cleaned);

    if (isMatch) {
      soundEngine.playVictory();
      setFinished(true);
      const grid = Array.from({ length: 6 }, (_, i) => {
        if (i < revealedCount - 1) return '🟨';
        if (i === revealedCount - 1) return '🟩';
        return '⬛';
      }).join('');
      onFinish({
        won: true,
        score: currentPossibleScore,
        accuracy: Math.round(((7 - revealedCount) / 6) * 100),
        attempts: wrongGuesses.length + 1,
        summaryLine: `Identified ${puzzle.name} on Clue ${revealedCount}! ${puzzle.funFact}`,
        shareGrid: `Clues Used: ${revealedCount}/6\n${grid}`,
      });
      return;
    }

    soundEngine.playWrong();
    const nextWrong = [...wrongGuesses, raw.trim()];
    setWrongGuesses(nextWrong);
    setGuessInput('');

    if (revealedCount >= 6 || nextWrong.length >= 6) {
      setFinished(true);
      onFinish({
        won: false,
        score: 0,
        accuracy: 0,
        attempts: nextWrong.length,
        summaryLine: `Full time! The footballer was ${puzzle.name}. ${puzzle.funFact}`,
        shareGrid: `Clues Used: X/6\n🟨🟨🟨🟨🟨🟥`,
      });
    } else {
      setRevealedCount((c) => Math.min(6, c + 1));
    }
  };

  const revealNextClue = () => {
    if (finished || revealedCount >= 6) return;
    soundEngine.playMove();
    setRevealedCount((c) => Math.min(6, c + 1));
  };

  const timelineUnlocked = Math.min(puzzle.timeline.length, Math.max(1, Math.ceil((revealedCount / 6) * puzzle.timeline.length)));

  return (
    <div className="w-full max-w-3xl space-y-4">
      <div className="bg-[#1C1C1C] border border-white/10 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-[#0A0A0A] p-1 rounded-lg border border-white/10">
          {(['all', 'easy', 'medium', 'hard'] as const).map((d) => (
            <button
              key={d}
              type="button"
              disabled={revealedCount > 1 || wrongGuesses.length > 0}
              onClick={() => setDifficulty(d)}
              className={`px-3 py-1 rounded-md text-xs font-semibold capitalize disabled:opacity-50 ${
                difficulty === d ? 'bg-[#B6FF00] text-[#0A0A0A]' : 'text-white/70'
              }`}
            >
              {d === 'all' ? 'Mixed' : d}
            </button>
          ))}
        </div>
        <span className="font-mono-tabular text-xs text-white/60">
          Remaining Attempts: {6 - wrongGuesses.length}/6
        </span>
      </div>

      <div className="bg-[#1C1C1C] border border-white/10 rounded-xl p-5 sm:p-6 space-y-5">
        {/* Silhouette Reveal + Career Timeline */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center border-b border-white/10 pb-4">
          <div className="sm:col-span-4 flex items-center gap-4">
            <div className="w-20 h-20 rounded-xl bg-[#0A0A0A] border border-white/15 flex items-center justify-center relative overflow-hidden shrink-0">
              <svg viewBox="0 0 64 64" className="w-16 h-16" aria-hidden="true">
                <circle
                  cx="32"
                  cy="20"
                  r="10"
                  fill={revealedCount >= 2 ? '#B6FF00' : '#333'}
                  fillOpacity={0.2 + revealedCount * 0.13}
                />
                <path
                  d="M14 56c2-12 9-18 18-18s16 6 18 18"
                  fill={revealedCount >= 2 ? '#B6FF00' : '#333'}
                  fillOpacity={0.2 + revealedCount * 0.13}
                />
              </svg>
              {revealedCount >= 4 && (
                <span className="absolute bottom-1 right-1.5 font-mono-tabular text-xs font-bold text-[#B6FF00]">
                  #{puzzle.shirtNumber}
                </span>
              )}
            </div>
            <div>
              <div className="text-xs text-[#B6FF00] font-semibold uppercase">
                {revealedCount >= 1 ? `${puzzle.positionCode} Dossier` : 'Locked'}
              </div>
              <div className="font-display text-2xl font-bold">
                {finished ? puzzle.name : 'Unknown Player'}
              </div>
              <div className="font-mono-tabular text-xs text-white/55">
                Available: {currentPossibleScore} pts
              </div>
            </div>
          </div>

          <div className="sm:col-span-8 bg-[#0A0A0A] border border-white/10 rounded-lg p-3">
            <div className="text-[11px] text-white/50 mb-2">Career Timeline</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {puzzle.timeline.map((step, idx) => {
                const open = idx < timelineUnlocked || finished;
                return (
                  <div
                    key={step}
                    className={`px-2.5 py-2 rounded border text-xs font-medium ${
                      open
                        ? 'border-[#B6FF00]/40 bg-[#B6FF00]/10 text-white'
                        : 'border-white/10 bg-[#1C1C1C] text-white/25'
                    }`}
                  >
                    {open ? step : 'Locked Stop'}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-2.5">
          {puzzle.clues.map((clue, idx) => {
            const isUnlocked = idx < revealedCount;
            return (
              <div
                key={idx}
                className={`p-3.5 rounded-lg border transition-all ${
                  isUnlocked
                    ? 'bg-[#0A0A0A] border-white/15 text-white animate-tile-pop'
                    : 'bg-[#0A0A0A]/40 border-white/5 text-white/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="font-mono-tabular text-xs font-bold text-[#B6FF00] mt-0.5 shrink-0">
                    CLUE {idx + 1}
                  </span>
                  <span className="text-sm leading-snug">
                    {isUnlocked ? clue : 'Locked — Guess or reveal to unlock this dossier line'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitGuess(guessInput);
          }}
          className="pt-2 space-y-2.5"
        >
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={guessInput}
                onChange={(e) => setGuessInput(e.target.value)}
                placeholder="Type footballer name (e.g. Kalusha Bwalya)..."
                disabled={finished}
                className="w-full min-h-[46px] pl-10 pr-4 rounded-lg bg-[#0A0A0A] border border-white/20 text-white placeholder:text-white/35 text-sm focus:outline-none focus:border-[#B6FF00]"
              />
            </div>
            <button
              type="submit"
              disabled={!guessInput.trim() || finished}
              className="inline-flex items-center justify-center gap-2 px-5 min-h-[46px] rounded-lg bg-[#B6FF00] disabled:bg-white/15 disabled:text-white/40 text-[#0A0A0A] font-bold text-sm whitespace-nowrap shrink-0"
            >
              <Send className="w-4 h-4" />
              <span>Submit Guess</span>
            </button>
            <button
              type="button"
              onClick={revealNextClue}
              disabled={revealedCount >= 6 || finished}
              className="inline-flex items-center justify-center gap-2 px-4 min-h-[46px] rounded-lg bg-white/10 hover:bg-white/15 disabled:opacity-40 text-white text-sm font-medium whitespace-nowrap shrink-0"
            >
              <Eye className="w-4 h-4" />
              <span>Reveal Clue</span>
            </button>
          </div>

          {suggestions.length > 0 && !finished && (
            <div className="bg-[#0A0A0A] border border-white/15 rounded-lg divide-y divide-white/10 overflow-hidden">
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => submitGuess(s.name)}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-[#B6FF00] hover:text-[#0A0A0A] transition-colors flex items-center justify-between min-h-[42px]"
                >
                  <span className="font-medium">{s.name}</span>
                  <span className="text-xs opacity-65">Select</span>
                </button>
              ))}
            </div>
          )}
        </form>

        {wrongGuesses.length > 0 && (
          <div className="pt-1 text-xs text-white/55">
            Previous guesses: {wrongGuesses.join(' · ')}
          </div>
        )}
      </div>
    </div>
  );
};
