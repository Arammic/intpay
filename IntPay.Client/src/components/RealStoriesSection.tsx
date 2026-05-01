import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Building2,
  ChevronLeft,
  ChevronRight,
  Landmark,
  Pause,
  PiggyBank,
  Play,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import selfImg from "@/assets/stories/self-savings.webp";
import parentingImg from "@/assets/stories/parenting.webp";
import organizationImg from "@/assets/stories/organization.webp";
import governmentImg from "@/assets/stories/government.webp";
import everyoneImg from "@/assets/stories/everyone.webp";

type Story = {
  id: string;
  audience: string;
  audienceAr?: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  image: string;
  problem: string;
  solution: string;
  example: string;
  outcome: string;
  intent: { label: string; value: string }[];
};

const STORIES: Story[] = [
  {
    id: "self",
    audience: "Self · Savings",
    title: "Rent that pays itself, every month",
    icon: PiggyBank,
    accent: "from-emerald-500 to-teal-500",
    image: selfImg,
    problem:
      "I keep dipping into the money I set aside for rent. By the 25th, the balance is gone and I scramble to cover it.",
    solution:
      "Lock a monthly amount into a Guard intent that only unlocks on rent day, for housing only. No willpower required.",
    example:
      "Sara, a freelancer in Cairo, locks 6,000 EGP every payday into a 'Rent — May' intent. The card stays frozen until the 1st and only works for housing payments.",
    outcome: "12 months on time. Zero late fees. Zero anxiety.",
    intent: [
      { label: "Amount", value: "6,000 EGP" },
      { label: "Unlocks", value: "1st of month" },
      { label: "MCC", value: "Housing only" },
    ],
  },
  {
    id: "parent",
    audience: "Parenting",
    title: "Lunch money that buys lunch",
    icon: Users,
    accent: "from-sky-500 to-indigo-500",
    image: parentingImg,
    problem:
      "I give my son 200 for school meals. By Wednesday it's gone — on a game skin, snacks, and a friend's bet.",
    solution:
      "Send an intent card scoped to the school cafeteria and groceries, with a daily cap. He still feels independent — just inside the lines you drew.",
    example:
      "Ahmed sends his 13-year-old a weekly 'School lunch' card: 250 EGP, restaurants & groceries near school, weekdays only. A receipt photo is required for amounts above 80.",
    outcome: "Healthier lunches, honest conversations, no drama on Sunday.",
    intent: [
      { label: "Weekly", value: "250 EGP" },
      { label: "Where", value: "School area" },
      { label: "Proof", value: "Receipt > 80" },
    ],
  },
  {
    id: "org",
    audience: "Organization",
    title: "Team budgets without the leak",
    icon: Building2,
    accent: "from-violet-500 to-fuchsia-500",
    image: organizationImg,
    problem:
      "Department cards get used for 'gray' expenses. Reconciling at month-end is a fight, and a few invoices never show up.",
    solution:
      "Issue intent cards per project with locked merchant categories and mandatory proof. Every transaction lands with its receipt attached.",
    example:
      "An NGO running a clinic issues a 'Medical supplies — Q2' intent: 80,000 EGP, only pharmacies and medical wholesalers, invoice required.",
    outcome: "Audit-ready in one click. Trust restored across the team.",
    intent: [
      { label: "Budget", value: "80,000 EGP" },
      { label: "Scope", value: "Medical MCCs" },
      { label: "Proof", value: "Invoice required" },
    ],
  },
  {
    id: "gov",
    audience: "Government",
    title: "Public funds with a public trail",
    icon: Landmark,
    accent: "from-amber-500 to-orange-500",
    image: governmentImg,
    problem:
      "A school refurbishment grant is approved. Months later, no one can fully prove where the money went or who approved each step.",
    solution:
      "Disburse as intent cards bound to vendors and categories. Every payment is timestamped, scoped, and proof-attached — visible in real time.",
    example:
      "A municipality funds 12 schools with 'Refurbishment 2026' intents. Cards only pay licensed contractors and hardware suppliers.",
    outcome: "Less corruption surface. Faster delivery. Public confidence.",
    intent: [
      { label: "Per school", value: "Scoped intent" },
      { label: "Vendors", value: "Whitelisted" },
      { label: "Audit", value: "Live trail" },
    ],
  },
  {
    id: "everyone",
    audience: "Everyone",
    title: "One card for every promise you make to yourself",
    icon: Sparkles,
    accent: "from-rose-500 to-pink-500",
    image: everyoneImg,
    problem:
      "Money slips through the cracks — a gym you never use, subscriptions you forgot, 'just one coffee' that became thirty.",
    solution:
      "Turn any intention into a real, spendable boundary. If it's not aligned with the intent, the card simply says no.",
    example:
      "Layla creates three intents: 'Coffee — 600/mo', 'Books — 400/mo', 'Travel fund — 2,000 locked'. Her main account stops bleeding. Her goals start moving.",
    outcome: "Spending finally matches the life you say you want.",
    intent: [
      { label: "Multiple", value: "Intents" },
      { label: "Caps", value: "Per category" },
      { label: "Result", value: "Aligned life" },
    ],
  },
];

