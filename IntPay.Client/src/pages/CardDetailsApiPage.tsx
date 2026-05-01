import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { setCardLockState, requestCardRefund } from "@/api/cardActions";
import { useCurrentUserContext } from "@/lib/currentUserContext";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { IntentCard } from "@/components/IntentCard";
import { useCardDetailsData } from "@/hooks/useCardDetailsData";
import { AppLoader } from "@/components/AppLoader";
import { mccByCode } from "@/lib/mcc";
import {
  Copy,
  Check,
  Eye,
  EyeOff,
  Smartphone,
  Lock,
  ShieldAlert,
  ShieldCheck,
  Upload,
  AlertTriangle,
  Mail,
  Store,
  Wallet as WalletIcon,
  ListChecks,
  ArrowRight,
  User as UserIcon,
  Info,
  RefreshCw,
  Snowflake,
  FileWarning,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

/* ------------------------------ helpers ------------------------------ */

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function eventTone(message: string): "approved" | "blocked" | "info" {
  const m = message.toLowerCase();
  if (m.includes("declin") || m.includes("block") || m.includes("reject") || m.includes("missed"))
    return "blocked";
  if (m.includes("approved") || m.includes("verified") || m.includes("paid"))
    return "approved";
  return "info";
}

function parseAmount(message: string): number | null {
  const m = message.match(/\$([0-9]+(?:\.[0-9]+)?)/);
  return m ? Number(m[1]) : null;
}

/* ------------------------------ Glass Button ------------------------------ */
function GlassBtn({
  icon: Icon,
  label,
  onClick,
  disabled,
  tone = "neutral",
  title,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  tone?: "neutral" | "primary" | "secondary";
  title?: string;
}) {
  const toneCls =
    tone === "primary"
      ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/15"
      : tone === "secondary"
        ? "border-secondary/30 bg-secondary/10 text-secondary hover:bg-secondary/15"
        : "border-border bg-card/70 text-foreground hover:bg-card";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`group flex flex-1 min-w-[110px] items-center justify-center gap-2 rounded-xl border ${toneCls} px-3 py-2.5 backdrop-blur-md shadow-sm transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0`}
    >
      <Icon className="h-4 w-4" />
      <span className="font-label text-xs font-semibold uppercase tracking-wide">{label}</span>
      {disabled && <Lock className="h-3 w-3 opacity-60" />}
    </button>
  );
}

/* ------------------------------ Section wrapper ------------------------------ */
function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-2.5 flex items-center gap-1.5 font-display text-base font-bold">
        {Icon && <Icon className="h-4 w-4 text-primary" />}
        {title}
      </h3>
      {children}
    </section>
  );
}

/* ============================================================
 * Page
 * ============================================================ */
