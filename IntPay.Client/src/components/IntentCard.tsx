import { cn } from "@/lib/utils";

/**
 * IntentCard — pixel-faithful React port of the IntPay credit-card SVG.
 * Dark slate body (#0F0F12) with a soft purple→teal radial wash, the IntPay
 * mark + wordmark on the top-left, a thin globe ring on the top-right, an
 * EMV chip, the PAN, and "Card Holder" / expiry footer. Built with pure CSS
 * + inline SVG so it scales crisply at any size.
 *
 * Size variants tune typography & padding so the same component looks great
 * in tiny home-feed sliders, the success dialog, and the marketing hero.
 */

export type IntentCardSize = "xs" | "sm" | "md" | "lg";

interface IntentCardProps {
  cardNumber: string;
  cardholderName: string;
  expiry: string;
  /** Optional — small pill in the top-right (e.g. "Active", "Strict"). */
  statusLabel?: string;
  /** Optional intent purpose, shown as a subtle line under the wordmark. */
  intentTitle?: string;
  size?: IntentCardSize;
  /** When true, renders without the lift / hover transition (useful in dialogs). */
  static?: boolean;
  className?: string;
}

const SIZE_CLASSES: Record<
  IntentCardSize,
  {
    pad: string;
    mark: string;
    wordmark: string;
    chip: string;
    globe: string;
    pan: string;
    label: string;
    holder: string;
    tagline: string;
  }
> = {
  xs: {
    pad: "p-3",
    mark: "h-5 w-5",
    wordmark: "text-[11px]",
    chip: "h-5 w-7",
    globe: "h-4 w-4",
    pan: "text-[11px] tracking-[0.14em]",
    label: "text-[7px]",
    holder: "text-[9px]",
    tagline: "text-[7px]",
  },
  sm: {
    pad: "p-3",
    mark: "h-5 w-5",
    wordmark: "text-[12px]",
    chip: "h-5 w-8",
    globe: "h-5 w-5",
    pan: "text-[11px] tracking-[0.14em]",
    label: "text-[8px]",
    holder: "text-[9px]",
    tagline: "text-[8px]",
  },
  md: {
    pad: "p-5",
    mark: "h-8 w-8",
    wordmark: "text-[18px]",
    chip: "h-8 w-12",
    globe: "h-7 w-7",
    pan: "text-[18px] tracking-[0.2em]",
    label: "text-[10px]",
    holder: "text-[12px]",
    tagline: "text-[10px]",
  },
  lg: {
    pad: "p-6 sm:p-7",
    mark: "h-10 w-10",
    wordmark: "text-[22px] sm:text-[24px]",
    chip: "h-10 w-14",
    globe: "h-8 w-8",
    pan: "text-[22px] sm:text-[26px] tracking-[0.22em]",
    label: "text-[10px] sm:text-[11px]",
    holder: "text-[13px] sm:text-sm",
    tagline: "text-[10px] sm:text-[11px]",
  },
};

const TITLE_MAX_BY_SIZE: Record<IntentCardSize, number> = {
  xs: 16,
  sm: 18,
  md: 28,
  lg: 34,
};

