import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { MCC_CATEGORIES } from "@/lib/mcc";
import { cn } from "@/lib/utils";
import {
  Loader2,
  Check,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  Calendar,
  MapPin,
  Repeat,
  FileImage,
  ArrowLeft,
  ArrowRight,
  MessageSquare,
  Wand2,
  Lock,
  Send,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/PageHeader";
import { IntentChat, type ExtractedIntent } from "@/components/IntentChat";
import {
  ContactPicker,
  type ContactPickerRow,
} from "@/components/ContactPicker";
import {
  LiveIntentExtractor,
  type ExtractionResult,
  type LiveIntent,
} from "@/components/LiveIntentExtractor";
import { IssueSuccessDialog } from "@/components/IssueSuccessDialog";
import { createIntent, type IntentWithCardResponse } from "@/api/intentCards";
import { mapToCardDetails, type CardWithLogsResponse } from "@/api/cardDetails";
import { useCurrentUserContext } from "@/lib/currentUserContext";

type Tab = "recipient" | "intent" | "review";
type ExtractMode = "live" | "chat";

function formatDt(iso: string | null) {
  if (!iso) return "Any time";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}
function mccLabel(code: string) {
  const m = MCC_CATEGORIES.find((c) => c.code === code);
  return m ? `${m.emoji} ${m.name}` : code;
}

function normalizeExtractedIntent(intent: ExtractedIntent): ExtractedIntent {
  const amount = Number(intent.amount);
  const usesRaw = intent.allowed_uses;
  const usesNum = Number(usesRaw);
  const normalizedUses =
    usesRaw == null
      ? null
      : Number.isFinite(usesNum)
        ? Math.max(1, Math.trunc(usesNum))
        : null;
  const safeMcc = Array.isArray(intent.allowed_mcc_codes)
    ? intent.allowed_mcc_codes
        .map((c) => String(c ?? "").trim())
        .filter((c) => c.length > 0)
    : [];
  return {
    ...intent,
    amount: Number.isFinite(amount) ? amount : 0,
    allowed_uses: normalizedUses,
    description: (intent.description ?? "").toString(),
    require_proof: !!intent.require_proof,
    proof_type: intent.require_proof
      ? (intent.proof_type ?? "image-of-invoice")
      : null,
    allowed_mcc_codes: safeMcc,
    first_use_at: intent.first_use_at ?? null,
    last_use_at: intent.last_use_at ?? null,
    city: intent.city ?? null,
    country: intent.country ?? null,
    rule_preview: intent.rule_preview ?? "",
  };
}

/** Map our LiveIntent (live extractor, backend-shape) → ExtractedIntent (legacy chat shape used downstream UI). */
function liveToExtracted(li: LiveIntent): ExtractedIntent {
  return {
    amount: li.amount ?? 0,
    allowed_uses: li.useTimes ?? null,
    description: li.description ?? "",
    require_proof: !!li.requiredInvoiceProve,
    proof_type: li.requiredInvoiceProve ? "image-of-invoice" : null,
    allowed_mcc_codes: li.mccList ?? [],
    first_use_at: li.firstDateToUser,
    last_use_at: li.expiryDate,
    city: li.city,
    country: li.country,
    rule_preview: "", // generated client-side below
  };
}

function buildRulePreview(
  i: ExtractedIntent,
  lockWebsites?: boolean | null,
  onlyWebsites?: string[],
) {
  const mccCodes = Array.isArray(i.allowed_mcc_codes)
    ? i.allowed_mcc_codes
    : [];
  const lines: string[] = [];
  lines.push(`• Amount: $${i.amount.toFixed(2)}`);
  lines.push(
    `• Allowed uses: ${i.allowed_uses == null ? "Unlimited" : i.allowed_uses}`,
  );
  if (mccCodes.length)
    lines.push(`• Categories: ${mccCodes.map(mccLabel).join(", ")}`);
  if (i.require_proof)
    lines.push(
      `• Proof required: ${i.proof_type === "both" ? "Invoice + product" : i.proof_type === "image-of-invoice" ? "Invoice" : "Product"}`,
    );
  if (i.first_use_at) lines.push(`• Earliest use: ${formatDt(i.first_use_at)}`);
  if (i.last_use_at) lines.push(`• Expires: ${formatDt(i.last_use_at)}`);
  if (i.city || i.country)
    lines.push(`• Location: ${[i.city, i.country].filter(Boolean).join(", ")}`);
  if (lockWebsites && onlyWebsites?.length)
    lines.push(`• Websites only: ${onlyWebsites.join(", ")}`);
  return lines.join("\n");
}

export default function SendIntentPage() {
  const nav = useNavigate();
  const queryClient = useQueryClient();
  const [params] = useSearchParams();
  const { userId: currentNumericUserId, profile } = useCurrentUserContext();
  const initialSearchQuery = params.get("q")?.trim() ?? "";

  // ── Tabs ──
  const [tab, setTab] = useState<Tab>("recipient");

  // ── Tab 1: recipient ──
  const [targetMode, setTargetMode] = useState<"self" | "account">("account");
  const [recipient, setRecipient] = useState<ContactPickerRow | null>(null);
  const recipientId = recipient?.id ?? null;

  // ── Tab 2: intent extraction ──
  const [mode, setMode] = useState<ExtractMode>("live");
  const [liveText, setLiveText] = useState("");
  const [liveResult, setLiveResult] = useState<ExtractionResult | null>(null);
  const [chatIntent, setChatIntent] = useState<ExtractedIntent | null>(null);
  const [chatResetKey, setChatResetKey] = useState(0);

  // ── Final intent (computed when entering review) ──
  const [finalIntent, setFinalIntent] = useState<ExtractedIntent | null>(null);
  const [extraWebsiteLock, setExtraWebsiteLock] = useState<boolean | null>(
    null,
  );
  const [extraWebsites, setExtraWebsites] = useState<string[]>([]);

  // ── Issue success ──
  const [issuedCard, setIssuedCard] = useState<IntentWithCardResponse | null>(
    null,
  );

  // Pre-select recipient from ?to= (matches a saved contact when possible).
  useEffect(() => {
    const to = params.get("to");
    if (!to) return;
    const c = profile?.contacts?.find((x) => String(x.id) === to);
    if (c) {
      setRecipient({
        id: String(c.id),
        name: c.name,
        username: c.username,
        email: c.email,
        initials: c.name
          .split(/\s+/)
          .filter(Boolean)
          .map((p) => p[0])
          .slice(0, 2)
          .join("")
          .toUpperCase(),
      });
      setTargetMode("account");
    }
  }, [params, profile]);

  useEffect(() => {
    if (initialSearchQuery) {
      setTargetMode("account");
    }
  }, [initialSearchQuery]);

  // Self-send recipient derived from real profile.
  const selfRecipient = profile
    ? {
        id: String(profile.id),
        name: profile.name,
        username: profile.username,
        email: profile.email,
        initials: profile.name
          .split(/\s+/)
          .filter(Boolean)
          .map((p) => p[0])
          .slice(0, 2)
          .join("")
          .toUpperCase(),
      }
    : null;

  // ── Mutation: issue card via real backend ──
  const issueMutation = useMutation({
    mutationFn: async () => {
      if (!finalIntent) throw new Error("Intent not ready");

      // Resolve receiver as integer id. Self → current user. Otherwise the
      // contact's numeric id (falls back to current user if not parseable).
      const recipientNumeric = recipientId ? Number(recipientId) : NaN;
      const receiverId =
        targetMode === "self"
          ? currentNumericUserId
          : Number.isFinite(recipientNumeric)
            ? recipientNumeric
            : currentNumericUserId;

      // Prefer the live AI extraction (already in backend shape) when present —
      // it preserves AI-inferred fields (mccList codes, dates, etc) without lossy
      // round-tripping through the legacy ExtractedIntent shape.
      const ai = mode === "live" ? liveResult?.intent : null;

      const toIso = (v: string | null | undefined): string | null => {
        if (!v) return null;
        const d = new Date(v);
        return isNaN(d.getTime()) ? null : d.toISOString();
      };

      const rawMcc = ai?.mccList ?? finalIntent.allowed_mcc_codes ?? [];
      const mccList = rawMcc
        .map((c) => (c ?? "").toString().trim())
        .filter((c) => c.length > 0);

      const amount = Number(ai?.amount ?? finalIntent.amount);
      const candidateUseTimes = ai?.useTimes ?? finalIntent.allowed_uses;
      const parsedUseTimes = Number(candidateUseTimes);
      const useTimes =
        candidateUseTimes == null || !Number.isFinite(parsedUseTimes)
          ? null
          : Math.max(1, Math.trunc(parsedUseTimes));

      const apiResult = await createIntent({
        creatorId: currentNumericUserId,
        userId: receiverId,
        amount: Number.isFinite(amount) ? amount : 0,
        useTimes,
        expiryDate: toIso(ai?.expiryDate ?? finalIntent.last_use_at),
        firstDateToUser: toIso(ai?.firstDateToUser ?? finalIntent.first_use_at),
        country: (ai?.country ?? finalIntent.country) || null,
        city: (ai?.city ?? finalIntent.city) || null,
        description:
          (ai?.description ?? finalIntent.description ?? "").trim() || null,
        mccList,
        requiredInvoiceProve: !!(
          ai?.requiredInvoiceProve ?? finalIntent.require_proof
        ),
      });

      if (!apiResult.isSucess || !apiResult.data) {
        throw new Error(apiResult.error?.[0] ?? "Failed to create intent card");
      }
      return apiResult.data;
    },
    onSuccess: (card) => {
      // Seed the React Query cache so the card details page renders
      // instantly from the create response — no extra fetch needed when
      // the cache hit is available.
      try {
        const payload: CardWithLogsResponse = { card, logs: [] };
        console.log("payload: ", payload);
        const mapped = mapToCardDetails(payload, currentNumericUserId);
        queryClient.setQueryData(
          ["card-details", String(card.card.id), currentNumericUserId],
          { data: mapped, isSucess: true, error: [] },
        );
        console.log("mapped: ", mapped);
      } catch (err) {
        console.warn("Failed to prime card-details cache", err);
      }
      console.log("card: ", card);
      setIssuedCard(card);
      toast.success("Intent card issued");
    },
    onError: (e: Error) => {
      console.error("createIntent failed", e);
      toast.error("Something went wrong", {
        description: e?.message,
      });
    },
  });

  // ── Tab transitions with state preservation ──
  const goToIntent = () => {
    if (targetMode === "account" && !recipientId) {
      toast.error("Pick a recipient first");
      return;
    }
    setTab("intent");
  };

  const goToReview = () => {
    let intent: ExtractedIntent | null = null;
    if (mode === "live") {
      if (!liveResult?.ready) {
        toast.error("Add the missing required details first");
        return;
      }
      intent = normalizeExtractedIntent(liveToExtracted(liveResult.intent));
      intent.rule_preview = buildRulePreview(intent);
      setExtraWebsiteLock(null);
      setExtraWebsites([]);
    } else {
      if (!chatIntent) {
        toast.error("Finish chatting with IntentBot first");
        return;
      }
      intent = normalizeExtractedIntent(chatIntent);
      if (!intent.rule_preview) intent.rule_preview = buildRulePreview(intent);
    }
    setFinalIntent(intent);
    setTab("review");
  };

  // ── Render ──
  return (
    <div className="pb-8 -mt-2">
      <PageHeader
        title="New Intent Card"
        subtitle="Create money with intent…"
        fallback="/cards"
      />

      {/* Tab indicator */}
      <div className="pt-4 flex items-center gap-2 px-1">
        {(["recipient", "intent", "review"] as Tab[]).map((p, i) => {
          const idx = (["recipient", "intent", "review"] as Tab[]).indexOf(tab);
          const active = tab === p;
          const done = idx > i;
          return (
            <div
              key={p}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-base",
                active
                  ? "bg-gradient-primary"
                  : done
                    ? "bg-primary/60"
                    : "bg-muted",
              )}
            />
          );
        })}
      </div>

      <div className="pt-5">
        {/* ─────── TAB 1 — recipient ─────── */}
        {tab === "recipient" && (
          <div className="space-y-5 animate-fade-in">
            <div>
              <p className="font-label text-[11px] uppercase tracking-wider text-muted-foreground">
                Who is this for?
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTargetMode("self")}
                  className={cn(
                    "rounded-lg px-3 py-2 text-xs font-medium flex items-center justify-center gap-1.5 transition-base",
                    targetMode === "self"
                      ? "bg-primary/15 text-primary ring-1 ring-primary/40"
                      : "bg-card text-muted-foreground hover:text-foreground",
                  )}
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Lock for me
                </button>
                <button
                  type="button"
                  onClick={() => setTargetMode("account")}
                  className={cn(
                    "rounded-lg px-3 py-2 text-xs font-medium flex items-center justify-center gap-1.5 transition-base",
                    targetMode === "account"
                      ? "bg-primary/15 text-primary ring-1 ring-primary/40"
                      : "bg-card text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Send className="h-3.5 w-3.5" />
                  Send to someone
                </button>
              </div>
            </div>

            {targetMode === "account" && (
              <ContactPicker
                selectedId={recipientId}
                onSelect={setRecipient}
                initialQuery={initialSearchQuery}
              />
            )}

            <div className="flex justify-between gap-3 pt-1">
              <Button variant="ghost" onClick={() => nav(-1)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button
                onClick={goToIntent}
                className="bg-gradient-primary text-primary-foreground font-label"
              >
                Next <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </div>
          </div>
        )}

        {/* ─────── TAB 2 — intent extraction ─────── */}
        {tab === "intent" && (
          <div className="space-y-4 animate-fade-in">
            {/* Selected person card (mirrors picker style) — only when sending */}
            {targetMode === "account" && recipient && (
              <div className="rounded-xl border border-primary/30 bg-primary/5 px-3 py-2.5 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-muted to-card border border-border flex items-center justify-center text-xs font-semibold">
                  {recipient.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">
                    {recipient.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {recipient.username}
                  </p>
                </div>
                <Check className="h-4 w-4 text-primary" />
              </div>
            )}
            {targetMode === "self" && (
              <div className="rounded-xl border border-secondary/30 bg-secondary/5 px-3 py-2.5 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-secondary text-secondary-foreground flex items-center justify-center text-xs font-semibold">
                  {selfRecipient?.initials ?? "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">Self-intent card</p>
                  <p className="text-[11px] text-muted-foreground">
                    Locked for you · Digital Guard
                  </p>
                </div>
              </div>
            )}

            {/* Mode switch */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setMode("live")}
                className={cn(
                  "rounded-xl border p-2.5 text-left transition-base",
                  mode === "live"
                    ? "border-primary bg-primary/10 shadow-glow-primary"
                    : "border-border bg-card",
                )}
              >
                <p className="text-xs font-semibold flex items-center gap-1.5">
                  <Wand2 className="h-3.5 w-3.5 text-primary" /> Live AI
                  extractor
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Type freely — AI extracts in real time
                </p>
              </button>
              <button
                onClick={() => setMode("chat")}
                className={cn(
                  "rounded-xl border p-2.5 text-left transition-base",
                  mode === "chat"
                    ? "border-primary bg-primary/10 shadow-glow-primary"
                    : "border-border bg-card",
                )}
              >
                <p className="text-xs font-semibold flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" /> Chat with IntentBot
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Step-by-step conversation
                </p>
                <span className="absolute top-1.5 right-1.5 text-[9px] uppercase font-label bg-muted text-muted-foreground rounded-full px-1.5 py-0.5">
                  Coming soon
                </span>
              </button>
            </div>

            {mode === "live" ? (
              <LiveIntentExtractor
                initialText={liveText}
                initialResult={liveResult}
                onChange={(t, r) => {
                  setLiveText(t);
                  setLiveResult(r);
                }}
              />
            ) : (
              <div className="space-y-2">
                <IntentChat
                  resetKey={chatResetKey}
                  onComplete={(i) => setChatIntent(i)}
                />
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setChatIntent(null);
                      setChatResetKey((k) => k + 1);
                    }}
                  >
                    Restart chat
                  </Button>
                </div>
              </div>
            )}

            <div className="flex justify-between gap-3 pt-1">
              <Button variant="ghost" onClick={() => setTab("recipient")}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button
                onClick={goToReview}
                className="bg-gradient-primary text-primary-foreground font-label"
              >
                Next <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </div>
          </div>
        )}

        {/* ─────── TAB 3 — review & issue ─────── */}
        {tab === "review" && finalIntent && (
          <div className="space-y-4 animate-fade-in">
            {/* Recipient summary */}
            {targetMode === "account" && recipient ? (
              <div className="rounded-xl border border-primary/30 bg-primary/5 px-3 py-2.5 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-muted to-card border border-border flex items-center justify-center text-xs font-semibold">
                  {recipient.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-label text-[10px] uppercase text-muted-foreground">
                    Sending to
                  </p>
                  <p className="text-sm font-semibold truncate">
                    {recipient.name} · {recipient.username}
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-secondary/30 bg-secondary/5 px-3 py-2.5 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-secondary text-secondary-foreground flex items-center justify-center text-xs font-semibold">
                  {selfRecipient?.initials ?? "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-label text-[10px] uppercase text-muted-foreground">
                    Locked for
                  </p>
                  <p className="text-sm font-semibold">You (Digital Guard)</p>
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-4 shadow-glow-primary">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-label text-[10px] uppercase tracking-wider text-muted-foreground">
                    Intent card preview
                  </p>
                  <p className="font-display text-3xl font-bold tabular-nums mt-1">
                    ${finalIntent.amount.toFixed(2)}
                  </p>
                  <p className="text-sm text-foreground/90 mt-0.5">
                    {finalIntent.description}
                  </p>
                </div>
                <div className="h-14 w-14 rounded-full bg-gradient-primary text-primary-foreground flex items-center justify-center text-base font-semibold">
                  {(targetMode === "account"
                    ? recipient?.initials
                    : selfRecipient?.initials) ?? "?"}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-card/60 border border-border p-2">
                  <p className="font-label text-[10px] uppercase text-muted-foreground flex items-center gap-1">
                    <Repeat className="h-3 w-3" /> Allowed uses
                  </p>
                  <p className="font-display text-base font-semibold mt-0.5">
                    {finalIntent.allowed_uses == null
                      ? "Unlimited"
                      : finalIntent.allowed_uses}
                  </p>
                </div>
                <div className="rounded-lg bg-card/60 border border-border p-2">
                  <p className="font-label text-[10px] uppercase text-muted-foreground flex items-center gap-1">
                    <ShieldAlert className="h-3 w-3" /> Proof
                  </p>
                  <p className="text-sm mt-0.5 font-medium">
                    {finalIntent.require_proof
                      ? finalIntent.proof_type === "both"
                        ? "Invoice + product"
                        : finalIntent.proof_type === "image-of-invoice"
                          ? "Invoice"
                          : "Product"
                      : "Not required"}
                  </p>
                </div>
                <div className="rounded-lg bg-card/60 border border-border p-2">
                  <p className="font-label text-[10px] uppercase text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> First use
                  </p>
                  <p className="text-xs mt-0.5">
                    {formatDt(finalIntent.first_use_at)}
                  </p>
                </div>
                <div className="rounded-lg bg-card/60 border border-border p-2">
                  <p className="font-label text-[10px] uppercase text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Last use
                  </p>
                  <p className="text-xs mt-0.5">
                    {formatDt(finalIntent.last_use_at)}
                  </p>
                </div>
                <div className="rounded-lg bg-card/60 border border-border p-2 col-span-2">
                  <p className="font-label text-[10px] uppercase text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Location
                  </p>
                  <p className="text-xs mt-0.5">
                    {finalIntent.city || finalIntent.country
                      ? [finalIntent.city, finalIntent.country]
                          .filter(Boolean)
                          .join(", ")
                      : "Anywhere"}
                  </p>
                </div>
                {extraWebsiteLock && extraWebsites.length > 0 && (
                  <div className="rounded-lg bg-card/60 border border-border p-2 col-span-2">
                    <p className="font-label text-[10px] uppercase text-muted-foreground flex items-center gap-1">
                      <Lock className="h-3 w-3" /> Websites only
                    </p>
                    <p className="text-xs mt-0.5">{extraWebsites.join(", ")}</p>
                  </div>
                )}
              </div>

              <div className="mt-3">
                <p className="font-label text-[10px] uppercase text-muted-foreground flex items-center gap-1">
                  <FileImage className="h-3 w-3" /> Allowed merchants
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {(finalIntent.allowed_mcc_codes ?? []).map((c) => (
                    <span
                      key={c}
                      className="text-[11px] rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5"
                    >
                      {mccLabel(c)}
                    </span>
                  ))}
                </div>
              </div>

              {finalIntent.rule_preview && (
                <div className="mt-3 rounded-lg bg-surface/60 border border-border p-2.5">
                  <p className="font-label text-[10px] uppercase text-muted-foreground mb-1">
                    Smart rule
                  </p>
                  <p className="text-xs whitespace-pre-wrap leading-relaxed">
                    {finalIntent.rule_preview}
                  </p>
                </div>
              )}
            </div>

            <p className="inline-flex w-full items-center justify-center gap-1.5 text-center text-[10px] text-muted-foreground">
              <ShieldCheck className="h-3 w-3 text-primary" />
              Protected by IntPay smart contract policy data
            </p>

            <div className="flex justify-between gap-3 pt-1">
              <Button variant="ghost" onClick={() => setTab("intent")}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button
                onClick={() => issueMutation.mutate()}
                disabled={issueMutation.isPending}
                className="bg-gradient-primary text-primary-foreground font-label shadow-glow-primary"
              >
                {issueMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-1.5" />
                )}
                {issueMutation.isPending ? "Issuing…" : "Issue Card"}
              </Button>
            </div>
          </div>
        )}
      </div>

      <IssueSuccessDialog
        open={!!issuedCard}
        card={issuedCard}
        recipient={targetMode === "account" ? recipient : selfRecipient}
        onClose={() => {
          const id = issuedCard?.intentId;
          console.log("Issued card with intentId", id);
          console.log("Issued card with intentId", id);
          setIssuedCard(null);
          if (id != null) nav(`/cards/${id}`);
        }}
      />
    </div>
  );
}
