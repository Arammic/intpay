import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApp } from "@/lib/store";
import { Banknote, CreditCard, Wallet, Loader2, ArrowDownLeft, Landmark, BadgeDollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const pmIcon = (type: string) => {
  if (type === "bank") return <Banknote className="h-4 w-4" />;
  if (type === "card") return <CreditCard className="h-4 w-4" />;
  return <Wallet className="h-4 w-4" />;
};

function pmVisual(pm: { type: string; label: string; detail?: string; brand?: string }) {
  const raw = `${pm.brand ?? ""} ${pm.label} ${pm.detail ?? ""}`.toLowerCase();
  if (pm.type === "paypal" || raw.includes("paypal")) {
    return {
      icon: <BadgeDollarSign className="h-4 w-4" />,
      badge: "PayPal",
      tone: "bg-[#0070BA]/15 text-[#0070BA] border-[#0070BA]/35",
    };
  }
  if (pm.type === "bank" || raw.includes("bank") || raw.includes("checking")) {
    return {
      icon: <Landmark className="h-4 w-4" />,
      badge: "Bank",
      tone: "bg-[#16A34A]/15 text-[#16A34A] border-[#16A34A]/35",
    };
  }
  if (raw.includes("visa")) {
    return {
      icon: <CreditCard className="h-4 w-4" />,
      badge: "Visa",
      tone: "bg-[#1A1F71]/15 text-[#1A1F71] border-[#1A1F71]/35",
    };
  }
  if (raw.includes("mastercard") || raw.includes("mc")) {
    return {
      icon: <CreditCard className="h-4 w-4" />,
      badge: "Mastercard",
      tone: "bg-[#EB001B]/15 text-[#EB001B] border-[#EB001B]/35",
    };
  }
  if (raw.includes("amex")) {
    return {
      icon: <CreditCard className="h-4 w-4" />,
      badge: "Amex",
      tone: "bg-[#2E77BC]/15 text-[#2E77BC] border-[#2E77BC]/35",
    };
  }
  return {
    icon: pmIcon(pm.type),
    badge: pm.type === "card" ? "Card" : "Wallet",
    tone: "bg-primary/15 text-primary border-primary/30",
  };
}

const QUICK = [25, 50, 100, 250];

export function TopUpDialog({ open, onOpenChange }: Props) {
  const { currentUser, topUpWallet, previewFees } = useApp();
  const [amount, setAmount] = useState("");
  const [pmId, setPmId] = useState(currentUser.paymentMethods[0]?.id ?? "");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    if (!pmId) return toast.error("Pick a funding source");
    setSubmitting(true);
    try {
      await topUpWallet({ amount: amt, paymentMethodId: pmId });
      toast.success(`Top-up completed: +$${previewFees(amt).topUpNet.toFixed(2)} net`);
      onOpenChange(false);
      setTimeout(() => setAmount(""), 300);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl flex items-center gap-2">
            <ArrowDownLeft className="h-5 w-5 text-secondary" /> Top up wallet
          </DialogTitle>
          <DialogDescription>Charge cash to your IntPay wallet. Funds become available instantly.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="font-label text-xs uppercase tracking-wider text-muted-foreground">Amount</Label>
            <div className="relative mt-2">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-display">$</span>
              <Input inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="pl-7 font-display text-2xl h-14" />
            </div>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {QUICK.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setAmount(String(q))}
                  className="rounded-lg border border-border bg-surface text-sm font-label py-2 hover:border-primary/50 transition-base"
                >
                  ${q}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="font-label text-xs uppercase tracking-wider text-muted-foreground">Funding source</Label>
            <div className="grid grid-cols-1 gap-2 mt-2">
              {currentUser.paymentMethods.map((pm) => {
                const v = pmVisual(pm);
                return (
                <button
                  key={pm.id}
                  type="button"
                  onClick={() => setPmId(pm.id)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border p-3 text-left transition-base",
                    pmId === pm.id ? "border-primary bg-primary/10" : "border-border bg-surface hover:border-primary/50"
                  )}
                >
                  <span className={`h-9 w-9 rounded-lg border grid place-items-center ${v.tone}`}>{v.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{pm.label}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{pm.detail}</p>
                  </div>
                  <span className={`text-[10px] font-label uppercase rounded-full border px-2 py-0.5 ${v.tone}`}>{v.badge}</span>
                </button>
              )})}
            </div>
          </div>
          {(() => {
            const amt = parseFloat(amount) || 0;
            const fees = previewFees(amt);
            return (
              <div className="rounded-lg border border-border bg-muted/40 p-2 text-xs text-muted-foreground">
                <p>Charge amount: ${amt.toFixed(2)}</p>
                <p>Processing fee: ${fees.topUpFee.toFixed(2)}</p>
                <p className="font-medium text-foreground">Net added: ${fees.topUpNet.toFixed(2)}</p>
              </div>
            );
          })()}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={submitting} className="bg-gradient-secondary text-secondary-foreground font-label">
            {submitting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <ArrowDownLeft className="h-4 w-4 mr-1.5" />}
            {submitting ? "Charging…" : `Top up ${amount ? `$${parseFloat(amount).toFixed(2)}` : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
