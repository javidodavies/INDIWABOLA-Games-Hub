import React, { useCallback, useEffect, useState } from 'react';
import { Dices, ShieldCheck, Swords, TrendingDown, TrendingUp } from 'lucide-react';
import { MultiplayerLobbyBar, PlayMode } from '../components/MultiplayerLobbyBar';
import { TRIVIA_BANK } from '../data/footballData';
import { MultiplayerRoomState } from '../types';
import { soundEngine } from '../utils/sound';
import { GameComponentProps } from './common';

type JourneyTheme = 'zambia' | 'continental' | 'world';

const JOURNEY_THEMES: Record<JourneyTheme, { name: string; startLabel: string; finishLabel: string }> = {
  zambia: { name: 'Zambian Football Journey', startLabel: 'District Amateur', finishLabel: 'Super League & Cup' },
  continental: { name: 'Continental Glory', startLabel: 'Preliminary Round', finishLabel: 'CAF Champions' },
  world: { name: 'World Championship', startLabel: 'Regional Qualifier', finishLabel: 'World Trophy' },
};

const PROMOTIONS: Record<number, { to: number; label: string }> = {
  4: { to: 25, label: 'Youth Academy Call-Up' },
  13: { to: 46, label: 'Cup Victory Surge' },
  33: { to: 49, label: 'Transfer Window Signing' },
  42: { to: 63, label: 'Training Ground Peak' },
  50: { to: 69, label: 'Golden Boot Streak' },
  62: { to: 81, label: 'Top-Flight Promotion' },
  74: { to: 92, label: 'Semi-Final Winner' },
};

const RELEGATIONS: Record<number, { to: number; label: string }> = {
  27: { to: 5, label: 'Points Deduction' },
  40: { to: 3, label: 'Matchday Red Card' },
  43: { to: 18, label: 'Injury Crisis Slide' },
  54: { to: 31, label: 'VAR Disallowed Goal' },
  66: { to: 45, label: 'Relegation Battle' },
  89: { to: 53, label: 'Stoppage-Time Slip' },
  97: { to: 78, label: 'Title Race Nerve' },
};

const TACTICAL_SQUARES = new Set([17, 35, 58, 79]);
const TRIVIA_SQUARES = new Set([22, 48, 71]);

const PLAYER_COLORS = ['#B6FF00', '#EF4444', '#38BDF8', '#F59E0B'];
const BOT_NAMES = ['Nkana Bot', 'ZESCO Bot', 'Arrows Bot'];

