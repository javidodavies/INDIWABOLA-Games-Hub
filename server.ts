import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { verifyBolaLettersSubmission, verifyLetterBoxSubmission } from './src/utils/wordPuzzles.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type RegionId = 'zambia' | 'all' | 'egypt' | 'england' | 'spain' | 'germany';
type GameCategory = 'football' | 'multiplayer';
type GameId =
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

interface StoredPlayer {
  id: string;
  username: string;
  pin?: string;
  isGuest: boolean;
  country: RegionId;
  favoriteClub: string;
  streak: number;
  bestStreak: number;
  totalPoints: number;
  multiplayerPoints: number;
  gamesPlayed: number;
  wins: number;
  achievements: string[];
  dailyCompletedDates: Record<string, GameId[]>;
  history: {
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
  }[];
  createdAt: string;
}

interface RoomState {
  code: string;
  gameId: 'bola-ludo' | 'road-to-glory' | 'four-goals';
  hostId: string;
  maxPlayers: number;
  players: {
    id: string;
    name: string;
    clubName: string;
    color: string;
    isBot: boolean;
    connected: boolean;
  }[];
  status: 'WAITING' | 'ACTIVE' | 'FINISHED';
  turnIndex: number;
  winnerId: string | null;
  lastActionLabel: string;
  updatedAt: string;
  payload: Record<string, unknown>;
}

const MAX_SCORE_BY_GAME: Record<GameId, number> = {
  'who-am-i': 900,
  'bola-trivia': 1500,
  'predict-score': 500,
  'bola-word': 900,
  'mini-crossword': 900,
  'bola-connections': 900,
  'bola-strands': 900,
  'bola-sudoku': 1000,
  'bola-tiles': 1500,
  'match-replay': 900,
  'bola-draft': 1000,
  'memory-grid': 900,
  'bola-letters': 900,
  'bola-letter-box': 150,
  'bola-ludo': 600,
  'road-to-glory': 600,
  'four-goals': 500,
};

const GAME_TITLES: Record<GameId, { title: string; category: GameCategory }> = {
  'who-am-i': { title: 'Who Am I?', category: 'football' },
  'bola-trivia': { title: 'BOLA Trivia', category: 'football' },
  'predict-score': { title: 'Predict the Score', category: 'football' },
  'bola-word': { title: 'BOLA Word', category: 'football' },
  'mini-crossword': { title: 'BOLA Mini Crossword', category: 'football' },
  'bola-connections': { title: 'BOLA Connections', category: 'football' },
  'bola-strands': { title: 'BOLA Strands', category: 'football' },
  'bola-sudoku': { title: 'BOLA Sudoku', category: 'football' },
  'bola-tiles': { title: 'BOLA Tiles', category: 'football' },
  'match-replay': { title: 'Match Replay', category: 'football' },
  'bola-draft': { title: 'BOLA Draft', category: 'football' },
  'memory-grid': { title: 'Memory Grid', category: 'football' },
  'bola-letters': { title: 'BOLA Letters', category: 'football' },
  'bola-letter-box': { title: 'BOLA Letter Box', category: 'football' },
  'bola-ludo': { title: 'BOLA Ludo', category: 'multiplayer' },
  'road-to-glory': { title: 'Road to Glory', category: 'multiplayer' },
  'four-goals': { title: 'Four Goals', category: 'multiplayer' },
};

function getLusakaDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Lusaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function getLusakaTimeInfo() {
  const now = new Date();
  const dateStr = getLusakaDateString(now);
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lusaka',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const getNum = (t: string) => Number(parts.find((p) => p.type === t)?.value || 0);
  const h = getNum('hour');
  const m = getNum('minute');
  const s = getNum('second');
  const elapsed = h * 3600 + m * 60 + s;
  const msUntilMidnight = Math.max(1000, (86400 - elapsed) * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');

  return {
    lusakaDate: dateStr,
    lusakaTimeFormatted: `${pad(h)}:${pad(m)}:${pad(s)} CAT`,
    msUntilMidnight,
    promoWindowLabel: h >= 7 ? '07:00 CAT Daily Dispatch Sent' : 'Next 07:00 CAT Dispatch Queued',
  };
}

const DAILY_POOL: { gameId: GameId; title: string; subtitle: string; bonusMultiplier: number }[] = [
  { gameId: 'who-am-i', title: 'Who Am I?', subtitle: 'Career Clue Identity', bonusMultiplier: 1.5 },
  { gameId: 'bola-word', title: 'BOLA Word', subtitle: '5-Letter Pitch Puzzle', bonusMultiplier: 1.5 },
  { gameId: 'bola-connections', title: 'BOLA Connections', subtitle: '4x4 Tactical Grouping', bonusMultiplier: 1.5 },
  { gameId: 'bola-trivia', title: 'BOLA Trivia', subtitle: 'Daily Matchday Quiz', bonusMultiplier: 1.5 },
  { gameId: 'mini-crossword', title: 'BOLA Mini Crossword', subtitle: '5x5 Football Grid', bonusMultiplier: 1.5 },
  { gameId: 'match-replay', title: 'Match Replay', subtitle: 'Iconic Timeline Order', bonusMultiplier: 1.5 },
  { gameId: 'bola-letters', title: 'BOLA Letters', subtitle: '7-Letter Captain Hive', bonusMultiplier: 1.5 },
  { gameId: 'bola-letter-box', title: 'BOLA Letter Box', subtitle: '12-Letter Pitch Frame', bonusMultiplier: 1.5 },
];

function getDailyGames(lusakaDate: string) {
  let hash = 0;
  for (let i = 0; i < lusakaDate.length; i++) {
    hash = (hash * 31 + lusakaDate.charCodeAt(i)) % 100000;
  }
  return [0, 1, 2].map((i) => DAILY_POOL[(hash + i * 3) % DAILY_POOL.length]);
}

const DATA_DIR = path.join(__dirname, '.data');
const STORE_PATH = path.join(DATA_DIR, 'hub-store.json');

interface StoreData {
  players: Record<string, StoredPlayer>;
}

function createSeedPlayers(): Record<string, StoredPlayer> {
  // Per INDIWABOLA integrity policy, do not fabricate or pre-seed fake player rankings.
  return {};
}

let store: StoreData = { players: createSeedPlayers() };

function loadStore() {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as StoreData;
      if (parsed && parsed.players) {
        // Strip any legacy seed_ demo entries so only real registered players appear
        const cleaned: Record<string, StoredPlayer> = {};
        for (const [k, v] of Object.entries(parsed.players)) {
          if (!v.id.startsWith('seed_')) {
            cleaned[k] = v;
          }
        }
        store = { players: cleaned };
      }
    } else {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
    }
  } catch {
    // Fallback cleanly to in-memory store
  }
}

function saveStore() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
  } catch {
    // Ignore filesystem errors in restricted runtimes
  }
}

loadStore();

// Multiplayer in-memory rooms + SSE subscribers
const rooms = new Map<string, RoomState>();
const roomStreams = new Map<string, Set<Response>>();

function broadcastRoom(code: string) {
  const room = rooms.get(code);
  const subs = roomStreams.get(code);
  if (!room || !subs) return;
  const data = `data: ${JSON.stringify(room)}\n\n`;
  for (const res of subs) {
    res.write(data);
  }
}

