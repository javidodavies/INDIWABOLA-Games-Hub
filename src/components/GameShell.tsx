import React, { useEffect, useState } from 'react';
import { ArrowLeft, Pause, Play, RotateCcw, Trophy, Volume2, VolumeX } from 'lucide-react';
import { GameCatalogEntry, GamePhase, PlayerSession, RegionId } from '../types';
import { soundEngine } from '../utils/sound';
import { GameEmblem } from './GameEmblem';
import { ShareButton } from './ShareButton';

export interface GameResultPayload {
  won: boolean;
  score: number;
  accuracy?: number;
  attempts?: number;
  summaryLine: string;
  shareGrid: string;
  verificationPayload?: Record<string, unknown>;
}

interface GameShellProps {
  game: GameCatalogEntry;
  phase: GamePhase;
  onStart: () => void;
  onPauseToggle: () => void;
  onRestart: () => void;
  onExit: () => void;
  score: number;
  statusText?: string;
  region: RegionId;
  isDailyMode: boolean;
  juniorMode?: boolean;
  player: PlayerSession | null;
  result: GameResultPayload | null;
  submissionStatus: {
    loading: boolean;
    officialRanked: boolean;
    validatedScore?: number;
    message?: string;
    error?: string;
  } | null;
  onOpenRegister?: () => void;
  setupExtras?: React.ReactNode;
  children: React.ReactNode;
}

