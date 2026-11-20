import React, { useState } from 'react';
import { X } from 'lucide-react';
import { ZAMBIAN_CLUBS } from '../data/gameCatalog';
import {
  ensureFirebasePlayerProfile,
  signInWithGoogleFirebase,
} from '../firebase/firebaseClient';
import { PlayerSession, RegionId } from '../types';
import { soundEngine } from '../utils/sound';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  currentRegion: RegionId;
  juniorMode?: boolean;
  onAuthenticated: (player: PlayerSession) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  open,
  onClose,
  currentRegion,
  juniorMode = false,
  onAuthenticated,
}) => {
  const [tab, setTab] = useState<'register' | 'login'>('register');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [favoriteClub, setFavoriteClub] = useState(ZAMBIAN_CLUBS[0]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const fbUser = await signInWithGoogleFirebase();
      const profile = await ensureFirebasePlayerProfile(
        fbUser,
        favoriteClub,
        currentRegion,
        juniorMode
      );
      soundEngine.playVictory();
      onAuthenticated(profile);
      onClose();
    } catch (err) {
      soundEngine.playWrong();
      setError(err instanceof Error ? err.message : 'Google sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const endpoint = tab === 'register' ? '/api/auth/register' : '/api/auth/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          pin: pin || '1234',
          favoriteClub,
          country: currentRegion,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed.');
      }
      soundEngine.playVictory();
      onAuthenticated(data.player);
      onClose();
    } catch (err) {
      soundEngine.playWrong();
      setError(err instanceof Error ? err.message : 'Unable to complete request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#1C1C1C] border border-white/15 rounded-xl p-6 space-y-5 animate-tile-pop">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-3xl font-extrabold text-white">
              {tab === 'register' ? 'Claim Your Username' : 'Player Sign In'}
            </h2>
            <p className="text-xs text-white/60 mt-0.5">
              Sign in with Google for cloud Firestore sync or claim a local INDIWABOLA username.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Firebase Google Login */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full min-h-[46px] rounded-lg bg-white hover:bg-[#F2F2F2] disabled:opacity-50 text-[#0A0A0A] font-bold text-sm inline-flex items-center justify-center gap-2.5 transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
            />
          </svg>
          <span>Continue with Google (Cloud Sync)</span>
        </button>

        <div className="flex items-center gap-3 text-[11px] text-white/40 uppercase tracking-wider">
          <span className="h-px flex-1 bg-white/10" />
          <span>or username & PIN</span>
          <span className="h-px flex-1 bg-white/10" />
        </div>

        <div className="grid grid-cols-2 gap-1 bg-[#0A0A0A] p-1 rounded-lg border border-white/10">
          <button
            type="button"
            onClick={() => {
              setTab('register');
              setError('');
            }}
            className={`py-2 rounded-md text-xs font-bold transition-colors ${
              tab === 'register' ? 'bg-[#B6FF00] text-[#0A0A0A]' : 'text-white/65 hover:text-white'
            }`}
          >
            Register New
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('login');
              setError('');
            }}
            className={`py-2 rounded-md text-xs font-bold transition-colors ${
              tab === 'login' ? 'bg-[#B6FF00] text-[#0A0A0A]' : 'text-white/65 hover:text-white'
            }`}
          >
            Existing Account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="auth-username" className="block text-xs font-medium text-white/75">
              Unique Username (3–20 characters)
            </label>
            <input
              id="auth-username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. CopperbeltKing"
              className="w-full min-h-[44px] px-3.5 rounded-lg bg-[#0A0A0A] border border-white/20 text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-[#B6FF00]"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="auth-pin" className="block text-xs font-medium text-white/75">
              4-Digit PIN (optional for quick sign-in)
            </label>
            <input
              id="auth-pin"
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="1234"
              className="w-full min-h-[44px] px-3.5 rounded-lg bg-[#0A0A0A] border border-white/20 text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-[#B6FF00]"
            />
          </div>

          {tab === 'register' && (
            <div className="space-y-1.5">
              <label htmlFor="auth-club" className="block text-xs font-medium text-white/75">
                Club Allegiance
              </label>
              <select
                id="auth-club"
                value={favoriteClub}
                onChange={(e) => setFavoriteClub(e.target.value)}
                className="w-full min-h-[44px] px-3.5 rounded-lg bg-[#0A0A0A] border border-white/20 text-sm text-white focus:outline-none focus:border-[#B6FF00]"
              >
                {ZAMBIAN_CLUBS.map((club) => (
                  <option key={club} value={club}>
                    {club}
                  </option>
                ))}
              </select>
            </div>
          )}

          {error && (
            <div className="text-xs text-red-400" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[46px] rounded-lg bg-[#B6FF00] hover:bg-[#c8ff3d] disabled:opacity-50 text-[#0A0A0A] font-bold text-sm"
          >
            {loading ? 'Submitting...' : tab === 'register' ? 'Create Account' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};
