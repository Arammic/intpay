import { useState } from "react";
import { Eye, EyeOff, Copy, Check, Smartphone, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { IntentCard as IntentCardType } from "@/lib/types";
import { mccByCode } from "@/lib/mcc";
import { retrieveCardDetails } from "@/lib/stripeIssuingMock";
import { toast } from "sonner";
import { IntentCard } from "./IntentCard";

interface Props {
  card: IntentCardType;
  variant?: "purple" | "green" | "orange" | "neutral";
  compact?: boolean;
  /** "full" shows PAN, stats, and actions. "shape" is a non-sensitive visual only. */
  displayMode?: "full" | "shape";
  /** Optional background image over the gradient (e.g. brand texture). Pass a URL from `/public` or an import. */
  backgroundImageUrl?: string;
}

function formatPan(pan: string, masked: boolean) {
  if (masked) {
    return `•••• •••• •••• ${pan.slice(-4)}`;
  }
  return pan.replace(/(.{4})/g, "$1 ").trim();
}

export function DebitCard({ card, compact = false, displayMode = "full" }: Props) {
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [secure, setSecure] = useState(card._secure);

  const remaining = card.amount - card.amountSpent;
  const usePct = (card.usedCount / card.cancelAfterUseCount) * 100;
  const spendPct = (card.amountSpent / card.amount) * 100;

  const reveal = async () => {
    if (revealed) { setRevealed(false); return; }
    setLoading(true);
    try {
      const details = await retrieveCardDetails(card);
      setSecure(details);
      setRevealed(true);
    } finally { setLoading(false); }
  };

  const copy = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(label);
      setTimeout(() => setCopiedField(null), 1400);
      toast.success(`${label} copied`);
    } catch { toast.error("Couldn't copy"); }
  };

  const shapeOnly = displayMode === "shape";

  const displayPan = formatPan(secure.fullNumber, !revealed);
  const expiry = `${String(secure.expMonth).padStart(2, "0")}/${String(secure.expYear).slice(-2)}`;
  const titleWords = (card.description ?? "").trim().split(/\s+/).filter(Boolean);
  const intentTitle = titleWords.slice(0, 6).join(" ");

  return (
    <div className={cn("group w-full", compact ? "max-w-sm" : "")}>
      <div
        className={cn(
          "transition-spring",
          card.status === "expired" || card.status === "canceled" || card.status === "destroyed" ? "opacity-60 grayscale" : "",
        )}
      >
        <IntentCard
          cardNumber={shapeOnly ? "•••• •••• •••• ••••" : displayPan}
          cardholderName={shapeOnly ? "Cardholder hidden" : secure.cardholderName}
          expiry={shapeOnly ? "--/--" : expiry}
          intentTitle={intentTitle}
          statusLabel={card.status}
          className="ring-1 ring-white/10"
        />
      </div>

      {!shapeOnly && (
      <div className="mt-4 space-y-3">
        <p className="text-xs text-muted-foreground">
          CVC: <span className="font-mono text-foreground">{revealed ? secure.cvc : "•••"}</span>
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-card/60 border border-border p-3">
            <p className="font-label text-[10px] uppercase text-muted-foreground">Remaining</p>
            <p className="font-display text-lg font-semibold">${remaining.toFixed(2)}</p>
            <div className="h-1 rounded-full bg-muted mt-2 overflow-hidden">
              <div className="h-full bg-gradient-secondary" style={{ width: `${100 - spendPct}%` }} />
            </div>
          </div>
          <div className="rounded-xl bg-card/60 border border-border p-3">
            <p className="font-label text-[10px] uppercase text-muted-foreground">Uses left</p>
            <p className="font-display text-lg font-semibold">{card.cancelAfterUseCount - card.usedCount}<span className="text-muted-foreground text-sm font-normal">/{card.cancelAfterUseCount}</span></p>
            <div className="h-1 rounded-full bg-muted mt-2 overflow-hidden">
              <div className="h-full bg-gradient-tertiary" style={{ width: `${100 - usePct}%` }} />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={reveal}
            disabled={loading}
            className="font-label"
          >
            {revealed ? <EyeOff className="h-4 w-4 mr-1.5" /> : <Eye className="h-4 w-4 mr-1.5" />}
            {loading ? "Fetching…" : revealed ? "Hide details" : "Reveal full number"}
          </Button>
          {revealed && (
            <>
              <Button variant="outline" size="sm" onClick={() => copy("Card number", secure.fullNumber)} className="font-label">
                {copiedField === "Card number" ? <Check className="h-4 w-4 mr-1.5" /> : <Copy className="h-4 w-4 mr-1.5" />}
                Number
              </Button>
              <Button variant="outline" size="sm" onClick={() => copy("CVC", secure.cvc)} className="font-label">
                {copiedField === "CVC" ? <Check className="h-4 w-4 mr-1.5" /> : <Copy className="h-4 w-4 mr-1.5" />}
                CVC
              </Button>
            </>
          )}
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            disabled
            title="Coming soon"
            className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs font-label text-muted-foreground cursor-not-allowed"
          >
            <Smartphone className="h-3.5 w-3.5" /> Add to Apple Wallet
            <Lock className="h-3 w-3 ml-0.5" />
          </button>
          <button
            disabled
            title="Coming soon"
            className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs font-label text-muted-foreground cursor-not-allowed"
          >
            <Smartphone className="h-3.5 w-3.5" /> Add to Samsung Wallet
            <Lock className="h-3 w-3 ml-0.5" />
          </button>
        </div>

        <div className="text-[11px] text-muted-foreground">
          Wallet add-ons are coming soon — for now, reveal the number and add it manually to your phone wallet.
        </div>

        <div className="flex flex-wrap gap-1.5 pt-1">
          {card.allowedMccCodes.slice(0, 6).map((code) => {
            const m = mccByCode(code);
            return (
              <span key={code} className="text-[10px] font-label uppercase tracking-wide px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                {m?.emoji} {m?.name ?? code}
              </span>
            );
          })}
          {card.allowedMccCodes.length > 6 && (
            <span className="text-[10px] font-label uppercase px-2 py-1 rounded-full bg-muted text-muted-foreground">
              +{card.allowedMccCodes.length - 6}
            </span>
          )}
        </div>
      </div>
      )}
    </div>
  );
}
