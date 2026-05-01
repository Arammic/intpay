import { useState } from "react";
import { Copy, Check, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { IntentCard } from "@/components/IntentCard";
import { toast } from "sonner";
import type { IntentWithCardResponse } from "@/api/intentCards";

interface RecipientInfo {
  id: string;
  name: string;
  username: string;
  email: string;
  initials: string;
}

interface Props {
  open: boolean;
  card: IntentWithCardResponse | null;
  recipient?: RecipientInfo | null;
  onClose: () => void;
}

function formatPan(pan: string) {
  return pan.replace(/(.{4})/g, "$1 ").trim();
}

export function IssueSuccessDialog({ open, card, recipient, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  if (!card || !card.card) return null;
  const c = card.card;
  const expiry =
    c.expiryDate ||
    `${String(c.expiryMonth ?? 0).padStart(2, "0")}/${String(c.expiryYear ?? 0).slice(-2)}`;
  const fullPan = c.cardNumber ?? "";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(fullPan);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
      toast.success("Card number copied");
    } catch {
      toast.error("Couldn't copy");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm rounded-2xl p-5 bg-card border-border">
        <DialogTitle className="sr-only">Card issued successfully</DialogTitle>
        <DialogDescription className="sr-only">
          Your intent card has been issued and is ready to use.
        </DialogDescription>
        <div className="text-center space-y-1">
          <div className="mx-auto h-12 w-12 rounded-full bg-secondary/15 flex items-center justify-center">
            <ShieldCheck className="h-6 w-6 text-secondary" />
          </div>
          <h2 className="font-display text-xl font-bold">Card issued 🎉</h2>
          <p className="text-xs text-muted-foreground px-2">
            Your smart-contract intent card is live. You can find these details any time in <span className="text-foreground font-medium">My Cards</span>.
          </p>
        </div>

        {recipient && (
          <div className="mt-3 flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2.5">
            <div className="h-10 w-10 rounded-full bg-gradient-primary text-primary-foreground flex items-center justify-center text-xs font-semibold shrink-0">
              {recipient.initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-label text-[10px] uppercase text-muted-foreground">
                Issued to
              </p>
              <p className="text-sm font-semibold truncate">{recipient.name}</p>
              {recipient.username && (
                <p className="text-[11px] text-muted-foreground truncate">
                  @{recipient.username}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="mt-4">
          <IntentCard
            size="xs"
            static
            cardNumber={formatPan(fullPan)}
            cardholderName={c.cardholderName}
            expiry={expiry}
            intentTitle={card.description ?? "Intent card"}
            statusLabel={c.status}
          />
        </div>

        <div className="mt-3 rounded-xl border border-border bg-surface/40 p-3">
          <p className="font-label text-[10px] uppercase text-muted-foreground">Card number</p>
          <div className="flex items-center justify-between gap-2 mt-1">
            <p className="font-mono text-sm tabular-nums tracking-wider truncate">{formatPan(fullPan)}</p>
            <Button size="sm" variant="ghost" onClick={copy} className="h-8 px-2 shrink-0">
              {copied ? <Check className="h-4 w-4 text-secondary" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <Button onClick={onClose} className="mt-4 w-full bg-gradient-primary text-primary-foreground font-label">
          OK
        </Button>
      </DialogContent>
    </Dialog>
  );
}