export function IntentCard({
  cardNumber,
  cardholderName,
  expiry,
  statusLabel,
  intentTitle,
  size = "md",
  static: isStatic = false,
  className,
}: IntentCardProps) {
  const s = SIZE_CLASSES[size];
  const holder = (cardholderName || "Card Holder").trim();

  return (
    <div
      className={cn(
        "group relative aspect-[1.586/1] w-full rounded-[24px] overflow-hidden",
        "shadow-[0_30px_60px_-25px_rgba(0,0,0,0.55),0_10px_20px_-10px_rgba(91,57,212,0.35)]",
        "ring-1 ring-white/[0.05] text-white",
        !isStatic && "transition-transform duration-300 ease-out hover:-translate-y-0.5 hover:rotate-[0.15deg]",
        className,
      )}
    >
      {/* Base */}
      <div className="absolute inset-0 bg-[#0F0F12]" />

      {/* Soft diagonal wash — purple top-left → teal bottom-right (matches SVG paint0_linear) */}
      <div
        className="absolute inset-0 opacity-90"
        style={{
          background:
            "linear-gradient(135deg, rgba(91,57,212,0.32) 0%, rgba(15,15,18,0) 45%, rgba(15,15,18,0) 60%, rgba(15,183,142,0.22) 100%)",
        }}
      />

      {/* Subtle left-side darkening (path opacity 0.05 in source) */}
      <div className="absolute inset-y-0 left-0 w-1/2 bg-black/[0.06]" />

      {/* Faint specular sheen */}
      <div className="absolute -top-1/2 -right-1/3 h-[180%] w-[80%] rotate-[18deg] bg-[radial-gradient(closest-side,rgba(255,255,255,0.06),transparent_70%)]" />

      {/* ============== Content layer ============== */}
      <div className={cn("absolute inset-0 flex flex-col", s.pad)}>
        {/* Top row: IntPay logo + globe / status */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <IntPayMark className={s.mark} />
            <div className="leading-none">
              <span className={cn("font-display font-semibold tracking-tight text-white", s.wordmark)}>
                IntPay
              </span>
              <span
                className={cn(
                  "ml-1 font-display font-medium tracking-tight text-white/60",
                  s.wordmark,
                )}
              >
                Inc
              </span>
              <p
                className={cn(
                  "mt-1 max-w-[15ch] overflow-hidden text-ellipsis whitespace-nowrap uppercase tracking-[0.2em] text-white/45 font-label leading-tight",
                  s.tagline,
                )}
              >
                {intentTitle
                  ? truncate(intentTitle, TITLE_MAX_BY_SIZE[size])
                  : "Elite · Infinite · Limitless"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {statusLabel ? (
              <span
                className={cn(
                  "rounded-full border border-white/25 bg-white/10 backdrop-blur px-2 py-0.5 uppercase tracking-wider font-label text-white/90",
                  s.tagline,
                )}
              >
                {statusLabel}
              </span>
            ) : null}
            <GlobeRing className={cn("text-white/45", s.globe)} />
          </div>
        </div>

        {/* Middle: chip */}
        <div className="mt-auto">
          <EmvChip className={s.chip} />

          {/* PAN */}
          <p
            className={cn(
              "mt-2.5 font-mono font-medium tabular-nums text-white",
              s.pan,
            )}
          >
            {cardNumber}
          </p>

          {/* Footer */}
          <div className="mt-2 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p
                className={cn(
                  "uppercase tracking-[0.22em] text-white/45 font-label",
                  s.label,
                )}
              >
                Card Holder
              </p>
              <p
                className={cn(
                  "font-display font-semibold text-white truncate",
                  s.holder,
                )}
              >
                {holder}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p
                className={cn(
                  "uppercase tracking-[0.22em] text-white/45 font-label",
                  s.label,
                )}
              >
                Exp
              </p>
              <p
                className={cn(
                  "font-display font-semibold text-white tabular-nums",
                  s.holder,
                )}
              >
                {expiry}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function truncate(s: string, n: number) {
  return s.length <= n ? s : `${s.slice(0, n - 1)}…`;
}

/* ----------------------------- SVG sub-marks ----------------------------- */

/** IntPay mark — teal hook + violet "i" dot (mirrors paths in source SVG). */
function IntPayMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      {/* Teal C-hook */}
      <path
        d="M16 5.2c-3.6 0-6.6 2.4-7.4 5.7h3.4c.6-1.4 2-2.4 3.7-2.4 2.2 0 4 1.7 4 3.9 0 2.2-1.8 3.9-4 3.9-1.7 0-3.1-1-3.7-2.4H8.6c.5 2 1.8 3.6 3.6 4.5v4.4c0 1 .8 1.7 1.8 1.7s1.8-.8 1.8-1.7v-3.5c.7.1 1.4.1 2.1 0 4-.5 7-3.9 7-7.9 0-4.4-3.5-7.9-7.9-7.9z"
        fill="#0FB78E"
      />
      {/* Violet vertical bar */}
      <rect x="5.2" y="11.2" width="3.6" height="13.2" rx="1.8" fill="#5B39D4" />
      {/* Violet dot */}
      <circle cx="7" cy="7.5" r="2.4" fill="#5B39D4" />
      {/* Tiny inner triangle accent */}
      <path d="M14.6 11.6l3 2.1-3 2.1v-1.4h-3v-1.4h3v-1.4z" fill="#251C50" />
    </svg>
  );
}

/** Top-right globe ring (the concentric arcs from the source SVG). */
function GlobeRing({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="12" cy="12" r="10.5" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      <ellipse cx="12" cy="12" rx="10.5" ry="5" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <ellipse cx="12" cy="12" rx="6" ry="10.5" stroke="currentColor" strokeWidth="1" opacity="0.6" />
      <line x1="1.5" y1="12" x2="22.5" y2="12" stroke="currentColor" strokeWidth="1" opacity="0.4" />
    </svg>
  );
}

/** EMV chip — golden gradient + 3×3 grid (mirrors rect#paint1_linear). */
function EmvChip({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 56 44" fill="none" className={className} aria-hidden>
      <defs>
        <linearGradient id="emvgrad" x1="0" y1="0" x2="56" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#E9C46A" />
          <stop offset="0.45" stopColor="#FCF4B2" />
          <stop offset="0.75" stopColor="#BB8F31" />
          <stop offset="1" stopColor="#F8E995" />
        </linearGradient>
      </defs>
      <rect x="0.5" y="0.5" width="55" height="43" rx="7.5" fill="url(#emvgrad)" stroke="black" strokeOpacity="0.1" />
      <g opacity="0.3" stroke="black" strokeWidth="0.8">
        <line x1="19" y1="2" x2="19" y2="42" />
        <line x1="37" y1="2" x2="37" y2="42" />
        <line x1="2" y1="15" x2="54" y2="15" />
        <line x1="2" y1="29" x2="54" y2="29" />
      </g>
    </svg>
  );
}
