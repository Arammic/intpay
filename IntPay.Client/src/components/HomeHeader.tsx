import {
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/BrandMark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Link, useNavigate } from "react-router-dom";

interface Props {
  onReceive: () => void;
  currentUser: {
    initials: string;
    balance: number;
  };
  cardsGuardCount: number;
  cardsReceivedCount: number;
  cardsSentCount: number;
  lockMoneyAmount: number;
  isLoading?: boolean;
}

export function HomeHeader({
  onReceive,
  currentUser,
  cardsGuardCount,
  cardsReceivedCount,
  cardsSentCount,
  lockMoneyAmount,
  isLoading = false,
}: Props) {
  const nav = useNavigate();
  const totalCards = cardsGuardCount + cardsReceivedCount + cardsSentCount;

  return (
    <header className="space-y-5">
      <div className="flex items-center justify-between">
        <Link
          to="/app"
          aria-label="Go to home"
          className="flex items-center gap-3 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <BrandMark />
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            to="/profile"
            className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Open profile"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-sm font-semibold">
              {currentUser.initials}
            </div>
          </Link>
        </div>
      </div>

      {/* Balance hero */}
      <div
        data-tour="balance"
        className="rounded-3xl bg-card border border-border p-6 shadow-card relative overflow-hidden"
      >
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-20 h-64 w-64 rounded-full bg-secondary/10 blur-3xl pointer-events-none" />

        <div className="relative">
          <div className="grid grid-cols-2 gap-4">
            <div className="pr-2">
              <p className="font-label text-[10px] uppercase tracking-widest text-muted-foreground">
                Free Money
              </p>
              <p className="font-display text-3xl sm:text-4xl font-bold tracking-tight mt-1">
                {isLoading ? (
                  <span className="inline-block h-10 w-44 animate-pulse rounded-lg bg-muted/60 align-middle" />
                ) : (
                  <>
                    $
                    {currentUser.balance.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </>
                )}
              </p>
              <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <CreditCard className="h-3.5 w-3.5 text-primary" />
                <span>
                  <span className="text-primary">{cardsGuardCount}</span> guard
                  · <span className="text-secondary">{cardsReceivedCount}</span>{" "}
                  in · <span className="text-tertiary">{cardsSentCount}</span>{" "}
                  out
                </span>
              </div>
            </div>
            <div className="pl-3 border-l border-border/70">
              <p className="font-label text-[10px] uppercase tracking-widest text-muted-foreground">
                Lock Money Amount
              </p>
              <p className="font-display text-3xl sm:text-4xl font-bold tracking-tight mt-1">
                {isLoading ? (
                  <span className="inline-block h-10 w-40 animate-pulse rounded-lg bg-muted/60 align-middle" />
                ) : (
                  `$${lockMoneyAmount.toFixed(2)}`
                )}
              </p>
              <button
                type="button"
                onClick={() => nav("/intent/new")}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-label text-primary hover:underline"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Lock Money
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
