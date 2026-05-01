import { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  CreditCard,
  MessageSquareText,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Wallet,
} from "lucide-react";
import { IntentCard } from "@/components/IntentCard";
import { cn } from "@/lib/utils";

/**
 * HowItWorksFlow — interactive 4-step walkthrough of the IntPay journey.
 * Auto-advances, can be paused, replayed, or stepped manually.
 */

type Step = {
  id: number;
  title: string;
  caption: string;
  icon: React.ComponentType<{ className?: string }>;
};

const STEPS: Step[] = [
  { id: 1, title: "Send intent", caption: "Describe what the money is for", icon: MessageSquareText },
  { id: 2, title: "Card created", caption: "A smart card is issued instantly", icon: CreditCard },
  { id: 3, title: "Pay in store", caption: "Tap to pay — only intent-matching", icon: Store },
  { id: 4, title: "Done", caption: "Settled, logged, proof captured", icon: Check },
];

interface HowItWorksFlowProps {
  isDark: boolean;
}

export default function HowItWorksFlow({ isDark }: HowItWorksFlowProps) {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => setActive((a) => (a + 1) % STEPS.length), 4200);
    return () => clearTimeout(t);
  }, [active, playing]);

  return (
    <section
      className={cn(
        "rounded-2xl border p-6 sm:p-8",
        isDark ? "border-slate-700 bg-slate-900/70" : "border-slate-200 bg-white",
      )}
    >
      {/* Heading */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className={cn("text-xs font-semibold uppercase tracking-[0.2em]", isDark ? "text-slate-400" : "text-slate-500")}>
            How it works
          </p>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            From intent to a tap at the store, in four steps.
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPlaying((p) => !p)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
              isDark ? "border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700" : "border-slate-300 bg-white text-slate-800 hover:bg-slate-100",
            )}
          >
            {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {playing ? "Pause" : "Play"}
          </button>
          <button
            onClick={() => {
              setActive(0);
              setPlaying(true);
            }}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
              isDark ? "border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700" : "border-slate-300 bg-white text-slate-800 hover:bg-slate-100",
            )}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Replay
          </button>
        </div>
      </div>

      {/* Stepper */}
      <div className="mt-7">
        <div className="relative grid grid-cols-4 gap-2">
          {/* Progress line */}
          <div className={cn("absolute left-4 right-4 top-4 h-0.5 -z-0", isDark ? "bg-slate-700" : "bg-slate-200")} />
          <div
            className="absolute left-4 top-4 h-0.5 -z-0 bg-gradient-to-r from-violet-500 to-emerald-500 transition-all duration-500"
            style={{ width: `calc(${(active / (STEPS.length - 1)) * 100}% * (100% - 32px) / 100%)` }}
          />
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const reached = i <= active;
            return (
              <button
                key={s.id}
                onClick={() => {
                  setPlaying(false);
                  setActive(i);
                }}
                className="group relative z-10 flex flex-col items-center gap-2 text-left"
              >
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all",
                    reached
                      ? "border-transparent bg-gradient-to-br from-violet-500 to-emerald-500 text-white shadow-lg shadow-violet-500/30"
                      : isDark
                        ? "border-slate-700 bg-slate-900 text-slate-500"
                        : "border-slate-200 bg-white text-slate-400",
                    i === active && "ring-4 ring-violet-500/20 scale-110",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="hidden text-center sm:block">
                  <p className={cn("text-xs font-semibold", reached ? "" : isDark ? "text-slate-500" : "text-slate-400")}>
                    Step {s.id}
                  </p>
                  <p className={cn("text-[11px] leading-tight", isDark ? "text-slate-400" : "text-slate-600")}>
                    {s.title}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Stage */}
      <div
        className={cn(
          "mt-8 grid gap-6 rounded-xl border p-5 sm:p-7 lg:grid-cols-2",
          isDark ? "border-slate-700 bg-slate-950/40" : "border-slate-200 bg-slate-50",
        )}
      >
        {/* Left: narrative */}
        <div className="flex flex-col justify-center space-y-4">
          <div
            className={cn(
              "inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider",
              isDark ? "border-slate-700 bg-slate-900 text-slate-300" : "border-slate-200 bg-white text-slate-600",
            )}
          >
            <Sparkles className="h-3 w-3" />
            Step {STEPS[active].id} of {STEPS.length}
          </div>
          <h3 className="text-2xl font-semibold tracking-tight sm:text-3xl">{STEPS[active].title}</h3>
          <p className={cn("text-sm leading-relaxed sm:text-base", isDark ? "text-slate-300" : "text-slate-700")}>
            {STEP_COPY[active]}
          </p>
          <ul className="space-y-1.5">
            {STEP_BULLETS[active].map((b) => (
              <li key={b} className="flex items-start gap-2 text-sm">
                <Check className={cn("mt-0.5 h-4 w-4 shrink-0", isDark ? "text-emerald-300" : "text-emerald-600")} />
                <span className={isDark ? "text-slate-300" : "text-slate-700"}>{b}</span>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={() => {
                setPlaying(false);
                setActive((a) => Math.max(0, a - 1));
              }}
              disabled={active === 0}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40",
                isDark ? "border-slate-700 bg-slate-800 text-slate-200" : "border-slate-300 bg-white text-slate-700",
              )}
            >
              Previous
            </button>
            <button
              onClick={() => {
                setPlaying(false);
                setActive((a) => Math.min(STEPS.length - 1, a + 1));
              }}
              disabled={active === STEPS.length - 1}
              className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-violet-600 to-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md transition-transform hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0"
            >
              Next
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Right: visual stage */}
        <div className="relative min-h-[280px] sm:min-h-[320px]">
          <StageVisual step={active} isDark={isDark} />
        </div>
      </div>
    </section>
  );
}

