import React, { useEffect, useMemo, useState } from 'react';
import { Check, Copy, X } from 'lucide-react';
import { DRAFT_POOL, DraftPlayer } from '../data/footballData';
import { calculateDraftChemistry } from '../utils/gameRules';
import { soundEngine } from '../utils/sound';
import { GameComponentProps } from './common';

type FormationId = '1-2-1-1' | '1-1-2-1' | '1-2-2';

interface PitchSlot {
  key: string;
  label: string;
  pos: DraftPlayer['pos'];
  xPct: number;
  yPct: number;
}

const FORMATIONS: Record<FormationId, { label: string; slots: PitchSlot[] }> = {
  '1-2-1-1': {
    label: '1-2-1-1 Diamond',
    slots: [
      { key: 'GK', label: 'GK', pos: 'GK', xPct: 50, yPct: 86 },
      { key: 'DEF', label: 'DEF', pos: 'DEF', xPct: 50, yPct: 64 },
      { key: 'MID1', label: 'LCM', pos: 'MID', xPct: 26, yPct: 44 },
      { key: 'MID2', label: 'RCM', pos: 'MID', xPct: 74, yPct: 44 },
      { key: 'FWD', label: 'ST', pos: 'FWD', xPct: 50, yPct: 18 },
    ],
  },
  '1-1-2-1': {
    label: '1-1-2-1 Control',
    slots: [
      { key: 'GK', label: 'GK', pos: 'GK', xPct: 50, yPct: 86 },
      { key: 'DEF', label: 'CB', pos: 'DEF', xPct: 30, yPct: 66 },
      { key: 'MID1', label: 'WB', pos: 'DEF', xPct: 70, yPct: 62 },
      { key: 'MID2', label: 'CAM', pos: 'MID', xPct: 50, yPct: 38 },
      { key: 'FWD', label: 'ST', pos: 'FWD', xPct: 50, yPct: 16 },
    ],
  },
  '1-2-2': {
    label: '1-2-2 Twin Strikers',
    slots: [
      { key: 'GK', label: 'GK', pos: 'GK', xPct: 50, yPct: 86 },
      { key: 'DEF', label: 'CB', pos: 'DEF', xPct: 50, yPct: 65 },
      { key: 'MID1', label: 'CM', pos: 'MID', xPct: 50, yPct: 44 },
      { key: 'MID2', label: 'LF', pos: 'FWD', xPct: 30, yPct: 20 },
      { key: 'FWD', label: 'RF', pos: 'FWD', xPct: 70, yPct: 20 },
    ],
  },
};

const BUDGET_CAP = 45;
const TARGET_SCORE = 445;