export const GameShell: React.FC<GameShellProps> = ({
  game,
  phase,
  onStart,
  onPauseToggle,
  onRestart,
  onExit,
  score,
  statusText,
  region,
  isDailyMode,
  juniorMode = false,
  player,
  result,
  submissionStatus,
  onOpenRegister,
  setupExtras,
  children,
}) => {
  const [muted, setMuted] = useState(() => soundEngine.isMuted());

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (phase === 'PLAYING' || phase === 'PAUSED') {
          onPauseToggle();
        }
      } else if (phase === 'TITLE_MENU' && (e.key === 'Enter' || e.key === ' ')) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag !== 'INPUT' && tag !== 'SELECT' && tag !== 'TEXTAREA' && tag !== 'BUTTON') {
          e.preventDefault();
          onStart();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, onStart, onPauseToggle]);

  const handleToggleMute = () => {
    const next = soundEngine.toggleMute();
    setMuted(next);
  };

  return (
    <div className="min-h-screen w-full bg-[#0A0A0A] text-white flex flex-col select-none">
      {/* Slim Perimeter HUD */}
      <header className="w-full border-b border-white/10 bg-[#0A0A0A]/95 px-4 sm:px-6 h-14 flex items-center justify-between gap-4 shrink-0 z-30">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onExit();
            }}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-white/80 hover:text-white hover:bg-[#1C1C1C] transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Hub</span>
          </button>
          <span className="h-4 w-px bg-white/15 hidden sm:inline-block" aria-hidden="true" />
          <div className="flex items-center gap-2.5 min-w-0">
            <GameEmblem gameId={game.id} color={game.accentColor} size={24} />
            <span className="font-display text-xl tracking-wide font-bold uppercase truncate">
              {game.title}
            </span>
          </div>
          {isDailyMode && (
            <span className="hidden md:inline-block text-xs font-medium text-[#B6FF00] whitespace-nowrap shrink-0">
              Daily Challenge (1.5×)
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 sm:gap-5 shrink-0">
          {phase !== 'TITLE_MENU' && (
            <div className="flex items-center gap-4 text-sm">
              {statusText && (
                <span className="hidden md:inline-block text-white/65 whitespace-nowrap">
                  {statusText}
                </span>
              )}
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs text-white/50">Score</span>
                <span className="font-mono-tabular text-base font-bold text-[#B6FF00]">
                  {score}
                </span>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleToggleMute}
            aria-label={muted ? 'Unmute sound effects' : 'Mute sound effects'}
            className="p-2 rounded-lg text-white/75 hover:text-white hover:bg-[#1C1C1C] transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {(phase === 'PLAYING' || phase === 'PAUSED') && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onPauseToggle();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1C1C1C] hover:bg-white/15 text-xs font-semibold text-white transition-colors min-h-[40px] whitespace-nowrap shrink-0"
            >
              {phase === 'PAUSED' ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              <span>{phase === 'PAUSED' ? 'Resume' : 'Rules'}</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Playfield */}
      <main className="flex-1 relative flex flex-col items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {phase === 'TITLE_MENU' && (
          <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center py-6">
            {/* Calm negative space + Bespoke SVG Lockup */}
            <div className="lg:col-span-6 flex flex-col items-start gap-5">
              <div className="flex items-center gap-3 text-xs text-white/60">
                <span>Game {String(game.number).padStart(2, '0')} of 17</span>
                <span aria-hidden="true">·</span>
                <span>{region === 'zambia' ? 'Zambia Focus' : 'All Football'}</span>
                {juniorMode && game.juniorFriendly && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-[#B6FF00] font-semibold">Junior Mode</span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-[#1C1C1C] border border-white/10">
                  <GameEmblem gameId={game.id} color={game.accentColor} size={52} />
                </div>
                <div>
                  <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight leading-none text-white">
                    {game.title}
                  </h1>
                  <p className="text-sm text-[#B6FF00] font-medium mt-1.5">
                    {game.shortTag}
                  </p>
                </div>
              </div>

              <p className="text-base text-white/75 leading-relaxed max-w-md">
                {juniorMode && game.juniorDescription ? game.juniorDescription : game.description}
              </p>

              {setupExtras && (
                <div className="w-full pt-1">
                  {setupExtras}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playWhistle();
                    onStart();
                  }}
                  className="px-7 py-3.5 rounded-lg bg-[#B6FF00] hover:bg-[#c8ff3d] text-[#0A0A0A] font-bold text-base transition-transform active:scale-[0.98] whitespace-nowrap shrink-0 min-h-[44px]"
                >
                  Start Game
                </button>
              </div>

              <p className="text-xs text-white/50 font-mono-tabular pt-1">
                {game.controlHint}
              </p>
            </div>

            {/* Rules & Scoring Card */}
            <div className="lg:col-span-6 bg-[#1C1C1C] border border-white/10 rounded-xl p-6 space-y-5">
              <div>
                <h2 className="text-sm font-semibold text-white/90 mb-3">
                  {juniorMode && game.juniorRules ? 'Easy Rules' : 'How to Play'}
                </h2>
                <ul className="space-y-2.5 text-sm text-white/75">
                  {(juniorMode && game.juniorRules ? game.juniorRules : game.rules).map((rule, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <span className="font-mono-tabular text-xs font-bold text-[#B6FF00] mt-0.5">
                        0{idx + 1}
                      </span>
                      <span>{rule}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="pt-4 border-t border-white/10">
                <h3 className="text-xs font-semibold text-white/55 mb-1">Scoring Rules</h3>
                <p className="text-sm text-white/85">{game.scoringSummary}</p>
              </div>
              {player?.isGuest && (
                <div className="pt-4 border-t border-white/10 text-xs text-white/60">
                  Playing as <span className="text-white font-medium">{player.username}</span>. Register a username anytime to place on official leaderboards.
                </div>
              )}
            </div>
          </div>
        )}

        {phase !== 'TITLE_MENU' && (
          <div className="w-full max-w-5xl flex flex-col items-center">
            {children}
          </div>
        )}

        {/* Pause / Rules Overlay */}
        {phase === 'PAUSED' && (
          <div className="fixed inset-0 bg-black/80 z-40 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#1C1C1C] border border-white/15 rounded-xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-2xl font-bold">Match Paused · {game.title}</h2>
                <button
                  type="button"
                  onClick={onPauseToggle}
                  className="text-sm text-white/60 hover:text-white px-2 py-1"
                >
                  Esc
                </button>
              </div>
              <ul className="space-y-2 text-sm text-white/75">
                {game.rules.map((rule, i) => (
                  <li key={i} className="flex gap-2.5">
                    <span className="font-mono-tabular text-[#B6FF00] font-bold">{i + 1}.</span>
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
              <div className="text-xs text-white/60 pt-2 border-t border-white/10">
                {game.scoringSummary}
              </div>
              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="button"
                  onClick={onPauseToggle}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-[#B6FF00] text-[#0A0A0A] font-bold text-sm min-h-[44px]"
                >
                  Resume
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    onRestart();
                  }}
                  className="px-4 py-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-white font-semibold text-sm min-h-[44px]"
                >
                  Restart
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Victory / Game Over Modal */}
        {(phase === 'VICTORY' || phase === 'GAME_OVER') && result && (
          <div className="fixed inset-0 bg-black/85 z-40 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#1C1C1C] border border-white/15 rounded-xl p-6 space-y-5 animate-tile-pop">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-lg ${result.won ? 'bg-[#B6FF00] text-[#0A0A0A]' : 'bg-white/10 text-white'}`}>
                  <Trophy className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-display text-3xl font-extrabold leading-none">
                    {result.won ? 'Full Time Victory' : 'Match Complete'}
                  </h2>
                  <p className="text-xs text-white/60 mt-1">{game.title}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 py-3 border-y border-white/10">
                <div>
                  <div className="text-xs text-white/50">Validated Score</div>
                  <div className="font-mono-tabular text-2xl font-bold text-[#B6FF00]">
                    {submissionStatus?.validatedScore ?? result.score}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-white/50">Accuracy</div>
                  <div className="font-mono-tabular text-xl font-bold text-white">
                    {result.accuracy !== undefined ? `${result.accuracy}%` : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-white/50">Attempts</div>
                  <div className="font-mono-tabular text-xl font-bold text-white">
                    {result.attempts ?? '—'}
                  </div>
                </div>
              </div>

              <p className="text-sm text-white/80 leading-relaxed">
                {result.summaryLine}
              </p>

              {/* Spoiler-Free Share Preview */}
              <div className="bg-[#0A0A0A] border border-white/10 rounded-lg p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs text-white/55">
                  <span>Spoiler-Free Share Card</span>
                  <ShareButton
                    variant="ghost"
                    label="Copy / Share"
                    className="text-xs"
                    gameTitle={game.title}
                    gameCategory={game.category}
                    score={submissionStatus?.validatedScore ?? result.score}
                    accuracy={result.accuracy}
                    won={result.won}
                    isDailyMode={isDailyMode}
                    shareGrid={result.shareGrid}
                    summaryLine={result.summaryLine}
                  />
                </div>
                <pre className="font-mono-tabular text-sm text-white whitespace-pre-wrap leading-snug">
                  {result.shareGrid}
                </pre>
              </div>

              {/* Submission & Guest Notice */}
              {submissionStatus && (
                <div className="text-xs text-white/65">
                  {submissionStatus.loading && 'Validating score on INDIWABOLA server...'}
                  {!submissionStatus.loading && submissionStatus.error && (
                    <span className="text-amber-400">{submissionStatus.error}</span>
                  )}
                  {!submissionStatus.loading && !submissionStatus.error && submissionStatus.officialRanked && (
                    <span className="text-[#B6FF00]">
                      Official score recorded for {player?.username}.
                    </span>
                  )}
                  {!submissionStatus.loading && !submissionStatus.error && !submissionStatus.officialRanked && (
                    <div className="flex items-center justify-between gap-3">
                      <span>Guest score only. Register to enter rankings.</span>
                      {onOpenRegister && (
                        <button
                          type="button"
                          onClick={onOpenRegister}
                          className="text-[#B6FF00] font-semibold hover:underline whitespace-nowrap shrink-0"
                        >
                          Claim Username
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playWhistle();
                    onRestart();
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[#B6FF00] hover:bg-[#c8ff3d] text-[#0A0A0A] font-bold text-sm min-h-[44px] whitespace-nowrap"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Play Again</span>
                </button>
                <ShareButton
                  variant="secondary"
                  label="Share Results"
                  gameTitle={game.title}
                  gameCategory={game.category}
                  score={submissionStatus?.validatedScore ?? result.score}
                  accuracy={result.accuracy}
                  won={result.won}
                  isDailyMode={isDailyMode}
                  shareGrid={result.shareGrid}
                  summaryLine={result.summaryLine}
                />
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    onExit();
                  }}
                  className="w-full px-4 py-2.5 rounded-lg border border-white/15 hover:bg-white/5 text-white/80 font-medium text-sm min-h-[44px]"
                >
                  Back to Games Hub
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
