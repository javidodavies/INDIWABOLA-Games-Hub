import React, { useEffect, useMemo, useState } from 'react';
import { Shuffle } from 'lucide-react';
import { CONNECTIONS_BANK, ConnectionsGroup, filterByRegion } from '../data/footballData';
import { soundEngine } from '../utils/sound';
import { GameComponentProps } from './common';

const DIFFICULTY_STYLES: Record<1 | 2 | 3 | 4, { bg: string; label: string; emoji: string }> = {
  1: { bg: 'bg-amber-300 text-[#0A0A0A]', label: 'Tier 1 · Straightforward', emoji: '🟨' },
  2: { bg: 'bg-[#B6FF00] text-[#0A0A0A]', label: 'Tier 2 · Tactical', emoji: '🟩' },
  3: { bg: 'bg-sky-400 text-[#0A0A0A]', label: 'Tier 3 · Deep Cut', emoji: '🟦' },
  4: { bg: 'bg-rose-400 text-[#0A0A0A]', label: 'Tier 4 · Expert Link', emoji: '🟥' },
};

export const ConnectionsGame: React.FC<GameComponentProps> = ({
  region,
  seedOffset,
  onScoreChange,
  onFinish,
}) => {
  const pool = useMemo(() => {
    const regional = filterByRegion(CONNECTIONS_BANK, region);
    return regional.length >= 2 ? regional : CONNECTIONS_BANK;
  }, [region]);

  const [boardIdx, setBoardIdx] = useState(() => seedOffset % pool.length);
  const puzzle = pool[boardIdx % pool.length];

  const [tiles, setTiles] = useState<string[]>(() => {
    const all = puzzle.groups.flatMap((g) => g.items);
    return [...all].sort(() => Math.random() - 0.5);
  });
  const [selected, setSelected] = useState<string[]>([]);
  const [solvedGroups, setSolvedGroups] = useState<ConnectionsGroup[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [shakeBoard, setShakeBoard] = useState(false);
  const [historyRows, setHistoryRows] = useState<string[]>([]);
  const [finished, setFinished] = useState(false);

  const score = Math.max(0, solvedGroups.length * 150 + (4 - mistakes) * 50);

  useEffect(() => {
    onScoreChange(score, `Mistakes ${mistakes}/4`);
  }, [score, mistakes, onScoreChange]);

  const switchBoard = (idx: number) => {
    const nextPuzzle = pool[idx % pool.length];
    soundEngine.playClick();
    setBoardIdx(idx);
    setTiles([...nextPuzzle.groups.flatMap((g) => g.items)].sort(() => Math.random() - 0.5));
    setSelected([]);
    setSolvedGroups([]);
    setMistakes(0);
    setFeedback('');
    setHistoryRows([]);
    setFinished(false);
  };

  const toggleTile = (item: string) => {
    if (finished) return;
    soundEngine.playClick();
    setFeedback('');
    setSelected((prev) => {
      if (prev.includes(item)) return prev.filter((x) => x !== item);
      if (prev.length >= 4) return prev;
      return [...prev, item];
    });
  };

  const shuffleTiles = () => {
    soundEngine.playMove();
    setTiles((prev) => [...prev].sort(() => Math.random() - 0.5));
  };

  const submitGroup = () => {
    if (selected.length !== 4 || finished) return;

    const matched = puzzle.groups.find((g) =>
      selected.every((item) => g.items.includes(item))
    );

    const rowEmojis = selected
      .map((item) => {
        const grp = puzzle.groups.find((g) => g.items.includes(item));
        return grp ? DIFFICULTY_STYLES[grp.difficulty].emoji : '⬜';
      })
      .join('');
    const nextHistory = [...historyRows, rowEmojis];
    setHistoryRows(nextHistory);

    if (matched) {
      soundEngine.playCorrect();
      const nextSolved = [...solvedGroups, matched];
      setSolvedGroups(nextSolved);
      setTiles((prev) => prev.filter((t) => !selected.includes(t)));
      setSelected([]);
      setFeedback(`Locked Tier ${matched.difficulty}: ${matched.category}`);

      if (nextSolved.length === 4) {
        soundEngine.playVictory();
        setFinished(true);
        const finalScore = 500 + (4 - mistakes) * 75;
        onFinish({
          won: true,
          score: finalScore,
          accuracy: Math.round(((4 - mistakes) / 4) * 100),
          attempts: nextHistory.length,
          summaryLine: `Sorted all 4 football connections in "${puzzle.title}" with ${4 - mistakes} lives remaining.`,
          shareGrid: `BOLA Connections · ${puzzle.title}\n${nextHistory.join('\n')}`,
        });
      }
      return;
    }

    const oneAway = puzzle.groups.some(
      (g) => selected.filter((item) => g.items.includes(item)).length === 3
    );

    soundEngine.playWrong();
    setShakeBoard(true);
    window.setTimeout(() => setShakeBoard(false), 380);
    const nextMistakes = mistakes + 1;
    setMistakes(nextMistakes);
    setFeedback(oneAway ? 'One away! Three of those share a link.' : 'Not a match — try a different link.');

    if (nextMistakes >= 4) {
      setFinished(true);
      setSolvedGroups(puzzle.groups);
      setTiles([]);
      onFinish({
        won: false,
        score: solvedGroups.length * 100,
        accuracy: Math.round((solvedGroups.length / 4) * 100),
        attempts: nextHistory.length,
        summaryLine: `Out of mistakes! All 4 groups for "${puzzle.title}" are now revealed.`,
        shareGrid: `BOLA Connections (X/4)\n${nextHistory.join('\n')}`,
      });
    }
  };

  return (
    <div className="w-full max-w-2xl space-y-4">
      {/* Board Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#1C1C1C] border border-white/10 rounded-xl p-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {pool.map((b, idx) => (
            <button
              key={b.id}
              type="button"
              onClick={() => switchBoard(idx)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold min-h-[36px] ${
                boardIdx % pool.length === idx
                  ? 'bg-[#B6FF00] text-[#0A0A0A]'
                  : 'bg-[#0A0A0A] text-white/70 hover:text-white border border-white/10'
              }`}
            >
              {b.title}
            </button>
          ))}
        </div>
        <span className="font-mono-tabular text-xs font-semibold text-white/80 px-2">
          Mistakes Left: {4 - mistakes} / 4
        </span>
      </div>

      {feedback && (
        <div
          className={`text-center text-sm font-medium ${
            feedback.startsWith('Locked') ? 'text-[#B6FF00]' : 'text-amber-300'
          }`}
          role="status"
        >
          {feedback}
        </div>
      )}

      {/* Solved Group Banners */}
      <div className="space-y-2">
        {solvedGroups.map((g) => {
          const style = DIFFICULTY_STYLES[g.difficulty];
          return (
            <div key={g.category} className={`rounded-xl px-4 py-3 text-center animate-tile-pop ${style.bg}`}>
              <div className="text-xs font-bold uppercase opacity-75">{style.label}</div>
              <div className="font-display text-xl font-extrabold">{g.category}</div>
              <div className="text-xs font-semibold mt-0.5">{g.items.join(' · ')}</div>
            </div>
          );
        })}
      </div>

      {/* Remaining 4x4 Tiles */}
      {tiles.length > 0 && (
        <div className={`grid grid-cols-2 sm:grid-cols-4 gap-2.5 transition-transform ${shakeBoard ? 'translate-x-1' : ''}`}>
          {tiles.map((item) => {
            const isSelected = selected.includes(item);
            return (
              <button
                key={item}
                type="button"
                onClick={() => toggleTile(item)}
                className={`min-h-[60px] px-3 py-2 rounded-xl border text-sm font-bold transition-all ${
                  isSelected
                    ? 'bg-[#B6FF00] border-[#B6FF00] text-[#0A0A0A] scale-[0.98]'
                    : 'bg-[#1C1C1C] border-white/15 text-white hover:border-white/40'
                }`}
              >
                {item}
              </button>
            );
          })}
        </div>
      )}

      {/* Action Row */}
      {!finished && (
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={shuffleTiles}
            className="inline-flex items-center gap-2 px-4 min-h-[44px] rounded-lg bg-[#1C1C1C] border border-white/15 hover:bg-white/10 text-sm font-medium"
          >
            <Shuffle className="w-4 h-4" />
            <span>Shuffle</span>
          </button>
          <button
            type="button"
            onClick={() => setSelected([])}
            disabled={selected.length === 0}
            className="px-4 min-h-[44px] rounded-lg bg-[#1C1C1C] border border-white/15 disabled:opacity-40 text-sm font-medium"
          >
            Deselect All
          </button>
          <button
            type="button"
            onClick={submitGroup}
            disabled={selected.length !== 4}
            className="px-6 min-h-[44px] rounded-lg bg-[#B6FF00] disabled:bg-white/15 disabled:text-white/40 text-[#0A0A0A] font-bold text-sm"
          >
            Submit Group ({selected.length}/4)
          </button>
        </div>
      )}
    </div>
  );
};
