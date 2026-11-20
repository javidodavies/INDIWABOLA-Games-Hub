/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Award,
  Calendar,
  CheckCircle2,
  Flame,
  Gamepad2,
  Globe,
  Lock,
  LogOut,
  Play,
  ShieldCheck,
  Trophy,
  User,
  Users,
} from 'lucide-react';
import type { User as FirebaseUser } from 'firebase/auth';
import { AuthModal } from './components/AuthModal';
import { DailyPromoCard } from './components/DailyPromoCard';
import { GameEmblem } from './components/GameEmblem';
import { GameResultPayload, GameShell } from './components/GameShell';
import { GAME_CATALOG, getGameById, REGIONS, ZAMBIAN_CLUBS } from './data/gameCatalog';
import {
  ensureFirebasePlayerProfile,
  fetchPublicLeaderboardFromFirestore,
  observeFirebaseAuth,
  recordScoreInFirestore,
  signOutFirebase,
  updateFirebasePlayerClub,
} from './firebase/firebaseClient';
import { BolaDraftGame } from './games/BolaDraftGame';
import { BolaLetterBoxGame } from './games/BolaLetterBoxGame';
import { BolaLettersGame } from './games/BolaLettersGame';
import { BolaLudoGame } from './games/BolaLudoGame';
import { BolaStrandsGame } from './games/BolaStrandsGame';
import { BolaSudokuGame } from './games/BolaSudokuGame';
import { BolaTilesGame } from './games/BolaTilesGame';
import { BolaTriviaGame } from './games/BolaTriviaGame';
import { BolaWordGame } from './games/BolaWordGame';
import { ConnectionsGame } from './games/ConnectionsGame';
import { FourGoalsGame } from './games/FourGoalsGame';
import { MatchReplayGame } from './games/MatchReplayGame';
import { MemoryGridGame } from './games/MemoryGridGame';
import { MiniCrosswordGame } from './games/MiniCrosswordGame';
import { PredictScoreGame } from './games/PredictScoreGame';
import { RoadToGloryGame } from './games/RoadToGloryGame';
import { WhoAmIGame } from './games/WhoAmIGame';
import {
  DailyChallengeInfo,
  GameId,
  GamePhase,
  HubRoute,
  LeaderboardRow,
  PlayerSession,
  RegionId,
} from './types';
import {
  formatCountdown,
  getDailyArchiveDates,
  getDailyRotationForDate,
  getDailySeedIndex,
  getLusakaTimeParts,
} from './utils/lusakaTime';
import { soundEngine } from './utils/sound';

const HERO_STADIUM_IMG = '/src/assets/images/hero_stadium_pitch_1795187253993.jpg';
const ARENA_BOARD_IMG = '/src/assets/images/arena_board_crest_1795187253591.jpg';

function normalizeRoute(pathname: string): HubRoute {
  if (pathname.startsWith('/games/daily')) return '/games/daily';
  if (pathname.startsWith('/games/football')) return '/games/football';
  if (pathname.startsWith('/games/multiplayer')) return '/games/multiplayer';
  if (pathname.startsWith('/games/leaderboards')) return '/games/leaderboards';
  if (pathname.startsWith('/games/profile')) return '/games/profile';
  return '/games';
}

