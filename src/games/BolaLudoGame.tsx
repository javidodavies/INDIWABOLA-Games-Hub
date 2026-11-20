import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Dices,
  Shield,
  Sparkles,
  Star,
  Trophy,
} from 'lucide-react';
import { MultiplayerLobbyBar, PlayMode } from '../components/MultiplayerLobbyBar';
import { TRIVIA_BANK } from '../data/footballData';
import { MultiplayerRoomState } from '../types';
import { canLudoTokenMove, getLudoGlobalTrackIndex, LUDO_SAFE_TRACK_INDICES } from '../utils/gameRules';
import { soundEngine } from '../utils/sound';
import { GameComponentProps } from './common';

type BoardTheme = 'stadium' | 'street' | 'championship';
type LudoRulesMode = 'classic' | 'tactics';

type TacticalSpaceType =
  | 'DEFENCE'
  | 'COUNTERATTACK'
  | 'OFFSIDE'
  | 'YELLOW_CARD'
  | 'PENALTY'
  | 'FREE_KICK'
  | 'VAR_REVIEW';

const TACTICAL_SPACES: Record<number, { type: TacticalSpaceType; short: string; label: string; desc: string }> = {
  4: { type: 'DEFENCE', short: 'DEF', label: 'Defence', desc: 'Token gains a 1-time capture shield.' },
  6: { type: 'FREE_KICK', short: 'FK', label: 'Free Kick', desc: 'Choose +1, +2, or +3 tactical yards.' },
  10: { type: 'COUNTERATTACK', short: 'CA', label: 'Counterattack', desc: 'Sprint +2 extra spaces immediately.' },
  12: { type: 'VAR_REVIEW', short: 'VAR', label: 'VAR Review', desc: 'Clears cards or boosts trailing squad token +2.' },
  16: { type: 'OFFSIDE', short: 'OFF', label: 'Offside', desc: 'Token capped at max roll 3 on its next turn.' },
  19: { type: 'YELLOW_CARD', short: 'YC', label: 'Yellow Card', desc: 'This token misses its next movement chance.' },
  23: { type: 'PENALTY', short: 'PEN', label: 'Penalty', desc: 'Answer a spot-kick quiz for +3 steps.' },
  30: { type: 'DEFENCE', short: 'DEF', label: 'Defence', desc: 'Token gains a 1-time capture shield.' },
  32: { type: 'FREE_KICK', short: 'FK', label: 'Free Kick', desc: 'Choose +1, +2, or +3 tactical yards.' },
  36: { type: 'COUNTERATTACK', short: 'CA', label: 'Counterattack', desc: 'Sprint +2 extra spaces immediately.' },
  38: { type: 'VAR_REVIEW', short: 'VAR', label: 'VAR Review', desc: 'Clears cards or boosts trailing squad token +2.' },
  42: { type: 'OFFSIDE', short: 'OFF', label: 'Offside', desc: 'Token capped at max roll 3 on its next turn.' },
  45: { type: 'YELLOW_CARD', short: 'YC', label: 'Yellow Card', desc: 'This token misses its next movement chance.' },
  49: { type: 'PENALTY', short: 'PEN', label: 'Penalty', desc: 'Answer a spot-kick quiz for +3 steps.' },
};

const THEME_STYLES: Record<
  BoardTheme,
  { name: string; frame: string; turf: string; cellBorder: string; accent: string }
> = {
  stadium: {
    name: 'Stadium Edition',
    frame: 'bg-gradient-to-b from-[#132619] to-[#0a120d] border-[#B6FF00]/40',
    turf: 'bg-[#0e1f13]',
    cellBorder: 'border-[#B6FF00]/20',
    accent: '#B6FF00',
  },
  street: {
    name: 'Street Football',
    frame: 'bg-gradient-to-b from-[#26262a] to-[#121215] border-sky-400/35',
    turf: 'bg-[#1a1a1f]',
    cellBorder: 'border-white/15',
    accent: '#38BDF8',
  },
  championship: {
    name: 'Championship Gold',
    frame: 'bg-gradient-to-b from-[#231d0f] to-[#0d0b07] border-amber-400/45',
    turf: 'bg-[#14110b]',
    cellBorder: 'border-amber-400/25',
    accent: '#FACC15',
  },
};

