import { HomeHeader } from "@/components/HomeHeader";
import { ReceiveDialog } from "@/components/ReceiveDialog";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Wallet,
  Sparkles,
  TrendingUp,
  Activity,
  ArrowUpRight,
  ArrowDownLeft,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMemo, useState } from "react";
import { ActiveSmartCardsSlider } from "@/components/ActiveSmartCardsSlider";
import { useQuery } from "@tanstack/react-query";
import { getHomeSummary } from "@/api/homeSummary";
import { getCardsByUser } from "@/api/cardsByUser";
import { AppLoader } from "@/components/AppLoader";
import { UserActivity } from "@/components/UserActivity";
import {
  useCurrentUserContext,
  profileInitials,
} from "@/lib/currentUserContext";
import type { AppHomeSliderCard } from "@/api/appHome";
import type { IntentWithCardResponse } from "@/api/intentCards";

function toSliderCard(item: IntentWithCardResponse): AppHomeSliderCard {
  const c = item.card;
  return {
    id: String(c.id),
    cardNumber: c.cardNumber,
    last4: c.last4,
    cardholderName: c.cardholderName,
    expMonth: c.expiryMonth,
    expYear: c.expiryYear,
    description: item.description ?? "Intent card",
    status: c.status,
  };
}

export default function HomePage() {
  const [receiveOpen, setReceiveOpen] = useState(false);
  const nav = useNavigate();
  const { pathname } = useLocation();
  const isActiveRoute = (path: string) =>
    path === "/app" ? pathname === "/app" : pathname.startsWith(path);
  const activeRing =
    "ring-2 ring-white/70 ring-offset-2 ring-offset-background animate-pulse";
  const activeRingNeutral =
    "ring-2 ring-primary/50 ring-offset-2 ring-offset-background animate-pulse";

  const {
    userId,
    profile,
    isLoading: isProfileLoading,
    error: profileErrors,
  } = useCurrentUserContext();

  const { data: homeResponse, isLoading: isHomeLoading } = useQuery({
    queryKey: ["home-summary", userId],
    queryFn: () => getHomeSummary(userId),
  });

  const { data: cardsByUserResponse, isLoading: isCardsLoading } = useQuery({
    queryKey: ["cards-by-user", userId],
    queryFn: () => getCardsByUser(userId),
  });

  const home = homeResponse?.data;
  const apiErrors = [
    ...(profileErrors ?? []),
    ...(homeResponse?.error ?? []),
    ...(cardsByUserResponse?.error ?? []),
  ];

  const sliderCards = useMemo<AppHomeSliderCard[]>(() => {
    const items = cardsByUserResponse?.data?.items ?? [];
    return items.slice(0, 5).map(toSliderCard);
  }, [cardsByUserResponse]);

  const cardsGuardCount =
    home?.selfCards?.count ?? home?.selfCards?.items?.length ?? 0;
  const cardsReceivedCount =
    home?.receivedCards?.count ?? home?.receivedCards?.items?.length ?? 0;
  const cardsSentCount =
    home?.sentCards?.count ?? home?.sentCards?.items?.length ?? 0;

  const lockMoneyAmount = profile?.lockMoney ?? home?.lockMoney ?? 0;
  const freeMoney = home?.freeMoney ?? profile?.vaultBalance ?? 0;
  const currentPoints = profile?.points ?? 0;
  const currentActivityCount = home?.totalActivityCount ?? 0;

  const currentUser = {
    id: profile ? String(profile.id) : String(userId),
    name: profile?.name ?? "",
    email: profile?.email ?? "",
    initials: profileInitials(profile?.name),
    balance: freeMoney,
  };

  const isLoading = isHomeLoading || isProfileLoading || isCardsLoading;

  return (
    <div className="space-y-6 pt-4">
      <HomeHeader
        onReceive={() => setReceiveOpen(true)}
        currentUser={currentUser}
        cardsGuardCount={cardsGuardCount}
        cardsReceivedCount={cardsReceivedCount}
        cardsSentCount={cardsSentCount}
        lockMoneyAmount={lockMoneyAmount}
        isLoading={isLoading}
      />
      {isLoading && (
        <section className="rounded-xl border border-border bg-card p-3">
          <AppLoader label={`Loading data for user ${userId}…`} />
        </section>
      )}
      {apiErrors.length > 0 && (
        <section className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 space-y-1">
          <p className="text-sm font-medium text-destructive">
            Failed to load data from{" "}
            {import.meta.env.VITE_API_BASE_URL ?? "API"}
          </p>
          {apiErrors.map((message) => (
            <p key={message} className="text-xs text-muted-foreground">
              {message}
            </p>
          ))}
        </section>
      )}

      <section
        data-tour="quick-actions"
        className="rounded-2xl border border-border bg-gradient-to-br from-card via-card to-primary/5 p-4 shadow-sm"
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-display text-base font-bold">
            <Zap className="h-4 w-4 text-primary" />
            Quick actions
          </h3>
          <span className="font-label text-[10px] uppercase tracking-wider text-muted-foreground">
            One tap
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <button
            type="button"
            onClick={() => nav("/intent/new")}
            style={{ animationDelay: "0ms" }}
            className={`group relative flex flex-col items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-primary p-4 text-primary-foreground shadow-glow-primary opacity-0 animate-fade-in transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_12px_30px_-8px_hsl(var(--primary)/0.55)] active:translate-y-0 active:scale-[0.97] ${isActiveRoute("/intent") ? activeRing : ""}`}
          >
            <span className="pointer-events-none absolute -inset-x-10 -top-1/2 h-[200%] w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent translate-x-[-200%] group-hover:translate-x-[400%] transition-transform duration-700 ease-out" />
            <span className="grid h-10 w-10 place-items-center rounded-full bg-white/20 backdrop-blur-sm ring-0 ring-white/40 transition-all duration-300 group-hover:ring-4 group-hover:scale-110 group-hover:rotate-[-8deg]">
              <ArrowUpRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </span>
            <span className="font-label text-xs font-semibold uppercase tracking-wide">
              Lock Money
            </span>
          </button>

          <button
            type="button"
            onClick={() => setReceiveOpen(true)}
            style={{ animationDelay: "80ms" }}
            className={`group relative flex flex-col items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-secondary p-4 text-secondary-foreground shadow-sm opacity-0 animate-fade-in transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_12px_30px_-8px_hsl(var(--secondary)/0.55)] active:translate-y-0 active:scale-[0.97] ${receiveOpen ? activeRing : ""}`}
          >
            <span className="pointer-events-none absolute -inset-x-10 -top-1/2 h-[200%] w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent translate-x-[-200%] group-hover:translate-x-[400%] transition-transform duration-700 ease-out" />
            <span className="grid h-10 w-10 place-items-center rounded-full bg-white/20 backdrop-blur-sm ring-0 ring-white/40 transition-all duration-300 group-hover:ring-4 group-hover:scale-110 group-hover:rotate-[8deg]">
              <ArrowDownLeft className="h-5 w-5 transition-transform duration-300 group-hover:-translate-x-0.5 group-hover:translate-y-0.5" />
            </span>
            <span className="font-label text-xs font-semibold uppercase tracking-wide">
              Receive
            </span>
          </button>

          <button
            type="button"
            onClick={() => nav("/wallet")}
            style={{ animationDelay: "160ms" }}
            className={`group relative flex flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border border-border bg-card/60 p-4 backdrop-blur-md opacity-0 animate-fade-in transition-all duration-300 ease-out hover:-translate-y-1 hover:border-primary/40 hover:bg-card hover:shadow-md active:translate-y-0 active:scale-[0.97] ${isActiveRoute("/wallet") ? activeRingNeutral : ""}`}
          >
            <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/0 to-primary/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <span className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary ring-0 ring-primary/30 transition-all duration-300 group-hover:ring-4 group-hover:scale-110 group-hover:bg-primary/15">
              <Wallet className="h-5 w-5 transition-transform duration-300 group-hover:-translate-y-0.5" />
            </span>
            <span className="font-label text-xs font-semibold uppercase tracking-wide text-foreground">
              Wallet
            </span>
          </button>

          <button
            type="button"
            onClick={() => nav("/coach")}
            style={{ animationDelay: "240ms" }}
            className={`group relative flex flex-col items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-tertiary p-4 text-tertiary-foreground shadow-sm opacity-0 animate-fade-in transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_12px_30px_-8px_hsl(var(--tertiary)/0.55)] active:translate-y-0 active:scale-[0.97] ${isActiveRoute("/coach") ? activeRing : ""}`}
          >
            <span className="pointer-events-none absolute -inset-x-10 -top-1/2 h-[200%] w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent translate-x-[-200%] group-hover:translate-x-[400%] transition-transform duration-700 ease-out" />
            <span className="grid h-10 w-10 place-items-center rounded-full bg-white/20 backdrop-blur-sm ring-0 ring-white/40 transition-all duration-300 group-hover:ring-4 group-hover:scale-110">
              <Sparkles className="h-5 w-5 transition-transform duration-500 group-hover:rotate-[20deg] group-hover:scale-110 animate-[pulse_2.4s_ease-in-out_infinite]" />
            </span>
            <span className="font-label text-xs font-semibold uppercase tracking-wide">
              Ask IntPay
            </span>
          </button>
        </div>
      </section>

      <div data-tour="active-cards">
        <ActiveSmartCardsSlider
          cards={sliderCards}
          title="Active Smart Cards"
          onSeeAllHref="/cards"
        />
      </div>

      <div data-tour="activity">
        <UserActivity userId={userId} />
      </div>

      {/* <section className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display text-lg font-bold">Trust Score</h3>
          <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-label text-primary">
            <TrendingUp className="h-3.5 w-3.5" /> {currentPoints} pts
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Keep intent spending aligned and upload required proofs on time to
          increase your score.
        </p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg border border-border bg-surface/50 p-3">
            <p className="text-muted-foreground">Current points</p>
            <p className="font-display text-lg font-bold">{currentPoints}</p>
          </div>
          <div className="rounded-lg border border-border bg-surface/50 p-3">
            <p className="text-muted-foreground">Activity count</p>
            <p className="font-display text-lg font-bold flex items-center gap-1">
              <Activity className="h-4 w-4 text-primary" />{" "}
              {currentActivityCount}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          className="w-full font-label"
          onClick={() => nav("/features")}
        >
          See points category
        </Button>
      </section> */}

      <ReceiveDialog
        open={receiveOpen}
        onOpenChange={setReceiveOpen}
        account={{
          id: currentUser.id,
          name: currentUser.name,
          email: currentUser.email,
          initials: currentUser.initials,
        }}
      />
    </div>
  );
}
