import { useEffect, useMemo, useState } from "react";
import type { IntentCard, User } from "@/lib/types";
import { PROOF_UPLOAD_WINDOW_MS } from "@/lib/store";
import { DebitCard } from "@/components/DebitCard";
import { UserAvatar } from "@/components/UserAvatar";
import { Timer, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { expiryMessageFromEvents } from "@/lib/expiryMessage";

function formatCountdown(ms: number) {
  if (ms <= 0) return "0:00";
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

interface Props {
  card: IntentCard;
  counterparty: User;
  variant: "purple" | "green" | "orange" | "neutral";
  /** Optional custom background for the card chrome (see DebitCard). */
  backgroundImageUrl?: string;
}

export function ReceivedCardPreview({ card, counterparty, variant, backgroundImageUrl }: Props) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const statusLabel = useMemo(() => {
    const s = card.status;
    if (s === "pending") return "Pending";
    if (s === "active") return "Active";
    if (s === "expired") return "Expired";
    if (s === "canceled") return "Canceled";
    if (s === "destroyed") return "Destroyed";
    return s;
  }, [card.status]);

  const expiryLine = useMemo(
    () => (card.status === "expired" ? expiryMessageFromEvents(card.events, card.status) : null),
    [card.status, card.events],
  );

  const proofOpen = card.proofs.find(
    (p) => p.status === "awaiting_upload" && card.requireProof,
  );
  const proofDeadline = proofOpen
    ? proofOpen.proofDeadlineAt ?? proofOpen.createdAt + PROOF_UPLOAD_WINDOW_MS
    : 0;
  const proofWindowLeft = proofOpen ? Math.max(0, proofDeadline - now) : 0;
  const showProofDeadline = !!proofOpen && card.requireProof;

  const notBeforeLeft =
    card.activeNotBeforeTs != null && now < card.activeNotBeforeTs
      ? card.activeNotBeforeTs - now
      : 0;
  const notAfterLeft =
    card.activeNotAfterTs != null && now < card.activeNotAfterTs
      ? card.activeNotAfterTs - now
      : 0;
  const postFirstLeft =
    card.usedCount > 0 && card.postFirstUseValidUntilTs != null && now < card.postFirstUseValidUntilTs
      ? card.postFirstUseValidUntilTs - now
      : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <UserAvatar user={counterparty} size="md" />
          <div>
            <p className="font-label text-[10px] uppercase tracking-widest text-muted-foreground">Received from</p>
            <p className="font-display font-semibold truncate">{counterparty.name}</p>
          </div>
        </div>
        <span
          className={cn(
            "text-[10px] font-label uppercase tracking-wider px-2.5 py-1 rounded-full border",
            card.status === "active"
              ? "bg-secondary/15 text-secondary border-secondary/30"
              : card.status === "pending"
                ? "bg-tertiary/15 text-tertiary border-tertiary/30"
                : "bg-muted text-muted-foreground border-border",
          )}
        >
          {statusLabel}
        </span>
      </div>

      {expiryLine && (
        <p className="text-[11px] text-muted-foreground rounded-lg border border-border/80 bg-muted/20 px-2.5 py-1.5 leading-snug">
          {expiryLine}
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
        <div className="rounded-lg border border-border bg-surface/50 p-2">
          <p className="font-label text-[9px] uppercase text-muted-foreground">Uses</p>
          <p className="font-display font-semibold tabular-nums">
            {card.usedCount} <span className="text-muted-foreground font-normal">/ {card.cancelAfterUseCount}</span>
          </p>
        </div>
        {notBeforeLeft > 0 && (
          <div className="rounded-lg border border-tertiary/30 bg-tertiary/5 p-2 flex items-start gap-1.5">
            <Timer className="h-3.5 w-3.5 text-tertiary shrink-0 mt-0.5" />
            <div>
              <p className="font-label text-[9px] uppercase text-muted-foreground">Opens in</p>
              <p className="font-mono font-medium text-tertiary">{formatCountdown(notBeforeLeft)}</p>
            </div>
          </div>
        )}
        {notAfterLeft > 0 && card.status !== "expired" && card.status !== "canceled" && card.status !== "destroyed" && (
          <div className="rounded-lg border border-border p-2 flex items-start gap-1.5">
            <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="font-label text-[9px] uppercase text-muted-foreground">Ends in</p>
              <p className="font-mono font-medium">{formatCountdown(notAfterLeft)}</p>
            </div>
          </div>
        )}
        {postFirstLeft > 0 && (
          <div className="rounded-lg border border-border p-2 flex items-start gap-1.5">
            <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="font-label text-[9px] uppercase text-muted-foreground">After 1st use</p>
              <p className="font-mono font-medium">{formatCountdown(postFirstLeft)}</p>
            </div>
          </div>
        )}
        {showProofDeadline && (
          <div className="rounded-lg border-2 border-tertiary/50 bg-tertiary/10 p-2 col-span-2 sm:col-span-1">
            <p className="font-label text-[9px] uppercase text-tertiary">Proof deadline</p>
            <p className="font-mono font-semibold text-tertiary">{formatCountdown(proofWindowLeft)}</p>
          </div>
        )}
      </div>

      {card.description && (
        <p className="text-sm text-muted-foreground italic border-l-2 border-primary pl-3">"{card.description}"</p>
      )}

      {/* Set `backgroundImageUrl` to a hosted or imported image URL to skin the card; default remains the gradient. */}
      <DebitCard card={card} variant={variant} displayMode="full" backgroundImageUrl={backgroundImageUrl} />
    </div>
  );
}
