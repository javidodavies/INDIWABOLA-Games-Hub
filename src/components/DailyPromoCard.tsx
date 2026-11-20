import React, { useState } from 'react';
import { Check, Copy, Download } from 'lucide-react';
import { DailyChallengeInfo } from '../types';

interface DailyPromoCardProps {
  daily: DailyChallengeInfo;
}

export const DailyPromoCard: React.FC<DailyPromoCardProps> = ({ daily }) => {
  const [copiedCaption, setCopiedCaption] = useState(false);

  const downloadPng = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Pitch Black background
    ctx.fillStyle = '#0A0A0A';
    ctx.fillRect(0, 0, 1080, 1080);

    // Subtle pitch grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 2;
    ctx.strokeRect(56, 56, 968, 968);
    ctx.beginPath();
    ctx.arc(540, 540, 180, 0, Math.PI * 2);
    ctx.stroke();

    // Header
    ctx.fillStyle = '#B6FF00';
    ctx.font = 'bold 34px sans-serif';
    ctx.fillText('INDIWABOLA DAILY BOLA CHALLENGE', 96, 130);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 84px sans-serif';
    ctx.fillText('PLAY. COMPETE. CONQUER.', 96, 230);

    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.font = '28px monospace';
    ctx.fillText(`LUSAKA EDITION · ${daily.lusakaDate} · 07:00 CAT`, 96, 286);

    // 3 Puzzle Blocks
    daily.games.forEach((g, idx) => {
      const y = 360 + idx * 175;
      ctx.fillStyle = '#1C1C1C';
      ctx.fillRect(96, y, 888, 145);
      ctx.strokeStyle = 'rgba(182,255,0,0.4)';
      ctx.strokeRect(96, y, 888, 145);

      ctx.fillStyle = '#B6FF00';
      ctx.font = 'bold 28px monospace';
      ctx.fillText(`0${idx + 1}`, 132, y + 65);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 42px sans-serif';
      ctx.fillText(g.title, 200, y + 68);

      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.font = '26px sans-serif';
      ctx.fillText(`${g.subtitle} · 1.5x Daily Multiplier`, 200, y + 112);
    });

    ctx.fillStyle = '#B6FF00';
    ctx.font = 'bold 32px sans-serif';
    ctx.fillText('indiwabola.com/games/daily', 96, 970);

    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `indiwabola-daily-${daily.lusakaDate}.png`;
    a.click();
  };

  const copySocialDispatch = async () => {
    const caption = [
      `Daily BOLA Challenge (${daily.lusakaDate}) is live on INDIWABOLA!`,
      ...daily.games.map((g, i) => `${i + 1}. ${g.title} (${g.subtitle})`),
      `New puzzles drop midnight CAT · indiwabola.com/games/daily`,
    ].join('\n');
    try {
      await navigator.clipboard.writeText(caption);
      setCopiedCaption(true);
      setTimeout(() => setCopiedCaption(false), 2000);
    } catch {
      setCopiedCaption(false);
    }
  };

  return (
    <div className="bg-[#1C1C1C] border border-white/10 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="space-y-1">
        <div className="text-xs text-[#B6FF00] font-medium">
          07:00 CAT Daily Promo Kit · {daily.promoWindowLabel}
        </div>
        <h3 className="font-display text-2xl font-bold text-white">
          Share Today’s Zambia Matchday Graphic
        </h3>
        <p className="text-xs text-white/60">
          Export a crisp 1080×1080 social card or copy the morning dispatch text.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2.5 shrink-0">
        <button
          type="button"
          onClick={copySocialDispatch}
          className="inline-flex items-center gap-2 px-4 min-h-[44px] rounded-lg bg-white/10 hover:bg-white/15 text-xs font-semibold text-white whitespace-nowrap"
        >
          {copiedCaption ? <Check className="w-4 h-4 text-[#B6FF00]" /> : <Copy className="w-4 h-4" />}
          <span>{copiedCaption ? 'Copied Dispatch' : 'Copy Post Text'}</span>
        </button>
        <button
          type="button"
          onClick={downloadPng}
          className="inline-flex items-center gap-2 px-4 min-h-[44px] rounded-lg bg-[#B6FF00] hover:bg-[#c8ff3d] text-[#0A0A0A] text-xs font-bold whitespace-nowrap"
        >
          <Download className="w-4 h-4" />
          <span>Download 1080px PNG</span>
        </button>
      </div>
    </div>
  );
};