export default function App() {
  const [route, setRoute] = useState<HubRoute>(() =>
    typeof window !== 'undefined' ? normalizeRoute(window.location.pathname) : '/games'
  );
  const [region, setRegion] = useState<RegionId>('zambia');
  const [regionNotice, setRegionNotice] = useState('');
  const [juniorMode, setJuniorMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('indiwabola_junior_mode') === 'true';
  });
  const [footballFilter, setFootballFilter] = useState<'all' | 'Phase 2' | 'Phase 4' | 'Word Studio'>('all');

  const toggleJuniorMode = useCallback(() => {
    soundEngine.playClick();
    setJuniorMode((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('indiwabola_junior_mode', String(next));
      }
      return next;
    });
  }, []);

  // Player session & Firebase Auth state
  const [player, setPlayer] = useState<PlayerSession | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Lusaka Daily Challenge clock & state
  const [lusakaClock, setLusakaClock] = useState(() => getLusakaTimeParts());
  const [dailyInfo, setDailyInfo] = useState<DailyChallengeInfo>(() => {
    const parts = getLusakaTimeParts();
    return {
      lusakaDate: parts.dateStr,
      lusakaTimeFormatted: parts.formattedTime,
      msUntilMidnight: parts.msUntilMidnight,
      promoWindowLabel: parts.hours >= 7 ? '07:00 CAT Daily Dispatch Sent' : 'Next 07:00 CAT Dispatch Queued',
      games: getDailyRotationForDate(parts.dateStr),
      completedGameIds: [],
      userDailyScore: 0,
    };
  });

  // Leaderboards
  const [lbPeriod, setLbPeriod] = useState<'daily' | 'weekly' | 'alltime'>('alltime');
  const [lbCategory, setLbCategory] = useState<'skill' | 'puzzle' | 'multiplayer'>('skill');
  const [lbGameId, setLbGameId] = useState<'all' | GameId>('all');
  const [lbRows, setLbRows] = useState<LeaderboardRow[]>([]);
  const [lbLoading, setLbLoading] = useState(false);

  // Active Game Shell state
  const [inviteRoomCode, setInviteRoomCode] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('room');
  });
  const [activeGameId, setActiveGameId] = useState<GameId | null>(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    const gameParam = params.get('game') as GameId | null;
    if (roomParam && gameParam && ['bola-ludo', 'road-to-glory', 'four-goals'].includes(gameParam)) {
      return gameParam;
    }
    return null;
  });
  const [activeIsDaily, setActiveIsDaily] = useState(false);
  const [gamePhase, setGamePhase] = useState<GamePhase>(() => {
    if (typeof window === 'undefined') return 'TITLE_MENU';
    const params = new URLSearchParams(window.location.search);
    return params.get('room') && params.get('game') ? 'PLAYING' : 'TITLE_MENU';
  });
  const [gameInstanceKey, setGameInstanceKey] = useState(1);
  const [seedOffset, setSeedOffset] = useState(0);
  const [liveScore, setLiveScore] = useState(0);
  const [liveStatus, setLiveStatus] = useState('');
  const [gameResult, setGameResult] = useState<GameResultPayload | null>(null);
  const [submissionStatus, setSubmissionStatus] = useState<{
    loading: boolean;
    officialRanked: boolean;
    validatedScore?: number;
    message?: string;
    error?: string;
  } | null>(null);

  // Image error resilience
  const [heroImgOk, setHeroImgOk] = useState(true);
  const [arenaImgOk, setArenaImgOk] = useState(true);

  const navigate = useCallback((nextRoute: HubRoute) => {
    soundEngine.playClick();
    setRoute(nextRoute);
    if (typeof window !== 'undefined' && window.location.pathname !== nextRoute) {
      window.history.pushState({}, '', nextRoute);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const onPop = () => {
      setRoute(normalizeRoute(window.location.pathname));
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Initialize session from localStorage or server guest endpoint
  useEffect(() => {
    const initSession = async () => {
      try {
        const saved = window.localStorage.getItem('indiwabola_player');
        if (saved) {
          const parsed = JSON.parse(saved) as PlayerSession;
          if (!parsed.isGuest) {
            const res = await fetch(`/api/profile/${encodeURIComponent(parsed.username)}`);
            if (res.ok) {
              const data = await res.json();
              setPlayer(data.player);
              return;
            }
          } else {
            setPlayer(parsed);
            return;
          }
        }
        const res = await fetch('/api/auth/guest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ country: 'zambia' }),
        });
        if (res.ok) {
          const data = await res.json();
          setPlayer(data.player);
          window.localStorage.setItem('indiwabola_player', JSON.stringify(data.player));
        }
      } catch {
        // Fallback guest offline
        setPlayer({
          id: 'guest_local',
          username: 'Guest_Player',
          isGuest: true,
          country: 'zambia',
          favoriteClub: 'Chipolopolo',
          streak: 0,
          bestStreak: 0,
          totalPoints: 0,
          multiplayerPoints: 0,
          gamesPlayed: 0,
          wins: 0,
          achievements: [],
          dailyCompletedDates: {},
          history: [],
          createdAt: new Date().toISOString(),
        });
      }
    };
    initSession();
  }, []);

  // Firebase Auth listener for cloud-synced Google accounts
  useEffect(() => {
    const unsub = observeFirebaseAuth(async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        try {
          const profile = await ensureFirebasePlayerProfile(
            fbUser,
            player?.favoriteClub || 'Chipolopolo',
            region,
            juniorMode
          );
          setPlayer(profile);
          window.localStorage.setItem('indiwabola_player', JSON.stringify(profile));
        } catch {
          // ErrorBoundary / console handles Firestore error context cleanly
        }
      }
    });
    return () => unsub();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Live 1s Lusaka clock tick
  useEffect(() => {
    const timer = window.setInterval(() => {
      setLusakaClock(getLusakaTimeParts());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const fetchDaily = useCallback(async () => {
    try {
      const q = player && !player.isGuest ? `?username=${encodeURIComponent(player.username)}` : '';
      const res = await fetch(`/api/daily${q}`);
      if (res.ok) {
        const data = await res.json();
        setDailyInfo(data);
      }
    } catch {
      // Keep local fallback
    }
  }, [player]);

  const fetchLeaderboards = useCallback(async () => {
    setLbLoading(true);
    try {
      const u = player && !player.isGuest ? `&username=${encodeURIComponent(player.username)}` : '';
      const res = await fetch(
        `/api/leaderboards?period=${lbPeriod}&category=${lbCategory}&gameId=${lbGameId}&region=${region === 'zambia' ? 'zambia' : 'all'}${u}`
      );
      let serverRows: LeaderboardRow[] = [];
      if (res.ok) {
        const data = await res.json();
        serverRows = data.rows || [];
      }
      if (lbGameId === 'all' && lbPeriod === 'alltime') {
        try {
          const fbRows = await fetchPublicLeaderboardFromFirestore(lbCategory, player?.username);
          const mergedMap = new Map<string, LeaderboardRow>();
          [...serverRows, ...fbRows].forEach((r) => {
            const key = r.username.toLowerCase();
            const prev = mergedMap.get(key);
            if (!prev || r.score > prev.score) {
              mergedMap.set(key, r);
            }
          });
          const merged = Array.from(mergedMap.values())
            .sort((a, b) => b.score - a.score)
            .slice(0, 25)
            .map((r, i) => ({ ...r, rank: i + 1 }));
          setLbRows(merged);
          return;
        } catch {
          // Fall back cleanly to server rows if offline or unindexed
        }
      }
      setLbRows(serverRows);
    } catch {
      setLbRows([]);
    } finally {
      setLbLoading(false);
    }
  }, [lbPeriod, lbCategory, lbGameId, region, player]);

  useEffect(() => {
    fetchDaily();
  }, [fetchDaily]);

  useEffect(() => {
    fetchLeaderboards();
  }, [fetchLeaderboards]);

  const handleAuthenticated = (newPlayer: PlayerSession) => {
    setPlayer(newPlayer);
    window.localStorage.setItem('indiwabola_player', JSON.stringify(newPlayer));
    fetchDaily();
    fetchLeaderboards();
  };

  const launchGame = (gameId: GameId, isDaily = false) => {
    soundEngine.playClick();
    setActiveGameId(gameId);
    setActiveIsDaily(isDaily);
    setGamePhase('TITLE_MENU');
    setGameResult(null);
    setSubmissionStatus(null);
    setLiveScore(0);
    setLiveStatus('');
    setSeedOffset(
      isDaily
        ? getDailySeedIndex(lusakaClock.dateStr, 97)
        : Math.floor(Math.random() * 50)
    );
    setGameInstanceKey((k) => k + 1);
  };

  const handleGameScoreChange = useCallback((sc: number, status?: string) => {
    setLiveScore(sc);
    if (status !== undefined) setLiveStatus(status);
  }, []);

  const handleGameFinish = useCallback(
    async (resPayload: GameResultPayload) => {
      setGameResult(resPayload);
      setGamePhase(resPayload.won ? 'VICTORY' : 'GAME_OVER');
      setSubmissionStatus({ loading: true, officialRanked: false });

      if (!activeGameId) return;

      const catalogMeta = getGameById(activeGameId);

      // If signed in with Firebase Auth, write directly to Firestore as well
      if (firebaseUser && player && !player.isGuest && catalogMeta) {
        try {
          const validatedScore = activeIsDaily ? Math.round(resPayload.score * 1.5) : resPayload.score;
          await recordScoreInFirestore({
            fbUser: firebaseUser,
            player,
            gameId: activeGameId,
            category: catalogMeta.category,
            skillClass: catalogMeta.skillClass,
            region,
            score: validatedScore,
            accuracy: resPayload.accuracy,
            attempts: resPayload.attempts,
            isDaily: activeIsDaily,
            won: resPayload.won,
            lusakaDate: lusakaClock.dateStr,
          });
          const refreshed = await ensureFirebasePlayerProfile(
            firebaseUser,
            player.favoriteClub,
            region,
            juniorMode
          );
          setPlayer(refreshed);
          window.localStorage.setItem('indiwabola_player', JSON.stringify(refreshed));
          setSubmissionStatus({
            loading: false,
            officialRanked: true,
            validatedScore,
            message: 'Verified & synced to Firebase Cloud Firestore.',
          });
          fetchDaily();
          fetchLeaderboards();
          return;
        } catch (err) {
          setSubmissionStatus({
            loading: false,
            officialRanked: false,
            error: err instanceof Error ? err.message : 'Firestore sync error.',
          });
          return;
        }
      }

      try {
        const res = await fetch('/api/scores/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: player?.username,
            isGuest: player?.isGuest ?? true,
            gameId: activeGameId,
            rawScore: resPayload.score,
            accuracy: resPayload.accuracy,
            attempts: resPayload.attempts,
            isDaily: activeIsDaily,
            region,
            won: resPayload.won,
            verificationPayload: resPayload.verificationPayload,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setSubmissionStatus({
            loading: false,
            officialRanked: false,
            error: data.error || 'Score validation issue.',
          });
          return;
        }
        setSubmissionStatus({
          loading: false,
          officialRanked: Boolean(data.officialRanked),
          validatedScore: data.validatedScore,
          message: data.message,
        });
        if (data.player) {
          setPlayer(data.player);
          window.localStorage.setItem('indiwabola_player', JSON.stringify(data.player));
        } else if (player && player.isGuest) {
          const entry = {
            id: `local_${Date.now()}`,
            gameId: activeGameId,
            gameTitle: getGameById(activeGameId)?.title || activeGameId,
            category: getGameById(activeGameId)?.category || 'football',
            region,
            score: resPayload.score,
            accuracy: resPayload.accuracy,
            attempts: resPayload.attempts,
            isDaily: activeIsDaily,
            lusakaDate: lusakaClock.dateStr,
            createdAt: new Date().toISOString(),
          };
          const updatedGuest: PlayerSession = {
            ...player,
            totalPoints: player.totalPoints + resPayload.score,
            gamesPlayed: player.gamesPlayed + 1,
            wins: player.wins + (resPayload.won ? 1 : 0),
            history: [entry, ...player.history].slice(0, 20),
          };
          setPlayer(updatedGuest);
          window.localStorage.setItem('indiwabola_player', JSON.stringify(updatedGuest));
        }
        fetchDaily();
        fetchLeaderboards();
      } catch {
        setSubmissionStatus({
          loading: false,
          officialRanked: false,
          error: 'Offline or server unavailable — local result kept.',
        });
      }
    },
    [activeGameId, activeIsDaily, fetchDaily, fetchLeaderboards, firebaseUser, juniorMode, lusakaClock.dateStr, player, region]
  );

  const handleRestartGame = () => {
    setGameResult(null);
    setSubmissionStatus(null);
    setLiveScore(0);
    setSeedOffset((s) => (activeIsDaily ? s : s + 1));
    setGameInstanceKey((k) => k + 1);
    setGamePhase('PLAYING');
  };

  const updateClub = async (newClub: string) => {
    if (!player) return;
    if (firebaseUser) {
      const updated = { ...player, favoriteClub: newClub };
      setPlayer(updated);
      window.localStorage.setItem('indiwabola_player', JSON.stringify(updated));
      await updateFirebasePlayerClub(firebaseUser.uid, newClub, region, juniorMode);
      return;
    }
    if (player.isGuest) {
      const updated = { ...player, favoriteClub: newClub };
      setPlayer(updated);
      window.localStorage.setItem('indiwabola_player', JSON.stringify(updated));
      return;
    }
    try {
      const res = await fetch(`/api/profile/${encodeURIComponent(player.username)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ favoriteClub: newClub }),
      });
      if (res.ok) {
        const data = await res.json();
        setPlayer(data.player);
        window.localStorage.setItem('indiwabola_player', JSON.stringify(data.player));
      }
    } catch {
      // ignore
    }
  };

  const handleSignOut = async () => {
    soundEngine.playClick();
    if (firebaseUser) {
      await signOutFirebase();
    }
    window.localStorage.removeItem('indiwabola_player');
    try {
      const res = await fetch('/api/auth/guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country: region }),
      });
      if (res.ok) {
        const data = await res.json();
        setPlayer(data.player);
        window.localStorage.setItem('indiwabola_player', JSON.stringify(data.player));
        return;
      }
    } catch {
      // ignore
    }
  };

  const footballGames = useMemo(
    () =>
      GAME_CATALOG.filter((g) => {
        if (g.category !== 'football') return false;
        if (juniorMode && !g.juniorFriendly) return false;
        if (footballFilter === 'all') return true;
        return g.phase === footballFilter;
      }),
    [footballFilter, juniorMode]
  );

  const multiplayerGames = useMemo(
    () => GAME_CATALOG.filter((g) => g.category === 'multiplayer'),
    []
  );

  // Full-Viewport Game Shell when a game is launched
  if (activeGameId) {
    const activeGame = getGameById(activeGameId);
    if (activeGame) {
      const commonProps = {
        region,
        seedOffset,
        isPaused: gamePhase !== 'PLAYING',
        juniorMode,
        playerName: player?.username || 'Player 1',
        favoriteClub: player?.favoriteClub || 'Chipolopolo',
        initialRoomCode: inviteRoomCode,
        onScoreChange: handleGameScoreChange,
        onFinish: handleGameFinish,
      };

      return (
        <>
          <GameShell
            game={activeGame}
            phase={gamePhase}
            onStart={() => setGamePhase('PLAYING')}
            onPauseToggle={() =>
              setGamePhase((p) => (p === 'PLAYING' ? 'PAUSED' : p === 'PAUSED' ? 'PLAYING' : p))
            }
            onRestart={handleRestartGame}
            onExit={() => {
              setActiveGameId(null);
              setInviteRoomCode(null);
              setGamePhase('TITLE_MENU');
            }}
            score={liveScore}
            statusText={liveStatus}
            region={region}
            isDailyMode={activeIsDaily}
            juniorMode={juniorMode}
            player={player}
            result={gameResult}
            submissionStatus={submissionStatus}
            onOpenRegister={() => setAuthModalOpen(true)}
          >
            <div key={gameInstanceKey} className="w-full flex justify-center">
              {activeGameId === 'who-am-i' && <WhoAmIGame {...commonProps} />}
              {activeGameId === 'bola-trivia' && <BolaTriviaGame {...commonProps} />}
              {activeGameId === 'predict-score' && <PredictScoreGame {...commonProps} />}
              {activeGameId === 'bola-word' && <BolaWordGame {...commonProps} />}
              {activeGameId === 'mini-crossword' && <MiniCrosswordGame {...commonProps} />}
              {activeGameId === 'bola-connections' && <ConnectionsGame {...commonProps} />}
              {activeGameId === 'bola-strands' && <BolaStrandsGame {...commonProps} />}
              {activeGameId === 'bola-sudoku' && <BolaSudokuGame {...commonProps} />}
              {activeGameId === 'bola-tiles' && <BolaTilesGame {...commonProps} />}
              {activeGameId === 'match-replay' && <MatchReplayGame {...commonProps} />}
              {activeGameId === 'bola-draft' && <BolaDraftGame {...commonProps} />}
              {activeGameId === 'memory-grid' && <MemoryGridGame {...commonProps} />}
              {activeGameId === 'bola-letters' && <BolaLettersGame {...commonProps} />}
              {activeGameId === 'bola-letter-box' && <BolaLetterBoxGame {...commonProps} />}
              {activeGameId === 'bola-ludo' && <BolaLudoGame {...commonProps} />}
              {activeGameId === 'road-to-glory' && <RoadToGloryGame {...commonProps} />}
              {activeGameId === 'four-goals' && <FourGoalsGame {...commonProps} />}
            </div>
          </GameShell>
          <AuthModal
            open={authModalOpen}
            onClose={() => setAuthModalOpen(false)}
            currentRegion={region}
            juniorMode={juniorMode}
            onAuthenticated={handleAuthenticated}
          />
        </>
      );
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="w-full border-b border-white/10 bg-[#0A0A0A] sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Wordmark */}
          <a
            href="/games"
            onClick={(e) => {
              e.preventDefault();
              navigate('/games');
            }}
            className="font-display text-2xl font-extrabold tracking-tight text-white whitespace-nowrap shrink-0 flex items-center gap-2.5"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="10" stroke="#B6FF00" strokeWidth="2.2" />
              <polygon points="12,6 17,10 15,16 9,16 7,10" fill="#B6FF00" />
            </svg>
            <span>INDIWABOLA</span>
          </a>

          {/* Zone 2: 5 concise single-line text nav links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            {(
              [
                { path: '/games', label: 'Hub' },
                { path: '/games/daily', label: 'Daily' },
                { path: '/games/football', label: 'Football' },
                { path: '/games/multiplayer', label: 'Arena' },
                { path: '/games/leaderboards', label: 'Rankings' },
              ] as { path: HubRoute; label: string }[]
            ).map((item) => (
              <a
                key={item.path}
                href={item.path}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(item.path);
                }}
                className={`whitespace-nowrap shrink-0 py-1 transition-colors ${
                  route === item.path
                    ? 'text-[#B6FF00] underline underline-offset-8 decoration-2'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => navigate('/games/profile')}
              className="px-4 py-2 rounded-lg bg-[#B6FF00] hover:bg-[#c8ff3d] text-[#0A0A0A] text-xs font-bold whitespace-nowrap shrink-0 min-h-[40px]"
            >
              {player && !player.isGuest ? player.username : 'Player Profile'}
            </button>
          </div>
        </div>

        {/* Compact Mobile Sub-Nav (kept well under 15% mobile viewport cap) */}
        <nav className="flex md:hidden items-center justify-between px-4 py-2 border-t border-white/10 text-xs font-medium overflow-x-auto gap-4">
          {(
            [
              { path: '/games', label: 'Hub' },
              { path: '/games/daily', label: 'Daily' },
              { path: '/games/football', label: 'Football' },
              { path: '/games/multiplayer', label: 'Arena' },
              { path: '/games/leaderboards', label: 'Rankings' },
            ] as { path: HubRoute; label: string }[]
          ).map((item) => (
            <a
              key={item.path}
              href={item.path}
              onClick={(e) => {
                e.preventDefault();
                navigate(item.path);
              }}
              className={`whitespace-nowrap shrink-0 py-1 ${
                route === item.path ? 'text-[#B6FF00] font-bold' : 'text-white/65'
              }`}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-12">
        {/* COUNTRY & COMPETITION WORKSPACE FILTER */}
        <section aria-label="Country and Competition Filter" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div className="flex items-center gap-2 text-xs text-white/60">
              <Globe className="w-4 h-4 text-[#B6FF00]" />
              <span>Active Football Dataset</span>
              <span aria-hidden="true">·</span>
              <span className="text-white/85 font-medium">
                {REGIONS.find((r) => r.id === region)?.leagues}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={toggleJuniorMode}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors min-h-[38px] ${
                  juniorMode
                    ? 'bg-[#B6FF00] border-[#B6FF00] text-[#0A0A0A]'
                    : 'bg-[#1C1C1C] border-white/10 text-white/75 hover:text-white'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Junior Mode: {juniorMode ? 'ON' : 'OFF'}</span>
              </button>

              <div className="flex flex-wrap items-center gap-1.5 bg-[#1C1C1C] p-1 rounded-lg border border-white/10">
                {REGIONS.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      if (!r.active) {
                        setRegionNotice(`${r.name} (${r.leagues}) is gated in Phase 5 until verified match records are connected.`);
                        return;
                      }
                      setRegionNotice('');
                      setRegion(r.id);
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 min-h-[36px] ${
                      region === r.id
                        ? 'bg-[#B6FF00] text-[#0A0A0A]'
                        : r.active
                        ? 'text-white/80 hover:text-white hover:bg-white/5'
                        : 'text-white/35 hover:text-white/60'
                    }`}
                  >
                    {!r.active && <Lock className="w-3 h-3" />}
                    <span>{r.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          {juniorMode && (
            <div className="text-xs text-[#B6FF00] flex items-center gap-2" role="status">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Junior Mode Active — Privacy-safe guest play, simplified rules, free clues, and age-friendly puzzles enabled.</span>
            </div>
          )}
          {regionNotice && (
            <div className="text-xs text-amber-300" role="status">
              {regionNotice}
            </div>
          )}
        </section>

        {/* HUB OVERVIEW (/games) */}
        {route === '/games' && (
          <>
            {/* Editorial Split Hero */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              <div className="lg:col-span-6 flex flex-col justify-between bg-[#1C1C1C] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-6">
                <div className="space-y-4">
                  <div className="text-xs text-[#B6FF00] font-semibold tracking-wide">
                    INDIWABOLA Games Hub · Zambia Launch Edition
                  </div>
                  <h1 className="font-display text-5xl sm:text-6xl font-extrabold tracking-tight leading-[0.95] text-white text-balance">
                    Play. Compete. Conquer.
                  </h1>
                  <p className="text-base text-white/75 leading-relaxed max-w-lg">
                    Fourteen original football puzzles and three stadium multiplayer games crafted for Chipolopolo supporters and casual challengers. Play free as a guest or claim your username for ranked tables.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => navigate('/games/daily')}
                    className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg bg-[#B6FF00] hover:bg-[#c8ff3d] text-[#0A0A0A] font-bold text-sm min-h-[46px] whitespace-nowrap"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Play Daily BOLA Challenge</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/games/multiplayer')}
                    className="inline-flex items-center gap-2 px-5 py-3.5 rounded-lg bg-white/10 hover:bg-white/15 text-white font-semibold text-sm min-h-[46px] whitespace-nowrap"
                  >
                    <span>Enter Multiplayer Arena</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="lg:col-span-6 relative rounded-2xl overflow-hidden border border-white/10 min-h-[300px] bg-[#1C1C1C]">
                {heroImgOk ? (
                  <img
                    src={HERO_STADIUM_IMG}
                    alt="Floodlit stadium pitch at night"
                    referrerPolicy="no-referrer"
                    onError={() => setHeroImgOk(false)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#1C1C1C] to-[#0A0A0A] flex items-center justify-center">
                    <Gamepad2 className="w-16 h-16 text-[#B6FF00]/40" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent flex flex-col justify-end p-6 sm:p-8">
                  <div className="text-xs text-[#B6FF00] font-medium">
                    Daily Reset · Africa/Lusaka ({lusakaClock.formattedTime})
                  </div>
                  <div className="font-display text-3xl font-extrabold text-white mt-1">
                    3 Rotating Football Puzzles Every Day
                  </div>
                  <div className="text-sm text-white/75 mt-1">
                    {dailyInfo.games.map((g) => g.title).join(' · ')}
                  </div>
                </div>
              </div>
            </section>

            {/* 4-Column KPI Strip */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#1C1C1C] border border-white/10 rounded-xl p-5">
                <div className="text-xs text-white/55">Games Live</div>
                <div className="font-mono-tabular text-3xl font-bold text-[#B6FF00] mt-1">17 / 17</div>
                <div className="text-xs text-white/60 mt-1">14 Football · 3 Arena</div>
              </div>
              <div className="bg-[#1C1C1C] border border-white/10 rounded-xl p-5">
                <div className="text-xs text-white/55">Next Lusaka Reset</div>
                <div className="font-mono-tabular text-3xl font-bold text-white mt-1">
                  {formatCountdown(lusakaClock.msUntilMidnight)}
                </div>
                <div className="text-xs text-white/60 mt-1">00:00 CAT Midnight</div>
              </div>
              <div className="bg-[#1C1C1C] border border-white/10 rounded-xl p-5">
                <div className="text-xs text-white/55">Your Daily Streak</div>
                <div className="font-mono-tabular text-3xl font-bold text-white mt-1">
                  {player?.streak ?? 0}d
                </div>
                <div className="text-xs text-white/60 mt-1">
                  {dailyInfo.completedGameIds.length}/3 completed today
                </div>
              </div>
              <div className="bg-[#1C1C1C] border border-white/10 rounded-xl p-5">
                <div className="text-xs text-white/55">Your Hub Points</div>
                <div className="font-mono-tabular text-3xl font-bold text-[#B6FF00] mt-1">
                  {(player?.totalPoints ?? 0) + (player?.multiplayerPoints ?? 0)}
                </div>
                <div className="text-xs text-white/60 mt-1">
                  {player?.isGuest ? 'Guest session' : player?.favoriteClub}
                </div>
              </div>
            </section>

            {/* Today's 3 Daily BOLA Challenges */}
            <section className="space-y-5">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white">
                    Today’s Daily BOLA Challenge
                  </h2>
                  <p className="text-sm text-white/65 mt-1">
                    Three curated puzzles earning a 1.5× daily multiplier until midnight Lusaka time.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/games/daily')}
                  className="text-sm font-semibold text-[#B6FF00] hover:underline whitespace-nowrap"
                >
                  Open Daily Hub →
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {dailyInfo.games.map((dg, idx) => {
                  const catalogItem = getGameById(dg.gameId);
                  const done = dailyInfo.completedGameIds.includes(dg.gameId);
                  return (
                    <div
                      key={dg.gameId}
                      className="bg-[#1C1C1C] border border-white/10 rounded-xl p-6 flex flex-col justify-between gap-5"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs text-white/55">
                          <span>Daily Slot 0{idx + 1} · 1.5× Score</span>
                          {done && (
                            <span className="inline-flex items-center gap-1 text-[#B6FF00] font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Done</span>
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <GameEmblem gameId={dg.gameId} color={catalogItem?.accentColor} size={36} />
                          <div>
                            <h3 className="font-display text-2xl font-bold text-white">{dg.title}</h3>
                            <div className="text-xs text-white/60">{dg.subtitle}</div>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => launchGame(dg.gameId, true)}
                        className="w-full min-h-[44px] rounded-lg bg-[#B6FF00] hover:bg-[#c8ff3d] text-[#0A0A0A] font-bold text-sm"
                      >
                        {done ? 'Replay Practice' : 'Play Daily Puzzle'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Featured Football Games & New Word Studio */}
            <section className="space-y-5">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white">
                    Section A — Football Games (14)
                  </h2>
                  <p className="text-sm text-white/65 mt-1">
                    Distinct visual identity, clear scoring rules, and mobile-ready boards — now featuring BOLA Letters &amp; BOLA Letter Box.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/games/football')}
                  className="text-sm font-semibold text-[#B6FF00] hover:underline whitespace-nowrap"
                >
                  View All 14 Games →
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {GAME_CATALOG.filter((g) => g.category === 'football' && (!juniorMode || g.juniorFriendly))
                  .slice(0, 6)
                  .concat(
                    GAME_CATALOG.filter(
                      (g) => g.id === 'bola-letters' || g.id === 'bola-letter-box'
                    )
                  )
                  .slice(0, 8)
                  .map((g) => (
                    <div
                      key={g.id}
                      className="bg-[#1C1C1C] border border-white/10 hover:border-white/25 rounded-xl p-5 flex flex-col justify-between gap-4 transition-colors"
                    >
                      <div className="space-y-3">
                        <div className="text-xs text-white/50">
                          Game {String(g.number).padStart(2, '0')} · {g.shortTag} · {g.estimatedMinutes}
                        </div>
                        <div className="flex items-center gap-3">
                          <GameEmblem gameId={g.id} color={g.accentColor} size={36} />
                          <h3 className="font-display text-2xl font-bold text-white">{g.title}</h3>
                        </div>
                        <p className="text-sm text-white/70 leading-relaxed">
                          {juniorMode && g.juniorDescription ? g.juniorDescription : g.description}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => launchGame(g.id, false)}
                        className="w-full min-h-[44px] rounded-lg bg-white/10 hover:bg-[#B6FF00] hover:text-[#0A0A0A] text-white font-semibold text-sm transition-colors"
                      >
                        Play {g.title}
                      </button>
                    </div>
                  ))}
              </div>
            </section>

            {/* Section B Spotlight */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch bg-[#1C1C1C] border border-white/10 rounded-2xl overflow-hidden">
              <div className="lg:col-span-5 relative min-h-[260px] bg-[#0A0A0A]">
                {arenaImgOk ? (
                  <img
                    src={ARENA_BOARD_IMG}
                    alt="INDIWABOLA Multiplayer Arena tabletop strategy board"
                    referrerPolicy="no-referrer"
                    onError={() => setArenaImgOk(false)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Users className="w-16 h-16 text-[#B6FF00]/40" />
                  </div>
                )}
              </div>
              <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between gap-5">
                <div className="space-y-3">
                  <div className="text-xs text-[#B6FF00] font-semibold">
                    Section B — BOLA Multiplayer Arena
                  </div>
                  <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white">
                    BOLA Ludo, Road to Glory & Four Goals
                  </h2>
                  <p className="text-sm sm:text-base text-white/75 leading-relaxed">
                    Built for low-bandwidth mobile play with private friend room codes, live turn synchronization, local pass-and-play, and intelligent AI club opponents.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {multiplayerGames.map((mg) => (
                    <button
                      key={mg.id}
                      type="button"
                      onClick={() => launchGame(mg.id, false)}
                      className="p-4 rounded-xl bg-[#0A0A0A] border border-white/15 hover:border-[#B6FF00] text-left space-y-1.5 transition-colors"
                    >
                      <GameEmblem gameId={mg.id} color={mg.accentColor} size={28} />
                      <div className="font-display text-xl font-bold text-white">{mg.title}</div>
                      <div className="text-xs text-white/55">{mg.playersLabel}</div>
                    </button>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}

        {/* DAILY BOLA CHALLENGE (/games/daily) */}
        {route === '/games/daily' && (
          <section className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-5">
              <div>
                <div className="text-xs text-[#B6FF00] font-semibold">
                  Africa/Lusaka Schedule · {dailyInfo.lusakaDate}
                </div>
                <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-white mt-1">
                  Daily BOLA Challenge
                </h1>
                <p className="text-sm text-white/70 mt-1">
                  Complete today’s 3 rotating puzzles before midnight Lusaka time to extend your streak.
                </p>
              </div>
              <div className="flex items-center gap-6">
                <div>
                  <div className="text-xs text-white/50">Midnight Reset</div>
                  <div className="font-mono-tabular text-2xl font-bold text-[#B6FF00]">
                    {formatCountdown(lusakaClock.msUntilMidnight)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-white/50">Daily Streak</div>
                  <div className="font-mono-tabular text-2xl font-bold text-white flex items-center gap-1.5">
                    <Flame className="w-5 h-5 text-[#B6FF00]" />
                    <span>{player?.streak ?? 0}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {dailyInfo.games.map((dg, idx) => {
                const catalog = getGameById(dg.gameId);
                const completed = dailyInfo.completedGameIds.includes(dg.gameId);
                return (
                  <div
                    key={dg.gameId}
                    className="bg-[#1C1C1C] border border-white/10 rounded-xl p-6 flex flex-col justify-between gap-5"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs text-white/55">
                        <span>Puzzle 0{idx + 1} · {dg.bonusMultiplier}× Points</span>
                        {completed && (
                          <span className="text-[#B6FF00] font-semibold inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Submitted
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <GameEmblem gameId={dg.gameId} color={catalog?.accentColor} size={42} />
                        <div>
                          <h2 className="font-display text-2xl font-bold text-white">{dg.title}</h2>
                          <p className="text-xs text-white/60">{dg.subtitle}</p>
                        </div>
                      </div>
                      <p className="text-sm text-white/75">{catalog?.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => launchGame(dg.gameId, true)}
                      className="w-full min-h-[46px] rounded-lg bg-[#B6FF00] hover:bg-[#c8ff3d] text-[#0A0A0A] font-bold text-sm"
                    >
                      {completed ? 'Play Practice Run' : 'Launch Daily Challenge'}
                    </button>
                  </div>
                );
              })}
            </div>

            <DailyPromoCard daily={dailyInfo} />

            {/* 7-Day Daily Challenge Archive */}
            <div className="bg-[#1C1C1C] border border-white/10 rounded-xl p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div>
                  <h2 className="font-display text-2xl font-bold text-white">7-Day Challenge Archive</h2>
                  <p className="text-xs text-white/60">
                    Missed a previous Lusaka matchday? Replay archived daily seed boards in practice mode.
                  </p>
                </div>
                <span className="text-xs text-white/50 font-mono-tabular">CAT History</span>
              </div>
              <div className="divide-y divide-white/10">
                {getDailyArchiveDates(dailyInfo.lusakaDate, 7).map((archDate) => {
                  const archGames = getDailyRotationForDate(archDate);
                  const archSeed = getDailySeedIndex(archDate, 97);
                  const completedIds = player?.dailyCompletedDates?.[archDate] || [];
                  return (
                    <div
                      key={archDate}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="font-mono-tabular text-xs font-bold text-[#B6FF00]">
                          {archDate}
                        </div>
                        <div className="text-xs text-white/65">
                          {archGames.map((g) => g.title).join(' · ')}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {archGames.map((dg) => {
                          const done = completedIds.includes(dg.gameId);
                          return (
                            <button
                              key={`${archDate}-${dg.gameId}`}
                              type="button"
                              onClick={() => {
                                soundEngine.playClick();
                                setActiveGameId(dg.gameId);
                                setActiveIsDaily(false);
                                setGamePhase('TITLE_MENU');
                                setGameResult(null);
                                setSubmissionStatus(null);
                                setLiveScore(0);
                                setLiveStatus('');
                                setSeedOffset(archSeed);
                                setGameInstanceKey((k) => k + 1);
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border min-h-[36px] transition-colors ${
                                done
                                  ? 'bg-[#B6FF00]/15 border-[#B6FF00]/50 text-[#B6FF00]'
                                  : 'bg-[#0A0A0A] border-white/15 hover:border-[#B6FF00] text-white/85'
                              }`}
                            >
                              {done ? '✓ ' : ''}{dg.title}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* FOOTBALL GAMES DIRECTORY (/games/football) */}
        {route === '/games/football' && (
          <section className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-5">
              <div>
                <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-white">
                  Section A — Football Games
                </h1>
                <p className="text-sm text-white/70 mt-1">
                  All 14 original football games with dedicated rules, scoring validation, and mobile-first layouts.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1 bg-[#1C1C1C] p-1 rounded-lg border border-white/10">
                {(['all', 'Phase 2', 'Phase 4', 'Word Studio'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setFootballFilter(tab)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold min-h-[36px] ${
                      footballFilter === tab ? 'bg-[#B6FF00] text-[#0A0A0A]' : 'text-white/70 hover:text-white'
                    }`}
                  >
                    {tab === 'all'
                      ? 'All 14'
                      : tab === 'Phase 2'
                      ? 'Core 6'
                      : tab === 'Phase 4'
                      ? 'Expansion 6'
                      : 'Word Studio (2)'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {footballGames.map((g) => (
                <div
                  key={g.id}
                  className="bg-[#1C1C1C] border border-white/10 hover:border-white/25 rounded-xl p-5 flex flex-col justify-between gap-4 transition-colors"
                >
                  <div className="space-y-3">
                    <div className="text-xs text-white/50">
                      #{String(g.number).padStart(2, '0')} · {g.phase} · {g.shortTag} · {g.estimatedMinutes}
                    </div>
                    <div className="flex items-center gap-3">
                      <GameEmblem gameId={g.id} color={g.accentColor} size={38} />
                      <h2 className="font-display text-2xl font-bold text-white">{g.title}</h2>
                    </div>
                    <p className="text-sm text-white/70 leading-relaxed">
                      {juniorMode && g.juniorDescription ? g.juniorDescription : g.description}
                    </p>
                    <div className="text-xs text-white/50 pt-1">{g.scoringSummary}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => launchGame(g.id, false)}
                    className="w-full min-h-[44px] rounded-lg bg-[#B6FF00] hover:bg-[#c8ff3d] text-[#0A0A0A] font-bold text-sm"
                  >
                    Play {g.title}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* MULTIPLAYER ARENA (/games/multiplayer) */}
        {route === '/games/multiplayer' && (
          <section className="space-y-6">
            <div className="border-b border-white/10 pb-5">
              <div className="text-xs text-[#B6FF00] font-semibold">
                Section B · Low-Bandwidth Real-Time Rooms & AI Opponents
              </div>
              <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-white mt-1">
                BOLA Multiplayer Arena
              </h1>
              <p className="text-sm text-white/70 mt-1">
                Challenge friends via private room codes, play locally on one device, or test tactics against club AI bots.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {multiplayerGames.map((mg) => (
                <div
                  key={mg.id}
                  className="bg-[#1C1C1C] border border-white/10 rounded-xl p-6 flex flex-col justify-between gap-5"
                >
                  <div className="space-y-3">
                    <div className="text-xs text-white/55">
                      Game #{mg.number} · {mg.playersLabel}
                    </div>
                    <div className="flex items-center gap-3">
                      <GameEmblem gameId={mg.id} color={mg.accentColor} size={44} />
                      <div>
                        <h2 className="font-display text-3xl font-bold text-white">{mg.title}</h2>
                        <div className="text-xs text-[#B6FF00]">{mg.shortTag}</div>
                      </div>
                    </div>
                    <p className="text-sm text-white/75 leading-relaxed">{mg.description}</p>
                    <ul className="space-y-1.5 text-xs text-white/60 pt-2 border-t border-white/10">
                      {mg.rules.map((r, i) => (
                        <li key={i}>• {r}</li>
                      ))}
                    </ul>
                  </div>
                  <button
                    type="button"
                    onClick={() => launchGame(mg.id, false)}
                    className="w-full min-h-[46px] rounded-lg bg-[#B6FF00] hover:bg-[#c8ff3d] text-[#0A0A0A] font-bold text-sm"
                  >
                    Enter {mg.title}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* LEADERBOARDS (/games/leaderboards) */}
        {route === '/games/leaderboards' && (
          <section className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-5">
              <div>
                <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-white">
                  Official Leaderboards
                </h1>
                <p className="text-sm text-white/70 mt-1">
                  Real player rankings only (zero synthetic demo entries) — separated across Skill Puzzles, Full Football, and Multiplayer Arena.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1 bg-[#1C1C1C] p-1 rounded-lg border border-white/10">
                  {(
                    [
                      { id: 'skill', label: 'Skill-Based' },
                      { id: 'puzzle', label: 'All Football' },
                      { id: 'multiplayer', label: 'Multiplayer Arena' },
                    ] as const
                  ).map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setLbCategory(cat.id);
                        setLbGameId('all');
                      }}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold min-h-[36px] ${
                        lbCategory === cat.id && lbGameId === 'all'
                          ? 'bg-[#B6FF00] text-[#0A0A0A]'
                          : 'text-white/70 hover:text-white'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                <select
                  aria-label="Filter leaderboard by individual game"
                  value={lbGameId}
                  onChange={(e) => setLbGameId(e.target.value as 'all' | GameId)}
                  className="min-h-[40px] px-3 rounded-lg bg-[#1C1C1C] border border-white/15 text-xs font-semibold text-white"
                >
                  <option value="all">All Games in Category</option>
                  {GAME_CATALOG.map((g) => (
                    <option key={g.id} value={g.id}>
                      #{String(g.number).padStart(2, '0')} {g.title} ({g.skillClass === 'skill' ? 'Skill' : 'Luck-Mixed'})
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-1 bg-[#1C1C1C] p-1 rounded-lg border border-white/10">
                  {(['daily', 'weekly', 'alltime'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setLbPeriod(p)}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold min-h-[36px] ${
                        lbPeriod === p ? 'bg-white text-[#0A0A0A]' : 'text-white/70'
                      }`}
                    >
                      {p === 'daily' ? 'Daily' : p === 'weekly' ? 'Weekly' : 'All-Time'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {player?.isGuest && (
              <div className="bg-[#1C1C1C] border border-white/15 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm text-white/80">
                  You are currently playing as <strong>{player.username}</strong>. Claim a unique username to appear on the official rankings.
                </span>
                <button
                  type="button"
                  onClick={() => setAuthModalOpen(true)}
                  className="px-4 py-2 rounded-lg bg-[#B6FF00] text-[#0A0A0A] text-xs font-bold whitespace-nowrap"
                >
                  Claim Username
                </button>
              </div>
            )}

            <div className="bg-[#1C1C1C] border border-white/10 rounded-xl overflow-hidden">
              {lbLoading ? (
                <div className="p-8 text-center text-sm text-white/60">Loading validated standings...</div>
              ) : lbRows.length === 0 ? (
                <div className="p-10 text-center space-y-3">
                  <div className="text-base font-bold text-white">No Real Player Scores Recorded Yet</div>
                  <p className="text-xs text-white/60 max-w-md mx-auto">
                    INDIWABOLA never populates fake demo accounts. Register a username and submit a validated match score to claim #1 on this table.
                  </p>
                  {player?.isGuest && (
                    <button
                      type="button"
                      onClick={() => setAuthModalOpen(true)}
                      className="px-5 py-2.5 rounded-lg bg-[#B6FF00] text-[#0A0A0A] text-xs font-bold"
                    >
                      Register & Claim #1
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-xs text-white/50">
                        <th className="py-3.5 px-5 font-medium">Rank</th>
                        <th className="py-3.5 px-5 font-medium">Player</th>
                        <th className="py-3.5 px-5 font-medium">Club</th>
                        <th className="py-3.5 px-5 font-medium text-right">Streak</th>
                        <th className="py-3.5 px-5 font-medium text-right">Matches</th>
                        <th className="py-3.5 px-5 font-medium text-right">Points</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10 text-sm">
                      {lbRows.map((row) => (
                        <tr
                          key={row.username}
                          className={row.isCurrentUser ? 'bg-[#B6FF00]/10' : 'hover:bg-white/[0.02]'}
                        >
                          <td className="py-3.5 px-5 font-mono-tabular font-bold text-[#B6FF00]">
                            #{row.rank}
                          </td>
                          <td className="py-3.5 px-5 font-semibold text-white">
                            {row.username}
                            {row.isCurrentUser && (
                              <span className="ml-2 text-xs text-[#B6FF00]">(You)</span>
                            )}
                          </td>
                          <td className="py-3.5 px-5 text-white/70">{row.favoriteClub}</td>
                          <td className="py-3.5 px-5 text-right font-mono-tabular text-white/80">
                            {row.streak}d
                          </td>
                          <td className="py-3.5 px-5 text-right font-mono-tabular text-white/80">
                            {row.gamesPlayed}
                          </td>
                          <td className="py-3.5 px-5 text-right font-mono-tabular font-bold text-[#B6FF00]">
                            {row.score.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}

        {/* PLAYER PROFILE & ARCHITECTURE (/games/profile) */}
        {route === '/games/profile' && (
          <section className="space-y-8">
            <div className="bg-[#1C1C1C] border border-white/10 rounded-2xl p-6 sm:p-8 flex flex-wrap items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-[#B6FF00] text-[#0A0A0A] flex items-center justify-center shrink-0">
                  <User className="w-8 h-8" />
                </div>
                <div>
                  <div className="text-xs text-[#B6FF00] font-semibold">
                    {player?.isGuest ? 'Guest Session' : 'Official Registered Player'}
                  </div>
                  <h1 className="font-display text-4xl font-extrabold text-white">
                    {player?.username || 'Player'}
                  </h1>
                  <div className="text-xs text-white/60 mt-1">
                    Club: {player?.favoriteClub || 'Chipolopolo'} · Region: {region.toUpperCase()}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <select
                  aria-label="Favorite Club"
                  value={player?.favoriteClub || ZAMBIAN_CLUBS[0]}
                  onChange={(e) => updateClub(e.target.value)}
                  className="min-h-[44px] px-3.5 rounded-lg bg-[#0A0A0A] border border-white/20 text-sm text-white"
                >
                  {ZAMBIAN_CLUBS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setAuthModalOpen(true)}
                  className="px-5 min-h-[44px] rounded-lg bg-[#B6FF00] hover:bg-[#c8ff3d] text-[#0A0A0A] font-bold text-sm"
                >
                  {player?.isGuest ? 'Register / Google Sign In' : 'Switch Account'}
                </button>
                {player && !player.isGuest && (
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="inline-flex items-center gap-1.5 px-4 min-h-[44px] rounded-lg bg-[#0A0A0A] border border-white/20 hover:border-white/40 text-xs font-semibold text-white/80"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-[#1C1C1C] border border-white/10 rounded-xl p-5">
                <div className="text-xs text-white/55">Puzzle Score</div>
                <div className="font-mono-tabular text-3xl font-bold text-[#B6FF00] mt-1">
                  {player?.totalPoints ?? 0}
                </div>
              </div>
              <div className="bg-[#1C1C1C] border border-white/10 rounded-xl p-5">
                <div className="text-xs text-white/55">Arena Score</div>
                <div className="font-mono-tabular text-3xl font-bold text-white mt-1">
                  {player?.multiplayerPoints ?? 0}
                </div>
              </div>
              <div className="bg-[#1C1C1C] border border-white/10 rounded-xl p-5">
                <div className="text-xs text-white/55">Games Played</div>
                <div className="font-mono-tabular text-3xl font-bold text-white mt-1">
                  {player?.gamesPlayed ?? 0}
                </div>
              </div>
              <div className="bg-[#1C1C1C] border border-white/10 rounded-xl p-5">
                <div className="text-xs text-white/55">Best Daily Streak</div>
                <div className="font-mono-tabular text-3xl font-bold text-[#B6FF00] mt-1">
                  {player?.bestStreak ?? 0}d
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 bg-[#1C1C1C] border border-white/10 rounded-xl p-6 space-y-4">
                <h2 className="font-display text-2xl font-bold flex items-center gap-2">
                  <Award className="w-5 h-5 text-[#B6FF00]" />
                  <span>Unlocked Honours</span>
                </h2>
                {player && player.achievements.length > 0 ? (
                  <ul className="space-y-2.5 text-sm">
                    {player.achievements.map((ach) => (
                      <li
                        key={ach}
                        className="p-3 rounded-lg bg-[#0A0A0A] border border-white/10 flex items-center gap-2.5"
                      >
                        <Trophy className="w-4 h-4 text-[#B6FF00] shrink-0" />
                        <span>{ach}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-white/55">
                    Complete your first game or claim a username to earn club honours.
                  </p>
                )}
              </div>

              <div className="lg:col-span-7 bg-[#1C1C1C] border border-white/10 rounded-xl p-6 space-y-4">
                <h2 className="font-display text-2xl font-bold flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#B6FF00]" />
                  <span>Recent Match History</span>
                </h2>
                {player && player.history.length > 0 ? (
                  <div className="divide-y divide-white/10">
                    {player.history.slice(0, 8).map((item) => (
                      <div key={item.id} className="py-3 flex items-center justify-between gap-4 text-sm">
                        <div>
                          <div className="font-semibold text-white">
                            {item.gameTitle}
                            {item.isDaily && (
                              <span className="ml-2 text-xs text-[#B6FF00]">Daily 1.5×</span>
                            )}
                          </div>
                          <div className="text-xs text-white/50">
                            {item.lusakaDate} · {item.region.toUpperCase()}
                          </div>
                        </div>
                        <div className="font-mono-tabular font-bold text-[#B6FF00]">
                          +{item.score} pts
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-white/55">
                    No match records yet. Launch any football puzzle or multiplayer arena game to record your score.
                  </p>
                )}
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="w-full border-t border-white/10 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-wrap items-center justify-between gap-4 text-xs text-white/50">
          <div>INDIWABOLA Games Hub · indiwabola.com · Zambia Football & Multiplayer</div>
          <div className="flex items-center gap-5">
            <a
              href="/games/daily"
              onClick={(e) => {
                e.preventDefault();
                navigate('/games/daily');
              }}
              className="hover:text-white"
            >
              Daily Challenge
            </a>
            <a
              href="/games/football"
              onClick={(e) => {
                e.preventDefault();
                navigate('/games/football');
              }}
              className="hover:text-white"
            >
              14 Football Games
            </a>
            <a
              href="/games/multiplayer"
              onClick={(e) => {
                e.preventDefault();
                navigate('/games/multiplayer');
              }}
              className="hover:text-white"
            >
              Multiplayer Arena
            </a>
          </div>
        </div>
      </footer>

      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        currentRegion={region}
        juniorMode={juniorMode}
        onAuthenticated={handleAuthenticated}
      />
    </div>
  );
}
