import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { useApp, PROOF_UPLOAD_WINDOW_MS } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserAvatar } from "@/components/UserAvatar";
import { IntentCard } from "@/components/IntentCard";
import { SimulateTapDialog } from "@/components/SimulateTapDialog";
import { mccByCode } from "@/lib/mcc";
import { retrieveCardDetails } from "@/lib/stripeIssuingMock";
import {
  Copy,
  Check,
  Eye,
  EyeOff,
  Smartphone,
  Lock,
  Wifi,
  ShieldAlert,
  ShieldCheck,
  Upload,
  AlertTriangle,
  Mail,
  ExternalLink,
  Store,
  Wallet as WalletIcon,
  ListChecks,
} from "lucide-react";
import { toast } from "sonner";
import { expiryMessageFromEvents } from "@/lib/expiryMessage";

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatTs(ts?: number) {
  if (ts == null) return "—";
  return new Date(ts).toLocaleString();
}

/* ============================================================
 * Glassy action button used for Copy / Wallet rows
 * ============================================================ */
function GlassButton({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  tone = "default",
  title,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  tone?: "default" | "primary" | "secondary";
  title?: string;
}) {
  const toneClasses =
    tone === "primary"
      ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/15"
      : tone === "secondary"
        ? "border-secondary/30 bg-secondary/10 text-secondary hover:bg-secondary/15"
        : "border-border bg-card/60 text-foreground hover:bg-card/80";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`group relative flex flex-1 min-w-[120px] items-center justify-center gap-2 rounded-xl border ${toneClasses} px-3 py-2.5 backdrop-blur-md transition-all disabled:cursor-not-allowed disabled:opacity-60`}
    >
      <Icon className="h-4 w-4" />
      <span className="font-label text-xs uppercase tracking-wide">{label}</span>
      {disabled && <Lock className="h-3 w-3 opacity-60" />}
    </button>
  );
}

/* ============================================================
 * Section wrapper
 * ============================================================ */
function Section({
  title,
  icon: Icon,
  children,
  tone = "default",
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  tone?: "default" | "warn" | "success" | "info";
}) {
  const toneClasses =
    tone === "warn"
      ? "border-tertiary/40 bg-tertiary/5"
      : tone === "success"
        ? "border-secondary/30 bg-secondary/5"
        : tone === "info"
          ? "border-primary/25 bg-primary/5"
          : "border-border bg-card";
  return (
    <section className={`rounded-2xl border ${toneClasses} p-4 sm:p-5`}>
      <h3 className="mb-3 flex items-center gap-2 font-label text-[11px] uppercase tracking-wider text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {title}
      </h3>
      {children}
    </section>
  );
}

/* ============================================================
 * Page
 * ============================================================ */
