import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Check, Lock } from 'lucide-react';
import { filterByRegion, MATCH_REPLAY_BANK, MatchReplayPuzzle } from '../data/footballData';
import { soundEngine } from '../utils/sound';
import { GameComponentProps } from './common';

function scrambleMatchEvents(puz: MatchReplayPuzzle) {
  const indexed = puz.eventsChronological.map((ev, idx) => ({ ...ev, correctIdx: idx }));
  const shuffled = [...indexed].sort(() => Math.random() - 0.5);
  if (shuffled.every((e, i) => e.correctIdx === i)) {
    [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
  }
  return shuffled;
}

export const MatchReplayGame: React.FC<GameComponentProps> = ({
  region,
  seedOffset,
  onScoreChange,
  onFinish,
}) => {
  const pool = useMemo(() => {
    const regional = filterByRegion(MATCH_REPLAY_BANK, region);
    return regional.length >= 2 ? regional : MATCH_REPLAY_BANK;
  }, [region]);

  const [matchIdx, setMatchIdx] = useState(() => seedOffset % pool.length);
  const puzzle = pool[matchIdx % pool.length];

  const [order, setOrder] = useState<{ minute: string; text: string; correctIdx: number }[]>(() =>
    scrambleMatchEvents(puzzle)
  );
  const [lockedSlots, setLockedSlots] = useState<boolean[]>([false, false, false, false, false]);
  const [checksUsed, setChecksUsed] = useState(0);
  const [finished, setFinished] = useState(false);

  const currentScore = Math.max(250, 850 - checksUsed * 150);

  useEffect(() => {
    onScoreChange(currentScore, `Check ${checksUsed}/3`);
  }, [currentScore, checksUsed, onScoreChange]);

  const switchMatch = (idx: number) => {
    const targetPuzzle = pool[idx % pool.length];
    soundEngine.playClick();
    setMatchIdx(idx);
    setOrder(scrambleMatchEvents(targetPuzzle));
    setLockedSlots([false, false, false, false, false]);
    setChecksUsed(0);
    setFinished(false);
  };

  const moveItem = (idx: number, delta: -1 | 1) => {
    const target = idx + delta;
    if (finished || target < 0 || target >= order.length) return;
    if (lockedSlots[idx] || lockedSlots[target]) return;
    soundEngine.playClick();
    const next = [...order];
    [next[idx], next[target]] = [next[target], next[idx]];
    setOrder(next);
  };

  const verifyTimeline = () => {
    if (finished) return;
    const nextChecks = checksUsed + 1;
    setChecksUsed(nextChecks);

    const nextLocked = order.map((item, idx) => item.correctIdx === idx);
    setLockedSlots(nextLocked);
    const correctCount = nextLocked.filter(Boolean).length;

    if (correctCount === 5) {
      soundEngine.playVictory();
      setFinished(true);
      const earned = Math.max(250, 850 - (nextChecks - 1) * 150);
      onFinish({
        won: true,
        score: earned,
        accuracy: 100,
        attempts: nextChecks,
        summaryLine: `Reconstructed "${puzzle.matchTitle}" (${puzzle.finalScore}) in ${nextChecks} check(s).`,
        shareGrid: `Match Replay ${nextChecks}/3 · ${puzzle.matchTitle}\n🟩🟩🟩🟩🟩`,
      });
      return;
    }

    soundEngine.playWrong();
    if (nextChecks >= 3) {
      setFinished(true);
      onFinish({
        won: false,
        score: correctCount * 80,
        accuracy: Math.round((correctCount / 5) * 100),
        attempts: 3,
        summaryLine: `Full time! Placed ${correctCount}/5 events from "${puzzle.matchTitle}" (${puzzle.finalScore}).`,
        shareGrid: `Match Replay X/3\n${nextLocked.map((b) => (b ? '🟩' : '🟥')).join('')}`,
      });
    }
  };

  return (
    <div className="w-full max-w-2xl space-y-4">
      {/* Match Selector */}
      <div className="bg-[#1C1C1C] border border-white/10 rounded-xl p-2.5 flex flex-wrap gap-1.5">
        {pool.map((m, idx) => (
          <button
            key={m.id}
            type="button"
            onClick={() => switchMatch(idx)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold min-h-[36px] ${
              matchIdx % pool.length === idx
                ? 'bg-[#B6FF00] text-[#0A0A0A]'
                : 'bg-[#0A0A0A] text-white/70 hover:text-white border border-white/10'
            }`}
          >
            {m.matchTitle.split('—')[0].trim()}
          </button>
        ))}
      </div>

      <div className="bg-[#1C1C1C] border border-white/10 rounded-xl p-5 sm:p-6 space-y-4">
        <div className="border-b border-white/10 pb-3">
          <div className="text-xs text-[#B6FF00] font-medium">{puzzle.dateAndVenue}</div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-white mt-0.5">
            {puzzle.matchTitle}
          </h2>
          <p className="text-xs text-white/55 mt-1">
            Arrange from Kickoff (top) to Final Whistle (bottom). Checks remaining: {3 - checksUsed}
          </p>
        </div>

        <div className="space-y-2.5">
          {order.map((ev, idx) => {
            const isLocked = lockedSlots[idx];
            return (
              <div
                key={ev.text}
                className={`p-3.5 rounded-lg border flex items-center justify-between gap-3 transition-colors ${
                  isLocked
                    ? 'bg-[#B6FF00]/15 border-[#B6FF00] text-white'
                    : 'bg-[#0A0A0A] border-white/15 text-white'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <span className="font-mono-tabular text-xs font-bold text-[#B6FF00] w-6 shrink-0 pt-0.5">
                    0{idx + 1}
                  </span>
                  <div className="min-w-0">
                    {(isLocked || finished) && (
                      <span className="font-mono-tabular text-xs font-bold text-[#B6FF00] mr-2">
                        {ev.minute}
                      </span>
                    )}
                    <span className="text-sm leading-snug">{ev.text}</span>
                  </div>
                </div>

                {isLocked ? (
                  <Lock className="w-4 h-4 text-[#B6FF00] shrink-0" />
                ) : (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0 || lockedSlots[idx - 1] || finished}
                      onClick={() => moveItem(idx, -1)}
                      aria-label="Move event earlier"
                      className="w-10 h-10 rounded-md bg-white/10 hover:bg-white/20 disabled:opacity-25 flex items-center justify-center"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === order.length - 1 || lockedSlots[idx + 1] || finished}
                      onClick={() => moveItem(idx, 1)}
                      aria-label="Move event later"
                      className="w-10 h-10 rounded-md bg-white/10 hover:bg-white/20 disabled:opacity-25 flex items-center justify-center"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {finished && (
          <div className="bg-[#0A0A0A] border border-white/15 rounded-lg p-4 space-y-2">
            <div className="text-xs font-bold text-[#B6FF00] uppercase">
              Verified Chronological Match Log · {puzzle.finalScore}
            </div>
            <div className="space-y-1.5 text-xs text-white/80">
              {puzzle.eventsChronological.map((ev, idx) => (
                <div key={idx} className="flex gap-2">
                  <span className="font-mono-tabular font-bold text-[#B6FF00] w-10 shrink-0">
                    {ev.minute}
                  </span>
                  <span>{ev.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!finished && (
          <button
            type="button"
            onClick={verifyTimeline}
            className="w-full min-h-[48px] rounded-lg bg-[#B6FF00] hover:bg-[#c8ff3d] text-[#0A0A0A] font-bold text-sm inline-flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>Verify Timeline ({3 - checksUsed} checks left)</span>
          </button>
        )}
      </div>
    </div>
  );
};