function generateRoomCode(): string {
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `BOLA-${digits}`;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '512kb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true, service: 'indiwabola-games-hub', ...getLusakaTimeInfo() });
  });

  // Guest session
  app.post('/api/auth/guest', (req: Request, res: Response) => {
    const { country = 'zambia' } = req.body || {};
    const guestNum = Math.floor(1000 + Math.random() * 9000);
    const guest: StoredPlayer = {
      id: `guest_${Date.now()}_${guestNum}`,
      username: `Guest_${guestNum}`,
      isGuest: true,
      country,
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
    };
    res.json({ player: guest });
  });

  // Register unique username
  app.post('/api/auth/register', (req: Request, res: Response) => {
    const { username, pin = '1234', favoriteClub = 'Power Dynamos', country = 'zambia', carryGuestHistory } = req.body || {};
    const cleanName = String(username || '').trim();
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(cleanName)) {
      res.status(400).json({ error: 'Username must be 3–20 characters (letters, numbers, underscores).' });
      return;
    }
    const key = cleanName.toLowerCase();
    if (store.players[key]) {
      res.status(409).json({ error: 'That username is already claimed on INDIWABOLA.' });
      return;
    }

    const initialHistory = Array.isArray(carryGuestHistory) ? carryGuestHistory.slice(0, 20) : [];
    const player: StoredPlayer = {
      id: `plr_${Date.now()}`,
      username: cleanName,
      pin: String(pin).slice(0, 12),
      isGuest: false,
      country,
      favoriteClub: String(favoriteClub || 'Chipolopolo').slice(0, 32),
      streak: initialHistory.length > 0 ? 1 : 0,
      bestStreak: initialHistory.length > 0 ? 1 : 0,
      totalPoints: 0,
      multiplayerPoints: 0,
      gamesPlayed: 0,
      wins: 0,
      achievements: ['Official Squad Member'],
      dailyCompletedDates: {},
      history: [],
      createdAt: new Date().toISOString(),
    };

    store.players[key] = player;
    saveStore();
    const { pin: _omit, ...safePlayer } = player;
    res.json({ player: safePlayer });
  });

  // Login existing username
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { username, pin } = req.body || {};
    const cleanName = String(username || '').trim().toLowerCase();
    const existing = store.players[cleanName];
    if (!existing) {
      res.status(404).json({ error: 'Account not found. Check spelling or register a new username.' });
      return;
    }
    if (existing.pin && pin && existing.pin !== String(pin)) {
      res.status(401).json({ error: 'Incorrect PIN for this account.' });
      return;
    }
    const { pin: _omit, ...safePlayer } = existing;
    res.json({ player: safePlayer });
  });

  // Fetch player profile
  app.get('/api/profile/:username', (req: Request, res: Response) => {
    const key = String(req.params.username || '').toLowerCase();
    const existing = store.players[key];
    if (!existing) {
      res.status(404).json({ error: 'Player profile not found.' });
      return;
    }
    const { pin: _omit, ...safePlayer } = existing;
    res.json({ player: safePlayer });
  });

  // Update player club or country
  app.patch('/api/profile/:username', (req: Request, res: Response) => {
    const key = String(req.params.username || '').toLowerCase();
    const existing = store.players[key];
    if (!existing) {
      res.status(404).json({ error: 'Player profile not found.' });
      return;
    }
    const { favoriteClub, country } = req.body || {};
    if (favoriteClub) existing.favoriteClub = String(favoriteClub).slice(0, 32);
    if (country) existing.country = country;
    saveStore();
    const { pin: _omit, ...safePlayer } = existing;
    res.json({ player: safePlayer });
  });

  // Daily Challenge metadata
  app.get('/api/daily', (req: Request, res: Response) => {
    const username = String(req.query.username || '').toLowerCase();
    const info = getLusakaTimeInfo();
    const games = getDailyGames(info.lusakaDate);
    const player = username ? store.players[username] : undefined;
    const completedGameIds = player?.dailyCompletedDates?.[info.lusakaDate] || [];
    const userDailyScore = (player?.history || [])
      .filter((h) => h.isDaily && h.lusakaDate === info.lusakaDate)
      .reduce((acc, cur) => acc + cur.score, 0);

    res.json({
      ...info,
      games,
      completedGameIds,
      userDailyScore,
    });
  });

  // Server-authoritative score submission & validation
  app.post('/api/scores/submit', (req: Request, res: Response) => {
    const {
      username,
      isGuest,
      gameId,
      rawScore,
      accuracy,
      attempts,
      isDaily,
      region = 'zambia',
      won = true,
      verificationPayload,
    } = req.body || {};
    const gId = gameId as GameId;
    const meta = GAME_TITLES[gId];
    if (!meta) {
      res.status(400).json({ error: 'Invalid game identifier.' });
      return;
    }

    let authoritativeScore = Math.round(Number(rawScore));
    if (gId === 'bola-letters' && verificationPayload && Array.isArray(verificationPayload.foundWords)) {
      const check = verifyBolaLettersSubmission({
        seed: Number(verificationPayload.seed) || 0,
        region: (verificationPayload.region as RegionId) || (region as RegionId) || 'zambia',
        juniorMode: Boolean(verificationPayload.juniorMode),
        foundWords: verificationPayload.foundWords,
      });
      authoritativeScore = check.score;
    } else if (gId === 'bola-letter-box' && verificationPayload && Array.isArray(verificationPayload.words)) {
      const check = verifyLetterBoxSubmission({
        seed: Number(verificationPayload.seed) || 0,
        juniorMode: Boolean(verificationPayload.juniorMode),
        expertMode: Boolean(verificationPayload.expertMode),
        isTimed: Boolean(verificationPayload.isTimed),
        timeLeftSec: Number(verificationPayload.timeLeftSec) || 0,
        hintsUsed: Number(verificationPayload.hintsUsed) || 0,
        words: verificationPayload.words,
      });
      if (!check.valid) {
        res.status(400).json({ error: check.reason || 'Letter Box chain rejected by server verifier.' });
        return;
      }
      authoritativeScore = check.score;
    }

    const maxAllowed = MAX_SCORE_BY_GAME[gId] || 1000;
    const numericScore = authoritativeScore;
    if (!Number.isFinite(numericScore) || numericScore < 0 || numericScore > maxAllowed) {
      res.status(400).json({ error: `Score rejected by server validation (allowed range 0–${maxAllowed}).` });
      return;
    }

    const lusakaDate = getLusakaDateString();
    const finalScore = isDaily ? Math.round(numericScore * 1.5) : numericScore;

    if (isGuest || !username) {
      res.json({
        accepted: true,
        officialRanked: false,
        validatedScore: finalScore,
        message: 'Guest score verified locally. Register a username to claim official leaderboard rank.',
      });
      return;
    }

    const key = String(username).toLowerCase();
    const player = store.players[key];
    if (!player) {
      res.status(404).json({ error: 'Registered account not found.' });
      return;
    }

    if (isDaily) {
      const doneToday = player.dailyCompletedDates[lusakaDate] || [];
      if (doneToday.includes(gId)) {
        res.status(409).json({
          error: 'Daily BOLA Challenge entry already recorded for this game today (Africa/Lusaka).',
          alreadySubmittedDaily: true,
        });
        return;
      }
      player.dailyCompletedDates[lusakaDate] = [...doneToday, gId];
      if (doneToday.length === 0) {
        player.streak += 1;
        if (player.streak > player.bestStreak) player.bestStreak = player.streak;
      }
    }

    if (meta.category === 'multiplayer') {
      player.multiplayerPoints += finalScore;
    } else {
      player.totalPoints += finalScore;
    }
    player.gamesPlayed += 1;
    if (won) player.wins += 1;

    // Achievements
    if (!player.achievements.includes('First Kickoff')) player.achievements.push('First Kickoff');
    if (player.streak >= 3 && !player.achievements.includes('3-Day Streak')) player.achievements.push('3-Day Streak');
    if (player.gamesPlayed >= 5 && !player.achievements.includes('Squad Regular')) player.achievements.push('Squad Regular');
    if (meta.category === 'multiplayer' && won && !player.achievements.includes('Arena Winner')) {
      player.achievements.push('Arena Winner');
    }

    const entry = {
      id: `scr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      gameId: gId,
      gameTitle: meta.title,
      category: meta.category,
      region: region as RegionId,
      score: finalScore,
      accuracy: typeof accuracy === 'number' ? Math.min(100, Math.max(0, Math.round(accuracy))) : undefined,
      attempts: typeof attempts === 'number' ? Math.max(1, Math.round(attempts)) : undefined,
      isDaily: Boolean(isDaily),
      lusakaDate,
      createdAt: new Date().toISOString(),
    };

    player.history = [entry, ...player.history].slice(0, 50);
    saveStore();

    const { pin: _omit, ...safePlayer } = player;
    res.json({
      accepted: true,
      officialRanked: true,
      validatedScore: finalScore,
      player: safePlayer,
    });
  });

  // Leaderboards (Real registered players only; supports period, category, region, and per-gameId filtering)
  app.get('/api/leaderboards', (req: Request, res: Response) => {
    const period = String(req.query.period || 'alltime');
    const category = String(req.query.category || 'puzzle');
    const region = String(req.query.region || 'all');
    const gameId = String(req.query.gameId || 'all');
    const currentUsername = String(req.query.username || '').toLowerCase();
    const today = getLusakaDateString();

    const nowMs = Date.now();
    const weekAgoMs = nowMs - 7 * 86400 * 1000;

    const allPlayers = Object.values(store.players).filter((p) => !p.isGuest);
    const filtered = region === 'all' ? allPlayers : allPlayers.filter((p) => p.country === region || p.country === 'all');

    const rows = filtered
      .map((p) => {
        const relevantHistory = p.history.filter((h) => {
          if (gameId !== 'all' && h.gameId !== gameId) return false;
          if (gameId === 'all') {
            if (category === 'multiplayer' && h.category !== 'multiplayer') return false;
            if (category === 'puzzle' && h.category !== 'football') return false;
            if (category === 'skill' && ['bola-ludo', 'road-to-glory', 'predict-score'].includes(h.gameId)) return false;
          }
          if (period === 'daily' && h.lusakaDate !== today) return false;
          if (period === 'weekly' && new Date(h.createdAt).getTime() < weekAgoMs) return false;
          return true;
        });

        const score =
          gameId === 'all' && period === 'alltime' && category !== 'skill'
            ? category === 'multiplayer'
              ? p.multiplayerPoints
              : p.totalPoints
            : relevantHistory.reduce((sum, h) => sum + h.score, 0);

        return {
          username: p.username,
          favoriteClub: p.favoriteClub,
          country: p.country,
          score,
          gamesPlayed: relevantHistory.length || (period === 'alltime' && gameId === 'all' ? p.gamesPlayed : 0),
          streak: p.streak,
          isCurrentUser: p.username.toLowerCase() === currentUsername,
        };
      })
      .filter((r) => r.score > 0 || r.isCurrentUser)
      .sort((a, b) => b.score - a.score)
      .slice(0, 25)
      .map((r, idx) => ({ rank: idx + 1, ...r }));

    res.json({ rows, lusakaDate: today, period, category, gameId });
  });

  // Multiplayer room creation
  app.post('/api/rooms', (req: Request, res: Response) => {
    const { gameId, hostName = 'Player 1', clubName = 'Chipolopolo', color = '#B6FF00', maxPlayers = 2, addBots = 1 } = req.body || {};
    if (!['bola-ludo', 'road-to-glory', 'four-goals'].includes(gameId)) {
      res.status(400).json({ error: 'Unsupported multiplayer game.' });
      return;
    }

    const code = generateRoomCode();
    const hostId = `p_${Date.now()}`;
    const botPalette = [
      { name: 'Nkana Bot', club: 'Nkana FC', color: '#EF4444' },
      { name: 'ZESCO Bot', club: 'ZESCO United', color: '#38BDF8' },
      { name: 'Buffaloes Bot', club: 'Green Buffaloes', color: '#F59E0B' },
    ];

    const players: RoomState['players'] = [
      { id: hostId, name: String(hostName), clubName: String(clubName), color, isBot: false, connected: true },
    ];

    const botCount = Math.min(Number(addBots) || 0, (Number(maxPlayers) || 2) - 1);
    for (let i = 0; i < botCount; i++) {
      const b = botPalette[i % botPalette.length];
      players.push({
        id: `bot_${i + 1}`,
        name: b.name,
        clubName: b.club,
        color: b.color,
        isBot: true,
        connected: true,
      });
    }

    const room: RoomState = {
      code,
      gameId,
      hostId,
      maxPlayers: Math.min(4, Math.max(2, Number(maxPlayers) || 2)),
      players,
      status: players.length >= 2 ? 'ACTIVE' : 'WAITING',
      turnIndex: 0,
      winnerId: null,
      lastActionLabel: `Room ${code} opened by ${hostName}`,
      updatedAt: new Date().toISOString(),
      payload: {},
    };

    rooms.set(code, room);
    res.json({ room, playerId: hostId });
  });

  app.get('/api/rooms/:code', (req: Request, res: Response) => {
    const code = String(req.params.code || '').toUpperCase();
    const room = rooms.get(code);
    if (!room) {
      res.status(404).json({ error: 'Room not found or expired.' });
      return;
    }
    res.json({ room });
  });

  app.post('/api/rooms/:code/join', (req: Request, res: Response) => {
    const code = String(req.params.code || '').toUpperCase();
    const room = rooms.get(code);
    if (!room) {
      res.status(404).json({ error: 'Room not found.' });
      return;
    }
    const { playerName = 'Challenger', clubName = 'Power Dynamos', color = '#38BDF8' } = req.body || {};
    if (room.players.length >= room.maxPlayers) {
      // Replace a bot if present, or reject
      const botIndex = room.players.findIndex((p) => p.isBot);
      if (botIndex === -1) {
        res.status(409).json({ error: 'Room is full.' });
        return;
      }
      const pId = `p_${Date.now()}`;
      room.players[botIndex] = { id: pId, name: String(playerName), clubName: String(clubName), color, isBot: false, connected: true };
      room.lastActionLabel = `${playerName} took over a seat in ${code}`;
      room.updatedAt = new Date().toISOString();
      broadcastRoom(code);
      res.json({ room, playerId: pId });
      return;
    }

    const pId = `p_${Date.now()}`;
    room.players.push({ id: pId, name: String(playerName), clubName: String(clubName), color, isBot: false, connected: true });
    if (room.players.length >= 2) room.status = 'ACTIVE';
    room.lastActionLabel = `${playerName} joined ${code}`;
    room.updatedAt = new Date().toISOString();
    broadcastRoom(code);
    res.json({ room, playerId: pId });
  });

  app.post('/api/rooms/:code/sync', (req: Request, res: Response) => {
    const code = String(req.params.code || '').toUpperCase();
    const room = rooms.get(code);
    if (!room) {
      res.status(404).json({ error: 'Room not found.' });
      return;
    }
    const { turnIndex, winnerId, lastActionLabel, payload, status } = req.body || {};
    if (typeof turnIndex === 'number') room.turnIndex = turnIndex;
    if (winnerId !== undefined) room.winnerId = winnerId;
    if (lastActionLabel) room.lastActionLabel = String(lastActionLabel);
    if (payload && typeof payload === 'object') room.payload = payload;
    if (status) room.status = status;
    room.updatedAt = new Date().toISOString();
    broadcastRoom(code);
    res.json({ room });
  });

  app.get('/api/rooms/:code/stream', (req: Request, res: Response) => {
    const code = String(req.params.code || '').toUpperCase();
    const room = rooms.get(code);
    if (!room) {
      res.status(404).end();
      return;
    }
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.write(`data: ${JSON.stringify(room)}\n\n`);
    if (!roomStreams.has(code)) roomStreams.set(code, new Set());
    roomStreams.get(code)!.add(res);
    req.on('close', () => {
      roomStreams.get(code)?.delete(res);
    });
  });

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`INDIWABOLA Games Hub listening on http://localhost:${PORT}`);
  });
}

startServer();