export default function CardDetailsApiPage() {
  const { cardId } = useParams();
  const nav = useNavigate();
  const { userId } = useCurrentUserContext();
  const { data: detailsResponse, isLoading } = useCardDetailsData(cardId);
  const details = detailsResponse?.data;
  const apiErrors = detailsResponse?.error ?? [];
  const queryClient = useQueryClient();

  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundMsg, setRefundMsg] = useState("");
  const [refundSubmitting, setRefundSubmitting] = useState(false);
  const [showAllMcc, setShowAllMcc] = useState(false);
  const [proofToggled, setProofToggled] = useState<Record<string, boolean>>({});

  // Freeze / unfreeze dialog
  const [freezeOpen, setFreezeOpen] = useState(false);
  const [freezePhrase, setFreezePhrase] = useState("");
  const [freezeSubmitting, setFreezeSubmitting] = useState(false);

  const refreshAll = async () => {
    await queryClient.invalidateQueries({ queryKey: ["card-details", cardId] });
  };

  /* --------- loading / error / not-found states --------- */
  if (isLoading) {
    return (
      <section className="pt-4 rounded-xl border border-border bg-card p-3">
        <AppLoader label="Syncing /app/cards/:cardId data..." />
      </section>
    );
  }
  if (apiErrors.length > 0) {
    return (
      <section className="pt-4 rounded-xl border border-destructive/40 bg-destructive/5 p-3 space-y-1">
        <p className="text-sm font-medium text-destructive">
          Failed to load /app/cards/:cardId from localhost:8000
        </p>
        {apiErrors.map((m) => (
          <p key={m} className="text-xs text-muted-foreground">
            {m}
          </p>
        ))}
      </section>
    );
  }
  if (!details) {
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

  const { perspective } = details;
  const remaining = Math.max(0, details.amount - details.amountSpent);
  const unlimitedUses = details.cancelAfterUseCount >= 99999;
  const usePct = unlimitedUses
    ? 0
    : (details.usedCount / Math.max(1, details.cancelAfterUseCount)) * 100;
  const spendPct = details.amount > 0 ? (details.amountSpent / details.amount) * 100 : 0;

  // Whether the user is allowed to view the card number / CVC.
  // Hide secrets when the card is unusable (expired or frozen) and on sender perspective.
  const canViewSecrets = perspective !== "sent" && !details.hideSecrets;

  // Real backend values — no mocks.
  const fullPan = details.secure.fullNumber ?? "";
  const realCvc = details.secure.cvv ?? "";
  const expMonthStr = String(details.secure.expMonth).padStart(2, "0");
  const expYearFull = String(details.secure.expYear);
  const expYearShort = expYearFull.slice(-2);
  // Card on the front: MM/YY (industry standard). Detail rows show full year.
  const expiryStr = `${expMonthStr}/${expYearShort}`;
  const expiryLong = `${expMonthStr}/${expYearFull}`;
  const formattedFullPan = fullPan.replace(/(.{4})/g, "$1 ").trim();
  const maskedPan = `•••• •••• •••• ${details.secure.last4}`;

  // Status pill copy + tone, derived from the computed status.
  const statusMeta: Record<
    typeof details.status,
    { label: string; tone: "active" | "warn" | "danger" | "muted" }
  > = {
    active: { label: "Active", tone: "active" },
    inactive: { label: "Inactive", tone: "muted" },
    expired: { label: "Expired", tone: "danger" },
    frozen: { label: "Frozen", tone: "warn" },
    locked_invoice: { label: "Locked · proof needed", tone: "warn" },
    spend_blocked: { label: "Spending blocked", tone: "danger" },
    refund_pending: { label: "Refund pending", tone: "muted" },
  };
  const statusInfo = statusMeta[details.status];
  const statusToneCls =
    statusInfo.tone === "active"
      ? "bg-secondary/15 text-secondary border-secondary/30"
      : statusInfo.tone === "warn"
        ? "bg-tertiary/15 text-tertiary border-tertiary/30"
        : statusInfo.tone === "danger"
          ? "bg-destructive/15 text-destructive border-destructive/30"
          : "bg-muted text-muted-foreground border-border";

  const copy = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied(null), 1400);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Couldn't copy");
    }
  };

  const resolvedMcc = details.allowedMccCodes.map((code) => {
    const fromPayload = details.allowedMcc.find((m) => m.code === code)?.name?.trim();
    const fromLocalList = mccByCode(code)?.name;
    const displayName = fromPayload || fromLocalList || code;
    return { code, displayName };
  });

  /* --------- proof state classification --------- */
  const openProof = details.proofs.find(
    (p) => p.status === "awaiting_upload" || p.status === "rejected" || p.status === "expired_missed",
  );
  const verifyingProof = details.proofs.find((p) => p.status === "verifying");

  /* --------- detect "needs proof" from latest log --------- */
  const rawLogsForProof =
    (details.raw?.logs as Array<Record<string, unknown>> | undefined) ?? [];
  const sortedRawLogs = [...rawLogsForProof].sort((a, b) => {
    const ta = Date.parse(String((a as { createdAt?: string }).createdAt ?? "")) || 0;
    const tb = Date.parse(String((b as { createdAt?: string }).createdAt ?? "")) || 0;
    return tb - ta;
  });
  const latestLog = sortedRawLogs[0] as
    | {
        id?: number | string;
        decision?: string | null;
        reason?: string | null;
        transactionAmount?: number | null;
        amount?: number | null;
        merchantName?: string | null;
        proven?: boolean | null;
        createdAt?: string;
      }
    | undefined;
  const latestIsApprovedPayment = !!latestLog && (
    String(latestLog.reason ?? "").toLowerCase() === "approved" ||
    String(latestLog.decision ?? "").toLowerCase() === "approved"
  );
  // Mock: if backend doesn't include `proven` flag, treat as not yet proven.
  const latestProvenFlag =
    typeof latestLog?.proven === "boolean" ? latestLog!.proven : false;
  const latestLogId = latestLog?.id != null ? String(latestLog.id) : "";
  const locallyToggledProven = latestLogId ? !!proofToggled[latestLogId] : false;
  const needsProofForLatest =
    details.requireProof &&
    latestIsApprovedPayment &&
    !openProof &&
    !verifyingProof &&
    !latestProvenFlag &&
    !locallyToggledProven;
  const latestLogAmount =
    typeof latestLog?.transactionAmount === "number"
      ? latestLog!.transactionAmount!
      : typeof latestLog?.amount === "number"
        ? latestLog!.amount!
        : null;

  /* --------- header copy per perspective --------- */
  const headerTitle =
    perspective === "guard"
      ? "My self-locked card"
      : perspective === "received"
        ? "Received intent"
        : "Sent intent";
  const headerSubtitle =
    perspective === "guard"
      ? "Full policy & history"
      : details.counterparty
        ? perspective === "received"
          ? `From ${details.counterparty.name}`
          : `To ${details.counterparty.name}`
        : "Full policy & history";

  /* ====================================================
   *  SHARED — CARD VISUAL
   * ==================================================== */
  const CardHero = (
    <IntentCard
      cardNumber={
        canViewSecrets && revealed && formattedFullPan
          ? formattedFullPan
          : maskedPan
      }
      cardholderName={details.secure.cardholderName}
      expiry={expiryStr}
      intentTitle={details.description || "Intent locked by policy"}
      statusLabel={statusInfo.label}
      size={perspective === "sent" ? "md" : "lg"}
    />
  );

  /* ====================================================
   *  RULES APPLIED  (image-2 style)
   * ==================================================== */
  const RulesApplied = (
    <Section title="Rules Applied">
      <div className="space-y-3">
        {/* Approved merchants */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary/15">
              <Store className="h-5 w-5 text-secondary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-label text-[10px] uppercase tracking-widest text-muted-foreground">
                Approved Merchant
              </p>
              <p className="font-display text-base font-semibold mt-0.5">
                {(showAllMcc ? resolvedMcc : resolvedMcc.slice(0, 2))
                  .map((m) => m.displayName)
                  .join(", ") || "Any merchant"}
                {!showAllMcc && details.allowedMccCodes.length > 2 && (
                  <>
                    {" "}+{details.allowedMccCodes.length - 2}
                  </>
                )}
              </p>
              {details.allowedMccCodes.length > 2 && (
                <button
                  type="button"
                  onClick={() => setShowAllMcc((v) => !v)}
                  className="mt-1 font-label text-[11px] uppercase tracking-wider text-primary hover:underline"
                >
                  {showAllMcc ? "Show less" : "Show all"}
                </button>
              )}
              <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                Transactions restricted to:{" "}
                {resolvedMcc.map((m) => m.displayName.toLowerCase()).join(", ")}.
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
                Spending Limit
              </p>
              <p className="font-display text-base font-semibold mt-0.5">
                ${details.amount.toFixed(2)} total
              </p>
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-gradient-secondary transition-all"
                  style={{ width: `${spendPct}%` }}
                />
              </div>
              <div className="mt-1.5 flex justify-between text-xs">
                <span className="font-medium text-foreground">
                  ${details.amountSpent.toFixed(2)} spent
                </span>
                <span className="text-muted-foreground">
                  ${remaining.toFixed(2)} left
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Use limit */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/15">
              <ListChecks className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-label text-[10px] uppercase tracking-widest text-muted-foreground">
                Use Limit
              </p>
              {unlimitedUses ? (
                <>
                  <p className="font-display text-base font-semibold mt-0.5">
                    {details.usedCount} uses
                    <span className="ml-1.5 inline-flex items-center rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-label uppercase tracking-wider text-primary">
                      ∞ Unlimited
                    </span>
                  </p>
                  <p className="mt-2.5 text-xs text-muted-foreground">
                    No tap-count limit — card stays usable until the spending
                    limit or expiry date is reached.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-display text-base font-semibold mt-0.5">
                    {details.usedCount} / {details.cancelAfterUseCount} uses
                  </p>
                  <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-gradient-primary transition-all"
                      style={{ width: `${usePct}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Card auto-cancels after {details.cancelAfterUseCount} successful payments.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Card expiry date */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-tertiary/15">
              <ShieldCheck className="h-5 w-5 text-tertiary" />
            </div>
            <div className="flex-1">
              <p className="font-label text-[10px] uppercase tracking-widest text-muted-foreground">
                Card Expiry
              </p>
              <p className="font-display text-base font-semibold mt-0.5 tabular-nums">
                {expiryLong}
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Card number stops working after {new Date(details.secure.expYear, details.secure.expMonth, 0).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );

  /* ====================================================
   *  ACTIVITY LOG  (image-1/2 style with amounts + status pills)
   * ==================================================== */
  const activityEvents = details.events;
  const ActivityLog = (
    <section>
      <div className="mb-2.5 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 font-display text-base font-bold">
          Recent Activity
        </h3>
        <button
          type="button"
          disabled
          title="Activity refresh is disabled"
          className="hidden"
        >
          <RefreshCw className="h-3 w-3" />
          Refresh
        </button>
      </div>
      <ul className="space-y-2.5">
        {activityEvents.length === 0 && (
          <li className="rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-center text-xs text-muted-foreground">
            No activity yet.
          </li>
        )}
        {activityEvents
          .slice()
          .reverse()
          .slice(0, 12)
          .map((e) => {
            const tone = eventTone(e.message);
            const amount = parseAmount(e.message);
            const Icon = tone === "approved" ? Store : tone === "blocked" ? AlertTriangle : ShieldCheck;
            const iconWrap =
              tone === "approved"
                ? "bg-secondary/15 text-secondary"
                : tone === "blocked"
                  ? "bg-destructive/15 text-destructive"
                  : "bg-primary/15 text-primary";
            return (
              <li
                key={e.id}
                className="flex items-start gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm"
              >
                <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${iconWrap}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display text-sm font-semibold leading-snug">
                    {e.message.replace(/Approved \$[0-9.]+ at /, "").replace(/\.$/, "") || e.message}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{timeAgo(e.ts)}</p>
                  {tone === "blocked" && (
                    <span className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-destructive/10 px-1.5 py-0.5 text-[10px] font-label uppercase tracking-wide text-destructive">
                      <AlertTriangle className="h-2.5 w-2.5" /> Blocked
                    </span>
                  )}
                </div>
                <div className="text-right shrink-0">
                  {amount != null && (
                    <p
                      className={`font-display text-sm font-semibold tabular-nums ${
                        tone === "blocked"
                          ? "text-muted-foreground line-through"
                          : tone === "approved"
                            ? "text-destructive"
                            : "text-secondary"
                      }`}
                    >
                      {tone === "approved" ? "-" : tone === "info" ? "+" : ""}
                      ${amount.toFixed(2)}
                    </p>
                  )}
                  {tone === "approved" && (
                    <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-label text-secondary">
                      <Check className="h-2.5 w-2.5" /> Approved
                    </span>
                  )}
                </div>
              </li>
            );
          })}
      </ul>
    </section>
  );

  /* ====================================================
   *  COUNTERPARTY  (received & sent only)
   * ==================================================== */
  const CounterpartyCard = details.counterparty && (
    <Section title={perspective === "received" ? "Sent by" : "Sent to"} icon={UserIcon}>
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-primary text-primary-foreground font-display font-bold">
          {details.counterparty.name
            .split(" ")
            .map((s) => s[0])
            .slice(0, 2)
            .join("")}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display text-base font-semibold truncate">
            {details.counterparty.name}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {details.counterparty.handle}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {details.counterparty.email}
          </p>
        </div>
      </div>
    </Section>
  );

  /* ====================================================
   *  PROOF SECTION  (always last for guard & received)
   * ==================================================== */
  const ProofSection = (() => {
    // 1) No proof required at all
    if (!details.requireProof) {
      return (
        <Section title="Payment Proof" icon={ShieldCheck}>
          <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/15">
                <Info className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 text-sm">
                <p className="font-display font-semibold">No proof required</p>
                <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                  This card does <span className="font-semibold text-foreground">not</span> ask
                  you to upload an invoice or receipt after a payment. Spend within the rules
                  above and the transaction completes immediately — no follow-up upload is ever
                  needed for this card.
                </p>
              </div>
            </div>
          </div>
        </Section>
      );
    }

    // 2) An open proof is awaiting upload
    if (openProof) {
      return (
        <Section title="Proof Required" icon={Upload}>
          <div className="rounded-2xl border-2 border-tertiary/50 bg-tertiary/5 p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-tertiary/15">
                <AlertTriangle className="h-5 w-5 text-tertiary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display text-sm font-semibold text-tertiary">
                  Upload {details.proofName ?? "receipt"} for ${openProof.amount.toFixed(2)}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  At {openProof.merchantName}
                  {openProof.proofDeadlineAt
                    ? ` · deadline ${new Date(openProof.proofDeadlineAt).toLocaleString()}`
                    : ""}
                </p>
                <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                  Tap the button below to enter what you bought and attach a photo of the
                  receipt or invoice.
                </p>
              </div>
            </div>
            <Button
              className="mt-3 w-full bg-tertiary text-tertiary-foreground font-label"
              onClick={() => nav(`/proof/${details.id}`)}
            >
              <Upload className="mr-1.5 h-4 w-4" />
              {openProof.status === "expired_missed" ? "Upload (late)" : "Upload proof"}
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </div>
        </Section>
      );
    }

    // 3) Verifying
    if (verifyingProof) {
      return (
        <Section title="Proof Verifying" icon={ShieldCheck}>
          <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4 shadow-sm">
            <p className="text-sm">
              We're checking your last upload for{" "}
              <span className="font-semibold">{verifyingProof.merchantName}</span>. You'll see
              the result here in a moment.
            </p>
          </div>
        </Section>
      );
    }

    // 3.5) Latest log is an approved payment + card requires proof + not yet proven
    if (needsProofForLatest && latestLog) {
      const merchant = latestLog.merchantName?.trim() || "Last payment";
      const amountStr = latestLogAmount != null ? `$${latestLogAmount.toFixed(2)}` : "—";
      return (
        <Section title="Proof Required" icon={Upload}>
          <div className="rounded-2xl border-2 border-tertiary/50 bg-tertiary/5 p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-tertiary/15">
                <AlertTriangle className="h-5 w-5 text-tertiary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display text-sm font-semibold text-tertiary">
                  Upload {details.proofName ?? "receipt"} for {amountStr}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  At {merchant}
                  {latestLog.createdAt
                    ? ` · ${new Date(latestLog.createdAt).toLocaleString()}`
                    : ""}
                </p>
                <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                  This card requires an invoice or receipt after every approved payment.
                  Tap below to attach a photo of your proof.
                </p>
              </div>
            </div>
            <div className="mt-3">
              <Button
                className="w-full bg-tertiary text-tertiary-foreground font-label"
                onClick={() => nav(`/proof/${details.id}`)}
              >
                <Upload className="mr-1.5 h-4 w-4" />
                Upload proof
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>
          </div>
        </Section>
      );
    }

    // 4) Required after each payment but nothing pending right now
    return (
      <Section title="Payment Proof" icon={ShieldCheck}>
        <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/15">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 text-sm">
              <p className="font-display font-semibold">
                Proof required after each payment
                {details.proofName ? `: ${details.proofName}` : ""}
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                After every successful payment with this card, you'll be asked here to upload
                a proof (receipt or invoice). We won't ask you anything before a transaction
                actually happens — just spend normally and we'll let you know the moment a
                proof is needed.
              </p>
            </div>
          </div>
        </div>
      </Section>
    );
  })();

  /* ====================================================
   *  RENDER
   * ==================================================== */
  return (
    <div className="-mt-2 pb-10">
      <PageHeader title={headerTitle} subtitle={headerSubtitle} fallback="/cards" />

      <div className="mx-auto max-w-2xl space-y-6 pt-4">
        {/* ============ SENT — minimal view ============ */}
        {perspective === "sent" ? (
          <>
            <section className="overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-secondary/10 p-4 sm:p-5">
              {CardHero}
              <p className="mt-3 text-center text-xs text-muted-foreground">
                The recipient holds this card. Card numbers and CVC are not shown to the sender.
              </p>
            </section>

            {CounterpartyCard}

            <Section title="Intent Details" icon={Info}>
              <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <dl className="grid gap-2.5 text-sm">
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Amount sent</dt>
                    <dd className="font-display font-semibold">${details.amount.toFixed(2)}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Spent so far</dt>
                    <dd>${details.amountSpent.toFixed(2)}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Uses</dt>
                    <dd>
                      {unlimitedUses
                        ? `${details.usedCount} (∞ unlimited)`
                        : `${details.usedCount} / ${details.cancelAfterUseCount}`}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Status</dt>
                    <dd className="uppercase font-label text-xs">{statusInfo.label}</dd>
                  </div>
                  {details.description && (
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">Purpose</dt>
                      <dd className="max-w-[60%] text-right italic">"{details.description}"</dd>
                    </div>
                  )}
                </dl>
              </div>
            </Section>

            {RulesApplied}
            {ActivityLog}
          </>
        ) : (
          /* ============ GUARD or RECEIVED ============ */
          <>
            {/* CARD HERO + actions */}
            <section className="overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-secondary/10 p-4 sm:p-5">
              {CardHero}

              <div className="mt-4 space-y-3">
                {/* CVC line */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    CVC:{" "}
                    <span className="font-mono text-foreground">
                      {canViewSecrets && revealed ? realCvc || "—" : "•••"}
                    </span>
                  </span>
                  <span
                    className={`rounded-full border px-2 py-0.5 font-label text-[10px] uppercase tracking-wider ${statusToneCls}`}
                  >
                    {statusInfo.label}
                  </span>
                </div>

                {!canViewSecrets && (
                  <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
                    {details.isExpired
                      ? "Card is expired — number and CVC are no longer accessible."
                      : "Card is frozen — number and CVC are hidden until you unfreeze it."}
                  </p>
                )}

                {/* Row 1 — copy / reveal */}
                <div className="flex flex-wrap gap-2">
                  <GlassBtn
                    icon={revealed ? EyeOff : Eye}
                    label={revealed ? "Hide" : "Reveal"}
                    onClick={() => setRevealed((v) => !v)}
                    tone="primary"
                    disabled={!canViewSecrets}
                    title={canViewSecrets ? undefined : "Card is locked or expired"}
                  />
                  <GlassBtn
                    icon={copied === "Card number" ? Check : Copy}
                    label="Copy number"
                    disabled={!canViewSecrets}
                    onClick={() =>
                      copy(
                        "Card number",
                        revealed && fullPan ? fullPan : details.secure.last4,
                      )
                    }
                  />
                  <GlassBtn
                    icon={copied === "CVC" ? Check : Copy}
                    label="Copy CVC"
                    onClick={() => copy("CVC", realCvc)}
                    disabled={!canViewSecrets || !revealed || !realCvc}
                    title={
                      !canViewSecrets
                        ? "Card is locked or expired"
                        : revealed
                          ? undefined
                          : "Reveal first to copy CVC"
                    }
                  />
                </div>

                {/* Row 2 — wallets disabled */}
                <div className="flex flex-wrap gap-2">
                  <GlassBtn icon={Smartphone} label="Apple Wallet" disabled title="Coming soon" />
                  <GlassBtn icon={Smartphone} label="Samsung Wallet" disabled title="Coming soon" />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Wallet add-ons coming soon — for now, reveal the number and add it manually.
                </p>
              </div>
            </section>

            {/* DETAILS — quick stats */}
            <Section title="Card Details" icon={Info}>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
                  <p className="font-label text-[10px] uppercase text-muted-foreground">
                    {perspective === "received" ? "Sent amount" : "Initial"}
                  </p>
                  <p className="font-display text-lg font-bold">${details.amount.toFixed(2)}</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
                  <p className="font-label text-[10px] uppercase text-muted-foreground">
                    Remaining
                  </p>
                  <p className="font-display text-lg font-bold">${remaining.toFixed(2)}</p>
                </div>
                <div className="col-span-2 rounded-xl border border-border bg-card p-3 shadow-sm sm:col-span-1">
                  <p className="font-label text-[10px] uppercase text-muted-foreground">Uses</p>
                  <p className="font-display text-lg font-bold">
                    {details.usedCount}
                    <span className="text-sm font-normal text-muted-foreground">
                      {unlimitedUses ? " / ∞" : `/${details.cancelAfterUseCount}`}
                    </span>
                  </p>
                </div>
              </div>
            </Section>

            {/* Status / governance banners */}
            {(details.isExpired ||
              details.isManuallyFrozen ||
              details.isLockedByPendingInvoice ||
              details.isSpendBlocked) && (
              <div className="space-y-2.5">
                {details.isExpired && (
                  <div className="flex items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/5 p-4 shadow-sm">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-destructive/15">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                    </div>
                    <div className="flex-1 text-sm">
                      <p className="font-display font-semibold text-destructive">
                        Card has expired
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                        This card passed its printed expiry of {expiryLong}. The
                        number and CVC are no longer accessible and any new
                        charges will be declined.
                      </p>
                    </div>
                  </div>
                )}
                {!details.isExpired && details.isManuallyFrozen && (
                  <div className="flex items-start gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 shadow-sm">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/15">
                      <Snowflake className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 text-sm">
                      <p className="font-display font-semibold">Card is frozen</p>
                      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                        All charges on this card are blocked until you unfreeze it. Use the
                        Unfreeze button below to re-enable spending.
                      </p>
                    </div>
                  </div>
                )}
                {!details.isExpired && details.isLockedByPendingInvoice && (
                  <div className="flex items-start gap-3 rounded-2xl border border-tertiary/40 bg-tertiary/5 p-4 shadow-sm">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-tertiary/15">
                      <FileWarning className="h-5 w-5 text-tertiary" />
                    </div>
                    <div className="flex-1 text-sm">
                      <p className="font-display font-semibold text-tertiary">
                        Locked — invoice proof required
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                        Your last invoice didn't pass verification. Upload a valid receipt or
                        invoice to unlock this card and resume spending.
                      </p>
                      <Button
                        size="sm"
                        className="mt-3 bg-tertiary text-tertiary-foreground"
                        onClick={() => nav(`/proof/${details.id}`)}
                      >
                        <Upload className="mr-1.5 h-4 w-4" />
                        Upload valid proof
                      </Button>
                    </div>
                  </div>
                )}
                {!details.isExpired &&
                  !details.isManuallyFrozen &&
                  !details.isLockedByPendingInvoice &&
                  details.isSpendBlocked && (
                    <div className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 shadow-sm">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-destructive/15">
                        <ShieldAlert className="h-5 w-5 text-destructive" />
                      </div>
                      <div className="flex-1 text-sm">
                        <p className="font-display font-semibold text-destructive">
                          Spending blocked
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                          This card cannot make any new charges right now. Check
                          recent activity for details.
                        </p>
                      </div>
                    </div>
                  )}
              </div>
            )}

            {RulesApplied}
            {ActivityLog}

            {/* Counterparty (received only) */}
            {perspective === "received" && CounterpartyCard}

            {/* Proof — always last */}
            {ProofSection}

            {/* Card controls — guard & received only (NOT sender) */}
            <div className="space-y-2.5 pt-2">
              {/* Freeze / Unfreeze toggle */}
              <Button
                variant={details.isManuallyFrozen ? "secondary" : "outline"}
                className="w-full"
                disabled={details.isExpired}
                title={details.isExpired ? "Expired cards cannot be frozen" : undefined}
                onClick={() => {
                  setFreezePhrase("");
                  setFreezeOpen(true);
                }}
              >
                <Snowflake className="mr-1.5 h-4 w-4" />
                {details.isManuallyFrozen ? "Unfreeze card" : "Freeze card"}
              </Button>

              {/* Refund request */}
              {details.isRequestRefund ? (
                <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm">
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/15">
                      <Info className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-display font-semibold">Refund request received</p>
                      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                        We've got your refund request and our team will reach out shortly.
                        You don't need to do anything else — please wait for us to contact you.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <Button
                  variant="destructive"
                  className="w-full"
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

      {/* Refund request dialog (real API) */}
      <Dialog open={refundOpen} onOpenChange={(o) => !refundSubmitting && setRefundOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-destructive" />
              Request a refund
            </DialogTitle>
            <DialogDescription>
              We'll review your request and get back to you. Add a short note describing what
              happened (optional — sent for our reference).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="refund-msg" className="text-xs">
              Your message (optional)
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
            <Button
              variant="outline"
              onClick={() => setRefundOpen(false)}
              disabled={refundSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={refundSubmitting || !cardId}
              onClick={async () => {
                if (!cardId) return;
                setRefundSubmitting(true);
                const res = await requestCardRefund(cardId, { actingUserId: userId });
                setRefundSubmitting(false);
                if (res.isSucess) {
                  toast.success("Refund request sent — we'll contact you soon");
                  setRefundMsg("");
                  setRefundOpen(false);
                  await refreshAll();
                } else {
                  toast.error(res.error[0] || "Couldn't send refund request");
                }
              }}
            >
              {refundSubmitting ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <ShieldAlert className="mr-1.5 h-4 w-4" />
              )}
              Send request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Freeze / Unfreeze confirmation dialog */}
      <Dialog open={freezeOpen} onOpenChange={(o) => !freezeSubmitting && setFreezeOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Snowflake className="h-4 w-4 text-primary" />
              {details.isManuallyFrozen ? "Unfreeze card" : "Freeze card"}
            </DialogTitle>
            <DialogDescription>
              {details.isManuallyFrozen
                ? "Unfreezing will allow new charges on this card. Type the phrase below to confirm."
                : "Freezing will block all new charges on this card immediately. Type the phrase below to confirm."}
            </DialogDescription>
          </DialogHeader>

          {(() => {
            const phrase = `${details.isManuallyFrozen ? "unfreze" : "freze"}-card-${details.secure.last4}`;
            const matches = freezePhrase.trim() === phrase;
            return (
              <div className="space-y-2">
                <Label htmlFor="freeze-phrase" className="text-xs">
                  Type{" "}
                  <span className="font-mono font-semibold text-foreground">{phrase}</span>{" "}
                  to confirm
                </Label>
                <Input
                  id="freeze-phrase"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={phrase}
                  value={freezePhrase}
                  onChange={(e) => setFreezePhrase(e.target.value)}
                />
                <DialogFooter className="gap-2 pt-2 sm:gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setFreezeOpen(false)}
                    disabled={freezeSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    disabled={!matches || freezeSubmitting || !cardId}
                    onClick={async () => {
                      if (!cardId) return;
                      setFreezeSubmitting(true);
                      const res = await setCardLockState(cardId, {
                        locked: !details.isManuallyFrozen,
                        actingUserId: userId,
                      });
                      setFreezeSubmitting(false);
                      if (res.isSucess) {
                        toast.success(
                          details.isManuallyFrozen ? "Card unfrozen" : "Card frozen",
                        );
                        setFreezePhrase("");
                        setFreezeOpen(false);
                        await refreshAll();
                      } else {
                        toast.error(res.error[0] || "Couldn't update card lock state");
                      }
                    }}
                  >
                    {freezeSubmitting ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : (
                      <Snowflake className="mr-1.5 h-4 w-4" />
                    )}
                    Confirm
                  </Button>
                </DialogFooter>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
