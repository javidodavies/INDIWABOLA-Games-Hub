import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { GameId, LeaderboardRow, PlayerSession, RegionId, ScoreHistoryEntry } from '../types';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
void testConnection();

export function sanitizeUsername(raw: string, fallbackUid: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/^_+|_+$/g, '').slice(0, 24);
  if (cleaned.length >= 3) return cleaned;
  return `Player_${fallbackUid.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8) || 'ZM1'}`;
}

export function observeFirebaseAuth(cb: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, cb);
}

export async function signInWithGoogleFirebase(): Promise<FirebaseUser> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutFirebase(): Promise<void> {
  await signOut(auth);
}

export async function ensureFirebasePlayerProfile(
  fbUser: FirebaseUser,
  preferredClub = 'Chipolopolo',
  country: RegionId = 'zambia',
  juniorMode = false
): Promise<PlayerSession> {
  const playerPath = `players/${fbUser.uid}`;
  const privatePath = `players/${fbUser.uid}/private/info`;

  let existingSnap;
  try {
    existingSnap = await getDoc(doc(db, 'players', fbUser.uid));
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, playerPath);
  }

  const safeClub = String(preferredClub || 'Chipolopolo').slice(0, 40);
  const safeUsername = sanitizeUsername(
    fbUser.displayName || fbUser.email?.split('@')[0] || 'Player',
    fbUser.uid
  );

  if (!existingSnap.exists()) {
    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'players', fbUser.uid), {
        uid: fbUser.uid,
        username: safeUsername,
        favoriteClub: safeClub,
        country,
        juniorMode: Boolean(juniorMode),
        streak: 0,
        bestStreak: 0,
        totalPoints: 0,
        skillPoints: 0,
        multiplayerPoints: 0,
        gamesPlayed: 0,
        wins: 0,
        isPublic: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      if (fbUser.email) {
        batch.set(doc(db, 'players', fbUser.uid, 'private', 'info'), {
          uid: fbUser.uid,
          email: String(fbUser.email).slice(0, 160),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, playerPath);
    }

    return {
      id: fbUser.uid,
      username: safeUsername,
      isGuest: false,
      country,
      favoriteClub: safeClub,
      juniorMode,
      streak: 0,
      bestStreak: 0,
      totalPoints: 0,
      multiplayerPoints: 0,
      gamesPlayed: 0,
      wins: 0,
      achievements: ['Google Account Verified'],
      dailyCompletedDates: {},
      history: [],
      createdAt: new Date().toISOString(),
    };
  }

  const data = existingSnap.data();
  // Ensure private PII doc exists for existing user
  if (fbUser.email) {
    try {
      const privSnap = await getDoc(doc(db, 'players', fbUser.uid, 'private', 'info'));
      if (!privSnap.exists()) {
        await setDoc(doc(db, 'players', fbUser.uid, 'private', 'info'), {
          uid: fbUser.uid,
          email: String(fbUser.email).slice(0, 160),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, privatePath);
    }
  }

  let recentHistory: ScoreHistoryEntry[] = [];
  const scoresPath = `players/${fbUser.uid}/scores`;
  try {
    const scoreDocs = await getDocs(
      query(
        collection(db, 'players', fbUser.uid, 'scores'),
        where('uid', '==', fbUser.uid),
        orderBy('createdAt', 'desc'),
        limit(20)
      )
    );
    recentHistory = scoreDocs.docs.map((d) => {
      const s = d.data();
      return {
        id: d.id,
        gameId: s.gameId as GameId,
        gameTitle: String(s.gameId),
        category: s.category,
        region: s.region,
        score: Number(s.score) || 0,
        accuracy: typeof s.accuracy === 'number' ? s.accuracy : undefined,
        attempts: typeof s.attempts === 'number' ? s.attempts : undefined,
        isDaily: Boolean(s.isDaily),
        lusakaDate: String(s.lusakaDate || ''),
        createdAt: s.createdAt?.toDate ? s.createdAt.toDate().toISOString() : new Date().toISOString(),
      };
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, scoresPath);
  }

  return {
    id: fbUser.uid,
    username: String(data.username || safeUsername),
    isGuest: false,
    country: (data.country as RegionId) || 'zambia',
    favoriteClub: String(data.favoriteClub || 'Chipolopolo'),
    juniorMode: Boolean(data.juniorMode),
    streak: Number(data.streak) || 0,
    bestStreak: Number(data.bestStreak) || 0,
    totalPoints: Number(data.totalPoints) || 0,
    multiplayerPoints: Number(data.multiplayerPoints) || 0,
    gamesPlayed: Number(data.gamesPlayed) || 0,
    wins: Number(data.wins) || 0,
    achievements: ['Google Account Verified'],
    dailyCompletedDates: {},
    history: recentHistory,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
  };
}

export async function updateFirebasePlayerClub(
  uid: string,
  favoriteClub: string,
  country: RegionId,
  juniorMode: boolean
): Promise<void> {
  const path = `players/${uid}`;
  try {
    await updateDoc(doc(db, 'players', uid), {
      favoriteClub: String(favoriteClub || 'Chipolopolo').slice(0, 40),
      country,
      juniorMode: Boolean(juniorMode),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function recordScoreInFirestore(params: {
  fbUser: FirebaseUser;
  player: PlayerSession;
  gameId: GameId;
  category: 'football' | 'multiplayer';
  skillClass: 'skill' | 'mixed';
  region: RegionId;
  score: number;
  accuracy?: number;
  attempts?: number;
  isDaily: boolean;
  won: boolean;
  lusakaDate: string;
}): Promise<void> {
  const { fbUser, player, gameId, category, skillClass, region, score, accuracy, attempts, isDaily, won, lusakaDate } =
    params;
  const clampedScore = Math.max(0, Math.min(2250, Math.round(score)));
  const scoreId = `scr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const scoresPath = `players/${fbUser.uid}/scores/${scoreId}`;

  const safeUsername = sanitizeUsername(player.username, fbUser.uid);
  const safeClub = String(player.favoriteClub || 'Chipolopolo').slice(0, 40);

  const scorePayload: Record<string, unknown> = {
    uid: fbUser.uid,
    username: safeUsername,
    favoriteClub: safeClub,
    gameId,
    category,
    skillClass,
    region,
    score: clampedScore,
    isDaily: Boolean(isDaily),
    lusakaDate,
    createdAt: serverTimestamp(),
  };
  if (typeof accuracy === 'number') {
    scorePayload.accuracy = Math.max(0, Math.min(100, Math.round(accuracy)));
  }
  if (typeof attempts === 'number') {
    scorePayload.attempts = Math.max(1, Math.min(500, Math.round(attempts)));
  }

  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'players', fbUser.uid, 'scores', scoreId), scorePayload);

    const nextTotal =
      category === 'multiplayer' ? player.totalPoints : player.totalPoints + clampedScore;
    const nextMulti =
      category === 'multiplayer' ? player.multiplayerPoints + clampedScore : player.multiplayerPoints;
    const nextSkill =
      skillClass === 'skill' && category === 'football'
        ? (player.totalPoints || 0) + clampedScore
        : player.totalPoints || 0;
    const nextStreak = isDaily ? player.streak + 1 : player.streak;
    const nextBest = Math.max(player.bestStreak, nextStreak);

    batch.update(doc(db, 'players', fbUser.uid), {
      streak: nextStreak,
      bestStreak: nextBest,
      totalPoints: nextTotal,
      skillPoints: nextSkill,
      multiplayerPoints: nextMulti,
      gamesPlayed: player.gamesPlayed + 1,
      wins: player.wins + (won ? 1 : 0),
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, scoresPath);
  }
}

export async function fetchPublicLeaderboardFromFirestore(
  category: 'skill' | 'puzzle' | 'multiplayer',
  currentUsername?: string
): Promise<LeaderboardRow[]> {
  const path = 'players';
  try {
    const orderField =
      category === 'multiplayer'
        ? 'multiplayerPoints'
        : category === 'skill'
        ? 'skillPoints'
        : 'totalPoints';
    const snap = await getDocs(
      query(collection(db, 'players'), where('isPublic', '==', true), orderBy(orderField, 'desc'), limit(25))
    );
    const rows: LeaderboardRow[] = [];
    snap.docs.forEach((d) => {
      const data = d.data();
      const pts = Number(data[orderField]) || 0;
      if (pts <= 0) return;
      rows.push({
        rank: rows.length + 1,
        username: String(data.username || 'Player'),
        favoriteClub: String(data.favoriteClub || 'Chipolopolo'),
        country: (data.country as RegionId) || 'zambia',
        score: pts,
        gamesPlayed: Number(data.gamesPlayed) || 0,
        streak: Number(data.streak) || 0,
        isCurrentUser: Boolean(
          currentUsername && String(data.username).toLowerCase() === currentUsername.toLowerCase()
        ),
      });
    });
    return rows;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}
