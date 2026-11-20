import React, { useEffect, useState } from 'react';
import { Award, Clock, Shield, Trophy, User } from 'lucide-react';
import { MEMORY_PAIRS_BANK, MemoryCardPair } from '../data/footballData';
import { soundEngine } from '../utils/sound';
import { GameComponentProps } from './common';

type MemoryGridSize = '3x4' | '4x4' | '4x5';
type MemoryPlayMode = 'solo' | 'battle-p2' | 'battle-bot';

interface DeckCard extends MemoryCardPair {
  uid: string;
}

const SIZE_CONFIG: Record<MemoryGridSize, { pairs: number; colsClass: string; label: string }> = {
  '3x4': { pairs: 6, colsClass: 'grid-cols-4', label: 'Easy 3×4' },
  '4x4': { pairs: 8, colsClass: 'grid-cols-4', label: 'Standard 4×4' },
  '4x5': { pairs: 10, colsClass: 'grid-cols-5', label: 'Hard 4×5' },
};

function buildDeck(pairCount: number): DeckCard[] {
  const subset = MEMORY_PAIRS_BANK.slice(0, pairCount);
  const doubled = [...subset, ...subset].map((item, idx) => ({
    ...item,
    uid: `${item.pairId}-${idx}-${Math.random().toString(36).slice(2, 5)}`,
  }));
  return doubled.sort(() => Math.random() - 0.5);
}

const KindGlyph: React.FC<{ kind: MemoryCardPair['kind']; color: string }> = ({ kind, color }) => {
  if (kind === 'trophy') return <Trophy className="w-4 h-4 mb-1" style={{ color }} />;
  if (kind === 'player') return <User className="w-4 h-4 mb-1" style={{ color }} />;
  if (kind === 'icon') return <Award className="w-4 h-4 mb-1" style={{ color }} />;
  return <Shield className="w-4 h-4 mb-1" style={{ color }} />;
};

