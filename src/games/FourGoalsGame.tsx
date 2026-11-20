import React, { useCallback, useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { MultiplayerLobbyBar, PlayMode } from '../components/MultiplayerLobbyBar';
import { MultiplayerRoomState } from '../types';
import { checkFourGoalsWin, FourGoalsCell } from '../utils/gameRules';
import { soundEngine } from '../utils/sound';
import { GameComponentProps } from './common';

const ROWS = 6;
const COLS = 7;

type AiLevel = 'easy' | 'tactical' | 'pro';

function getDropRow(board: FourGoalsCell[][], col: number): number {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r][col] === 0) return r;
  }
  return -1;
}

function chooseBotColumn(board: FourGoalsCell[][], aiLevel: AiLevel): number {
  const validCols = Array.from({ length: COLS }, (_, c) => c).filter((c) => getDropRow(board, c) !== -1);
  if (validCols.length === 0) return 0;

  if (aiLevel === 'easy' && Math.random() < 0.45) {
    return validCols[Math.floor(Math.random() * validCols.length)];
  }

  // 1. Immediate win
  for (const c of validCols) {
    const r = getDropRow(board, c);
    const copy = board.map((row) => [...row]);
    copy[r][c] = 2;
    if (checkFourGoalsWin(copy)?.winner === 2) return c;
  }

  // 2. Immediate block
  for (const c of validCols) {
    const r = getDropRow(board, c);
    const copy = board.map((row) => [...row]);
    copy[r][c] = 1;
    if (checkFourGoalsWin(copy)?.winner === 1) return c;
  }

  // 3. Pro avoids giving player an immediate winning square above
  const safeCols =
    aiLevel === 'pro'
      ? validCols.filter((c) => {
          const r = getDropRow(board, c);
          if (r <= 0) return true;
          const copy = board.map((row) => [...row]);
          copy[r][c] = 2;
          copy[r - 1][c] = 1;
          return checkFourGoalsWin(copy)?.winner !== 1;
        })
      : validCols;

  const pool = safeCols.length > 0 ? safeCols : validCols;
  const priority = [3, 2, 4, 1, 5, 0, 6];
  for (const c of priority) {
    if (pool.includes(c)) return c;
  }
  return pool[0];
}