export const RoadToGloryGame: React.FC<GameComponentProps> = ({
  playerName = 'Player 1',
  favoriteClub = 'Chipolopolo',
  initialRoomCode,
  juniorMode = false,
  isPaused,
  onScoreChange,
  onFinish,
}) => {
  const [mode, setMode] = useState<PlayMode>('bot');
  const [playerCount, setPlayerCount] = useState(2);
  const [journeyTheme, setJourneyTheme] = useState<JourneyTheme>('zambia');
  const [triviaEnabled, setTriviaEnabled] = useState(!juniorMode);
  const [room, setRoom] = useState<MultiplayerRoomState | null>(null);
  const [localPlayerId, setLocalPlayerId] = useState<string | null>(null);

  const [positions, setPositions] = useState<number[]>(() => Array(4).fill(1));
  const [shields, setShields] = useState<boolean[]>([false, false, false, false]);
  const [turnIndex, setTurnIndex] = useState(0);
  const [lastRoll, setLastRoll] = useState<number | null>(null);
  const [eventLog, setEventLog] = useState('Roll the match die to climb from Square 1 to Championship 100.');
  const [promotionsHit, setPromotionsHit] = useState(0);
  const [finished, setFinished] = useState(false);

  const [tacticalDecision, setTacticalDecision] = useState<{ playerIdx: number; sq: number } | null>(null);
  const [triviaDecision, setTriviaDecision] = useState<{ playerIdx: number; qIdx: number } | null>(null);

  const activeCount = room ? room.players.length : playerCount;

  const getPlayerLabel = (idx: number) => {
    if (room && room.players[idx]) return room.players[idx].name;
    if (idx === 0) return playerName;
    if (mode === 'bot') return BOT_NAMES[(idx - 1) % BOT_NAMES.length];
    return `Player ${idx + 1}`;
  };

  useEffect(() => {
    onScoreChange(positions[0] * 4 + promotionsHit * 40, `Square ${positions[0]}/100`);
  }, [positions, promotionsHit, onScoreChange]);

  const handleRoomUpdated = useCallback((updated: MultiplayerRoomState) => {
    setRoom(updated);
    if (Array.isArray(updated.payload?.positions)) {
      setPositions(updated.payload.positions as number[]);
      if (Array.isArray(updated.payload?.shields)) setShields(updated.payload.shields as boolean[]);
      setTurnIndex(updated.turnIndex);
      setLastRoll((updated.payload.lastRoll as number) || null);
      if (updated.lastActionLabel) setEventLog(updated.lastActionLabel);
    }
  }, []);

  const commitTurn = useCallback(
    (nextPos: number[], nextShields: boolean[], actorIdx: number, die: number | null, msg: string) => {
      const target = nextPos[actorIdx];
      const nextTurn = target === 100 ? actorIdx : (actorIdx + 1) % activeCount;
      setPositions(nextPos);
      setShields(nextShields);
      setEventLog(msg);

      if (mode === 'online' && room) {
        fetch(`/api/rooms/${room.code}/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            turnIndex: nextTurn,
            winnerId: target === 100 ? room.players[actorIdx]?.id : null,
            lastActionLabel: msg,
            status: target === 100 ? 'FINISHED' : 'ACTIVE',
            payload: { positions: nextPos, shields: nextShields, lastRoll: die },
          }),
        }).catch(() => {});
      }

      if (target === 100) {
        setFinished(true);
        const actorName = getPlayerLabel(actorIdx);
        const userWon = actorIdx === 0 || mode === 'local';
        if (userWon) soundEngine.playVictory();
        const score = userWon ? Math.min(600, 420 + promotionsHit * 40) : 160;
        window.setTimeout(() => {
          onFinish({
            won: userWon,
            score,
            accuracy: 100,
            attempts: promotionsHit,
            summaryLine: `${actorName} won ${JOURNEY_THEMES[journeyTheme].name} at Square 100!`,
            shareGrid: `Road to Glory (${JOURNEY_THEMES[journeyTheme].name})\nPromotions: ${promotionsHit}\n🏆🟩🟩🟩🟩`,
          });
        }, 700);
        return;
      }

      setTurnIndex(nextTurn);
    },
    [activeCount, journeyTheme, mode, onFinish, promotionsHit, room]
  );

  const resolveTacticalChoice = (stance: 'attack' | 'balanced' | 'defend') => {
    if (!tacticalDecision) return;
    const { playerIdx } = tacticalDecision;
    const nextPos = [...positions];
    const nextShields = [...shields];
    const actorName = getPlayerLabel(playerIdx);
    let msg = '';

    if (stance === 'attack') {
      const risk = Math.floor(Math.random() * 6) + 1;
      if (risk >= 3) {
        nextPos[playerIdx] = Math.min(99, nextPos[playerIdx] + 6);
        soundEngine.playCorrect();
        msg = `${actorName} chose ATTACK and surged +6 divisions to Sq ${nextPos[playerIdx]}!`;
      } else {
        nextPos[playerIdx] = Math.max(1, nextPos[playerIdx] - 4);
        soundEngine.playWrong();
        msg = `${actorName} chose ATTACK and got countered (-4 to Sq ${nextPos[playerIdx]}).`;
      }
    } else if (stance === 'balanced') {
      nextPos[playerIdx] = Math.min(99, nextPos[playerIdx] + 3);
      soundEngine.playMove();
      msg = `${actorName} chose BALANCED (+3 steady spaces to Sq ${nextPos[playerIdx]}).`;
    } else {
      nextPos[playerIdx] = Math.min(99, nextPos[playerIdx] + 1);
      nextShields[playerIdx] = true;
      soundEngine.playCorrect();
      msg = `${actorName} chose DEFEND (+1 space & gained a Relegation Shield!).`;
    }

    setTacticalDecision(null);
    commitTurn(nextPos, nextShields, playerIdx, lastRoll, msg);
  };

  const rollDice = useCallback(() => {
    if (finished || isPaused || tacticalDecision || triviaDecision) return;
    soundEngine.playRoll();
    const die = Math.floor(Math.random() * 6) + 1;
    setLastRoll(die);

    const nextPos = [...positions];
    const nextShields = [...shields];
    const actorName = getPlayerLabel(turnIndex);
    let target = Math.min(100, nextPos[turnIndex] + die);
    let msg = `${actorName} rolled ${die} → Square ${target}`;

    if (PROMOTIONS[target]) {
      const p = PROMOTIONS[target];
      msg = `${actorName} rolled ${die} · PROMOTION: ${p.label} (${target} → ${p.to})!`;
      target = p.to;
      if (turnIndex === 0) setPromotionsHit((c) => c + 1);
      soundEngine.playCorrect();
    } else if (RELEGATIONS[target]) {
      if (nextShields[turnIndex]) {
        nextShields[turnIndex] = false;
        soundEngine.playCorrect();
        msg = `${actorName} used a Defence Shield to block ${RELEGATIONS[target].label} at Sq ${target}!`;
      } else {
        const r = RELEGATIONS[target];
        msg = `${actorName} rolled ${die} · RELEGATION: ${r.label} (${target} → ${r.to})!`;
        target = r.to;
        soundEngine.playWrong();
      }
    } else {
      soundEngine.playMove();
    }

    nextPos[turnIndex] = target;

    if (TACTICAL_SQUARES.has(target) && turnIndex === 0) {
      setPositions(nextPos);
      setShields(nextShields);
      setTacticalDecision({ playerIdx: turnIndex, sq: target });
      setEventLog(`Tactical Challenge at Sq ${target}! Choose Attack, Balanced, or Defend.`);
      return;
    }

    if (triviaEnabled && TRIVIA_SQUARES.has(target) && turnIndex === 0) {
      setPositions(nextPos);
      setShields(nextShields);
      setTriviaDecision({ playerIdx: turnIndex, qIdx: Math.floor(Math.random() * TRIVIA_BANK.length) });
      setEventLog(`Football Knowledge Bonus at Sq ${target}!`);
      return;
    }

    commitTurn(nextPos, nextShields, turnIndex, die, msg);
  }, [commitTurn, finished, isPaused, positions, shields, tacticalDecision, triviaDecision, triviaEnabled, turnIndex]);

  useEffect(() => {
    if (mode !== 'bot' || turnIndex === 0 || finished || isPaused || tacticalDecision || triviaDecision) return;
    const t = window.setTimeout(() => rollDice(), 650);
    return () => window.clearTimeout(t);
  }, [mode, turnIndex, finished, isPaused, tacticalDecision, triviaDecision, rollDice]);

  const boardSquares: number[] = [];
  for (let row = 9; row >= 0; row--) {
    const rowCols: number[] = [];
    for (let col = 0; col < 10; col++) {
      const sq = row % 2 === 0 ? row * 10 + col + 1 : row * 10 + (10 - col);
      rowCols.push(sq);
    }
    boardSquares.push(...rowCols);
  }

  const isMyTurn =
    !finished &&
    !tacticalDecision &&
    !triviaDecision &&
    (mode === 'local' ||
      (mode === 'bot' && turnIndex === 0) ||
      (mode === 'online' && room?.players[turnIndex]?.id === localPlayerId));

  return (
    <div className="w-full max-w-5xl space-y-4">
      <MultiplayerLobbyBar
        gameId="road-to-glory"
        playerName={playerName}
        favoriteClub={favoriteClub}
        maxPlayersCap={4}
        mode={mode}
        onModeChange={setMode}
        playerCount={playerCount}
        onPlayerCountChange={setPlayerCount}
        room={room}
        localPlayerId={localPlayerId}
        initialRoomCode={initialRoomCode}
        onRoomConnected={(r, id) => {
          setRoom(r);
          setLocalPlayerId(id);
        }}
        onRoomUpdated={handleRoomUpdated}
      />

      {/* Theme & Trivia Mode Strip */}
      <div className="bg-[#1C1C1C] border border-white/10 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {(['zambia', 'continental', 'world'] as JourneyTheme[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setJourneyTheme(t)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold border ${
                journeyTheme === t
                  ? 'border-[#B6FF00] text-[#B6FF00] bg-[#B6FF00]/10'
                  : 'border-white/10 text-white/60 bg-[#0A0A0A]'
              }`}
            >
              {JOURNEY_THEMES[t].name}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setTriviaEnabled((v) => !v)}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold border ${
            triviaEnabled
              ? 'border-[#B6FF00] bg-[#B6FF00]/10 text-[#B6FF00]'
              : 'border-white/15 bg-[#0A0A0A] text-white/75'
          }`}
        >
          {triviaEnabled ? 'Football Trivia Spaces: On' : 'Casual Mode (No Trivia)'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* 10x10 Pyramid Board */}
        <div className="lg:col-span-8 bg-[#1C1C1C] border border-white/10 rounded-xl p-3 sm:p-4 shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
          <div className="flex justify-between text-[11px] text-white/55 mb-2 px-1">
            <span>Start: {JOURNEY_THEMES[journeyTheme].startLabel} (1)</span>
            <span className="text-[#B6FF00] font-semibold">Goal: {JOURNEY_THEMES[journeyTheme].finishLabel} (100)</span>
          </div>
          <div className="grid grid-cols-10 gap-1">
            {boardSquares.map((sq) => {
              const promo = PROMOTIONS[sq];
              const rel = RELEGATIONS[sq];
              const isTactic = TACTICAL_SQUARES.has(sq);
              const isTrivia = triviaEnabled && TRIVIA_SQUARES.has(sq);
              const playersHere = Array.from({ length: activeCount }, (_, i) => i).filter(
                (i) => positions[i] === sq
              );

              return (
                <div
                  key={sq}
                  className={`aspect-square rounded border flex flex-col items-center justify-between p-0.5 sm:p-1 relative text-[9px] sm:text-[10px] font-mono-tabular ${
                    sq === 100
                      ? 'bg-[#B6FF00] text-[#0A0A0A] border-[#B6FF00] font-bold'
                      : promo
                      ? 'bg-[#B6FF00]/15 border-[#B6FF00]/50 text-[#B6FF00]'
                      : rel
                      ? 'bg-red-500/15 border-red-500/45 text-red-300'
                      : isTactic
                      ? 'bg-sky-500/20 border-sky-400/50 text-sky-300'
                      : isTrivia
                      ? 'bg-amber-400/15 border-amber-400/45 text-amber-300'
                      : 'bg-[#0A0A0A] border-white/10 text-white/60'
                  }`}
                >
                  <span className="self-start leading-none">{sq}</span>
                  {promo && <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
                  {rel && <TrendingDown className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
                  {isTactic && <Swords className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
                  {playersHere.length > 0 && (
                    <div className="flex flex-wrap gap-0.5 justify-center">
                      {playersHere.map((pIdx) => (
                        <span
                          key={pIdx}
                          className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ring-1 ring-black shadow"
                          style={{ backgroundColor: PLAYER_COLORS[pIdx] }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Turn & Action Panel */}
        <div className="lg:col-span-4 bg-[#1C1C1C] border border-white/10 rounded-xl p-5 space-y-4">
          <div className="space-y-2">
            {Array.from({ length: activeCount }, (_, idx) => (
              <div
                key={idx}
                className={`p-2.5 rounded-lg border flex items-center justify-between ${
                  turnIndex === idx && !finished
                    ? 'border-[#B6FF00] bg-[#B6FF00]/10'
                    : 'border-white/10 bg-[#0A0A0A]'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: PLAYER_COLORS[idx] }} />
                  <span className="text-sm font-semibold truncate">{getPlayerLabel(idx)}</span>
                  {shields[idx] && <ShieldCheck className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
                </div>
                <span className="font-mono-tabular text-xs font-bold text-white/80">
                  Sq {positions[idx]}
                </span>
              </div>
            ))}
          </div>

          <div className="bg-[#0A0A0A] border border-white/10 rounded-lg p-3.5 text-xs text-white/80 min-h-[64px]">
            {eventLog}
          </div>

          <button
            type="button"
            disabled={!isMyTurn}
            onClick={rollDice}
            className="w-full min-h-[52px] rounded-lg bg-[#B6FF00] disabled:bg-white/15 disabled:text-white/40 text-[#0A0A0A] font-bold text-base inline-flex items-center justify-center gap-2.5"
          >
            <Dices className="w-5 h-5" />
            <span>
              {isMyTurn ? `Roll Match Die${lastRoll ? ` (Last: ${lastRoll})` : ''}` : 'Waiting for Turn...'}
            </span>
          </button>

          <div className="text-[11px] text-white/55 space-y-1 pt-1">
            <div className="text-[#B6FF00]">Lime = Promotions · Sky = Tactical Choices</div>
            <div className="text-red-400">Red = Relegation / Cards · Shield blocks 1 setback</div>
          </div>
        </div>
      </div>

      {/* Tactical Challenge Decision Modal */}
      {tacticalDecision && (
        <div className="fixed inset-0 bg-black/80 z-40 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#1C1C1C] border border-[#B6FF00] rounded-xl p-6 space-y-4">
            <div className="text-xs font-bold text-[#B6FF00]">TACTICAL CHALLENGE · SQUARE {tacticalDecision.sq}</div>
            <h3 className="font-display text-3xl font-bold text-white">Choose Your Match Stance</h3>
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => resolveTacticalChoice('attack')}
                className="w-full p-3.5 rounded-lg bg-[#0A0A0A] border border-white/15 hover:border-[#B6FF00] text-left"
              >
                <div className="font-bold text-sm text-[#B6FF00]">Attack (+6 or -4)</div>
                <div className="text-xs text-white/65">High-reward gamble: 67% surge +6, 33% counter -4.</div>
              </button>
              <button
                type="button"
                onClick={() => resolveTacticalChoice('balanced')}
                className="w-full p-3.5 rounded-lg bg-[#0A0A0A] border border-white/15 hover:border-[#B6FF00] text-left"
              >
                <div className="font-bold text-sm text-white">Balanced (+3 Guaranteed)</div>
                <div className="text-xs text-white/65">Steady midfield progression with zero risk.</div>
              </button>
              <button
                type="button"
                onClick={() => resolveTacticalChoice('defend')}
                className="w-full p-3.5 rounded-lg bg-[#0A0A0A] border border-white/15 hover:border-sky-400 text-left"
              >
                <div className="font-bold text-sm text-sky-300">Defend (+1 & Shield)</div>
                <div className="text-xs text-white/65">Gain a Defence Shield that blocks your next Relegation slide.</div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Optional Trivia Challenge Modal */}
      {triviaDecision && (
        <div className="fixed inset-0 bg-black/80 z-40 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#1C1C1C] border border-amber-400 rounded-xl p-6 space-y-4">
            <div className="text-xs font-bold text-amber-300">FOOTBALL KNOWLEDGE BONUS (+4 SPACES)</div>
            <h3 className="font-display text-2xl font-bold text-white">
              {TRIVIA_BANK[triviaDecision.qIdx].question}
            </h3>
            <div className="space-y-2">
              {TRIVIA_BANK[triviaDecision.qIdx].options.map((opt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    const correct = idx === TRIVIA_BANK[triviaDecision.qIdx].correctIndex;
                    const nextPos = [...positions];
                    if (correct) {
                      nextPos[triviaDecision.playerIdx] = Math.min(99, nextPos[triviaDecision.playerIdx] + 4);
                      soundEngine.playCorrect();
                    } else {
                      soundEngine.playWrong();
                    }
                    setTriviaDecision(null);
                    commitTurn(
                      nextPos,
                      shields,
                      triviaDecision.playerIdx,
                      lastRoll,
                      correct ? `Correct! Bonus +4 spaces to Sq ${nextPos[triviaDecision.playerIdx]}.` : 'Missed bonus question — stay at current square.'
                    );
                  }}
                  className="w-full text-left px-4 py-3 rounded-lg bg-[#0A0A0A] border border-white/15 hover:border-amber-400 text-sm font-medium min-h-[44px]"
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