const AUTO_MS = 6000;

export default function RealStoriesSection({ isDark }: { isDark: boolean }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragStartX = useRef<number | null>(null);
  const dragDelta = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);

  const total = STORIES.length;
  const goTo = useCallback(
    (i: number) => setIndex(((i % total) + total) % total),
    [total],
  );
  const next = useCallback(() => goTo(index + 1), [index, goTo]);
  const prev = useCallback(() => goTo(index - 1), [index, goTo]);

  // Auto-advance
  useEffect(() => {
    if (!playing || dragging) return;
    const t = setTimeout(() => next(), AUTO_MS);
    return () => clearTimeout(t);
  }, [playing, index, dragging, next]);

  // Pointer / touch swipe
  const onPointerDown = (e: React.PointerEvent) => {
    dragStartX.current = e.clientX;
    dragDelta.current = 0;
    setDragging(true);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (dragStartX.current == null) return;
    dragDelta.current = e.clientX - dragStartX.current;
    setDragOffset(dragDelta.current);
  };
  const onPointerUp = () => {
    if (dragStartX.current == null) return;
    const w = trackRef.current?.clientWidth ?? 1;
    const ratio = dragDelta.current / w;
    if (ratio < -0.15) next();
    else if (ratio > 0.15) prev();
    dragStartX.current = null;
    dragDelta.current = 0;
    setDragOffset(0);
    setDragging(false);
  };

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p
            className={cn(
              "text-sm font-semibold uppercase tracking-[0.2em]",
              isDark ? "text-slate-400" : "text-slate-500",
            )}
          >
            Real stories · Real problems
          </p>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            When intent meets money, life changes.
          </h2>
          <p
            className={cn(
              "max-w-2xl text-base leading-relaxed",
              isDark ? "text-slate-300" : "text-slate-700",
            )}
          >
            Swipe through real-world scenarios — and how a single intent card
            quietly fixes them.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? "Pause" : "Play"}
            className={cn(
              "inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors",
              isDark
                ? "border-slate-700 bg-slate-900/60 text-slate-200 hover:bg-slate-800"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100",
            )}
          >
            {playing ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </button>
          <button
            onClick={prev}
            aria-label="Previous"
            className={cn(
              "inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors",
              isDark
                ? "border-slate-700 bg-slate-900/60 text-slate-200 hover:bg-slate-800"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100",
            )}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={next}
            aria-label="Next"
            className={cn(
              "inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors",
              isDark
                ? "border-slate-700 bg-slate-900/60 text-slate-200 hover:bg-slate-800"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100",
            )}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap justify-center gap-2">
        {STORIES.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === index;
          return (
            <button
              key={s.id}
              onClick={() => goTo(i)}
              className={cn(
                "inline-flex max-w-full items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all sm:gap-2 sm:px-4 sm:py-2 sm:text-sm",
                isActive
                  ? `border-transparent bg-gradient-to-r ${s.accent} text-white shadow-lg scale-105`
                  : isDark
                    ? "border-slate-700 bg-slate-900/60 text-slate-300 hover:border-slate-500"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-400",
              )}
            >
              <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="truncate">{s.audience}</span>
              {s.audienceAr && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px]",
                    isActive
                      ? "bg-white/20 text-white"
                      : isDark
                        ? "bg-slate-800 text-slate-400"
                        : "bg-slate-100 text-slate-500",
                  )}
                >
                  {s.audienceAr}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Slider viewport */}
      <div
        ref={trackRef}
        className={cn(
          "relative overflow-hidden rounded-3xl border touch-pan-y select-none",
          isDark
            ? "border-slate-700 bg-slate-900"
            : "border-slate-200 bg-slate-50",
        )}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* Track */}
        <div
          className="flex"
          style={{
            width: `${total * 100}%`,
            transform: `translate3d(calc(${-index * (100 / total)}% + ${dragOffset}px), 0, 0)`,
            transition: dragging
              ? "none"
              : "transform 700ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          {STORIES.map((s, i) => {
            const Icon = s.icon;
            const isActive = i === index;
            return (
              <article
                key={s.id}
                className="relative shrink-0"
                style={{ width: `${100 / total}%` }}
                aria-hidden={!isActive}
              >
                {/* Background image with parallax/zoom */}
                <div className="relative h-[560px] w-full overflow-hidden sm:h-[600px] lg:h-[620px]">
                  <img
                    src={s.image}
                    alt=""
                    width={1280}
                    height={832}
                    loading={i === 0 ? "eager" : "lazy"}
                    decoding="async"
                    fetchPriority={i === 0 ? "high" : "low"}
                    draggable={false}
                    className={cn(
                      "absolute inset-0 h-full w-full object-cover transition-transform duration-[8000ms] ease-out will-change-transform",
                      isActive ? "scale-110" : "scale-100",
                    )}
                  />

                  {/* Gradient overlays */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-black/20 sm:from-black/85 sm:via-black/45 sm:to-black/10" />
                  <div
                    className={cn(
                      "absolute inset-0 bg-gradient-to-br opacity-30 mix-blend-overlay",
                      s.accent,
                    )}
                  />
                  <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

                  {/* Content */}
                  <div className="relative z-10 flex h-full flex-col justify-center p-4 sm:p-8 lg:p-10">
                    <div className="mx-auto grid w-full max-w-6xl items-center gap-4 sm:gap-6 lg:grid-cols-5">
                      {/* Left narrative */}
                      <div
                        className={cn(
                          "space-y-4 text-center sm:text-left lg:col-span-3",
                          isActive ? "animate-fade-in" : "opacity-0",
                        )}
                      >
                        <div className="hidden items-center gap-3 sm:flex">
                          <div
                            className={cn(
                              "flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg",
                              s.accent,
                            )}
                          >
                            <Icon className="h-6 w-6" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-white/70">
                              {s.audience}
                            </p>
                            <h3 className="text-xl font-semibold text-white drop-shadow-md sm:text-3xl">
                              {s.title}
                            </h3>
                          </div>
                        </div>

                        <div className="space-y-3 rounded-2xl border border-white/15 bg-black/50 p-3 backdrop-blur-md sm:p-5">
                          <div className="hidden sm:block">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-300">
                              The problem
                            </p>
                            <p className="mt-1 text-xs leading-relaxed text-white/90 sm:text-base">
                              {s.problem}
                            </p>
                          </div>
                          <div className="hidden h-px bg-white/10 sm:block" />
                          <div>
                            <p className="flex items-center justify-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-300 sm:justify-start">
                              <ShieldCheck className="h-3.5 w-3.5" /> IntPay
                              solution
                            </p>
                            <p className="mt-1 text-sm leading-relaxed text-white/95 sm:text-base">
                              {s.solution}
                            </p>
                          </div>
                          <div className="h-px bg-white/10" />
                          <p className="hidden text-[11px] italic leading-relaxed text-white/75 sm:block sm:text-sm">
                            “{s.example}”
                          </p>
                        </div>

                        <div className="flex items-center justify-center gap-2 text-base font-semibold text-white sm:justify-start sm:text-base">
                          <ArrowRight className="h-4 w-4 text-white/70" />
                          {s.outcome}
                        </div>
                      </div>

                      {/* Right intent visual */}
                      <div
                        className={cn(
                          "mx-auto w-full max-w-md lg:col-span-2 lg:mx-0 lg:max-w-none",
                          isActive ? "animate-scale-in" : "opacity-0",
                        )}
                      >
                        <div className="rounded-2xl border border-white/15 bg-black/40 p-5 backdrop-blur-md">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/70">
                            The intent card
                          </p>
                          <div
                            className={cn(
                              "relative mt-3 overflow-hidden rounded-xl bg-gradient-to-br p-4 text-white shadow-xl sm:p-5",
                              s.accent,
                            )}
                          >
                            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/20 blur-2xl" />
                            <p className="relative text-[10px] font-medium uppercase tracking-widest text-white/80">
                              {s.audience}
                            </p>
                            <p className="relative mt-1 text-sm font-semibold leading-snug sm:text-base">
                              {s.title}
                            </p>
                          </div>
                          <ul className="mt-4 space-y-2">
                            {s.intent.map((row) => (
                              <li
                                key={row.label}
                                className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs sm:text-sm"
                              >
                                <span className="text-white/60">
                                  {row.label}
                                </span>
                                <span className="font-semibold text-white text-right">
                                  {row.value}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* Edge nav buttons */}
        <button
          onClick={prev}
          aria-label="Previous story"
          className="absolute left-3 top-1/2 z-20 hidden -translate-y-1/2 items-center justify-center rounded-full bg-black/40 p-2.5 text-white backdrop-blur-md transition-all hover:bg-black/60 sm:inline-flex"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          onClick={next}
          aria-label="Next story"
          className="absolute right-3 top-1/2 z-20 hidden -translate-y-1/2 items-center justify-center rounded-full bg-black/40 p-2.5 text-white backdrop-blur-md transition-all hover:bg-black/60 sm:inline-flex"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        {/* Progress dots */}
        <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
          {STORIES.map((s, i) => (
            <button
              key={s.id}
              onClick={() => goTo(i)}
              aria-label={`Go to ${s.audience}`}
              className={cn(
                "h-1.5 rounded-full transition-all duration-500",
                i === index
                  ? "w-8 bg-white"
                  : "w-2 bg-white/40 hover:bg-white/70",
              )}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
