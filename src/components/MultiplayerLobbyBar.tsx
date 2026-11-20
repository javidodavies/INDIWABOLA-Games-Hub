import React, { useEffect, useState } from 'react';
import { Bot, Check, Copy, Link2, Users } from 'lucide-react';
import { MultiplayerRoomState } from '../types';
import { soundEngine } from '../utils/sound';

export type PlayMode = 'bot' | 'local' | 'online';

interface MultiplayerLobbyBarProps {
  gameId: 'bola-ludo' | 'road-to-glory' | 'four-goals';
  playerName: string;
  favoriteClub: string;
  maxPlayersCap: number;
  mode: PlayMode;
  onModeChange: (mode: PlayMode) => void;
  playerCount: number;
  onPlayerCountChange: (n: number) => void;
  room: MultiplayerRoomState | null;
  localPlayerId: string | null;
  initialRoomCode?: string | null;
  onRoomConnected: (room: MultiplayerRoomState, localPlayerId: string) => void;
  onRoomUpdated: (room: MultiplayerRoomState) => void;
}

export const MultiplayerLobbyBar: React.FC<MultiplayerLobbyBarProps> = ({
  gameId,
  playerName,
  favoriteClub,
  maxPlayersCap,
  mode,
  onModeChange,
  playerCount,
  onPlayerCountChange,
  room,
  initialRoomCode,
  onRoomConnected,
  onRoomUpdated,
}) => {
  const [joinCode, setJoinCode] = useState(initialRoomCode || '');
  const [statusMsg, setStatusMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Auto-join when opened via invite link
  useEffect(() => {
    if (!initialRoomCode || room) return;
    let cancelled = false;
    const autoJoin = async () => {
      try {
        const res = await fetch(`/api/rooms/${initialRoomCode.toUpperCase()}/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerName, clubName: favoriteClub }),
        });
        const data = await res.json();
        if (!cancelled && res.ok && data.room) {
          onModeChange('online');
          onRoomConnected(data.room, data.playerId);
          setStatusMsg(`Joined invite room ${data.room.code}.`);
        }
      } catch {
        // Ignore auto-join error if room expired
      }
    };
    autoJoin();
    return () => {
      cancelled = true;
    };
  }, [initialRoomCode, room, playerName, favoriteClub, onModeChange, onRoomConnected]);

  // Subscribe to SSE stream when connected to an online room
  useEffect(() => {
    if (!room?.code || mode !== 'online') return;
    const es = new EventSource(`/api/rooms/${room.code}/stream`);
    es.onmessage = (ev) => {
      try {
        const updated = JSON.parse(ev.data) as MultiplayerRoomState;
        onRoomUpdated(updated);
      } catch {
        // ignore parse issues
      }
    };
    return () => {
      es.close();
    };
  }, [room?.code, mode, onRoomUpdated]);

  const createPrivateRoom = async () => {
    setBusy(true);
    setStatusMsg('');
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId,
          hostName: playerName,
          clubName: favoriteClub,
          maxPlayers: playerCount,
          addBots: 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not create room.');
      soundEngine.playCorrect();
      onModeChange('online');
      onRoomConnected(data.room, data.playerId);
      setStatusMsg(`Room ${data.room.code} live — invite friends with the link.`);
    } catch (e) {
      setStatusMsg(e instanceof Error ? e.message : 'Room error.');
    } finally {
      setBusy(false);
    }
  };

  const joinPrivateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    setBusy(true);
    setStatusMsg('');
    try {
      const res = await fetch(`/api/rooms/${code}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerName,
          clubName: favoriteClub,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not join room.');
      soundEngine.playCorrect();
      onModeChange('online');
      onRoomConnected(data.room, data.playerId);
      setStatusMsg(`Connected to room ${data.room.code}.`);
    } catch (e) {
      soundEngine.playWrong();
      setStatusMsg(e instanceof Error ? e.message : 'Join failed.');
    } finally {
      setBusy(false);
    }
  };

  const copyInvite = async () => {
    if (!room) return;
    const url = `${window.location.origin}/games/multiplayer?room=${room.code}&game=${gameId}`;
    try {
      await navigator.clipboard.writeText(`Join my ${gameId} match on INDIWABOLA! Room Code: ${room.code}\n${url}`);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      setCopiedLink(false);
    }
  };

  return (
    <div className="w-full bg-[#1C1C1C] border border-white/10 rounded-xl p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-[#0A0A0A] p-1 rounded-lg border border-white/10">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onModeChange('bot');
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold transition-colors min-h-[38px] ${
              mode === 'bot' ? 'bg-[#B6FF00] text-[#0A0A0A]' : 'text-white/70 hover:text-white'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>vs AI Bot</span>
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onModeChange('local');
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold transition-colors min-h-[38px] ${
              mode === 'local' ? 'bg-[#B6FF00] text-[#0A0A0A]' : 'text-white/70 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Pass & Play</span>
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onModeChange('online');
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold transition-colors min-h-[38px] ${
              mode === 'online' ? 'bg-[#B6FF00] text-[#0A0A0A]' : 'text-white/70 hover:text-white'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Private Room</span>
          </button>
        </div>

        {maxPlayersCap > 2 && mode !== 'online' && (
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-white/55">Players:</span>
            {[2, 3, 4].map((cnt) => (
              <button
                key={cnt}
                type="button"
                onClick={() => onPlayerCountChange(cnt)}
                className={`w-8 h-8 rounded-md font-mono-tabular font-bold ${
                  playerCount === cnt
                    ? 'bg-white text-[#0A0A0A]'
                    : 'bg-[#0A0A0A] text-white/70 border border-white/10'
                }`}
              >
                {cnt}
              </button>
            ))}
          </div>
        )}
      </div>

      {mode === 'online' && (
        <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {!room ? (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={createPrivateRoom}
                className="px-4 min-h-[42px] rounded-lg bg-[#B6FF00] text-[#0A0A0A] font-bold text-xs whitespace-nowrap"
              >
                Create Room Code
              </button>
              <form onSubmit={joinPrivateRoom} className="flex items-center gap-2">
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="BOLA-1234"
                  className="w-32 min-h-[42px] px-3 rounded-lg bg-[#0A0A0A] border border-white/20 text-xs font-mono-tabular text-white placeholder:text-white/35"
                />
                <button
                  type="submit"
                  disabled={busy || !joinCode.trim()}
                  className="px-4 min-h-[42px] rounded-lg bg-white/10 hover:bg-white/15 text-xs font-semibold"
                >
                  Join
                </button>
              </form>
            </>
          ) : (
            <div className="w-full flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs">
                <span className="text-white/55">Room: </span>
                <strong className="font-mono-tabular text-[#B6FF00] text-sm">{room.code}</strong>
                <span className="text-white/55 ml-3">
                  {room.players.length}/{room.maxPlayers} Connected ({room.players.map((p) => p.name).join(', ')})
                </span>
              </div>
              <button
                type="button"
                onClick={copyInvite}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/15 text-xs font-medium"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-[#B6FF00]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Invite Copied' : 'Copy Invite Link'}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {statusMsg && <div className="text-xs text-[#B6FF00]">{statusMsg}</div>}
    </div>
  );
};