export const MemoryGridGame: React.FC<GameComponentProps> = ({
  isPaused,
  juniorMode = false,
  playerName = 'Player 1',
  onScoreChange,
  onFinish,
}) => {
  const [gridSize, setGridSize] = useState<MemoryGridSize>(juniorMode ? '3x4' : '4x4');
  const [playMode, setPlayMode] = useState<MemoryPlayMode>('solo');

  const pairCount = SIZE_CONFIG[gridSize].pairs;
  const [cards, setCards] = useState<DeckCard[]>(() => buildDeck(pairCount));
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matchedPairs, setMatchedPairs] = useState<string[]>([]);
  const [seenByBot, setSeenByBot] = useState<Record<string, number[]>>({});
  const [p1Matches, setP1Matches] = useState(0);
  const [p2Matches, setP2Matches] = useState(0);
  const [turnOwner, setTurnOwner] = useState<1 | 2>(1);
  const [turns, setTurns] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [locked, setLocked] = useState(false);
  const [finished, setFinished] = useState(false);

  const currentScore =
    playMode === 'solo'
      ? Math.max(200, 880 - Math.max(0, turns - pairCount) * 25)
      : Math.max(200, p1Matches * 100 + (p1Matches > p2Matches ? 150 : 0));

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
    onScoreChange(
      currentScore,
      playMode === 'solo'
        ? `${matchedPairs.length}/${pairCount} Pairs · ${formatTimer(elapsedSec)}`
        : `${playerName} ${p1Matches} – ${p2Matches} ${playMode === 'battle-bot' ? 'Bot' : 'P2'}`
    );
  }, [
    currentScore,
    elapsedSec,
    matchedPairs.length,
    p1Matches,
    p2Matches,
    pairCount,
    playMode,
    playerName,
    onScoreChange,
  ]);

  const resetDeck = (nextSize: MemoryGridSize, nextMode: MemoryPlayMode) => {
    const count = SIZE_CONFIG[nextSize].pairs;
    soundEngine.playClick();
    setGridSize(nextSize);
    setPlayMode(nextMode);
    setCards(buildDeck(count));
    setFlipped([]);
    setMatchedPairs([]);
    setSeenByBot({});
    setP1Matches(0);
    setP2Matches(0);
    setTurnOwner(1);
    setTurns(0);
    setElapsedSec(0);
    setLocked(false);
    setFinished(false);
  };

  const rememberCard = (idx: number, pairId: string) => {
    setSeenByBot((prev) => {
      const existing = prev[pairId] || [];
      if (existing.includes(idx)) return prev;
      return { ...prev, [pairId]: [...existing, idx] };
    });
  };

  const resolvePair = (a: number, b: number, actor: 1 | 2) => {
    const nextTurns = turns + 1;
    setTurns(nextTurns);

    if (cards[a].pairId === cards[b].pairId) {
      soundEngine.playCorrect();
      const nextMatched = [...matchedPairs, cards[a].pairId];
      setMatchedPairs(nextMatched);
      const nextP1 = actor === 1 ? p1Matches + 1 : p1Matches;
      const nextP2 = actor === 2 ? p2Matches + 1 : p2Matches;
      setP1Matches(nextP1);
      setP2Matches(nextP2);
      setFlipped([]);
      setLocked(false);

      if (nextMatched.length === pairCount) {
        setFinished(true);
        const won = playMode === 'solo' || nextP1 >= nextP2;
        if (won) soundEngine.playVictory();
        else soundEngine.playWrong();
        const finalScore =
          playMode === 'solo'
            ? Math.max(250, 880 - Math.max(0, nextTurns - pairCount) * 25)
            : Math.max(200, nextP1 * 100 + (nextP1 > nextP2 ? 150 : 0));

        onFinish({
          won,
          score: Math.min(900, finalScore),
          accuracy: Math.min(100, Math.round((pairCount / nextTurns) * 100)),
          attempts: nextTurns,
          summaryLine:
            playMode === 'solo'
              ? `Cleared ${SIZE_CONFIG[gridSize].label} (${pairCount} pairs) in ${nextTurns} turns and ${formatTimer(elapsedSec)}.`
              : `2P Battle Final: ${playerName} ${nextP1} – ${nextP2} ${playMode === 'battle-bot' ? 'Club Bot' : 'Player 2'}.`,
          shareGrid: `Memory Grid (${SIZE_CONFIG[gridSize].label}): ${nextTurns} turns\n🟩🟩🟩🟩`,
        });
      }
      return;
    }

    window.setTimeout(() => {
      soundEngine.playMove();
      setFlipped([]);
      setLocked(false);
      if (playMode !== 'solo') {
        setTurnOwner(actor === 1 ? 2 : 1);
      }
    }, 680);
  };

  // Bot turn in battle-bot mode
  useEffect(() => {
    if (finished || isPaused || locked || playMode !== 'battle-bot' || turnOwner !== 2) return;
    const unmatchedIndices = cards
      .map((c, i) => (!matchedPairs.includes(c.pairId) ? i : -1))
      .filter((i) => i !== -1);
    if (unmatchedIndices.length < 2) return;

    const timer = window.setTimeout(() => {
      let pickA = -1;
      let pickB = -1;
      // Check if bot remembers any complete unmatched pair
      for (const pairId of Object.keys(seenByBot)) {
        if (matchedPairs.includes(pairId)) continue;
        const idxs = seenByBot[pairId].filter((i) => !matchedPairs.includes(cards[i].pairId));
        if (idxs.length >= 2) {
          pickA = idxs[0];
          pickB = idxs[1];
          break;
        }
      }
      if (pickA === -1) {
        const shuffled = [...unmatchedIndices].sort(() => Math.random() - 0.5);
        pickA = shuffled[0];
        pickB = shuffled[1];
      }
      rememberCard(pickA, cards[pickA].pairId);
      rememberCard(pickB, cards[pickB].pairId);
      setLocked(true);
      setFlipped([pickA, pickB]);
      window.setTimeout(() => resolvePair(pickA, pickB, 2), 480);
    }, 650);

    return () => window.clearTimeout(timer);
  });

  const handleCardClick = (idx: number) => {
    if (finished || isPaused || locked) return;
    if (playMode === 'battle-bot' && turnOwner === 2) return;
    if (flipped.includes(idx) || matchedPairs.includes(cards[idx].pairId)) return;

    soundEngine.playClick();
    rememberCard(idx, cards[idx].pairId);
    const nextFlipped = [...flipped, idx];
    setFlipped(nextFlipped);

    if (nextFlipped.length === 2) {
      setLocked(true);
      resolvePair(nextFlipped[0], nextFlipped[1], turnOwner);
    }
  };

  return (
    <div className="w-full max-w-2xl space-y-4">
      <div className="bg-[#1C1C1C] border border-white/10 rounded-xl p-4 sm:p-5 space-y-4">
        {/* Size & Mode Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1 bg-[#0A0A0A] p-1 rounded-lg border border-white/10">
            {(['3x4', '4x4', '4x5'] as MemoryGridSize[]).map((sz) => (
              <button
                key={sz}
                type="button"
                onClick={() => resetDeck(sz, playMode)}
                className={`px-2.5 py-1.5 rounded-md text-xs font-semibold min-h-[34px] ${
                  gridSize === sz ? 'bg-[#B6FF00] text-[#0A0A0A]' : 'text-white/70 hover:text-white'
                }`}
              >
                {SIZE_CONFIG[sz].label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-[#0A0A0A] p-1 rounded-lg border border-white/10">
            {(
              [
                { id: 'solo', label: 'Solo Timed' },
                { id: 'battle-bot', label: 'vs Bot' },
                { id: 'battle-p2', label: '2P Local' },
              ] as { id: MemoryPlayMode; label: string }[]
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => resetDeck(gridSize, m.id)}
                className={`px-2.5 py-1.5 rounded-md text-xs font-semibold min-h-[34px] ${
                  playMode === m.id ? 'bg-white text-[#0A0A0A]' : 'text-white/70 hover:text-white'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-white/70">
          {playMode === 'solo' ? (
            <span>Match {pairCount} Club, Trophy & Player Pairs</span>
          ) : (
            <span className="font-semibold">
              Turn: <span className="text-[#B6FF00]">{turnOwner === 1 ? playerName : playMode === 'battle-bot' ? 'Club Bot' : 'Player 2'}</span> · {playerName} {p1Matches} – {p2Matches} {playMode === 'battle-bot' ? 'Bot' : 'P2'}
            </span>
          )}
          <span className="font-mono-tabular font-bold text-[#B6FF00] inline-flex items-center gap-2">
            <span>Turns: {turns}</span>
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {formatTimer(elapsedSec)}
            </span>
          </span>
        </div>

        <div className={`grid ${SIZE_CONFIG[gridSize].colsClass} gap-2.5`}>
          {cards.map((card, idx) => {
            const isMatched = matchedPairs.includes(card.pairId);
            const isOpen = isMatched || flipped.includes(idx);

            return (
              <button
                key={card.uid}
                type="button"
                onClick={() => handleCardClick(idx)}
                className={`aspect-square min-h-[68px] rounded-xl border p-2 flex flex-col items-center justify-center text-center transition-transform duration-150 ${
                  isMatched
                    ? 'bg-[#B6FF00]/15 border-[#B6FF00] text-white'
                    : isOpen
                    ? 'bg-white text-[#0A0A0A] border-white animate-tile-pop'
                    : 'bg-[#0A0A0A] border-white/15 hover:border-white/40 text-white/35'
                }`}
              >
                {isOpen ? (
                  <>
                    <KindGlyph kind={card.kind} color={card.badgeColor} />
                    <span className="font-display text-xs sm:text-sm font-bold leading-tight">
                      {card.label}
                    </span>
                    <span className="text-[10px] opacity-70 mt-0.5 leading-tight hidden sm:block">
                      {card.subtitle}
                    </span>
                  </>
                ) : (
                  <span className="font-display text-base sm:text-lg font-bold tracking-wider">BOLA</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