export default function CardDetailsPage() {
  const { cardId } = useParams();
  const nav = useNavigate();
  const { state, currentUser, activateCard, requestGuardRefundSupport } = useApp();

  const [revealed, setRevealed] = useState(false);
  const [revealLoading, setRevealLoading] = useState(false);
  const [secureLive, setSecureLive] = useState<null | {
    fullNumber: string;
    cvc: string;
    expMonth: number;
    expYear: number;
    cardholderName: string;
    last4: string;
  }>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [tapOpen, setTapOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundMsg, setRefundMsg] = useState("");

  const { card, perspective, counterparty } = useMemo(() => {
    const c = state.cards.find((x) => x.id === cardId);
    if (!c) return { card: null, perspective: null, counterparty: null } as const;
    const me = currentUser.id;
    let perspective: "guard" | "received" | "sent";
    if (c.kind === "guard" && c.fromUserId === me) perspective = "guard";
    else if (c.kind === "send" && c.toUserId === me) perspective = "received";
    else perspective = "sent";
    const cp =
      perspective === "guard"
        ? currentUser
        : perspective === "received"
          ? state.users.find((u) => u.id === c.fromUserId) ?? currentUser
          : state.users.find((u) => u.id === c.toUserId) ?? currentUser;
    return { card: c, perspective, counterparty: cp };
  }, [state.cards, state.users, cardId, currentUser]);

  const expiryWhy = useMemo(() => {
    if (!card) return null;
    return expiryMessageFromEvents(card.events, card.status);
  }, [card]);

  if (!card || !perspective) {
    return (
      <div className="pb-8">
        <PageHeader title="Card" fallback="/cards" />
        <p className="pt-6 text-sm text-muted-foreground">Card not found.</p>
        <Button className="mt-4" onClick={() => nav("/cards")}>
          Back to cards
        </Button>
      </div>
    );
  }

  const remaining = Math.max(0, card.amount - card.amountSpent);
  const usesLeft = Math.max(0, card.cancelAfterUseCount - card.usedCount);
  const usePct = (card.usedCount / card.cancelAfterUseCount) * 100;
  const spendPct = (card.amountSpent / card.amount) * 100;

  const secure = secureLive ?? card._secure;
  const expiryStr = `${String(secure.expMonth).padStart(2, "0")}/${String(secure.expYear).slice(-2)}`;
  const maskedPan = `•••• •••• •••• ${secure.last4}`;
  const fullPan = (secureLive?.fullNumber ?? card._secure.fullNumber).replace(/(.{4})/g, "$1 ").trim();

  const reveal = async () => {
    if (revealed) {
      setRevealed(false);
      return;
    }
    setRevealLoading(true);
    try {
      const details = await retrieveCardDetails(card);
      setSecureLive(details);
      setRevealed(true);
    } finally {
      setRevealLoading(false);
    }
  };

  const copy = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(label);
      setTimeout(() => setCopiedField(null), 1400);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Couldn't copy");
    }
  };

  const openProof = card.proofs.find(
    (p) => p.status === "awaiting_upload" || p.status === "rejected" || p.status === "expired_missed",
  );
  const verifyingProof = card.proofs.find((p) => p.status === "verifying");
  const verifiedProofs = card.proofs.filter((p) => p.status === "verified");

  /* ===================== HEADER (perspective-aware) ===================== */
  const headerTitle =
    perspective === "guard"
      ? "My self-locked card"
      : perspective === "received"
        ? "Received intent"
        : "Sent intent";
  const headerSubtitle =
    perspective === "guard"
      ? "Full policy & history"
      : perspective === "received"
        ? `From ${counterparty.name}`
        : `To ${counterparty.name}`;

  /* ===================== SHARED — CARD VISUAL ===================== */
  const CardVisualFull = (
    <IntentCard
      cardNumber={revealed ? fullPan : maskedPan}
      cardholderName={revealed ? secure.cardholderName : secure.cardholderName}
      expiry={expiryStr}
      intentTitle={card.description || "Intent locked by policy"}
      statusLabel={card.status}
      size="lg"
    />
  );

  const CardVisualSendOnly = (
    <IntentCard
      cardNumber={maskedPan}
      cardholderName={card._secure.cardholderName}
      expiry={expiryStr}
      intentTitle={card.description || "Intent locked by policy"}
      statusLabel={card.status}
      size="md"
    />
  );

  /* ===================== SHARED — STATS GRID ===================== */
  const StatsGrid = (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <div className="rounded-xl border border-border bg-card/60 p-3 backdrop-blur">
        <p className="font-label text-[10px] uppercase text-muted-foreground">
          {perspective === "received" ? "Sent amount" : "Initial"}
        </p>
        <p className="font-display text-lg font-semibold">${card.amount.toFixed(2)}</p>
      </div>
      <div className="rounded-xl border border-border bg-card/60 p-3 backdrop-blur">
        <p className="font-label text-[10px] uppercase text-muted-foreground">Remaining</p>
        <p className="font-display text-lg font-semibold">${remaining.toFixed(2)}</p>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-gradient-secondary" style={{ width: `${100 - spendPct}%` }} />
        </div>
      </div>
      <div className="col-span-2 rounded-xl border border-border bg-card/60 p-3 backdrop-blur sm:col-span-1">
        <p className="font-label text-[10px] uppercase text-muted-foreground">Uses</p>
        <p className="font-display text-lg font-semibold">
          {card.usedCount}
          <span className="text-sm font-normal text-muted-foreground">/{card.cancelAfterUseCount}</span>
        </p>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-gradient-tertiary" style={{ width: `${usePct}%` }} />
        </div>
      </div>
    </div>
  );

  /* ===================== SHARED — RULES APPLIED ===================== */
  const RulesApplied = (
    <Section title="Rules applied" icon={ShieldCheck}>
      <div className="space-y-3">
        {/* Approved merchants */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary/15">
              <Store className="h-5 w-5 text-secondary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-label text-[10px] uppercase tracking-widest text-muted-foreground">
                Approved merchant
              </p>
              <p className="font-display text-base font-semibold mt-0.5">
                {card.allowedMccCodes
                  .slice(0, 2)
                  .map((c) => mccByCode(c)?.name ?? c)
                  .join(", ") || "Any merchant"}
                {card.allowedMccCodes.length > 2 && ` +${card.allowedMccCodes.length - 2}`}
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                Transactions restricted to MCC codes related to{" "}
                {card.allowedMccCodes
                  .map((c) => mccByCode(c)?.name?.toLowerCase() ?? c)
                  .join(" and ")}
                .
              </p>
            </div>
          </div>
        </div>

        {/* Spending limit */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary/15">
              <WalletIcon className="h-5 w-5 text-secondary" />
            </div>
            <div className="flex-1">
              <p className="font-label text-[10px] uppercase tracking-widest text-muted-foreground">
                Spending limit
              </p>
              <p className="font-display text-base font-semibold mt-0.5">
                ${card.amount.toFixed(2)} total
              </p>
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-gradient-secondary" style={{ width: `${spendPct}%` }} />
              </div>
              <div className="mt-1.5 flex justify-between text-xs">
                <span className="text-foreground font-medium">${card.amountSpent.toFixed(2)} spent</span>
                <span className="text-muted-foreground">${remaining.toFixed(2)} left</span>
              </div>
            </div>
          </div>
        </div>

        <details className="rounded-xl border border-border bg-muted/30 p-3 text-xs">
          <summary className="cursor-pointer font-label uppercase text-muted-foreground">
            Time constraints
          </summary>
          <dl className="mt-2 grid gap-1.5">
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Active not before</dt>
              <dd>{formatTs(card.activeNotBeforeTs)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Active not after</dt>
              <dd>{formatTs(card.activeNotAfterTs)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">After first use, valid until</dt>
              <dd>{formatTs(card.postFirstUseValidUntilTs)}</dd>
            </div>
          </dl>
        </details>
      </div>
    </Section>
  );

  /* ===================== SHARED — ACTIVITY LOG ===================== */
  const ActivityLog = (
    <Section title="Recent activity" icon={ListChecks}>
      <ul className="space-y-2.5">
        {card.events.length === 0 && (
          <li className="rounded-xl border border-dashed border-border bg-muted/20 p-4 text-center text-xs text-muted-foreground">
            No activity yet.
          </li>
        )}
        {card.events
          .slice()
          .reverse()
          .slice(0, 12)
          .map((e) => {
            const isApproved =
              e.kind === "approved" || e.kind === "proof_verified";
            const isDeclined =
              e.kind === "declined" || e.kind === "proof_rejected" || e.kind === "proof_deadline_missed";
            const isInfo = !isApproved && !isDeclined;
            const Icon = isApproved ? Store : isDeclined ? AlertTriangle : ShieldCheck;
            const iconWrap = isApproved
              ? "bg-secondary/15 text-secondary"
              : isDeclined
                ? "bg-destructive/15 text-destructive"
                : "bg-primary/15 text-primary";
            const rawAmount = (e.meta as { amount?: number } | undefined)?.amount;
            const amount = typeof rawAmount === "number" ? rawAmount : null;
            const amountStr = amount != null ? `$${Math.abs(amount).toFixed(2)}` : null;
            return (
              <li
                key={e.id}
                className="flex items-start gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm"
              >
                <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${iconWrap}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display text-sm font-semibold truncate">{e.message}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{timeAgo(e.ts)}</p>
                  {isDeclined && (
                    <span className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-destructive/10 px-1.5 py-0.5 text-[10px] font-label uppercase tracking-wide text-destructive">
                      <AlertTriangle className="h-2.5 w-2.5" /> Blocked
                    </span>
                  )}
                </div>
                <div className="text-right shrink-0">
                  {amountStr && (
                    <p
                      className={`font-display text-sm font-semibold tabular-nums ${
                        isDeclined
                          ? "text-muted-foreground line-through"
                          : isApproved
                            ? "text-destructive"
                            : "text-secondary"
                      }`}
                    >
                      {isApproved ? "-" : isInfo ? "+" : ""}
                      {amountStr}
                    </p>
                  )}
                  {isApproved && (
                    <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-label text-secondary">
                      <Check className="h-2.5 w-2.5" /> Approved
                    </span>
                  )}
                  {isInfo && amountStr && (
                    <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-label text-primary">
                      <Check className="h-2.5 w-2.5" /> Added
                    </span>
                  )}
                </div>
              </li>
            );
          })}
      </ul>
    </Section>
  );

  /* ===================== SHARED — PROOF SECTION ===================== */
  const ProofSection = (() => {
    if (!card.requireProof) {
      return (
        <Section title="Payment proof" icon={ShieldCheck} tone="info">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/15">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 text-sm">
              <p className="font-display font-semibold">No proof required</p>
              <p className="mt-1 text-xs text-muted-foreground">
                This card does not ask you to upload an invoice or receipt after a payment.
                Spend within the rules above and the transaction completes immediately — no
                follow-up upload needed.
              </p>
            </div>
          </div>
        </Section>
      );
    }

    if (openProof) {
      return (
        <Section title="Proof required" icon={Upload} tone="warn">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-tertiary/15">
                <AlertTriangle className="h-5 w-5 text-tertiary" />
              </div>
              <div>
                <p className="font-display text-sm font-semibold text-tertiary">
                  Upload {card.proofName ?? "receipt"} for ${openProof.amount.toFixed(2)}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  At {openProof.merchantName}
                  {openProof.proofDeadlineAt
                    ? ` · deadline ${new Date(openProof.proofDeadlineAt).toLocaleString()}`
                    : ""}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Tap the button to enter what you bought and attach a photo of the receipt.
                </p>
              </div>
            </div>
            <Button
              className="bg-tertiary text-tertiary-foreground font-label shrink-0"
              onClick={() => nav(`/proof/${card.id}/${openProof.id}`)}
            >
              <Upload className="mr-1.5 h-4 w-4" />
              {openProof.status === "expired_missed" ? "Upload (late)" : "Upload proof"}
            </Button>
          </div>
        </Section>
      );
    }

    if (verifyingProof) {
      return (
        <Section title="Proof verifying" icon={ShieldCheck} tone="info">
          <p className="text-sm">
            We're checking your last upload for{" "}
            <span className="font-semibold">{verifyingProof.merchantName}</span>. You'll see
            the result here in a moment.
          </p>
        </Section>
      );
    }

    return (
      <Section title="Payment proof" icon={ShieldCheck} tone="info">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/15">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 text-sm">
            <p className="font-display font-semibold">
              Proof required after each payment
              {card.proofName ? `: ${card.proofName}` : ""}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              After every successful payment with this card, you'll be asked to upload a
              proof (receipt or invoice) within{" "}
              {Math.round(PROOF_UPLOAD_WINDOW_MS / 60000)} minutes. We'll notify you here as
              soon as a proof is required — no need to do anything before then.
            </p>
            {verifiedProofs.length > 0 && (
              <p className="mt-2 text-xs text-secondary">
                ✓ {verifiedProofs.length} proof{verifiedProofs.length > 1 ? "s" : ""} verified.
              </p>
            )}
          </div>
        </div>
      </Section>
    );
  })();

  /* ===================== SHARED — COUNTERPARTY CARD ===================== */
  const CounterpartyCard = (
    <Section title={perspective === "received" ? "Sent by" : "Sent to"} icon={undefined}>
      <Link
        to={perspective === "received" ? "#" : `/intent/new?to=${counterparty.id}`}
        className="flex items-center gap-3 rounded-xl border border-border bg-card/40 p-3 transition hover:bg-card/70"
      >
        <UserAvatar user={counterparty} size="lg" />
        <div className="flex-1 min-w-0">
          <p className="font-display text-base font-semibold">{counterparty.name}</p>
          <p className="text-xs text-muted-foreground">{counterparty.handle}</p>
          <p className="truncate text-xs text-muted-foreground">{counterparty.email}</p>
        </div>
        {perspective === "sent" && (
          <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </Link>
    </Section>
  );

  /* ===================== RENDER ===================== */
  return (
    <div className="-mt-2 pb-10">
      <PageHeader title={headerTitle} subtitle={headerSubtitle} fallback="/cards" />

      <div className="mx-auto max-w-2xl space-y-5 pt-4">
        {/* ============ SENT perspective: minimal card view ============ */}
        {perspective === "sent" ? (
          <>
            <section className="overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-secondary/10 p-4 sm:p-5">
              {CardVisualSendOnly}
              <p className="mt-3 text-center text-xs text-muted-foreground">
                The recipient holds this card. Card numbers and CVC are not shown to the sender.
              </p>
            </section>

            {CounterpartyCard}

            <Section title="Intent details">
              <dl className="grid gap-2 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Sent amount</dt>
                  <dd className="font-medium">${card.amount.toFixed(2)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Spent</dt>
                  <dd>${card.amountSpent.toFixed(2)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Uses</dt>
                  <dd>
                    {card.usedCount} / {card.cancelAfterUseCount}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Status</dt>
                  <dd className="uppercase font-label text-xs">{card.status}</dd>
                </div>
                {card.description && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Description</dt>
                    <dd className="max-w-[60%] text-right italic">"{card.description}"</dd>
                  </div>
                )}
              </dl>
            </Section>

            {RulesApplied}
            {ActivityLog}

            {card.status === "expired" && expiryWhy && (
              <Section title="Why expired" tone="warn">
                <p className="text-sm">{expiryWhy}</p>
              </Section>
            )}
          </>
        ) : (
          /* ============ GUARD or RECEIVED perspective ============ */
          <>
            {/* Card hero */}
            <section className="overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-secondary/10 p-4 sm:p-5">
              {CardVisualFull}

              <div className="mt-4 space-y-3">
                <p className="text-xs text-muted-foreground">
                  CVC: <span className="font-mono text-foreground">{revealed ? secure.cvc : "•••"}</span>
                </p>

                {/* Action row 1: copy / reveal */}
                <div className="flex flex-wrap gap-2">
                  <GlassButton
                    icon={revealed ? EyeOff : Eye}
                    label={revealLoading ? "Loading…" : revealed ? "Hide" : "Reveal"}
                    onClick={reveal}
                    disabled={revealLoading}
                    tone="primary"
                  />
                  <GlassButton
                    icon={copiedField === "Card number" ? Check : Copy}
                    label="Copy number"
                    onClick={() =>
                      copy("Card number", revealed ? secure.fullNumber : maskedPan.replace(/\s/g, ""))
                    }
                    tone="default"
                  />
                  <GlassButton
                    icon={copiedField === "CVC" ? Check : Copy}
                    label="Copy CVC"
                    onClick={() => copy("CVC", revealed ? secure.cvc : "•••")}
                    disabled={!revealed}
                    title={revealed ? undefined : "Reveal first to copy CVC"}
                    tone="default"
                  />
                </div>

                {/* Action row 2: wallets (disabled) */}
                <div className="flex flex-wrap gap-2">
                  <GlassButton
                    icon={Smartphone}
                    label="Apple Wallet"
                    disabled
                    title="Coming soon"
                  />
                  <GlassButton
                    icon={Smartphone}
                    label="Samsung Wallet"
                    disabled
                    title="Coming soon"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Wallet add-ons are coming soon — for now, reveal the number and add it
                  manually to your phone wallet.
                </p>
              </div>
            </section>

            {/* Quick stats */}
            {StatsGrid}

            {/* Counterparty (received only) */}
            {perspective === "received" && CounterpartyCard}

            {/* Rules */}
            {RulesApplied}

            {/* Activity */}
            {ActivityLog}

            {/* Why expired */}
            {card.status === "expired" && expiryWhy && (
              <Section title="Why expired" tone="warn">
                <p className="text-sm">{expiryWhy}</p>
              </Section>
            )}

            {/* Proof — always last */}
            {ProofSection}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2">
              {perspective === "received" && card.status === "pending" && (
                <Button onClick={() => activateCard(card.id)}>Activate card</Button>
              )}
              {card.status === "active" && !openProof && !verifyingProof && (
                <Button variant="secondary" onClick={() => setTapOpen(true)}>
                  <Wifi className="mr-1.5 h-4 w-4 rotate-90" /> Simulate tap
                </Button>
              )}

              {/* Refund button — guard only, opens support modal */}
              {perspective === "guard" && card.status !== "destroyed" && (
                <Button
                  variant="destructive"
                  className="ml-auto"
                  onClick={() => setRefundOpen(true)}
                >
                  <ShieldAlert className="mr-1.5 h-4 w-4" />
                  Request refund
                </Button>
              )}
            </div>
          </>
        )}

        <div className="pt-2">
          <Link to="/cards" className="font-label text-sm text-primary">
            ← Back to list
          </Link>
        </div>
      </div>

      <SimulateTapDialog open={tapOpen} onOpenChange={setTapOpen} card={tapOpen ? card : null} />

      {/* Refund support modal (guard only) */}
      <Dialog open={refundOpen} onOpenChange={setRefundOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              Contact support for a refund
            </DialogTitle>
            <DialogDescription>
              Refunds on self-locked cards are handled by our support team. Send us a short
              message describing why you need a refund and we'll get back to you at{" "}
              <span className="font-medium text-foreground">intpay@help.com</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="refund-msg" className="text-xs">
              Your message
            </Label>
            <Textarea
              id="refund-msg"
              rows={4}
              placeholder="Tell us what happened…"
              value={refundMsg}
              onChange={(e) => setRefundMsg(e.target.value)}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setRefundOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const msg = refundMsg.trim();
                if (!msg) {
                  toast.error("Please write a short message first");
                  return;
                }
                requestGuardRefundSupport(card.id, msg);
                toast.success("Sent to intpay@help.com");
                setRefundMsg("");
                setRefundOpen(false);
              }}
            >
              <Mail className="mr-1.5 h-4 w-4" />
              Send to support
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