const STEP_COPY = [
  "Open the app and describe what the money is for in plain language. The Intent AI extracts amount, where, when, and any rules.",
  "A virtual smart card is created in seconds, locked to your intent. Share it with someone or keep it for yourself.",
  "Walk into the shop, tap to pay. The card only authorises if the merchant matches the intent — every other charge is rejected.",
  "Payment settles, the receipt is captured automatically, and the intent is closed. Full audit trail is ready to review.",
];

const STEP_BULLETS = [
  ["Natural-language intents", "Auto-fills amount, MCC, expiry", "Optional proof requirement"],
  ["Issued instantly via card network", "Send to anyone or keep yourself", "Full intent rules embedded on the card"],
  ["Tap-to-pay at any terminal", "Real-time intent validation", "Off-intent charges are blocked"],
  ["Receipt and proof attached", "Settled to your wallet", "Closed with a clean audit trail"],
];

/* ------------------------------ Stage visuals ----------------------------- */

function StageVisual({ step, isDark }: { step: number; isDark: boolean }) {
  return (
    <div className="absolute inset-0">
      {step === 0 && <StepIntent isDark={isDark} />}
      {step === 1 && <StepCard />}
      {step === 2 && <StepStore isDark={isDark} />}
      {step === 3 && <StepDone isDark={isDark} />}
    </div>
  );
}

function StepIntent({ isDark }: { isDark: boolean }) {
  return (
    <div
      className={cn(
        "h-full rounded-xl border p-4 shadow-lg",
        isDark ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white",
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        <div className="flex gap-1">
          <span className="h-2 w-2 rounded-full bg-rose-400" />
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
        </div>
        <p className={cn("text-[11px] font-medium", isDark ? "text-slate-400" : "text-slate-500")}>Send intent</p>
      </div>

      <div className={cn("rounded-lg p-3 text-sm leading-relaxed", isDark ? "bg-slate-800 text-slate-100" : "bg-slate-100 text-slate-800")}>
        <span className="typing-cursor">
          Give my son <b>$45</b> for school lunch this week, only at restaurants near home.
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
        {[
          { label: "Amount", value: "$45.00" },
          { label: "Use times", value: "5" },
          { label: "MCC", value: "5812 · 5814" },
          { label: "Expiry", value: "Fri 5pm" },
        ].map((f, i) => (
          <div
            key={f.label}
            className={cn(
              "rounded-md border px-2 py-1.5 opacity-0 animate-[slidein_0.4s_ease_forwards]",
              isDark ? "border-slate-700 bg-slate-800/50" : "border-slate-200 bg-slate-50",
            )}
            style={{ animationDelay: `${0.4 + i * 0.15}s` }}
          >
            <p className={isDark ? "text-slate-500" : "text-slate-500"}>{f.label}</p>
            <p className="font-semibold">{f.value}</p>
          </div>
        ))}
      </div>

      <button className="mt-3 w-full rounded-lg bg-gradient-to-r from-violet-600 to-emerald-600 py-2 text-xs font-semibold text-white">
        Create smart card →
      </button>

      <style>{`
        @keyframes slidein { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:translateY(0) } }
        .typing-cursor::after { content:'|'; margin-left:2px; animation: blink 1s steps(2) infinite; }
        @keyframes blink { 50% { opacity: 0 } }
      `}</style>
    </div>
  );
}

function StepCard() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3">
      <div className="w-full max-w-[360px] animate-[pop_0.5s_ease]">
        <IntentCard
          size="sm"
          cardNumber="•••• •••• •••• 7005"
          cardholderName="Liam · Son"
          expiry="11/26"
          intentTitle="School lunch · 5 uses"
          statusLabel="active"
        />
      </div>
      <div className="flex items-center gap-1.5 rounded-full border border-emerald-300/40 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-500">
        <ShieldCheck className="h-3 w-3" /> Issued · governed by intent rules
      </div>
      <style>{`@keyframes pop { 0% { transform:scale(0.85); opacity:0 } 60% { transform:scale(1.02); opacity:1 } 100% { transform:scale(1) } }`}</style>
    </div>
  );
}

