import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Bot, CheckCircle2, Clock, User, XCircle } from 'lucide-react';
import { filterByRegion, TRIVIA_BANK, TriviaCategory } from '../data/footballData';
import { soundEngine } from '../utils/sound';
import { GameComponentProps } from './common';

export const BolaTriviaGame: React.FC<GameComponentProps> = ({
  region,
  seedOffset,
  isPaused,
  onScoreChange,
  onFinish,
}) => {
  const [category, setCategory] = useState<TriviaCategory>('all');
  const [duelMode, setDuelMode] = useState(false);

  const questions = useMemo(() => {
    const base = filterByRegion(TRIVIA_BANK, region);
    const catPool = category === 'all' ? base : base.filter((q) => q.category === category);
    const working = catPool.length >= 4 ? catPool : [...catPool, ...TRIVIA_BANK.filter((q) => !catPool.includes(q))];
    const diffOrder = { easy: 0, medium: 1, hard: 2 };
    const sorted = [...working].sort((a, b) => diffOrder[a.difficulty] - diffOrder[b.difficulty]);
    return sorted.map((_, idx) => sorted[(idx + seedOffset) % sorted.length]).slice(0, 8);
  }, [region, category, seedOffset]);

  const [qIndex, setQIndex] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(20);
  const [score, setScore] = useState(0);
  const [botScore, setBotScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [historySymbols, setHistorySymbols] = useState<string[]>([]);

  const current = questions[qIndex];
  const answered = selectedOpt !== null || timeLeft === 0;

  useEffect(() => {
    onScoreChange(score, duelMode ? `Q${qIndex + 1}/${questions.length} · Duel Bot ${botScore}` : `Q${qIndex + 1}/${questions.length}`);
  }, [score, botScore, duelMode, qIndex, questions.length, onScoreChange]);

  useEffect(() => {
    if (isPaused || answered) return;
    const timer = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          soundEngine.playWrong();
          setHistorySymbols((prev) => [...prev, '🟥']);
          if (duelMode) setBotScore((b) => b + 120);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isPaused, answered, duelMode]);

  const handleSelect = (idx: number) => {
    if (answered) return;
    setSelectedOpt(idx);
    if (idx === current.correctIndex) {
      soundEngine.playCorrect();
      const gained = 100 + timeLeft * 4;
      setScore((s) => s + gained);
      setCorrectCount((c) => c + 1);
      setHistorySymbols((prev) => [...prev, '🟩']);
    } else {
      soundEngine.playWrong();
      setHistorySymbols((prev) => [...prev, '🟥']);
    }

    if (duelMode) {
      const botRight = Math.random() < (current.difficulty === 'easy' ? 0.78 : current.difficulty === 'medium' ? 0.62 : 0.45);
      if (botRight) setBotScore((b) => b + 115 + Math.floor(Math.random() * 40));
    }
  };

  const handleNext = () => {
    soundEngine.playClick();
    if (qIndex + 1 >= questions.length) {
      const accuracy = Math.round((correctCount / questions.length) * 100);
      const won = duelMode ? score >= botScore : correctCount >= 4;
      if (won) soundEngine.playVictory();
      onFinish({
        won,
        score,
        accuracy,
        attempts: questions.length,
        summaryLine: duelMode
          ? `Trivia Duel Full Time: You ${score} pts vs Bot ${botScore} pts (${correctCount}/${questions.length} right).`
          : `Answered ${correctCount} of ${questions.length} verified football trivia questions accurately.`,
        shareGrid: `BOLA Trivia ${score} pts (${correctCount}/${questions.length})\n${historySymbols.join('')}`,
      });
      return;
    }
    setQIndex((i) => i + 1);
    setSelectedOpt(null);
    setTimeLeft(20);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isPaused) return;
      if (!answered && ['1', '2', '3', '4'].includes(e.key)) {
        handleSelect(Number(e.key) - 1);
      } else if (answered && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="w-full max-w-2xl space-y-4">
      <div className="bg-[#1C1C1C] border border-white/10 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 bg-[#0A0A0A] p-1 rounded-lg border border-white/10">
          {(['all', 'club', 'player', 'competition', 'national'] as TriviaCategory[]).map((cat) => (
            <button
              key={cat}
              type="button"
              disabled={qIndex > 0 || answered}
              onClick={() => setCategory(cat)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold capitalize disabled:opacity-50 ${
                category === cat ? 'bg-[#B6FF00] text-[#0A0A0A]' : 'text-white/65'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <button
          type="button"
          disabled={qIndex > 0 || answered}
          onClick={() => setDuelMode((d) => !d)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border disabled:opacity-50 ${
            duelMode
              ? 'border-[#B6FF00] bg-[#B6FF00]/10 text-[#B6FF00]'
              : 'border-white/15 bg-[#0A0A0A] text-white/75'
          }`}
        >
          {duelMode ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
          <span>{duelMode ? 'Trivia Duel: vs Bot' : 'Solo Matchday'}</span>
        </button>
      </div>

      <div className="bg-[#1C1C1C] border border-white/10 rounded-xl p-5 sm:p-7 space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div className="text-xs font-mono-tabular text-white/60">
            Q{qIndex + 1}/{questions.length} · {current.category.toUpperCase()} · {current.difficulty.toUpperCase()}
          </div>
          <div className={`inline-flex items-center gap-1.5 font-mono-tabular text-sm font-bold ${timeLeft <= 5 ? 'text-red-400' : 'text-[#B6FF00]'}`}>
            <Clock className="w-4 h-4" />
            <span>{timeLeft}s</span>
          </div>
        </div>

        {duelMode && (
          <div className="grid grid-cols-2 gap-3 text-xs bg-[#0A0A0A] p-3 rounded-lg border border-white/10">
            <div className="flex justify-between">
              <span className="text-white/60">You</span>
              <span className="font-mono-tabular font-bold text-[#B6FF00]">{score} pts</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">Chipolopolo Bot</span>
              <span className="font-mono-tabular font-bold text-sky-400">{botScore} pts</span>
            </div>
          </div>
        )}

        <div className="w-full h-1.5 bg-[#0A0A0A] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#B6FF00] transition-transform duration-200 origin-left"
            style={{ transform: `scaleX(${(qIndex + (answered ? 1 : 0)) / questions.length})` }}
          />
        </div>

        <h2 className="font-display text-2xl sm:text-3xl font-bold leading-tight text-white">
          {current.question}
        </h2>

        <div className="grid grid-cols-1 gap-3">
          {current.options.map((opt, idx) => {
            const isCorrect = idx === current.correctIndex;
            const isChosen = idx === selectedOpt;

            let styleClass = 'bg-[#0A0A0A] border-white/15 hover:border-[#B6FF00] text-white';
            if (answered) {
              if (isCorrect) {
                styleClass = 'bg-[#B6FF00]/15 border-[#B6FF00] text-[#B6FF00]';
              } else if (isChosen) {
                styleClass = 'bg-red-500/15 border-red-500 text-red-300';
              } else {
                styleClass = 'bg-[#0A0A0A]/50 border-white/5 text-white/40';
              }
            }

            return (
              <button
                key={idx}
                type="button"
                disabled={answered}
                onClick={() => handleSelect(idx)}
                className={`w-full min-h-[52px] px-4 py-3 rounded-lg border text-left flex items-center justify-between gap-3 transition-colors ${styleClass}`}
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono-tabular text-xs font-bold opacity-60">
                    {idx + 1}.
                  </span>
                  <span className="text-sm sm:text-base font-medium">{opt}</span>
                </div>
                {answered && isCorrect && <CheckCircle2 className="w-5 h-5 text-[#B6FF00] shrink-0" />}
                {answered && isChosen && !isCorrect && <XCircle className="w-5 h-5 text-red-400 shrink-0" />}
              </button>
            );
          })}
        </div>

        {answered && (
          <div className="bg-[#0A0A0A] border border-white/10 rounded-lg p-4 space-y-3 animate-tile-pop">
            <p className="text-sm text-white/80 leading-relaxed">
              {current.explanation}
            </p>
            <button
              type="button"
              onClick={handleNext}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 min-h-[44px] rounded-lg bg-[#B6FF00] hover:bg-[#c8ff3d] text-[#0A0A0A] font-bold text-sm"
            >
              <span>{qIndex + 1 >= questions.length ? 'See Final Score' : 'Next Question'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
