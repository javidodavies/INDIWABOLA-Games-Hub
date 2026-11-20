import React, { useEffect, useState } from 'react';
import { Check, Share2 } from 'lucide-react';
import { soundEngine } from '../utils/sound';
import { formatShareMessage, ShareMetadata } from '../utils/shareFormat';

export { formatShareMessage, type ShareMetadata };

interface ShareButtonProps extends ShareMetadata {
  label?: string;
  variant?: 'secondary' | 'primary' | 'ghost';
  className?: string;
}

async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall back to execCommand below
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.className = 'fixed opacity-0 pointer-events-none';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

export const ShareButton: React.FC<ShareButtonProps> = ({
  gameTitle,
  gameCategory,
  score,
  accuracy,
  won,
  isDailyMode,
  shareGrid,
  summaryLine,
  customUrl,
  label = 'Share Results',
  variant = 'secondary',
  className = '',
}) => {
  const [toast, setToast] = useState<{ visible: boolean; message: string; preview: string }>({
    visible: false,
    message: '',
    preview: '',
  });
  const [sharedRecently, setSharedRecently] = useState(false);

  useEffect(() => {
    if (!toast.visible) return;
    const t = window.setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 3200);
    return () => window.clearTimeout(t);
  }, [toast.visible]);

  const handleShare = async () => {
    const payload = formatShareMessage({
      gameTitle,
      gameCategory,
      score,
      accuracy,
      won,
      isDailyMode,
      shareGrid,
      summaryLine,
      customUrl,
    });

    // Prefer native Web Share API when supported
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: payload.title,
          text: payload.text,
          url: payload.url,
        });
        soundEngine.playCorrect();
        setSharedRecently(true);
        window.setTimeout(() => setSharedRecently(false), 2400);
        setToast({
          visible: true,
          message: 'Result shared via device share sheet!',
          preview: `${gameTitle} · ${score} pts`,
        });
        return;
      } catch (err) {
        // User explicitly cancelled the native share sheet
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        // Otherwise fall back seamlessly to clipboard copy
      }
    }

    const copied = await copyTextToClipboard(payload.text);
    if (copied) {
      soundEngine.playCorrect();
      setSharedRecently(true);
      window.setTimeout(() => setSharedRecently(false), 2400);
      setToast({
        visible: true,
        message: 'Copied formatted WhatsApp & social message!',
        preview: payload.text.split('\n').slice(0, 2).join(' · '),
      });
    } else {
      soundEngine.playWrong();
      setToast({
        visible: true,
        message: 'Unable to copy automatically — please copy from the card above.',
        preview: payload.url,
      });
    }
  };

  const baseStyles =
    variant === 'primary'
      ? 'bg-[#B6FF00] hover:bg-[#c8ff3d] text-[#0A0A0A] font-bold px-4 py-3 rounded-lg min-h-[44px]'
      : variant === 'ghost'
      ? 'text-[#B6FF00] hover:underline font-medium px-2 py-1 rounded'
      : 'bg-white/10 hover:bg-white/15 text-white font-semibold px-4 py-3 rounded-lg min-h-[44px]';

  return (
    <>
      <button
        type="button"
        onClick={handleShare}
        className={`inline-flex items-center justify-center gap-2 text-sm whitespace-nowrap transition-colors ${baseStyles} ${className}`}
      >
        {sharedRecently ? (
          <Check className={`w-4 h-4 ${variant === 'primary' ? 'text-[#0A0A0A]' : 'text-[#B6FF00]'}`} />
        ) : (
          <Share2 className="w-4 h-4" />
        )}
        <span>{sharedRecently ? 'Shared!' : label}</span>
      </button>

      {toast.visible && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 max-w-sm w-[calc(100%-2rem)] bg-[#1C1C1C] border border-[#B6FF00]/60 text-white rounded-xl px-4 py-3 shadow-2xl flex items-start gap-3 animate-tile-pop"
        >
          <div className="w-6 h-6 rounded-full bg-[#B6FF00] text-[#0A0A0A] flex items-center justify-center shrink-0 mt-0.5">
            <Check className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-[#B6FF00]">{toast.message}</div>
            <div className="text-[11px] text-white/70 truncate mt-0.5">{toast.preview}</div>
          </div>
        </div>
      )}
    </>
  );
};
