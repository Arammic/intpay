import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, X, Sparkles } from "lucide-react";

export interface TourStep {
  /** CSS selector to highlight, or null to show as a centered modal step. */
  target?: string | null;
  title: string;
  body: string;
}

interface Props {
  steps: TourStep[];
  open: boolean;
  onClose: () => void;
}

const PADDING = 8;

export function TourGuide({ steps, open, onClose }: Props) {
  const [idx, setIdx] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!open) setIdx(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const step = steps[idx];
    if (!step?.target) {
      setRect(null);
      return;
    }
    const measure = () => {
      const el = document.querySelector(step.target!);
      if (!el) {
        setRect(null);
        return;
      }
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      // wait for scroll
      window.setTimeout(() => {
        const r = (el as HTMLElement).getBoundingClientRect();
        setRect(r);
      }, 350);
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [idx, open, steps]);

  if (!open) return null;
  const step = steps[idx];
  const isLast = idx === steps.length - 1;

  // Compute tooltip position
  let tooltipStyle: React.CSSProperties = {
    position: "fixed",
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%)",
    maxWidth: "min(92vw, 360px)",
  };
  if (rect) {
    const spaceBelow = window.innerHeight - rect.bottom;
    const placeBelow = spaceBelow > 220;
    const top = placeBelow ? rect.bottom + 12 : Math.max(16, rect.top - 220);
    const left = Math.min(
      Math.max(16, rect.left + rect.width / 2 - 180),
      window.innerWidth - 360 - 16,
    );
    tooltipStyle = {
      position: "fixed",
      top,
      left,
      width: "min(92vw, 360px)",
    };
  }

  // Highlight box
  const highlight = rect
    ? {
        position: "fixed" as const,
        top: rect.top - PADDING,
        left: rect.left - PADDING,
        width: rect.width + PADDING * 2,
        height: rect.height + PADDING * 2,
        borderRadius: 16,
        boxShadow:
          "0 0 0 9999px hsl(var(--background) / 0.78), 0 0 0 3px hsl(var(--primary) / 0.7), 0 0 40px hsl(var(--primary) / 0.55)",
        pointerEvents: "none" as const,
        transition: "all 220ms ease",
        zIndex: 99,
      }
    : null;

  return createPortal(
    <div className="fixed inset-0 z-[100]">
      {!highlight && (
        <div
          className="absolute inset-0 bg-background/85 backdrop-blur-sm"
          onClick={onClose}
        />
      )}
      {highlight && <div style={highlight} />}

      <div
        style={tooltipStyle}
        className="rounded-2xl border border-primary/30 bg-card p-4 shadow-[0_20px_60px_-20px_hsl(var(--primary)/0.55)] z-[101]"
      >
        <div className="flex items-start gap-2 mb-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-primary text-primary-foreground shrink-0">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-label text-[10px] uppercase tracking-widest text-muted-foreground">
              Step {idx + 1} of {steps.length}
            </p>
            <h4 className="font-display text-base font-bold leading-tight">
              {step.title}
            </h4>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Close tour"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {step.body}
        </p>
        <div className="mt-4 flex items-center justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={idx === 0}
            onClick={() => setIdx((i) => Math.max(0, i - 1))}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </Button>
          <div className="flex gap-1">
            {steps.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-1.5 rounded-full ${
                  i === idx ? "bg-primary w-4" : "bg-muted-foreground/30"
                } transition-all`}
              />
            ))}
          </div>
          <Button
            size="sm"
            onClick={() => {
              if (isLast) onClose();
              else setIdx((i) => i + 1);
            }}
          >
            {isLast ? "Done" : "Next"}
            {!isLast && <ArrowRight className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export const DEFAULT_TOUR_STEPS: TourStep[] = [
  {
    target: null,
    title: "Welcome to IntPay 👋",
    body: "IntPay lets you lock money behind clear intents and issue smart cards that only spend on what you allow. Let's take a quick tour.",
  },
  {
    target: '[data-tour="balance"]',
    title: "Your balance",
    body: "Free Money is what you can spend. Lock Money is held safely behind your active intents.",
  },
  {
    target: '[data-tour="quick-actions"]',
    title: "Quick actions",
    body: "Lock Money to start a new intent, Receive money via QR, top up your Wallet, or Ask IntPay for help.",
  },
  {
    target: '[data-tour="active-cards"]',
    title: "Active smart cards",
    body: "Your live intent cards. Tap any to see rules, activity, freeze it, or upload required proofs.",
  },
  {
    target: '[data-tour="activity"]',
    title: "Live activity",
    body: "Approved and declined transactions stream in here in real time.",
  },
  {
    target: '[data-tour="bottom-nav"]',
    title: "Navigate the app",
    body: "Switch between Home, Cards, Wallet and Profile from the bottom bar. The plus opens new intents.",
  },
  {
    target: '[data-tour="helpers-dock"]',
    title: "Helpers — always here",
    body: "Tap this floating button anytime to Ask IntPay AI, Scan a QR, or replay this tour.",
  },
];