function StepStore({ isDark }: { isDark: boolean }) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="relative w-full max-w-[360px]">
        {/* Terminal */}
        <div
          className={cn(
            "rounded-2xl border p-4 shadow-xl",
            isDark ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white",
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Store className={cn("h-4 w-4", isDark ? "text-slate-400" : "text-slate-500")} />
              <p className="text-xs font-semibold">Burger Place · POS</p>
            </div>
            <span className={cn("text-[10px]", isDark ? "text-slate-500" : "text-slate-400")}>MCC 5812</span>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-3xl font-semibold tabular-nums">$8.40</span>
            <span className={cn("text-xs", isDark ? "text-slate-400" : "text-slate-500")}>USD</span>
          </div>
          <div className={cn("mt-3 rounded-lg border-2 border-dashed px-3 py-3 text-center", isDark ? "border-slate-700" : "border-slate-300")}>
            <Wallet className="mx-auto h-5 w-5 text-violet-500 animate-pulse" />
            <p className={cn("mt-1 text-[11px]", isDark ? "text-slate-400" : "text-slate-600")}>Tap your card to pay</p>
          </div>
          <div className="mt-3 flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2 py-1.5 text-[11px] font-semibold text-emerald-600">
            <Check className="h-3 w-3" /> Approved · matches intent
          </div>
        </div>

        {/* Floating card */}
        <div className="pointer-events-none absolute -right-2 -top-3 w-32 rotate-[8deg] animate-[tap_2s_ease-in-out_infinite]">
          <IntentCard
            size="xs"
            cardNumber="•••• 7005"
            cardholderName="Liam"
            expiry="11/26"
            statusLabel="tap"
            static
          />
        </div>

        <style>{`@keyframes tap { 0%,100% { transform: rotate(8deg) translate(0,0) } 50% { transform: rotate(8deg) translate(-12px, 18px) } }`}</style>
      </div>
    </div>
  );
}

function StepDone({ isDark }: { isDark: boolean }) {
  return (
    <div className="flex h-full items-center justify-center">
      <div
        className={cn(
          "w-full max-w-[360px] rounded-2xl border p-5 text-center shadow-xl",
          isDark ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white",
        )}
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-500/40 animate-[pop_0.5s_ease]">
          <Check className="h-7 w-7" />
        </div>
        <h4 className="mt-3 text-lg font-semibold">Payment complete</h4>
        <p className={cn("mt-1 text-xs", isDark ? "text-slate-400" : "text-slate-500")}>
          Logged to "School lunch" intent
        </p>
        <div className={cn("mt-4 space-y-1.5 rounded-lg border p-3 text-left text-xs", isDark ? "border-slate-700 bg-slate-800/40" : "border-slate-200 bg-slate-50")}>
          <Row k="Merchant" v="Burger Place" isDark={isDark} />
          <Row k="Amount" v="$8.40" isDark={isDark} />
          <Row k="Remaining" v="$36.60 / $45.00" isDark={isDark} />
          <Row k="Proof" v="Receipt captured ✓" isDark={isDark} />
        </div>
        <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-violet-500">
          <ShoppingBag className="h-3 w-3" /> Intent active · 4 uses left
        </div>
      </div>
    </div>
  );
}

function Row({ k, v, isDark }: { k: string; v: string; isDark: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={isDark ? "text-slate-400" : "text-slate-500"}>{k}</span>
      <span className="font-medium">{v}</span>
    </div>
  );
}