export const FourGoalsGame: React.FC<GameComponentProps> = ({
  playerName = 'Player 1',
  favoriteClub = 'Chipolopolo',
  initialRoomCode,
  juniorMode = false,
  isPaused,
  onScoreChange,
  onFinish,
}) => {
  const [mode, setMode] = useState<PlayMode>('bot');
  const [aiLevel, setAiLevel] = useState<AiLevel>(juniorMode ? 'easy' : 'tactical');
  const [timedMatch, setTimedMatch] = useState(!juniorMode);
  const [shotClock, setShotClock] = useState(25);
  const [room, setRoom] = useState<MultiplayerRoomState | null>(null);
  const [localPlayerId, setLocalPlayerId] = useState<string | null>(null);

  const [board, setBoard] = useState<FourGoalsCell[][]>(() =>
    Array.from({ length: ROWS }, () => Array(COLS).fill(0))
  );
  const [turn, setTurn] = useState<1 | 2>(1);
  const [moves, setMoves] = useState(0);
  const [winLine, setWinLine] = useState<[number, number][]>([]);
  const [finished, setFinished] = useState(false);

  const mySlot: 1 | 2 = room
    ? (room.players.findIndex((p) => p.id === localPlayerId) === 1 ? 2 : 1)
    : 1;

  useEffect(() => {
    onScoreChange(moves * 15, turn === 1 ? `${playerName} Turn` : mode === 'bot' ? 'AI Bot Turn' : 'Player 2 Turn');
  }, [moves, turn, playerName, mode, onScoreChange]);

  const handleRoomUpdated = useCallback((updated: MultiplayerRoomState) => {
    setRoom(updated);
    const payloadBoard = updated.payload?.board as FourGoalsCell[][] | undefined;
    if (payloadBoard) {
      setBoard(payloadBoard);
      setTurn((updated.turnIndex % 2 === 0 ? 1 : 2) as 1 | 2);
      setMoves(Number(updated.payload?.moves || 0));
      setShotClock(25);
    }
  }, []);

  const syncOnline = async (nextBoard: FourGoalsCell[][], nextTurn: 1 | 2, nextMoves: number, winnerSlot: FourGoalsCell | 0) => {
    if (!room) return;
    await fetch(`/api/rooms/${room.code}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        turnIndex: nextTurn - 1,
        winnerId: winnerSlot ? room.players[winnerSlot - 1]?.id || 'winner' : null,
        lastActionLabel: `Column move #${nextMoves}`,
        status: winnerSlot ? 'FINISHED' : 'ACTIVE',
        payload: { board: nextBoard, moves: nextMoves },
      }),
    }).catch(() => {});
  };

  const dropToken = useCallback(
    (col: number, actor: 1 | 2) => {
      if (finished || isPaused) return;
      const row = getDropRow(board, col);
      if (row === -1) {
        soundEngine.playWrong();
        return;
      }

      soundEngine.playMove();
      const nextBoard = board.map((r) => [...r]);
      nextBoard[row][col] = actor;
      const nextMoves = moves + 1;
      setBoard(nextBoard);
      setMoves(nextMoves);
      setShotClock(25);

      const win = checkFourGoalsWin(nextBoard);
      if (win) {
        setWinLine(win.line);
        setFinished(true);
        const userWon = mode === 'bot' ? win.winner === 1 : mode === 'online' ? win.winner === mySlot : true;
        if (userWon) soundEngine.playVictory();
        else soundEngine.playWrong();

        if (mode === 'online') syncOnline(nextBoard, actor, nextMoves, win.winner);

        const quickBonus = nextMoves <= 14 ? 50 : 0;
        const pts = userWon ? 450 + quickBonus : 120;
        window.setTimeout(() => {
          onFinish({
            won: userWon,
            score: pts,
            accuracy: 100,
            attempts: Math.ceil(nextMoves / 2),
            summaryLine:
              mode === 'bot'
                ? win.winner === 1
                  ? `Defeated ${aiLevel.toUpperCase()} AI Bot in ${nextMoves} moves!`
                  : `AI Bot connected four in ${nextMoves} moves. Rematch to reclaim the pitch!`
                : `Club ${win.winner} scored Four Goals in ${nextMoves} moves!`,
            shareGrid: `Four Goals · ${nextMoves} moves\n${win.winner === 1 ? '🟩🟩🟩🟩' : '🟥🟥🟥🟥'}`,
          });
        }, 700);
        return;
      }

      const isDraw = nextBoard[0].every((c) => c !== 0);
      if (isDraw) {
        setFinished(true);
        onFinish({
          won: false,
          score: 200,
          accuracy: 50,
          attempts: 21,
          summaryLine: 'Draw! All 42 stadium slots filled with no four-in-a-row.',
          shareGrid: 'Four Goals · Draw 42/42\n🟨🟥🟨🟥',
        });
        return;
      }

      const nextTurn = actor === 1 ? 2 : 1;
      setTurn(nextTurn);
      if (mode === 'online') syncOnline(nextBoard, nextTurn, nextMoves, 0);
    },
    [aiLevel, board, finished, isPaused, mode, moves, mySlot, onFinish]
  );

  // Shot clock countdown for timed competitive matches
  useEffect(() => {
    if (!timedMatch || finished || isPaused) return;
    const t = window.setInterval(() => {
      setShotClock((s) => {
        if (s <= 1) {
          const valid = Array.from({ length: COLS }, (_, c) => c).filter((c) => getDropRow(board, c) !== -1);
          if (valid.length > 0 && (mode === 'local' || (mode === 'bot' && turn === 1) || (mode === 'online' && turn === mySlot))) {
            dropToken(valid[0], turn);
          }
          return 25;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(t);
  }, [timedMatch, finished, isPaused, board, mode, turn, mySlot, dropToken]);

  useEffect(() => {
    if (mode !== 'bot' || turn !== 2 || finished || isPaused) return;
    const t = window.setTimeout(() => {
      const col = chooseBotColumn(board, aiLevel);
      dropToken(col, 2);
    }, 520);
    return () => window.clearTimeout(t);
  }, [mode, turn, finished, isPaused, board, aiLevel, dropToken]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (finished || isPaused) return;
      if (['1', '2', '3', '4', '5', '6', '7'].includes(e.key)) {
        if (mode === 'bot' && turn !== 1) return;
        if (mode === 'online' && turn !== mySlot) return;
        dropToken(Number(e.key) - 1, turn);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dropToken, finished, isPaused, mode, mySlot, turn]);

  const canClick = !finished && (mode === 'local' || (mode === 'bot' && turn === 1) || (mode === 'online' && turn === mySlot));

  return (
    <div className="w-full max-w-2xl space-y-4">
      <MultiplayerLobbyBar
        gameId="four-goals"
        playerName={playerName}
        favoriteClub={favoriteClub}
        maxPlayersCap={2}
        mode={mode}
        onModeChange={setMode}
        playerCount={2}
        onPlayerCountChange={() => {}}
        room={room}
        localPlayerId={localPlayerId}
        initialRoomCode={initialRoomCode}
        onRoomConnected={(r, id) => {
          setRoom(r);
          setLocalPlayerId(id);
        }}
        onRoomUpdated={handleRoomUpdated}
      />

      <div className="bg-[#1C1C1C] border border-white/10 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        {mode === 'bot' ? (
          <div className="flex items-center gap-1 bg-[#0A0A0A] p-1 rounded-lg border border-white/10">
            {(['easy', 'tactical', 'pro'] as AiLevel[]).map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setAiLevel(lvl)}
                className={`px-3 py-1 rounded-md text-xs font-bold capitalize ${
                  aiLevel === lvl ? 'bg-[#B6FF00] text-[#0A0A0A]' : 'text-white/65'
                }`}
              >
                {lvl} AI
              </button>
            ))}
          </div>
        ) : (
          <span className="text-xs text-white/60">2-Player Stadium Match</span>
        )}

        <button
          type="button"
          onClick={() => setTimedMatch((v) => !v)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border ${
            timedMatch
              ? 'border-[#B6FF00] bg-[#B6FF00]/10 text-[#B6FF00]'
              : 'border-white/15 bg-[#0A0A0A] text-white/65'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>{timedMatch ? `Shot Clock: ${shotClock}s` : 'Untimed Casual'}</span>
        </button>
      </div>

      <div className="bg-[#1C1C1C] border border-white/10 rounded-xl p-4 sm:p-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className={`p-3 rounded-lg border flex items-center gap-3 ${turn === 1 && !finished ? 'border-[#B6FF00] bg-[#B6FF00]/10' : 'border-white/10 bg-[#0A0A0A]'}`}>
            <span className="w-5 h-5 rounded-full bg-[#B6FF00] shrink-0" />
            <div className="min-w-0">
              <div className="text-xs text-white/55">Home (1)</div>
              <div className="text-sm font-bold truncate">{room?.players[0]?.name || playerName}</div>
            </div>
          </div>
          <div className={`p-3 rounded-lg border flex items-center gap-3 ${turn === 2 && !finished ? 'border-red-500 bg-red-500/10' : 'border-white/10 bg-[#0A0A0A]'}`}>
            <span className="w-5 h-5 rounded-full bg-red-500 shrink-0" />
            <div className="min-w-0">
              <div className="text-xs text-white/55">Away (2)</div>
              <div className="text-sm font-bold truncate">
                {mode === 'bot' ? `${aiLevel.toUpperCase()} AI Bot` : room?.players[1]?.name || 'Player 2'}
              </div>
            </div>
          </div>
        </div>

        {/* 3D-Styled Stadium Drop Rack */}
        <div className="bg-gradient-to-b from-[#111914] to-[#080a09] border-2 border-[#B6FF00]/25 rounded-2xl p-3 sm:p-4 shadow-[0_20px_40px_rgba(0,0,0,0.6)]">
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5">
            {Array.from({ length: COLS }, (_, col) => (
              <button
                key={`col-head-${col}`}
                type="button"
                disabled={!canClick || getDropRow(board, col) === -1}
                onClick={() => dropToken(col, turn)}
                className="min-h-[34px] rounded-md bg-white/5 hover:bg-[#B6FF00] hover:text-[#0A0A0A] disabled:opacity-25 font-mono-tabular text-xs font-bold transition-colors"
              >
                {col + 1}
              </button>
            ))}

            {board.map((row, r) =>
              row.map((cell, c) => {
                const isWinCell = winLine.some(([wr, wc]) => wr === r && wc === c);
                return (
                  <button
                    key={`${r}-${c}`}
                    type="button"
                    disabled={!canClick || getDropRow(board, c) === -1}
                    onClick={() => dropToken(c, turn)}
                    aria-label={`Column ${c + 1} Row ${r + 1}`}
                    className="aspect-square min-h-[42px] rounded-full bg-[#09090b] border border-white/15 shadow-inner flex items-center justify-center p-1 hover:border-white/40 transition-colors"
                  >
                    {cell !== 0 && (
                      <span
                        className={`w-full h-full rounded-full animate-token-drop shadow-[0_3px_6px_rgba(0,0,0,0.7)] ${
                          isWinCell ? 'ring-4 ring-white' : ''
                        }`}
                        style={{
                          background:
                            cell === 1
                              ? 'radial-gradient(circle at 32% 30%, #ffffff 0%, #B6FF00 45%, #73a300 100%)'
                              : 'radial-gradient(circle at 32% 30%, #fecaca 0%, #ef4444 45%, #991b1b 100%)',
                        }}
                      />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
