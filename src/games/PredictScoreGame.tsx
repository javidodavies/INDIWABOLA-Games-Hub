import React, { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Lock, Minus, Plus } from 'lucide-react';
import { filterByRegion, MATCH_PREDICTION_SLIPS } from '../data/footballData';
import { soundEngine } from '../utils/sound';
import { GameComponentProps } from './common';

interface Prediction {
  home: number;
  away: number;
}

interface ResolvedMatch {
  fixtureId: string;
  actualHome: number;
  actualAway: number;
  points: number;
  outcomeLabel: 'Exact Score' | 'Goal Difference' | 'Result Only' | 'Missed';
}

export const PredictScoreGame: React.FC<GameComponentProps> = ({
  region,
  seedOffset,
  onScoreChange,
  onFinish,
}) => {
  const [leagueFilter, setLeagueFilter] = useState<string>('all');

  const baseFixtures = useMemo(() => {
    const pool = filterByRegion(MATCH_PREDICTION_SLIPS, region);
    return pool.length >= 5 ? pool : [...pool, ...MATCH_PREDICTION_SLIPS.filter((f) => !pool.includes(f))];
  }, [region]);

  const leagues = useMemo(() => {
    const set = new Set(baseFixtures.map((f) => f.competition));
    return ['all', ...Array.from(set)];
  }, [baseFixtures]);

  const fixtures = useMemo(() => {
    const filtered = leagueFilter === 'all' ? baseFixtures : baseFixtures.filter((f) => f.competition === leagueFilter);
    return filtered.slice(0, 5);
  }, [baseFixtures, leagueFilter]);

  const [picks, setPicks] = useState<Record<string, Prediction>>(() => {
    const initial: Record<string, Prediction> = {};
    MATCH_PREDICTION_SLIPS.forEach((f) => {
      initial[f.id] = { home: 1, away: 1 };
    });
    return initial;
  });

  const [resolved, setResolved] = useState<ResolvedMatch[] | null>(null);
  const [copiedSlip, setCopiedSlip] = useState(false);

  useEffect(() => {
    onScoreChange(0, resolved ? 'Full Time Slip' : `${fixtures.length} Fixtures Open`);
  }, [resolved, fixtures.length, onScoreChange]);

  const adjustGoal = (id: string, side: 'home' | 'away', delta: number) => {
    if (resolved) return;
    soundEngine.playClick();
    setPicks((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [side]: Math.min(7, Math.max(0, (prev[id]?.[side] ?? 1) + delta)),
      },
    }));
  };

  const copyFriendSlip = async () => {
    const slipText = [
      'INDIWABOLA Free Predict the Score Slip',
      ...fixtures.map((f) => `${f.homeTeam} ${picks[f.id]?.home ?? 1}-${picks[f.id]?.away ?? 1} ${f.awayTeam}`),
      'indiwabola.com/games/football',
    ].join('\n');
    try {
      await navigator.clipboard.writeText(slipText);
      setCopiedSlip(true);
      setTimeout(() => setCopiedSlip(false), 2000);
    } catch {
      setCopiedSlip(false);
    }
  };

  const lockPredictions = () => {
    soundEngine.playWhistle();
    const outcomes: ResolvedMatch[] = fixtures.map((f, idx) => {
      const seed = (seedOffset + idx * 17 + Date.now()) % 100;
      const homeBias = (f.homeStrength - f.awayStrength) / 25;
      const actualHome = Math.max(0, Math.min(4, Math.round(((seed % 5) * 0.65) + Math.max(0, homeBias))));
      const actualAway = Math.max(0, Math.min(4, Math.round((((seed + 3) % 5) * 0.6) + Math.max(0, -homeBias))));

      const pred = picks[f.id] || { home: 1, away: 1 };
      const predDiff = pred.home - pred.away;
      const actDiff = actualHome - actualAway;
      const predSign = Math.sign(predDiff);
      const actSign = Math.sign(actDiff);

      let points = 0;
      let outcomeLabel: ResolvedMatch['outcomeLabel'] = 'Missed';
      if (pred.home === actualHome && pred.away === actualAway) {
        points = 100;
        outcomeLabel = 'Exact Score';
      } else if (predDiff === actDiff) {
        points = 60;
        outcomeLabel = 'Goal Difference';
      } else if (predSign === actSign) {
        points = 35;
        outcomeLabel = 'Result Only';
      }
      return { fixtureId: f.id, actualHome, actualAway, points, outcomeLabel };
    });

    setResolved(outcomes);
    const total = outcomes.reduce((s, r) => s + r.points, 0);
    const hits = outcomes.filter((r) => r.points > 0).length;
    onScoreChange(total, 'Full Time');

    window.setTimeout(() => {
      if (total >= 150) soundEngine.playVictory();
      const share = outcomes
        .map((r) => (r.points === 100 ? '🟩' : r.points >= 35 ? '🟨' : '⬛'))
        .join('');
      onFinish({
        won: hits >= 2,
        score: total,
        accuracy: Math.round((hits / outcomes.length) * 100),
        attempts: fixtures.length,
        summaryLine: `Called ${hits}/${fixtures.length} match outcomes for ${total} free Matchday Points.`,
        shareGrid: `Matchday Slip: ${total} pts\n${share}`,
      });
    }, 1600);
  };

  return (
    <div className="w-full max-w-2xl space-y-4">
      <div className="bg-[#1C1C1C] border border-white/10 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 bg-[#0A0A0A] p-1 rounded-lg border border-white/10">
          {leagues.map((lg) => (
            <button
              key={lg}
              type="button"
              disabled={Boolean(resolved)}
              onClick={() => setLeagueFilter(lg)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                leagueFilter === lg ? 'bg-[#B6FF00] text-[#0A0A0A]' : 'text-white/65'
              }`}
            >
              {lg === 'all' ? 'All Leagues' : lg}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={copyFriendSlip}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/15 text-xs font-semibold text-white"
        >
          {copiedSlip ? <Check className="w-3.5 h-3.5 text-[#B6FF00]" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copiedSlip ? 'Slip Copied' : 'Compare w/ Friends'}</span>
        </button>
      </div>

      <div className="bg-[#1C1C1C] border border-white/10 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div>
            <h2 className="font-display text-2xl font-bold">Free Matchday Score Slip</h2>
            <p className="text-xs text-white/55">100% Free Points Only · Simulated Matchday Resolution (Live feed integration pending)</p>
          </div>
          <span className="font-mono-tabular text-xs font-semibold text-[#B6FF00]">
            {fixtures.length} FIXTURES
          </span>
        </div>

        <div className="divide-y divide-white/10">
          {fixtures.map((f) => {
            const p = picks[f.id] || { home: 1, away: 1 };
            const res = resolved?.find((r) => r.fixtureId === f.id);

            return (
              <div key={f.id} className="py-4 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-white/55">
                  <span>{f.competition} · {f.kickoffLabel}</span>
                  <span className="font-mono-tabular text-[#B6FF00]">Locks in {f.deadlineMinutes}m</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-7 items-center gap-3">
                  <div className="sm:col-span-2 text-sm font-semibold text-white sm:text-right truncate">
                    {f.homeTeam}
                  </div>

                  <div className="sm:col-span-3 flex items-center justify-center gap-2">
                    <div className="flex items-center bg-[#0A0A0A] border border-white/15 rounded-lg overflow-hidden">
                      <button
                        type="button"
                        disabled={Boolean(resolved)}
                        onClick={() => adjustGoal(f.id, 'home', -1)}
                        aria-label={`Decrease ${f.homeTeam} score`}
                        className="w-10 h-11 flex items-center justify-center hover:bg-white/10 disabled:opacity-40"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center font-mono-tabular text-lg font-bold text-[#B6FF00]">
                        {p.home}
                      </span>
                      <button
                        type="button"
                        disabled={Boolean(resolved)}
                        onClick={() => adjustGoal(f.id, 'home', 1)}
                        aria-label={`Increase ${f.homeTeam} score`}
                        className="w-10 h-11 flex items-center justify-center hover:bg-white/10 disabled:opacity-40"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <span className="font-mono-tabular text-xs text-white/40">VS</span>

                    <div className="flex items-center bg-[#0A0A0A] border border-white/15 rounded-lg overflow-hidden">
                      <button
                        type="button"
                        disabled={Boolean(resolved)}
                        onClick={() => adjustGoal(f.id, 'away', -1)}
                        aria-label={`Decrease ${f.awayTeam} score`}
                        className="w-10 h-11 flex items-center justify-center hover:bg-white/10 disabled:opacity-40"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center font-mono-tabular text-lg font-bold text-[#B6FF00]">
                        {p.away}
                      </span>
                      <button
                        type="button"
                        disabled={Boolean(resolved)}
                        onClick={() => adjustGoal(f.id, 'away', 1)}
                        aria-label={`Increase ${f.awayTeam} score`}
                        className="w-10 h-11 flex items-center justify-center hover:bg-white/10 disabled:opacity-40"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="sm:col-span-2 text-sm font-semibold text-white truncate">
                    {f.awayTeam}
                  </div>
                </div>

                {res && (
                  <div className="flex items-center justify-between text-xs bg-[#0A0A0A] px-3 py-2 rounded-lg">
                    <span className="text-white/75">
                      Full Time: <strong className="font-mono-tabular text-white">{res.actualHome} – {res.actualAway}</strong>
                    </span>
                    <span className={`font-mono-tabular font-bold ${res.points > 0 ? 'text-[#B6FF00]' : 'text-white/45'}`}>
                      {res.outcomeLabel} (+{res.points})
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {!resolved ? (
          <button
            type="button"
            onClick={lockPredictions}
            className="w-full min-h-[48px] rounded-lg bg-[#B6FF00] hover:bg-[#c8ff3d] text-[#0A0A0A] font-bold text-sm inline-flex items-center justify-center gap-2"
          >
            <Lock className="w-4 h-4" />
            <span>Lock Predictions & Resolve Matchday</span>
          </button>
        ) : (
          <div className="text-center text-xs text-[#B6FF00] inline-flex items-center justify-center gap-1.5 w-full py-2">
            <Check className="w-4 h-4" />
            <span>Matchday settled — preparing leaderboard tally...</span>
          </div>
        )}
      </div>
    </div>
  );
};
