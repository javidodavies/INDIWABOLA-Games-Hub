export type RegionId = 'zambia' | 'all' | 'egypt' | 'england' | 'spain' | 'germany';

export type GameCategory = 'football' | 'multiplayer';

export type GameSkillClass = 'skill' | 'mixed';

export type GameId =
  | 'who-am-i'
  | 'bola-trivia'
  | 'predict-score'
  | 'bola-word'
  | 'mini-crossword'
  | 'bola-connections'
  | 'bola-strands'
  | 'bola-sudoku'
  | 'bola-tiles'
  | 'match-replay'
  | 'bola-draft'
  | 'memory-grid'
  | 'bola-letters'
  | 'bola-letter-box'
  | 'bola-ludo'
  | 'road-to-glory'
  | 'four-goals';

export type HubRoute =
  | '/games'
  | '/games/daily'
  | '/games/football'
  | '/games/multiplayer'
  | '/games/leaderboards'
  | '/games/profile';

export type GamePhase = 'TITLE_MENU' | 'PLAYING' | 'PAUSED' | 'VICTORY' | 'GAME_OVER';

export interface GameCatalogEntry {
  id: GameId;
  number: number;
  title: string;
  category: GameCategory;
  skillClass: GameSkillClass;
  juniorFriendly: boolean;
  phase: 'Phase 2' | 'Phase 3' | 'Phase 4' | 'Word Studio';
  shortTag: string;
  description: string;
  juniorDescription?: string;
  rules: string[];
  juniorRules?: string[];
  scoringSummary: string;
  controlHint: string;
  accentColor: string;
  supportsDaily: boolean;
  playersLabel: string;
  estimatedMinutes: string;
}

export interface PlayerSession {
  id: string;
  username: string;
  isGuest: boolean;
  country: RegionId;
  favoriteClub: string;
  juniorMode?: boolean;
  streak: number;
  bestStreak: number;
  totalPoints: number;
  multiplayerPoints: number;
  gamesPlayed: number;
  wins: number;
  achievements: string[];
  dailyCompletedDates: Record<string, GameId[]>;
  history: ScoreHistoryEntry[];
  createdAt: string;
}

export interface ScoreHistoryEntry {
  id: string;
  gameId: GameId;
  gameTitle: string;
  category: GameCategory;
  region: RegionId;
  score: number;
  accuracy?: number;
  attempts?: number;
  isDaily: boolean;
  lusakaDate: string;
  createdAt: string;
}

export interface LeaderboardRow {
  rank: number;
  username: string;
  favoriteClub: string;
  country: RegionId;
  score: number;
  gamesPlayed: number;
  streak: number;
  isCurrentUser?: boolean;
}

export interface DailyChallengeInfo {
  lusakaDate: string;
  lusakaTimeFormatted: string;
  msUntilMidnight: number;
  promoWindowLabel: string;
  games: {
    gameId: GameId;
    title: string;
    subtitle: string;
    bonusMultiplier: number;
  }[];
  completedGameIds: GameId[];
  userDailyScore: number;
}

export interface MultiplayerPlayer {
  id: string;
  name: string;
  clubName: string;
  color: string;
  isBot: boolean;
  connected: boolean;
}

export interface MultiplayerRoomState {
  code: string;
  gameId: 'bola-ludo' | 'road-to-glory' | 'four-goals';
  hostId: string;
  maxPlayers: number;
  players: MultiplayerPlayer[];
  status: 'WAITING' | 'ACTIVE' | 'FINISHED';
  turnIndex: number;
  winnerId: string | null;
  lastActionLabel: string;
  updatedAt: string;
  payload: Record<string, unknown>;
}