const TRACK_COORDS: [number, number][] = [
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
  [0, 7], [0, 8],
  [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
  [7, 14], [8, 14],
  [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
  [14, 7], [14, 6],
  [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
  [7, 0], [6, 0],
];

const HOME_LANES: [number, number][][] = [
  [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
  [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
  [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
  [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]],
];

const CLUB_CONFIG = [
  {
    name: 'Chipolopolo',
    short: 'CHIP',
    color: '#B6FF00',
    rim: '#6e9f00',
    tintBg: 'rgba(182, 255, 0, 0.14)',
    trackTint: 'rgba(182, 255, 0, 0.28)',
    laneTint: 'rgba(182, 255, 0, 0.22)',
  },
  {
    name: 'Nkana Red',
    short: 'NKANA',
    color: '#EF4444',
    rim: '#991b1b',
    tintBg: 'rgba(239, 68, 68, 0.14)',
    trackTint: 'rgba(239, 68, 68, 0.28)',
    laneTint: 'rgba(239, 68, 68, 0.22)',
  },
  {
    name: 'ZESCO Sky',
    short: 'ZESCO',
    color: '#38BDF8',
    rim: '#0369a1',
    tintBg: 'rgba(56, 189, 248, 0.14)',
    trackTint: 'rgba(56, 189, 248, 0.28)',
    laneTint: 'rgba(56, 189, 248, 0.22)',
  },
  {
    name: 'Power Gold',
    short: 'POWER',
    color: '#FACC15',
    rim: '#a16207',
    tintBg: 'rgba(250, 204, 21, 0.14)',
    trackTint: 'rgba(250, 204, 21, 0.28)',
    laneTint: 'rgba(250, 204, 21, 0.22)',
  },
];

const YARD_SLOTS: [number, number][][] = [
  [[2, 2], [2, 3], [3, 2], [3, 3]],
  [[2, 11], [2, 12], [3, 11], [3, 12]],
  [[11, 11], [11, 12], [12, 11], [12, 12]],
  [[11, 2], [11, 3], [12, 2], [12, 3]],
];

const FINISHED_GOAL_ANCHORS: [number, number][] = [
  [7, 6.28], // Left triangle (Chipolopolo)
  [6.28, 7], // Top triangle (Nkana Red)
  [7, 7.72], // Right triangle (ZESCO Sky)
  [7.72, 7], // Bottom triangle (Power Gold)
];

const DUGOUT_GRID_AREAS: { gridRow: string; gridColumn: string; corner: number }[] = [
  { corner: 0, gridRow: '1 / 7', gridColumn: '1 / 7' },
  { corner: 1, gridRow: '1 / 7', gridColumn: '10 / 16' },
  { corner: 2, gridRow: '10 / 16', gridColumn: '10 / 16' },
  { corner: 3, gridRow: '10 / 16', gridColumn: '1 / 7' },
];

const DIE_PIPS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[28, 28], [72, 72]],
  3: [[28, 28], [50, 50], [72, 72]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
  6: [[28, 24], [72, 24], [28, 50], [72, 50], [28, 76], [72, 76]],
};

const STACK_OFFSETS: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [[-0.22, -0.14], [0.22, 0.14]],
  3: [[0, -0.22], [-0.22, 0.18], [0.22, 0.18]],
  4: [[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22]],
};

interface TokenStatusFlags {
  shielded: boolean;
  offside: boolean;
  yellowCard: boolean;
}

const StadiumDieFace: React.FC<{ value: number | null; rollSeq: number; activeAccent: string }> = ({
  value,
  rollSeq,
  activeAccent,
}) => {
  const pips = value ? DIE_PIPS[value] : [];
  return (
    <div
      key={rollSeq}
      className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center shrink-0 shadow-[0_6px_16px_rgba(0,0,0,0.45)] ${
        value ? 'bg-[#F8FAFC] border-white animate-die-tumble' : 'bg-[#0A0A0A] border-white/15'
      }`}
      style={value ? { boxShadow: `0 6px 18px ${activeAccent}25, inset 0 -2px 4px rgba(0,0,0,0.18)` } : undefined}
      aria-label={value ? `Rolled ${value}` : 'Die ready to roll'}
    >
      {value ? (
        <svg viewBox="0 0 100 100" className="w-10 h-10" aria-hidden="true">
          {pips.map(([cx, cy], idx) => (
            <circle
              key={idx}
              cx={cx}
              cy={cy}
              r={value === 1 ? 13 : 9.5}
              fill={value === 6 ? '#15803D' : '#0A0A0A'}
            />
          ))}
        </svg>
      ) : (
        <span className="font-display text-2xl font-extrabold text-white/35">—</span>
      )}
    </div>
  );
};

export const BolaLudoGame: React.FC<GameComponentProps> = ({
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
  const [boardTheme, setBoardTheme] = useState<BoardTheme>('stadium');
  const [rulesMode, setRulesMode] = useState<LudoRulesMode>(juniorMode ? 'classic' : 'tactics');
  const [room, setRoom] = useState<MultiplayerRoomState | null>(null);
  const [localPlayerId, setLocalPlayerId] = useState<string | null>(null);

  const [tokens, setTokens] = useState<number[][]>(() => [
    [-1, -1, -1, -1],
    [-1, -1, -1, -1],
    [-1, -1, -1, -1],
    [-1, -1, -1, -1],
  ]);
  const [flags, setFlags] = useState<TokenStatusFlags[][]>(() =>
    Array.from({ length: 4 }, () =>
      Array.from({ length: 4 }, () => ({ shielded: false, offside: false, yellowCard: false }))
    )
  );

  const [turnIndex, setTurnIndex] = useState(0);
  const [dieValue, setDieValue] = useState<number | null>(null);
  const [rollSeq, setRollSeq] = useState(0);
  const [awaitingMove, setAwaitingMove] = useState(false);
  const [capturesCount, setCapturesCount] = useState(0);
  const [statusLog, setStatusLog] = useState('Roll a 6 to deploy a football token from your team camp.');
  const [finished, setFinished] = useState(false);
  const [inspectedTactic, setInspectedTactic] = useState<{ label: string; desc: string } | null>(null);

  // Tactical modals (Free Kick choice / Penalty spot-kick question)
  const [freeKickChoice, setFreeKickChoice] = useState<{ corner: number; tokenIdx: number } | null>(null);
  const [penaltyPrompt, setPenaltyPrompt] = useState<{ corner: number; tokenIdx: number; qIdx: number } | null>(null);

  const activeCount = room ? room.players.length : playerCount;
  const theme = THEME_STYLES[boardTheme];

  const getCornerForSlot = useCallback(
    (slotIdx: number): number => {
      if (activeCount === 2) return slotIdx === 0 ? 0 : 2;
      return slotIdx;
    },
    [activeCount]
  );

  const getPlayerLabel = useCallback(
    (slotIdx: number) => {
      if (room && room.players[slotIdx]) return room.players[slotIdx].name;
      if (slotIdx === 0) return favoriteClub ? `${playerName} (${favoriteClub})` : playerName;
      if (mode === 'bot') return `${CLUB_CONFIG[getCornerForSlot(slotIdx)].name} Bot`;
      return `Player ${slotIdx + 1}`;
    },
    [favoriteClub, getCornerForSlot, mode, playerName, room]
  );

  const activeCorner = getCornerForSlot(turnIndex);

  useEffect(() => {
    const homeCount = tokens[0].filter((t) => t === 56).length;
    const progressSum = tokens[0].reduce((s, t) => s + Math.max(0, t), 0);
    onScoreChange(homeCount * 100 + capturesCount * 100 + progressSum, `${CLUB_CONFIG[activeCorner].name} Turn`);
  }, [tokens, capturesCount, activeCorner, onScoreChange]);

  const handleRoomUpdated = useCallback((updated: MultiplayerRoomState) => {
    setRoom(updated);
    if (Array.isArray(updated.payload?.tokens)) {
      setTokens(updated.payload.tokens as number[][]);
      if (Array.isArray(updated.payload?.flags)) {
        setFlags(updated.payload.flags as TokenStatusFlags[][]);
      }
      setTurnIndex(updated.turnIndex);
      setDieValue((updated.payload.dieValue as number | null) ?? null);
      setAwaitingMove(Boolean(updated.payload.awaitingMove));
      if (updated.lastActionLabel) setStatusLog(updated.lastActionLabel);
    }
  }, []);

  const syncOnline = useCallback(
    (
      nextTokens: number[][],
      nextFlags: TokenStatusFlags[][],
      nextTurn: number,
      nextDie: number | null,
      nextAwait: boolean,
      msg: string,
      winnerSlot: number | null
    ) => {
      if (mode !== 'online' || !room) return;
      fetch(`/api/rooms/${room.code}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          turnIndex: nextTurn,
          winnerId: winnerSlot !== null ? room.players[winnerSlot]?.id : null,
          lastActionLabel: msg,
          status: winnerSlot !== null ? 'FINISHED' : 'ACTIVE',
          payload: { tokens: nextTokens, flags: nextFlags, dieValue: nextDie, awaitingMove: nextAwait },
        }),
      }).catch(() => {});
    },
    [mode, room]
  );

  const isTokenSelectable = useCallback(
    (corner: number, tokenIdx: number, die: number): boolean => {
      const prog = tokens[corner][tokenIdx];
      const f = flags[corner][tokenIdx];
      if (f.yellowCard) return false;
      return canLudoTokenMove(prog, die, f.offside);
    },
    [flags, tokens]
  );

  const finalizeTurnProgression = useCallback(
    (
      nextTokens: number[][],
      nextFlags: TokenStatusFlags[][],
      corner: number,
      bonusRoll: boolean,
      msg: string
    ) => {
      const allFinished = nextTokens[corner].every((t) => t === 56);
      if (allFinished) {
        setTokens(nextTokens);
        setFlags(nextFlags);
        setAwaitingMove(false);
        setDieValue(null);
        setFinished(true);
        const actorName = getPlayerLabel(turnIndex);
        const userWon = turnIndex === 0 || mode === 'local';
        if (userWon) soundEngine.playVictory();
        syncOnline(nextTokens, nextFlags, turnIndex, null, false, `${actorName} lifted the Trophy Cup!`, turnIndex);
        window.setTimeout(() => {
          onFinish({
            won: userWon,
            score: userWon ? 500 + capturesCount * 100 : 180,
            accuracy: 100,
            attempts: capturesCount + 4,
            summaryLine: `${actorName} navigated ${rulesMode === 'tactics' ? 'Football Tactics Mode' : 'Classic Mode'} to claim the Final Whistle Trophy!`,
            shareGrid: `BOLA Ludo (${rulesMode === 'tactics' ? 'Tactics' : 'Classic'})\nCaptures: ${capturesCount}\n🏆🟩🟩🟩🟩`,
          });
        }, 700);
        return;
      }

      // Clear yellowCard for current corner's idle tokens after turn completes
      const updatedFlags = nextFlags.map((arr, cIdx) =>
        cIdx === corner ? arr.map((fl) => ({ ...fl, yellowCard: false })) : arr
      );

      const nextTurn = bonusRoll ? turnIndex : (turnIndex + 1) % activeCount;
      setTokens(nextTokens);
      setFlags(updatedFlags);
      setDieValue(null);
      setAwaitingMove(false);
      setTurnIndex(nextTurn);
      setStatusLog(msg);
      syncOnline(nextTokens, updatedFlags, nextTurn, null, false, msg, null);
    },
    [activeCount, capturesCount, getPlayerLabel, mode, onFinish, rulesMode, syncOnline, turnIndex]
  );

  const applyBonusSteps = (corner: number, tokenIdx: number, extraSteps: number, label: string) => {
    const nextTokens = tokens.map((a) => [...a]);
    const nextFlags = flags.map((a) => a.map((f) => ({ ...f })));
    const cur = nextTokens[corner][tokenIdx];
    const target = Math.min(55, cur + extraSteps);
    nextTokens[corner][tokenIdx] = target;
    soundEngine.playCorrect();
    setFreeKickChoice(null);
    setPenaltyPrompt(null);
    finalizeTurnProgression(nextTokens, nextFlags, corner, false, `${label} (+${extraSteps} steps).`);
  };

  const executeTokenMove = useCallback(
    (tokenIdx: number) => {
      if (!awaitingMove || dieValue === null || finished || freeKickChoice || penaltyPrompt) return;
      const corner = getCornerForSlot(turnIndex);
      if (!isTokenSelectable(corner, tokenIdx, dieValue)) return;

      const curProg = tokens[corner][tokenIdx];
      let nextProg = curProg === -1 ? 0 : curProg + dieValue;
      const nextTokens = tokens.map((arr) => [...arr]);
      const nextFlags = flags.map((arr) => arr.map((f) => ({ ...f })));

      // Clear offside after executing this capped move
      nextFlags[corner][tokenIdx].offside = false;
      nextTokens[corner][tokenIdx] = nextProg;

      let capturedOpponent = false;
      const landedTrack = getLudoGlobalTrackIndex(corner, nextProg);

      // Check Captures (respecting traditional safe stars AND Tactical Defence shield)
      if (landedTrack !== null && !LUDO_SAFE_TRACK_INDICES.has(landedTrack)) {
        for (let s = 0; s < activeCount; s++) {
          const otherCorner = getCornerForSlot(s);
          if (otherCorner === corner) continue;
          nextTokens[otherCorner] = nextTokens[otherCorner].map((opProg, opIdx) => {
            if (getLudoGlobalTrackIndex(otherCorner, opProg) === landedTrack) {
              if (nextFlags[otherCorner][opIdx].shielded) {
                nextFlags[otherCorner][opIdx].shielded = false;
                return opProg;
              }
              capturedOpponent = true;
              return -1;
            }
            return opProg;
          });
        }
      }

      const actorName = getPlayerLabel(turnIndex);
      let msg = `${actorName} moved to ${nextProg === 56 ? 'Final Whistle Cup!' : `step ${nextProg + 1}`}.`;

      if (capturedOpponent) {
        soundEngine.playCapture();
        if (turnIndex === 0) setCapturesCount((c) => c + 1);
        msg = `${actorName} tackled a rival token back to camp! Bonus roll earned.`;
      } else if (nextProg === 56) {
        soundEngine.playCorrect();
      } else {
        soundEngine.playMove();
      }

      // Check Football Tactics Mode Special Space
      const tactic = rulesMode === 'tactics' && landedTrack !== null ? TACTICAL_SPACES[landedTrack] : undefined;
      if (tactic && !capturedOpponent && nextProg < 51) {
        if (tactic.type === 'DEFENCE') {
          nextFlags[corner][tokenIdx].shielded = true;
          msg = `${actorName} landed on DEFENCE — token shielded from 1 tackle.`;
        } else if (tactic.type === 'COUNTERATTACK') {
          nextProg = Math.min(50, nextProg + 2);
          nextTokens[corner][tokenIdx] = nextProg;
          soundEngine.playCorrect();
          msg = `${actorName} triggered COUNTERATTACK (+2 yards)!`;
        } else if (tactic.type === 'OFFSIDE') {
          nextFlags[corner][tokenIdx].offside = true;
          soundEngine.playWrong();
          msg = `${actorName} caught OFFSIDE — max roll 3 on this token next turn.`;
        } else if (tactic.type === 'YELLOW_CARD') {
          nextFlags[corner][tokenIdx].yellowCard = true;
          soundEngine.playWrong();
          msg = `${actorName} drew a YELLOW CARD — this token skips next move.`;
        } else if (tactic.type === 'VAR_REVIEW') {
          const trailingIdx = nextTokens[corner].findIndex((p, idx) => idx !== tokenIdx && p >= 0 && p < 48);
          if (trailingIdx !== -1) {
            nextTokens[corner][trailingIdx] += 2;
            msg = `VAR REVIEW cleared play and advanced trailing token +2!`;
          } else {
            nextFlags[corner][tokenIdx].shielded = true;
            msg = `VAR REVIEW awarded a Defence Shield!`;
          }
        } else if (tactic.type === 'FREE_KICK' && turnIndex === 0) {
          setTokens(nextTokens);
          setFlags(nextFlags);
          setFreeKickChoice({ corner, tokenIdx });
          setStatusLog('FREE KICK awarded — pick +1, +2, or +3 yards.');
          return;
        } else if (tactic.type === 'PENALTY' && turnIndex === 0) {
          setTokens(nextTokens);
          setFlags(nextFlags);
          setPenaltyPrompt({ corner, tokenIdx, qIdx: Math.floor(Math.random() * TRIVIA_BANK.length) });
          setStatusLog('PENALTY SPOT! Answer correctly for +3 bonus steps.');
          return;
        } else if (tactic.type === 'FREE_KICK' || tactic.type === 'PENALTY') {
          nextTokens[corner][tokenIdx] = Math.min(50, nextProg + 2);
          msg = `${actorName} converted a set-piece (+2 steps)!`;
        }
      }

      const getsBonusRoll = dieValue === 6 || capturedOpponent || nextProg === 56;
      finalizeTurnProgression(nextTokens, nextFlags, corner, getsBonusRoll, msg);
    },
    [
      activeCount,
      awaitingMove,
      dieValue,
      finalizeTurnProgression,
      finished,
      flags,
      freeKickChoice,
      getCornerForSlot,
      getPlayerLabel,
      isTokenSelectable,
      penaltyPrompt,
      rulesMode,
      tokens,
      turnIndex,
    ]
  );

  const rollDie = useCallback(() => {
    if (awaitingMove || finished || isPaused || freeKickChoice || penaltyPrompt) return;
    soundEngine.playRoll();
    const rolled = Math.floor(Math.random() * 6) + 1;
    setRollSeq((s) => s + 1);
    const corner = getCornerForSlot(turnIndex);
    const validMoves = tokens[corner]
      .map((_, idx) => (isTokenSelectable(corner, idx, rolled) ? idx : -1))
      .filter((idx) => idx !== -1);

    const actorName = getPlayerLabel(turnIndex);

    if (validMoves.length === 0) {
      const clearedFlags = flags.map((arr, cIdx) =>
        cIdx === corner ? arr.map((fl) => ({ ...fl, yellowCard: false })) : arr
      );
      const nextTurn = (turnIndex + 1) % activeCount;
      const msg = `${actorName} rolled ${rolled} — no eligible token moves.`;
      setDieValue(rolled);
      setStatusLog(msg);
      window.setTimeout(() => {
        setFlags(clearedFlags);
        setDieValue(null);
        setTurnIndex(nextTurn);
        syncOnline(tokens, clearedFlags, nextTurn, null, false, msg, null);
      }, 650);
      return;
    }

    setDieValue(rolled);
    setAwaitingMove(true);
    setStatusLog(`${actorName} rolled ${rolled}! Select a highlighted football token.`);
    syncOnline(tokens, flags, turnIndex, rolled, true, `${actorName} rolled ${rolled}`, null);
  }, [
    activeCount,
    awaitingMove,
    finished,
    flags,
    freeKickChoice,
    getCornerForSlot,
    getPlayerLabel,
    isPaused,
    isTokenSelectable,
    penaltyPrompt,
    syncOnline,
    tokens,
    turnIndex,
  ]);

  // Bot automation
  useEffect(() => {
    if (mode !== 'bot' || turnIndex === 0 || finished || isPaused || freeKickChoice || penaltyPrompt) return;
    if (!awaitingMove && dieValue === null) {
      const t = window.setTimeout(() => rollDie(), 580);
      return () => window.clearTimeout(t);
    }
    if (awaitingMove && dieValue !== null) {
      const corner = getCornerForSlot(turnIndex);
      const valid = tokens[corner]
        .map((p, idx) => ({ idx, p }))
        .filter((item) => isTokenSelectable(corner, item.idx, dieValue));
      if (valid.length > 0) {
        valid.sort((a, b) => {
          if (a.p + dieValue === 56) return -1;
          if (b.p + dieValue === 56) return 1;
          if (a.p === -1) return -1;
          if (b.p === -1) return 1;
          return b.p - a.p;
        });
        const t = window.setTimeout(() => executeTokenMove(valid[0].idx), 520);
        return () => window.clearTimeout(t);
      }
    }
  }, [
    awaitingMove,
    dieValue,
    executeTokenMove,
    finished,
    freeKickChoice,
    getCornerForSlot,
    isPaused,
    isTokenSelectable,
    mode,
    penaltyPrompt,
    rollDie,
    tokens,
    turnIndex,
  ]);

  const isMyTurn =
    !finished &&
    !freeKickChoice &&
    !penaltyPrompt &&
    (mode === 'local' ||
      (mode === 'bot' && turnIndex === 0) ||
      (mode === 'online' && room?.players[turnIndex]?.id === localPlayerId));

  // Keyboard support: Space to roll die, 1–4 to pick eligible token
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
        return;
      }
      if (!isMyTurn || isPaused || finished || freeKickChoice || penaltyPrompt) return;

      if (e.code === 'Space') {
        if (!awaitingMove) {
          e.preventDefault();
          rollDie();
        }
      } else if (awaitingMove && dieValue !== null && ['1', '2', '3', '4'].includes(e.key)) {
        const idx = Number(e.key) - 1;
        if (isTokenSelectable(activeCorner, idx, dieValue)) {
          e.preventDefault();
          executeTokenMove(idx);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    activeCorner,
    awaitingMove,
    dieValue,
    executeTokenMove,
    finished,
    freeKickChoice,
    isMyTurn,
    isPaused,
    isTokenSelectable,
    penaltyPrompt,
    rollDie,
  ]);

  const trackIdxByCoord = useMemo(() => {
    const map = new Map<string, number>();
    TRACK_COORDS.forEach(([r, c], idx) => map.set(`${r},${c}`, idx));
    return map;
  }, []);

  const homeLaneByCoord = useMemo(() => {
    const map = new Map<string, { corner: number; step: number }>();
    HOME_LANES.forEach((lane, corner) => {
      lane.forEach(([r, c], step) => map.set(`${r},${c}`, { corner, step }));
    });
    return map;
  }, []);

  const stadiumTrackCells = useMemo(() => {
    const cells: { r: number; c: number }[] = [];
    for (let r = 0; r < 15; r++) {
      for (let c = 0; c < 15; c++) {
        const inCorner = (r < 6 && c < 6) || (r < 6 && c > 8) || (r > 8 && c > 8) || (r > 8 && c < 6);
        const inGoal = r >= 6 && r <= 8 && c >= 6 && c <= 8;
        if (!inCorner && !inGoal) {
          cells.push({ r, c });
        }
      }
    }
    return cells;
  }, []);

  // Build positioned tokens list (used both for Stadium smooth GPU token layer and classic grid lookup)
  const { cellTokensMap, positionedTokens } = useMemo(() => {
    const map = new Map<
      string,
      {
        corner: number;
        tokenIdx: number;
        canMove: boolean;
        shielded: boolean;
        offside: boolean;
        yellowCard: boolean;
        r: number;
        c: number;
      }[]
    >();

    for (let s = 0; s < activeCount; s++) {
      const corner = getCornerForSlot(s);
      tokens[corner].forEach((prog, tokenIdx) => {
        let coord: [number, number] | null = null;
        if (prog === -1) {
          coord = YARD_SLOTS[corner][tokenIdx];
        } else if (prog <= 50) {
          const gIdx = getLudoGlobalTrackIndex(corner, prog);
          if (gIdx !== null) coord = TRACK_COORDS[gIdx];
        } else if (prog <= 55) {
          coord = HOME_LANES[corner][prog - 51];
        } else {
          coord = boardTheme === 'stadium' ? FINISHED_GOAL_ANCHORS[corner] : [7, 7];
        }
        if (coord) {
          const k = `${coord[0]},${coord[1]}`;
          const list = map.get(k) || [];
          const isCurrentActor =
            corner === activeCorner && awaitingMove && dieValue !== null && isTokenSelectable(corner, tokenIdx, dieValue);
          list.push({
            corner,
            tokenIdx,
            canMove: isCurrentActor,
            shielded: flags[corner][tokenIdx].shielded,
            offside: flags[corner][tokenIdx].offside,
            yellowCard: flags[corner][tokenIdx].yellowCard,
            r: coord[0],
            c: coord[1],
          });
          map.set(k, list);
        }
      });
    }

    const flat: {
      corner: number;
      tokenIdx: number;
      canMove: boolean;
      shielded: boolean;
      offside: boolean;
      yellowCard: boolean;
      r: number;
      c: number;
      dx: number;
      dy: number;
      scale: number;
    }[] = [];

    map.forEach((group) => {
      const count = group.length;
      const offsets = STACK_OFFSETS[Math.min(4, count)] || STACK_OFFSETS[4];
      const scale = count === 1 ? 1 : count === 2 ? 0.84 : 0.74;
      group.forEach((tok, idx) => {
        const [dx, dy] = offsets[idx % offsets.length];
        flat.push({ ...tok, dx, dy, scale });
      });
    });

    // Keep consistent DOM key order so CSS transform glides tokens smoothly between cells
    flat.sort((a, b) => a.corner - b.corner || a.tokenIdx - b.tokenIdx);

    return { cellTokensMap: map, positionedTokens: flat };
  }, [activeCorner, activeCount, awaitingMove, boardTheme, dieValue, flags, getCornerForSlot, isTokenSelectable, tokens]);

  const eligibleActiveTokens = useMemo(() => {
    if (!isMyTurn || !awaitingMove || dieValue === null) return [];
    return tokens[activeCorner]
      .map((prog, tokenIdx) => ({
        tokenIdx,
        prog,
        selectable: isTokenSelectable(activeCorner, tokenIdx, dieValue),
      }))
      .filter((item) => item.selectable);
  }, [activeCorner, awaitingMove, dieValue, isMyTurn, isTokenSelectable, tokens]);

  // Fallback cell styling preserved for Street & Championship themes (redesign deferred until approved)
  const getCellStyle = (r: number, c: number): string => {
    if (r < 6 && c < 6) return 'bg-[#B6FF00]/15 border-[#B6FF00]/35 shadow-inner';
    if (r < 6 && c > 8) return 'bg-red-500/15 border-red-500/35 shadow-inner';
    if (r > 8 && c > 8) return 'bg-sky-400/15 border-sky-400/35 shadow-inner';
    if (r > 8 && c < 6) return 'bg-amber-400/15 border-amber-400/35 shadow-inner';
    if (r >= 6 && r <= 8 && c >= 6 && c <= 8) return 'bg-white/10 border-white/25';

    if (r === 7 && c >= 1 && c <= 5) return 'bg-[#B6FF00]/35 border-[#B6FF00]/60';
    if (c === 7 && r >= 1 && r <= 5) return 'bg-red-500/35 border-red-500/60';
    if (r === 7 && c >= 9 && c <= 13) return 'bg-sky-400/35 border-sky-400/60';
    if (c === 7 && r >= 9 && r <= 13) return 'bg-amber-400/35 border-amber-400/60';

    const tIdx = trackIdxByCoord.get(`${r},${c}`);
    if (tIdx === 0) return 'bg-[#B6FF00]/45 border-[#B6FF00]';
    if (tIdx === 13) return 'bg-red-500/45 border-red-500';
    if (tIdx === 26) return 'bg-sky-400/45 border-sky-400';
    if (tIdx === 39) return 'bg-amber-400/45 border-amber-400';
    if (tIdx !== undefined && LUDO_SAFE_TRACK_INDICES.has(tIdx)) return 'bg-white/15 border-white/35';

    const tactic = rulesMode === 'tactics' && tIdx !== undefined ? TACTICAL_SPACES[tIdx] : undefined;
    if (tactic) {
      if (tactic.type === 'COUNTERATTACK' || tactic.type === 'FREE_KICK' || tactic.type === 'PENALTY') {
        return 'bg-[#B6FF00]/15 border-[#B6FF00]/45';
      }
      if (tactic.type === 'OFFSIDE' || tactic.type === 'YELLOW_CARD') {
        return 'bg-amber-500/20 border-amber-400/50';
      }
      return 'bg-sky-500/20 border-sky-400/50';
    }

    return `${theme.turf} ${theme.cellBorder}`;
  };

  const renderStartArrow = (tIdx: number | undefined) => {
    if (tIdx === 0) return <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#0A0A0A]" />;
    if (tIdx === 13) return <ArrowDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />;
    if (tIdx === 26) return <ArrowLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#0A0A0A]" />;
    if (tIdx === 39) return <ArrowUp className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#0A0A0A]" />;
    return null;
  };

  const renderHomeChevron = (corner: number) => {
    const cls = 'w-3 h-3 sm:w-3.5 sm:h-3.5 opacity-60';
    const style = { color: CLUB_CONFIG[corner].color };
    if (corner === 0) return <ChevronRight className={cls} style={style} />;
    if (corner === 1) return <ChevronDown className={cls} style={style} />;
    if (corner === 2) return <ChevronLeft className={cls} style={style} />;
    return <ChevronUp className={cls} style={style} />;
  };

  return (
    <div className="w-full max-w-5xl space-y-4">
      <MultiplayerLobbyBar
        gameId="bola-ludo"
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

      {/* Mode & Theme Configuration Strip */}
      <div className="bg-[#1C1C1C] border border-white/10 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-[#0A0A0A] p-1 rounded-lg border border-white/10">
          <button
            type="button"
            onClick={() => setRulesMode('classic')}
            className={`px-3 py-2 min-h-[38px] rounded-md text-xs font-bold transition-colors ${
              rulesMode === 'classic' ? 'bg-white text-[#0A0A0A]' : 'text-white/65 hover:text-white'
            }`}
          >
            Classic Mode
          </button>
          <button
            type="button"
            onClick={() => setRulesMode('tactics')}
            className={`inline-flex items-center gap-1.5 px-3 py-2 min-h-[38px] rounded-md text-xs font-bold transition-colors ${
              rulesMode === 'tactics' ? 'bg-[#B6FF00] text-[#0A0A0A]' : 'text-white/65 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Football Tactics Mode</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(['stadium', 'street', 'championship'] as BoardTheme[]).map((tKey) => (
            <button
              key={tKey}
              type="button"
              onClick={() => setBoardTheme(tKey)}
              className={`px-3 py-2 min-h-[38px] rounded-md text-xs font-semibold border transition-colors ${
                boardTheme === tKey
                  ? 'border-[#B6FF00] text-[#B6FF00] bg-[#B6FF00]/10'
                  : 'border-white/10 text-white/65 hover:text-white bg-[#0A0A0A]'
              }`}
            >
              {THEME_STYLES[tKey].name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {boardTheme === 'stadium' ? (
          /* STADIUM EDITION — ARCHITECTURAL PITCH BOARD */
          <div className="lg:col-span-8 rounded-2xl border border-[#B6FF00]/30 bg-[#0C1710] p-2.5 sm:p-5 relative shadow-[0_24px_48px_rgba(0,0,0,0.65)]">
            {/* Soft Ambient Stadium Floodlight Wash */}
            <div
              className="pointer-events-none absolute inset-0 rounded-2xl"
              style={{
                background:
                  'radial-gradient(circle at 12% 8%, rgba(182,255,0,0.09), transparent 40%), radial-gradient(circle at 88% 8%, rgba(255,255,255,0.06), transparent 40%)',
              }}
            />

            {/* Board Top Pitch Header */}
            <div className="relative flex items-center justify-between gap-2 mb-2.5 px-1">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ backgroundColor: CLUB_CONFIG[activeCorner].color }}
                />
                <span className="font-display text-sm sm:text-base font-bold tracking-wide text-white truncate">
                  STADIUM EDITION
                </span>
                <span className="text-xs text-white/50 hidden sm:inline">·</span>
                <span className="text-xs font-medium text-white/65 hidden sm:inline">
                  {rulesMode === 'tactics' ? 'Football Tactics Pitch' : 'Classic 52-Square Pitch'}
                </span>
              </div>
              <span className="font-mono-tabular text-[11px] font-semibold text-[#B6FF00]">
                {getPlayerLabel(turnIndex)}
              </span>
            </div>

            {/* 15x15 Mowed-Turf Stadium Pitch */}
            <div
              className="relative grid grid-cols-15 grid-rows-15 aspect-square w-full max-w-[540px] mx-auto rounded-xl border-2 border-white/30 overflow-hidden shadow-[inset_0_0_24px_rgba(0,0,0,0.55)]"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(90deg, rgba(21,54,32,0.96) 0 6.6667%, rgba(15,41,24,0.98) 6.6667% 13.3334%)',
              }}
            >
              {/* 4 Unified 6x6 Corner Team Dugouts */}
              {DUGOUT_GRID_AREAS.map(({ corner, gridRow, gridColumn }) => {
                const cfg = CLUB_CONFIG[corner];
                const isCornerActive = activeCount === 4 || corner === 0 || corner === 2;
                const isCurrentTurn = isCornerActive && activeCorner === corner && !finished;
                return (
                  <div
                    key={`dugout-${corner}`}
                    style={{ gridRow, gridColumn }}
                    className={`relative border border-white/20 transition-opacity ${
                      isCornerActive ? 'opacity-100' : 'opacity-40'
                    }`}
                  >
                    {/* Inner Dugout Card Frame */}
                    <div
                      className="absolute inset-[6%] rounded-xl overflow-hidden transition-shadow"
                      style={{
                        backgroundColor: cfg.tintBg,
                        border: isCurrentTurn ? `2px solid ${cfg.color}` : '1.5px solid rgba(255,255,255,0.22)',
                        boxShadow: isCurrentTurn
                          ? `0 0 18px ${cfg.color}40, inset 0 0 18px rgba(0,0,0,0.45)`
                          : 'inset 0 0 16px rgba(0,0,0,0.4)',
                      }}
                    >
                      {/* Dugout Club Label Banner (tucked cleanly in top row band, clear of YARD_SLOTS) */}
                      <div className="px-2 pt-1 sm:pt-1.5 flex items-center justify-between gap-1">
                        <span
                          className="font-display text-[10px] sm:text-xs font-extrabold tracking-wider uppercase truncate"
                          style={{ color: cfg.color }}
                        >
                          {cfg.name}
                        </span>
                        {isCurrentTurn && (
                          <span className="font-mono-tabular text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-white bg-black/65 px-1.5 py-0.5 rounded">
                            TURN
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Recessed Pitch Pad framing the 4 exact YARD_SLOTS bays */}
                    <div
                      className="absolute rounded-lg bg-[#09130c]/85 border border-white/15 shadow-inner pointer-events-none"
                      style={{
                        left: '26%',
                        right: '26%',
                        top: '26%',
                        bottom: '26%',
                      }}
                    />

                    {/* 4 Exact Circular Recessed Sockets aligned 1:1 to YARD_SLOTS ([2..3, 2..3]) */}
                    <div
                      className="absolute grid grid-cols-2 grid-rows-2 pointer-events-none"
                      style={{
                        left: '33.3333%',
                        top: '33.3333%',
                        width: '33.3333%',
                        height: '33.3333%',
                      }}
                    >
                      {[0, 1, 2, 3].map((slot) => (
                        <div key={slot} className="flex items-center justify-center">
                          <div
                            className="w-[74%] h-[74%] rounded-full border bg-black/60 shadow-[inset_0_2px_4px_rgba(0,0,0,0.85)]"
                            style={{ borderColor: `${cfg.color}66` }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Unified 3x3 Center Home Goal Trophy Sanctuary */}
              <div
                style={{ gridRow: '7 / 10', gridColumn: '7 / 10' }}
                className="relative border border-white/35 bg-[#0a140d] flex items-center justify-center overflow-hidden"
              >
                <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" aria-hidden="true">
                  {/* Left: Chipolopolo */}
                  <polygon points="0,0 50,50 0,100" fill="#B6FF00" fillOpacity="0.28" />
                  {/* Top: Nkana Red */}
                  <polygon points="0,0 100,0 50,50" fill="#EF4444" fillOpacity="0.28" />
                  {/* Right: ZESCO Sky */}
                  <polygon points="100,0 100,100 50,50" fill="#38BDF8" fillOpacity="0.28" />
                  {/* Bottom: Power Gold */}
                  <polygon points="0,100 50,50 100,100" fill="#FACC15" fillOpacity="0.28" />
                  {/* Chalk Diagonal Lines */}
                  <line x1="0" y1="0" x2="100" y2="100" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" />
                  <line x1="100" y1="0" x2="0" y2="100" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" />
                </svg>
                <div className="relative z-10 w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-[#0A0A0A]/90 border border-[#B6FF00]/75 flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.7)]">
                  <Trophy className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 text-[#B6FF00]" />
                </div>
              </div>

              {/* 72 Track & Home Lane Squares */}
              {stadiumTrackCells.map(({ r, c }) => {
                const k = `${r},${c}`;
                const tIdx = trackIdxByCoord.get(k);
                const homeInfo = homeLaneByCoord.get(k);
                const isStartCorner =
                  tIdx === 0 ? 0 : tIdx === 13 ? 1 : tIdx === 26 ? 2 : tIdx === 39 ? 3 : null;
                const isSafe = tIdx !== undefined && LUDO_SAFE_TRACK_INDICES.has(tIdx);
                const tactic = rulesMode === 'tactics' && tIdx !== undefined ? TACTICAL_SPACES[tIdx] : undefined;

                let cellBg: string | undefined;
                let cellClass = 'border border-white/15 relative flex items-center justify-center';

                if (isStartCorner !== null) {
                  cellBg = CLUB_CONFIG[isStartCorner].color;
                  cellClass = 'border border-white/60 relative flex items-center justify-center shadow-inner';
                } else if (homeInfo) {
                  cellBg = CLUB_CONFIG[homeInfo.corner].laneTint;
                  cellClass = 'border border-white/25 relative flex items-center justify-center';
                } else if (tactic) {
                  if (tactic.type === 'COUNTERATTACK' || tactic.type === 'FREE_KICK' || tactic.type === 'PENALTY') {
                    cellBg = 'rgba(182, 255, 0, 0.16)';
                    cellClass = 'border border-[#B6FF00]/50 relative flex items-center justify-center';
                  } else if (tactic.type === 'OFFSIDE' || tactic.type === 'YELLOW_CARD') {
                    cellBg = 'rgba(245, 158, 11, 0.22)';
                    cellClass = 'border border-amber-400/55 relative flex items-center justify-center';
                  } else {
                    cellBg = 'rgba(56, 189, 248, 0.2)';
                    cellClass = 'border border-sky-400/55 relative flex items-center justify-center';
                  }
                } else if (isSafe) {
                  cellBg = 'rgba(255, 255, 255, 0.14)';
                  cellClass = 'border border-white/40 relative flex items-center justify-center';
                }

                return (
                  <div
                    key={k}
                    onMouseEnter={() =>
                      tactic
                        ? setInspectedTactic({ label: tactic.label, desc: tactic.desc })
                        : isSafe
                        ? setInspectedTactic({ label: 'Safe Pitch Zone', desc: 'Tokens here cannot be tackled.' })
                        : null
                    }
                    onMouseLeave={() => setInspectedTactic(null)}
                    onClick={() =>
                      tactic && setInspectedTactic({ label: tactic.label, desc: tactic.desc })
                    }
                    title={tactic ? `${tactic.label}: ${tactic.desc}` : isSafe ? 'Safe Zone' : undefined}
                    className={cellClass}
                    style={{
                      gridRowStart: r + 1,
                      gridColumnStart: c + 1,
                      backgroundColor: cellBg,
                    }}
                  >
                    {isStartCorner !== null && renderStartArrow(tIdx)}
                    {isStartCorner === null && homeInfo && renderHomeChevron(homeInfo.corner)}
                    {isStartCorner === null && isSafe && (
                      <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white/75" />
                    )}
                    {tactic && (
                      <span className="font-mono-tabular text-[7px] sm:text-[9px] font-extrabold tracking-tight text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]">
                        {tactic.short}
                      </span>
                    )}
                  </div>
                );
              })}

              {/* Smooth GPU-Transformed Football Tokens Layer */}
              <div className="pointer-events-none absolute inset-0 z-20">
                {positionedTokens.map((tok) => {
                  const cfg = CLUB_CONFIG[tok.corner];
                  const clickable = tok.canMove && isMyTurn;
                  return (
                    <div
                      key={`${tok.corner}-${tok.tokenIdx}`}
                      className={`absolute top-0 left-0 w-[6.6667%] h-[6.6667%] flex items-center justify-center transition-transform duration-200 ease-out motion-reduce:transition-none ${
                        clickable ? 'z-30' : 'z-10'
                      }`}
                      style={{
                        transform: `translate3d(${(tok.c + tok.dx) * 100}%, ${(tok.r + tok.dy) * 100}%, 0) scale(${
                          clickable ? Math.max(tok.scale, 1.06) : tok.scale
                        })`,
                      }}
                    >
                      <button
                        type="button"
                        disabled={!clickable}
                        onClick={() => clickable && executeTokenMove(tok.tokenIdx)}
                        aria-label={`${cfg.name} football token ${tok.tokenIdx + 1}${
                          tok.shielded ? ', shielded' : ''
                        }${tok.offside ? ', offside max roll 3' : ''}${
                          tok.yellowCard ? ', yellow card suspended' : ''
                        }${clickable ? ', ready to move' : ''}`}
                        className={`pointer-events-auto relative flex items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B6FF00] ${
                          clickable
                            ? 'w-7 h-7 sm:w-8 sm:h-8 cursor-pointer'
                            : 'w-[78%] h-[78%] cursor-default'
                        }`}
                      >
                        {/* Selectable Outer Halo */}
                        {clickable && (
                          <span
                            className="absolute inset-0 rounded-full ring-2 ring-[#B6FF00] bg-[#B6FF00]/25 animate-pulse motion-reduce:animate-none"
                            aria-hidden="true"
                          />
                        )}

                        {/* Sculpted Football Token Sphere */}
                        <span
                          className={`relative rounded-full border-2 flex items-center justify-center shadow-[0_3px_8px_rgba(0,0,0,0.75)] ${
                            clickable ? 'w-[22px] h-[22px] sm:w-[25px] sm:h-[25px]' : 'w-full h-full'
                          }`}
                          style={{
                            background: `radial-gradient(circle at 32% 28%, #ffffff 0%, ${cfg.color} 42%, ${cfg.rim} 100%)`,
                            borderColor: tok.shielded ? '#38BDF8' : clickable ? '#FFFFFF' : '#0A0A0A',
                          }}
                        >
                          {/* Subtle Football Seam Pentagon */}
                          <svg
                            viewBox="0 0 24 24"
                            className="w-[58%] h-[58%] opacity-45"
                            aria-hidden="true"
                          >
                            <polygon
                              points="12,3 20,9 17,19 7,19 4,9"
                              fill="none"
                              stroke="#0A0A0A"
                              strokeWidth="2"
                            />
                          </svg>

                          {/* Status Badges: Shield / Offside / Yellow Card */}
                          {tok.shielded && (
                            <span
                              className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-sky-400 border border-[#0A0A0A]"
                              title="Shielded from 1 tackle"
                            />
                          )}
                          {tok.yellowCard && (
                            <span
                              className="absolute -top-1 -left-1 w-2 h-2.5 rounded-[1px] bg-yellow-400 border border-[#0A0A0A]"
                              title="Yellow Card: skips next movement roll"
                            />
                          )}
                          {tok.offside && (
                            <span
                              className="absolute -bottom-1 -right-1 px-0.5 rounded bg-amber-500 text-[7px] font-black text-[#0A0A0A] leading-tight border border-[#0A0A0A]"
                              title="Offside: max roll 3 next turn"
                            >
                              3
                            </span>
                          )}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Subtle Hover/Tap Square Inspector (Tactics Mode) */}
            {inspectedTactic && (
              <div className="mt-2.5 px-3 py-1.5 rounded-lg bg-[#0A0A0A]/80 border border-white/10 text-xs text-white/85 flex items-center justify-between gap-2">
                <span>
                  <strong className="text-[#B6FF00]">{inspectedTactic.label}:</strong> {inspectedTactic.desc}
                </span>
              </div>
            )}
          </div>
        ) : (
          /* STREET & CHAMPIONSHIP THEMES — PRESERVED UNCHANGED UNTIL NEXT PHASE */
          <div className={`lg:col-span-8 rounded-2xl border-2 p-3 sm:p-5 relative shadow-[0_24px_48px_rgba(0,0,0,0.65)] ${theme.frame}`}>
            <div className="flex justify-between text-[10px] font-mono-tabular text-white/45 mb-2 px-1">
              <span>FLOODLIGHT NW · {theme.name.toUpperCase()}</span>
              <span>FLOODLIGHT NE</span>
            </div>

            <div
              className="grid grid-cols-15 gap-[2px] aspect-square w-full max-w-[540px] mx-auto p-2 rounded-xl bg-black/45 border border-white/15 shadow-inner"
              style={{ transform: 'perspective(1100px) rotateX(2deg)' }}
            >
              {Array.from({ length: 15 }, (_, r) =>
                Array.from({ length: 15 }, (_, c) => {
                  const k = `${r},${c}`;
                  const tIdx = trackIdxByCoord.get(k);
                  const isSafe = tIdx !== undefined && LUDO_SAFE_TRACK_INDICES.has(tIdx);
                  const tactic = rulesMode === 'tactics' && tIdx !== undefined ? TACTICAL_SPACES[tIdx] : undefined;
                  const cellTokens = cellTokensMap.get(k) || [];

                  return (
                    <div
                      key={k}
                      title={tactic ? `${tactic.label}: ${tactic.desc}` : isSafe ? 'Safe Zone' : undefined}
                      className={`rounded-[4px] border relative flex items-center justify-center ${getCellStyle(r, c)}`}
                    >
                      {isSafe && cellTokens.length === 0 && (
                        <Shield className="w-2.5 h-2.5 text-white/45" />
                      )}
                      {tactic && cellTokens.length === 0 && (
                        <span className="font-mono-tabular text-[7px] sm:text-[8px] font-bold tracking-tight text-white/80">
                          {tactic.short}
                        </span>
                      )}
                      {r === 7 && c === 7 && cellTokens.length === 0 && (
                        <Trophy className="w-4 h-4 text-[#B6FF00]" />
                      )}
                      {cellTokens.length > 0 && (
                        <div className="flex flex-wrap items-center justify-center gap-[1px] z-10">
                          {cellTokens.map((tok) => {
                            const cfg = CLUB_CONFIG[tok.corner];
                            const clickable = tok.canMove && isMyTurn;
                            return (
                              <button
                                key={`${tok.corner}-${tok.tokenIdx}`}
                                type="button"
                                disabled={!clickable}
                                onClick={() => clickable && executeTokenMove(tok.tokenIdx)}
                                aria-label={`${cfg.name} football token ${tok.tokenIdx + 1}`}
                                className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 transition-transform relative flex items-center justify-center shadow-[0_3px_6px_rgba(0,0,0,0.65)] ${
                                  clickable
                                    ? 'border-white scale-125 ring-2 ring-[#B6FF00] cursor-pointer'
                                    : 'cursor-default'
                                }`}
                                style={{
                                  background: `radial-gradient(circle at 32% 30%, #ffffff 0%, ${cfg.color} 45%, ${cfg.rim} 100%)`,
                                  borderColor: tok.shielded ? '#38BDF8' : '#0A0A0A',
                                }}
                              />
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Control & Tactics Sidebar */}
        <div className="lg:col-span-4 bg-[#1C1C1C] border border-white/10 rounded-xl p-4 sm:p-5 space-y-4">
          {/* Active Roster with Progress Pips */}
          <div className="space-y-2">
            {Array.from({ length: activeCount }, (_, s) => {
              const corner = getCornerForSlot(s);
              const cfg = CLUB_CONFIG[corner];
              const clubTokens = tokens[corner];
              const homeCount = clubTokens.filter((t) => t === 56).length;
              const isTurn = turnIndex === s && !finished;
              return (
                <div
                  key={s}
                  className={`p-3 rounded-lg border flex items-center justify-between gap-2 transition-colors ${
                    isTurn ? 'bg-[#0D1A11]' : 'border-white/10 bg-[#0A0A0A]'
                  }`}
                  style={isTurn ? { borderColor: cfg.color } : undefined}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-4 h-4 rounded-full shrink-0 border border-white/25"
                      style={{ backgroundColor: cfg.color }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold truncate">{getPlayerLabel(s)}</span>
                        {isTurn && (
                          <span
                            className="font-mono-tabular text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/10"
                            style={{ color: cfg.color }}
                          >
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-white/55">{cfg.name}</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="font-mono-tabular text-xs font-bold text-[#B6FF00]">
                      {homeCount}/4 Cup
                    </span>
                    <div className="flex items-center gap-1" aria-hidden="true">
                      {clubTokens.map((p, idx) => (
                        <span
                          key={idx}
                          className="w-2 h-2 rounded-full border"
                          style={{
                            backgroundColor:
                              p === 56 ? cfg.color : p >= 0 ? `${cfg.color}65` : 'transparent',
                            borderColor: p >= 0 ? cfg.color : 'rgba(255,255,255,0.25)',
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pitch Commentary / Match Log */}
          <div
            aria-live="polite"
            className="bg-[#0A0A0A] border border-white/10 rounded-lg p-3.5 text-xs leading-relaxed text-white/85 min-h-[60px]"
          >
            {statusLog}
          </div>

          {/* 6-Pip Die & Primary Roll Control */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-3">
              <StadiumDieFace
                value={dieValue}
                rollSeq={rollSeq}
                activeAccent={CLUB_CONFIG[activeCorner].color}
              />
              <button
                type="button"
                disabled={!isMyTurn || awaitingMove}
                onClick={rollDie}
                className="flex-1 min-h-[56px] rounded-lg bg-[#B6FF00] hover:bg-[#c5ff33] disabled:bg-white/12 disabled:text-white/40 text-[#0A0A0A] font-bold text-sm inline-flex items-center justify-center gap-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B6FF00]"
              >
                <Dices className="w-5 h-5" />
                <span>{awaitingMove ? 'Select Token' : isMyTurn ? 'Roll Die' : 'Wait Turn'}</span>
              </button>
            </div>

            {/* Quick-Select Eligible Tokens (44px+ accessible mobile/keyboard fallback alongside direct board clicks) */}
            {eligibleActiveTokens.length > 0 && (
              <div className="bg-[#0A0A0A] border border-[#B6FF00]/35 rounded-lg p-2.5 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-semibold text-[#B6FF00]">
                  <span>Pick Eligible Token (or press 1–4)</span>
                  <span className="font-mono-tabular text-white/60">Roll: {dieValue}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {eligibleActiveTokens.map(({ tokenIdx, prog }) => {
                    const nextStep = prog === -1 ? 1 : prog + (dieValue ?? 0) + 1;
                    const destText =
                      prog === -1
                        ? 'Enter Pitch'
                        : prog + (dieValue ?? 0) === 56
                        ? 'Score Cup!'
                        : `Step ${nextStep}`;
                    return (
                      <button
                        key={tokenIdx}
                        type="button"
                        onClick={() => executeTokenMove(tokenIdx)}
                        className="min-h-[44px] px-2.5 py-2 rounded-md bg-[#1C1C1C] hover:bg-[#B6FF00]/15 border border-white/15 hover:border-[#B6FF00] text-left flex items-center justify-between gap-1.5 transition-colors"
                      >
                        <span className="font-mono-tabular text-xs font-bold text-[#B6FF00]">
                          #{tokenIdx + 1}
                        </span>
                        <span className="text-[11px] font-medium text-white/85 truncate">{destText}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="text-[11px] text-white/45 flex items-center justify-between px-0.5">
              <span>Space: Roll Die</span>
              <span>1–4 or Click Token: Move</span>
            </div>
          </div>

          {rulesMode === 'tactics' && (
            <div className="pt-3 border-t border-white/10 space-y-2 text-[11px] text-white/70">
              <div className="font-semibold text-white/90">Tactics Spaces Legend</div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                <div>
                  <strong className="text-sky-300 font-mono-tabular">DEF</strong> Shield 1 tackle
                </div>
                <div>
                  <strong className="text-[#B6FF00] font-mono-tabular">CA</strong> +2 yards sprint
                </div>
                <div>
                  <strong className="text-[#B6FF00] font-mono-tabular">FK</strong> Pick +1/+2/+3
                </div>
                <div>
                  <strong className="text-[#B6FF00] font-mono-tabular">PEN</strong> Quiz +3 steps
                </div>
                <div>
                  <strong className="text-amber-300 font-mono-tabular">OFF</strong> Max roll 3
                </div>
                <div>
                  <strong className="text-amber-300 font-mono-tabular">YC</strong> Skip next move
                </div>
                <div>
                  <strong className="text-sky-300 font-mono-tabular">VAR</strong> Trailing boost
                </div>
                <div>
                  <strong className="text-white font-mono-tabular">★</strong> Safe Zone
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Free Kick Choice Modal */}
      {freeKickChoice && (
        <div className="fixed inset-0 bg-black/75 z-40 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#161B17] border-2 border-[#B6FF00] rounded-xl p-6 space-y-4 text-center shadow-2xl">
            <h3 className="font-display text-2xl font-bold text-[#B6FF00]">Free Kick Awarded</h3>
            <p className="text-sm text-white/80">Choose your tactical yardage boost:</p>
            <div className="grid grid-cols-3 gap-2.5">
              {[1, 2, 3].map((yards) => (
                <button
                  key={yards}
                  type="button"
                  onClick={() =>
                    applyBonusSteps(freeKickChoice.corner, freeKickChoice.tokenIdx, yards, `Free Kick +${yards}`)
                  }
                  className="min-h-[48px] rounded-lg bg-[#0A0A0A] border border-white/20 hover:border-[#B6FF00] hover:bg-[#B6FF00]/10 font-display text-xl font-bold text-white transition-colors"
                >
                  +{yards}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Penalty Spot-Kick Challenge Modal */}
      {penaltyPrompt && (
        <div className="fixed inset-0 bg-black/80 z-40 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#161B17] border-2 border-[#B6FF00] rounded-xl p-6 space-y-4 shadow-2xl">
            <div className="text-xs font-bold tracking-wider uppercase text-[#B6FF00]">
              Penalty Spot Challenge · +3 Steps
            </div>
            <h3 className="font-display text-2xl font-bold text-white leading-snug">
              {TRIVIA_BANK[penaltyPrompt.qIdx].question}
            </h3>
            <div className="space-y-2">
              {TRIVIA_BANK[penaltyPrompt.qIdx].options.map((opt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    const correct = idx === TRIVIA_BANK[penaltyPrompt.qIdx].correctIndex;
                    if (correct) {
                      applyBonusSteps(penaltyPrompt.corner, penaltyPrompt.tokenIdx, 3, 'Penalty Scored');
                    } else {
                      soundEngine.playWrong();
                      setPenaltyPrompt(null);
                      finalizeTurnProgression(tokens, flags, penaltyPrompt.corner, false, 'Penalty saved! Play continues.');
                    }
                  }}
                  className="w-full text-left px-4 py-3 rounded-lg bg-[#0A0A0A] border border-white/15 hover:border-[#B6FF00] hover:bg-[#B6FF00]/10 text-sm font-medium min-h-[44px] transition-colors"
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