export const BolaDraftGame: React.FC<GameComponentProps> = ({
  onScoreChange,
  onFinish,
}) => {
  const [formation, setFormation] = useState<FormationId>('1-2-1-1');
  const slots = FORMATIONS[formation].slots;

  const [lineup, setLineup] = useState<Record<string, DraftPlayer | null>>({
    GK: null,
    DEF: null,
    MID1: null,
    MID2: null,
    FWD: null,
  });
  const [activeSlot, setActiveSlot] = useState<string>('GK');
  const [copiedCard, setCopiedCard] = useState(false);
  const [finished, setFinished] = useState(false);

  const selectedPlayers = useMemo(
    () => Object.values(lineup).filter((p): p is DraftPlayer => p !== null),
    [lineup]
  );

  const spent = selectedPlayers.reduce((sum, p) => sum + p.cost, 0);
  const remaining = BUDGET_CAP - spent;

  const chemStats = useMemo(
    () => calculateDraftChemistry(selectedPlayers),
    [selectedPlayers]
  );

  useEffect(() => {
    onScoreChange(chemStats.total, `${formation} · ${remaining}M left`);
  }, [chemStats.total, formation, remaining, onScoreChange]);

  const activePos = slots.find((s) => s.key === activeSlot)?.pos || 'GK';
  const pickedIds = new Set(selectedPlayers.map((p) => p.id));

  const switchFormation = (nextF: FormationId) => {
    if (finished) return;
    soundEngine.playClick();
    setFormation(nextF);
    // Clear slots whose position changed so formation requirements stay authentic
    setLineup((prev) => {
      const next = { ...prev };
      FORMATIONS[nextF].slots.forEach((slot) => {
        if (next[slot.key] && next[slot.key]!.pos !== slot.pos) {
          next[slot.key] = null;
        }
      });
      return next;
    });
  };

  const pickPlayer = (player: DraftPlayer) => {
    if (finished) return;
    const prevCost = lineup[activeSlot]?.cost || 0;
    if (spent - prevCost + player.cost > BUDGET_CAP) {
      soundEngine.playWrong();
      return;
    }
    soundEngine.playCorrect();
    const next = { ...lineup, [activeSlot]: player };
    setLineup(next);

    const nextEmpty = slots.find((s) => !next[s.key]);
    if (nextEmpty) setActiveSlot(nextEmpty.key);
  };

  const copyFormationText = async () => {
    const lines = [
      `INDIWABOLA Draft XI (${FORMATIONS[formation].label})`,
      ...slots.map((s) => `${s.label}: ${lineup[s.key]?.name || '—'} (${lineup[s.key]?.club || '-'})`),
      `Rating: ${chemStats.total} (+${chemStats.chemistry} Chem) · Budget: ${spent}/${BUDGET_CAP}M`,
    ].join('\n');
    try {
      await navigator.clipboard.writeText(lines);
      setCopiedCard(true);
      soundEngine.playCorrect();
      window.setTimeout(() => setCopiedCard(false), 2000);
    } catch {
      // ignore
    }
  };

  const submitSquad = () => {
    if (selectedPlayers.length < 5 || finished) return;
    setFinished(true);
    const won = chemStats.total >= TARGET_SCORE;
    if (won) soundEngine.playVictory();
    else soundEngine.playWrong();

    onFinish({
      won,
      score: Math.min(950, chemStats.total * 2),
      accuracy: Math.min(100, Math.round((chemStats.total / 480) * 100)),
      attempts: 1,
      summaryLine: `Drafted ${FORMATIONS[formation].label} rated ${chemStats.total} (${chemStats.baseRating} OVR + ${chemStats.chemistry} Chem) in ${spent}M/${BUDGET_CAP}M.`,
      shareGrid: `BOLA Draft (${formation}): ${chemStats.total}\nBudget: ${spent}/${BUDGET_CAP}M\n${won ? '🟩🟩🟩🟩🟩' : '🟨🟨🟨🟨⬛'}`,
    });
  };

  return (
    <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      {/* Interactive SVG Pitch */}
      <div className="lg:col-span-6 bg-[#1C1C1C] border border-white/10 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-2xl font-bold">Tactical Pitch Draft</h2>
            <p className="text-xs text-white/55">Target: {TARGET_SCORE}+ · Club & Nation Links</p>
          </div>
          <div className="flex items-center gap-1 bg-[#0A0A0A] p-1 rounded-lg border border-white/10">
            {(Object.keys(FORMATIONS) as FormationId[]).map((fid) => (
              <button
                key={fid}
                type="button"
                onClick={() => switchFormation(fid)}
                className={`px-2.5 py-1 rounded text-xs font-bold min-h-[32px] ${
                  formation === fid ? 'bg-[#B6FF00] text-[#0A0A0A]' : 'text-white/65 hover:text-white'
                }`}
              >
                {fid}
              </button>
            ))}
          </div>
        </div>

        {/* SVG Football Field with interactive slot nodes */}
        <div className="relative w-full aspect-[4/5] rounded-xl overflow-hidden border border-white/15 bg-[#0E2212]">
          <svg viewBox="0 0 400 500" className="w-full h-full" aria-hidden="true">
            <rect width="400" height="500" fill="#0F2614" />
            <rect x="0" y="0" width="400" height="62" fill="#132F19" />
            <rect x="0" y="125" width="400" height="62" fill="#132F19" />
            <rect x="0" y="250" width="400" height="62" fill="#132F19" />
            <rect x="0" y="375" width="400" height="62" fill="#132F19" />
            <rect x="20" y="20" width="360" height="460" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="2" />
            <line x1="20" y1="250" x2="380" y2="250" stroke="rgba(255,255,255,0.28)" strokeWidth="2" />
            <circle cx="200" cy="250" r="48" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="2" />
            <rect x="115" y="20" width="170" height="72" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="2" />
            <rect x="115" y="408" width="170" height="72" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="2" />
          </svg>

          {slots.map((slot) => {
            const picked = lineup[slot.key];
            const isActive = activeSlot === slot.key;
            return (
              <div
                key={slot.key}
                style={{ left: `${slot.xPct}%`, top: `${slot.yPct}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1"
              >
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setActiveSlot(slot.key);
                  }}
                  className={`w-14 h-14 rounded-full border-2 flex flex-col items-center justify-center transition-transform shadow-lg ${
                    isActive
                      ? 'bg-[#B6FF00] border-white text-[#0A0A0A] scale-105'
                      : picked
                      ? 'bg-[#0A0A0A] border-[#B6FF00] text-white'
                      : 'bg-[#0A0A0A]/85 border-white/40 text-white/70 hover:border-white'
                  }`}
                >
                  <span className="font-mono-tabular text-[10px] font-bold">
                    {picked ? `OVR ${picked.rating}` : slot.label}
                  </span>
                  {picked && (
                    <span className="font-mono-tabular text-[10px] opacity-80">{picked.cost}M</span>
                  )}
                </button>
                <div className="px-2 py-0.5 rounded bg-black/85 border border-white/15 text-[11px] font-bold text-white whitespace-nowrap flex items-center gap-1">
                  <span>{picked ? picked.name.split(' ').pop() : `Pick ${slot.pos}`}</span>
                  {picked && (
                    <button
                      type="button"
                      aria-label={`Remove ${picked.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        soundEngine.playClick();
                        setLineup((prev) => ({ ...prev, [slot.key]: null }));
                      }}
                      className="text-white/50 hover:text-red-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Budget & Chemistry Summary */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1">
          <span className="text-white/70">
            Budget Left: <strong className="font-mono-tabular text-[#B6FF00]">{remaining}M</strong> / {BUDGET_CAP}M
          </span>
          <span className="font-mono-tabular font-bold text-white">
            Total: <span className="text-[#B6FF00]">{chemStats.total}</span> (+{chemStats.chemistry} Chem)
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={selectedPlayers.length < 5 || finished}
            onClick={submitSquad}
            className="flex-1 min-h-[46px] rounded-lg bg-[#B6FF00] disabled:bg-white/15 disabled:text-white/40 text-[#0A0A0A] font-bold text-sm inline-flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>Lock XI ({selectedPlayers.length}/5)</span>
          </button>
          <button
            type="button"
            onClick={copyFormationText}
            className="px-4 min-h-[46px] rounded-lg bg-[#0A0A0A] border border-white/15 hover:border-white/40 text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <Copy className="w-3.5 h-3.5 text-[#B6FF00]" />
            <span>{copiedCard ? 'Copied XI!' : 'Share Formation'}</span>
          </button>
        </div>
      </div>

      {/* Player Selection Pool */}
      <div className="lg:col-span-6 bg-[#1C1C1C] border border-white/10 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-2xl font-bold">
            Select {activePos} ({slots.find((s) => s.key === activeSlot)?.label})
          </h3>
          <span className="text-xs text-white/55">Same club +16 · Nation +6</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {DRAFT_POOL.filter((p) => p.pos === activePos).map((player) => {
            const alreadyPicked = pickedIds.has(player.id);
            const prevCost = lineup[activeSlot]?.cost || 0;
            const unaffordable = spent - prevCost + player.cost > BUDGET_CAP;

            return (
              <button
                key={player.id}
                type="button"
                disabled={alreadyPicked || unaffordable || finished}
                onClick={() => pickPlayer(player)}
                className="p-3.5 rounded-lg bg-[#0A0A0A] border border-white/15 hover:border-[#B6FF00] disabled:opacity-35 text-left transition-colors min-h-[72px]"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-white">{player.name}</span>
                  <span className="font-mono-tabular text-xs font-bold text-[#B6FF00]">
                    {player.cost}M
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-white/55 mt-1">
                  <span>{player.club}</span>
                  <span className="font-mono-tabular">OVR {player.rating}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
