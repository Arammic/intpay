import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Inbox,
  Send,
  ShieldCheck,
  ShieldAlert,
  Upload,
  ChevronRight,
  Snowflake,
  Ban,
  Clock3,
  CircleCheck,
  CircleOff,
  TriangleAlert,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { IntentCard as IntentCardVisual } from "@/components/IntentCard";
import type { CardsPageCardItem } from "@/api/cards";

const CARD_STATUS_LEGEND_EVENT = "card-status-legend-toggle";
const CARD_STATUS_LEGEND_KEY = "intentpay.cardStatusLegend.visible";

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function CardItem({
  card,
  perspective,
}: {
  card: CardsPageCardItem;
  perspective: "sent" | "received" | "guard";
}) {
  const nav = useNavigate();
  const isOwn = perspective === "guard" || perspective === "received";
  const openProof = card.proofs.find(
    (p) =>
      p.status === "awaiting_upload" ||
      p.status === "rejected" ||
      p.status === "expired_missed",
  );
  const verifyingProof = card.proofs.find((p) => p.status === "verifying");

  return (
    <div
      className="rounded-2xl bg-card border border-border/80 p-4 sm:p-6 cursor-pointer hover:border-primary/35 transition-base"
      onClick={() => nav(`/cards/${card.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          nav(`/cards/${card.id}`);
        }
      }}
    >
      {isOwn && openProof && (
        <div
          className="mb-4 rounded-xl border-2 border-tertiary bg-tertiary/15 p-3 sm:p-4 flex items-center gap-3"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="h-10 w-10 rounded-full bg-tertiary text-tertiary-foreground flex items-center justify-center">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-tertiary text-sm">
              Proof required
            </p>
            <p className="text-xs text-foreground mt-0.5">
              {openProof.status === "expired_missed"
                ? "Upload deadline passed - open card to upload proof."
                : `Upload ${card.proofName ?? "proof"} for $${openProof.amount.toFixed(2)} at ${openProof.merchantName}.`}
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => nav(`/proof/${card.id}/${openProof.id}`)}
            className="bg-tertiary text-tertiary-foreground"
          >
            <Upload className="h-4 w-4 mr-1.5" /> Upload
          </Button>
        </div>
      )}

      {isOwn && verifyingProof && !openProof && (
        <div className="mb-4 rounded-xl border border-primary/40 bg-primary/10 p-3 flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-primary animate-pulse" />
          <p className="text-xs">AI verifying your proof...</p>
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="w-[40%] min-w-[132px] max-w-[172px]">
          <IntentCardVisual
            className="w-full"
            cardNumber={`•••• •••• •••• ${card.secure.last4}`}
            cardholderName={card.secure.cardholderName}
            expiry={`${String(card.secure.expMonth).padStart(2, "0")}/${String(card.secure.expYear).slice(-2)}`}
            intentTitle={card.description || "Intent locked by policy"}
            statusLabel={card.status}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-label text-[10px] uppercase tracking-widest text-muted-foreground">
            {perspective === "received"
              ? "Received from"
              : perspective === "sent"
                ? "Sent to"
                : "My intent"}
          </p>
          <p className="font-display font-semibold truncate">
            {perspective === "guard"
              ? card.description || "My intent"
              : card.counterparty?.name}
          </p>
          <p className="text-xs text-muted-foreground">
            {perspective === "guard"
              ? timeAgo(card.createdAt)
              : card.counterparty?.handle}
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
            <div className="rounded-lg border border-border/80 bg-surface/40 px-2.5 py-1.5">
              <p className="font-label text-[9px] uppercase text-muted-foreground">
                Locked
              </p>
              <p className="font-display font-semibold tabular-nums">
                ${card.amount.toFixed(2)}
              </p>
            </div>
            <div className="rounded-lg border border-border/80 bg-surface/40 px-2.5 py-1.5">
              <p className="font-label text-[9px] uppercase text-muted-foreground">
                Remaining
              </p>
              <p className="font-display font-semibold tabular-nums">
                ${(card.amount - card.amountSpent).toFixed(2)}
              </p>
            </div>
          </div>
          <div className="mt-3 inline-flex items-center gap-1 text-xs font-label text-primary">
            See details <ChevronRight className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function CardsListApi({
  defaultTab = "guard",
  cardsGuard,
  cardsReceived,
  cardsSent,
}: {
  defaultTab?: "guard" | "received" | "sent";
  cardsGuard: CardsPageCardItem[];
  cardsReceived: CardsPageCardItem[];
  cardsSent: CardsPageCardItem[];
}) {
  const [showStatusLegend, setShowStatusLegend] = useState(false);
  const tabListClass = useMemo(
    () =>
      "bg-card border border-border/80 w-full grid grid-cols-3 rounded-xl p-1 h-auto",
    [],
  );

  useEffect(() => {
    const saved =
      typeof window !== "undefined"
        ? window.localStorage.getItem(CARD_STATUS_LEGEND_KEY)
        : null;
    setShowStatusLegend(saved === "1");

    const onLegendToggle = (e: Event) => {
      const next = (e as CustomEvent<boolean>).detail;
      if (typeof next === "boolean") {
        setShowStatusLegend(next);
      }
    };
    window.addEventListener(CARD_STATUS_LEGEND_EVENT, onLegendToggle as EventListener);
    return () =>
      window.removeEventListener(CARD_STATUS_LEGEND_EVENT, onLegendToggle as EventListener);
  }, []);

  const toggleLegend = () => {
    const next = !showStatusLegend;
    setShowStatusLegend(next);
    window.localStorage.setItem(CARD_STATUS_LEGEND_KEY, next ? "1" : "0");
    window.dispatchEvent(new CustomEvent<boolean>(CARD_STATUS_LEGEND_EVENT, { detail: next }));
  };

  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <section className="mb-4">
        <div className="flex justify-center">
          <button
            type="button"
            onClick={toggleLegend}
            className="inline-flex items-center rounded-full border border-border/80 bg-card/70 px-3 py-1 text-[11px] font-label uppercase tracking-wider text-muted-foreground backdrop-blur-sm transition-colors hover:bg-card hover:text-foreground"
          >
            Card Status Legend {showStatusLegend ? "Hide" : "Show"}
          </button>
        </div>
        {showStatusLegend && (
          <div className="mt-2 rounded-xl border border-border/80 bg-card p-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <LegendItem
                icon={TriangleAlert}
                label="Expired"
                description="Card has reached expiry and can't be used."
              />
              <LegendItem
                icon={Snowflake}
                label="Frozen"
                description="Card is manually paused until unfrozen."
              />
              <LegendItem
                icon={Ban}
                label="Spend blocked"
                description="New charges are blocked by policy/risk checks."
              />
              <LegendItem
                icon={Clock3}
                label="Refund pending"
                description="Refund request is open and under review."
              />
              <LegendItem
                icon={CircleCheck}
                label="Active"
                description="Card is usable under its rules."
              />
              <LegendItem
                icon={CircleOff}
                label="Inactive"
                description="Card exists but is not currently usable."
              />
            </div>
          </div>
        )}
      </section>

      <TabsList className={tabListClass}>
        <TabsTrigger
          value="guard"
          className="font-label rounded-lg py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
        >
          <ShieldCheck className="h-4 w-4 mr-1.5" /> My intent (
          {cardsGuard.length})
        </TabsTrigger>
        <TabsTrigger
          value="received"
          className="font-label rounded-lg py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
        >
          <Inbox className="h-4 w-4 mr-1.5" /> Received ({cardsReceived.length})
        </TabsTrigger>
        <TabsTrigger
          value="sent"
          className="font-label rounded-lg py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
        >
          <Send className="h-4 w-4 mr-1.5" /> Sent ({cardsSent.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="guard" className="mt-5">
        {cardsGuard.length === 0 ? (
          <EmptyState text="No intent cards yet. Use Lock Money to lock funds for your own intent." />
        ) : (
          <div className="space-y-6">
            {cardsGuard.map((c) => (
              <CardItem key={c.id} card={c} perspective="guard" />
            ))}
          </div>
        )}
      </TabsContent>
      <TabsContent value="received" className="mt-5">
        {cardsReceived.length === 0 ? (
          <EmptyState text="No intent cards received yet. Switch to another user and send one!" />
        ) : (
          <div className="space-y-6">
            {cardsReceived.map((c) => (
              <CardItem key={c.id} card={c} perspective="received" />
            ))}
          </div>
        )}
      </TabsContent>
      <TabsContent value="sent" className="mt-5">
        {cardsSent.length === 0 ? (
          <EmptyState text="You have not sent any intent cards. Use Send with intent to issue one." />
        ) : (
          <div className="space-y-6">
            {cardsSent.map((c) => (
              <CardItem key={c.id} card={c} perspective="sent" />
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}

function LegendItem({
  icon: Icon,
  label,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-surface/40 px-2.5 py-2">
      <p className="flex items-center gap-1.5 text-xs font-semibold">
        <Icon className="h-3.5 w-3.5 text-primary" />
        {label}
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
        {description}
      </p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center">
      <p className="text-muted-foreground text-sm">{text}</p>
    </div>
  );
}
