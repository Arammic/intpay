import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowUpRight, CheckCircle2, Loader2, Wallet as WalletIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { postWalletTopUp, postWalletCashOut, type WalletPaymentMethod } from "@/api/wallet";
import { toast } from "@/hooks/use-toast";

type Mode = "topup" | "cashout";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: Mode;
  paymentMethods: WalletPaymentMethod[];
  currentBalance: number;
}

const QUICK = [25, 50, 100, 250];

export function WalletActionDialog({ open, onOpenChange, mode, paymentMethods, currentBalance }: Props) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState<string>("");
  const [pmId, setPmId] = useState<string>(paymentMethods[0]?.id ?? "");
  const [done, setDone] = useState<null | { amount: number; fee?: number }>(null);

  useEffect(() => {
    if (!open) {
      setAmount("");
      setDone(null);
    } else if (paymentMethods[0] && !pmId) {
      setPmId(paymentMethods[0].id);
    }
  }, [open, paymentMethods, pmId]);

  const isTopUp = mode === "topup";
  const numAmount = Number(amount) || 0;
  const estFee = !isTopUp ? Math.max(0.5, +(numAmount * 0.015).toFixed(2)) : 0;

  const exceedsBalance = !isTopUp && numAmount > currentBalance;

  const mutation = useMutation({
    mutationFn: (vars: { amount: number; paymentMethodId: string }) =>
      isTopUp ? postWalletTopUp(vars) : postWalletCashOut(vars),
    onSuccess: (res) => {
      if (!res.isSucess) {
        toast({ title: "Failed", description: res.error.join(", "), variant: "destructive" });
        return;
      }
      setDone({ amount: res.data.amount, fee: res.data.fee });
      qc.invalidateQueries({ queryKey: ["wallet-page"] });
      qc.invalidateQueries({ queryKey: ["current-user"] });
      toast({
        title: isTopUp ? "Top up complete" : "Cash out scheduled",
        description: isTopUp
          ? `+$${res.data.amount.toFixed(2)} added to your wallet.`
          : `$${res.data.amount.toFixed(2)} on its way (fee $${res.data.fee?.toFixed(2)}).`,
      });
    },
  });

  const accent = useMemo(
    () => (isTopUp
      ? { ring: "border-secondary/40 bg-secondary/10 text-secondary", grad: "bg-gradient-secondary", icon: ArrowDownLeft }
      : { ring: "border-tertiary/40 bg-tertiary/10 text-tertiary", grad: "bg-gradient-tertiary", icon: ArrowUpRight }),
    [isTopUp],
  );
  const Icon = accent.icon;

  const submit = () => {
    if (!numAmount || numAmount <= 0 || exceedsBalance || !pmId) return;
    mutation.mutate({ amount: numAmount, paymentMethodId: pmId });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <span className={cn("h-11 w-11 rounded-2xl grid place-items-center border", accent.ring)}>
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle className="font-display text-lg">
                {isTopUp ? "Top up wallet" : "Cash out"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {isTopUp
                  ? "Add funds from one of your funding sources."
                  : "Move funds from your wallet to a funding source."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {done ? (
          <div className="py-6 flex flex-col items-center text-center gap-3">
            <span className="h-14 w-14 rounded-full bg-secondary/15 grid place-items-center text-secondary">
              <CheckCircle2 className="h-7 w-7" />
            </span>
            <div>
              <p className="font-display text-xl font-bold">
                {isTopUp ? "+" : "-"}${done.amount.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {isTopUp
                  ? "Funds available immediately."
                  : `Sent to your funding source · fee $${(done.fee ?? 0).toFixed(2)}`}
              </p>
            </div>
            <Button onClick={() => onOpenChange(false)} className={cn("mt-2 w-full", accent.grad)}>
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Balance hint */}
            <div className="rounded-2xl border border-border bg-surface/60 p-3 flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-label">
                Current balance
              </p>
              <p className="font-display text-base font-semibold tabular-nums">
                ${currentBalance.toFixed(2)}
              </p>
            </div>

            {/* Amount */}
            <div>
              <label className="font-label text-[11px] uppercase tracking-wider text-muted-foreground">
                Amount
              </label>
              <div className="mt-1.5 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg text-muted-foreground">$</span>
                <Input
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                  className="h-14 pl-7 text-2xl font-display font-semibold tabular-nums rounded-xl"
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {QUICK.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setAmount(String(q))}
                    className="text-xs px-2.5 py-1 rounded-full border border-border bg-card hover:bg-accent transition"
                  >
                    ${q}
                  </button>
                ))}
              </div>
              {exceedsBalance && (
                <p className="text-[11px] text-destructive mt-1.5">Amount exceeds available balance.</p>
              )}
              {!isTopUp && numAmount > 0 && !exceedsBalance && (
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  Fee ~${estFee.toFixed(2)} · You receive ${(numAmount - estFee).toFixed(2)}
                </p>
              )}
            </div>

            {/* Payment methods */}
            <div>
              <label className="font-label text-[11px] uppercase tracking-wider text-muted-foreground">
                {isTopUp ? "From" : "To"}
              </label>
              <div className="mt-1.5 space-y-1.5">
                {paymentMethods.map((pm) => (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => setPmId(pm.id)}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-2xl border p-3 transition text-left",
                      pmId === pm.id
                        ? "border-primary/60 bg-primary/5"
                        : "border-border bg-card hover:border-border/80",
                    )}
                  >
                    <span className="h-9 w-9 rounded-lg bg-primary/10 text-primary grid place-items-center">
                      <WalletIcon className="h-4 w-4" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{pm.label}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{pm.detail}</p>
                    </div>
                    <span className={cn(
                      "h-4 w-4 rounded-full border grid place-items-center",
                      pmId === pm.id ? "border-primary" : "border-border",
                    )}>
                      {pmId === pm.id && <span className="h-2 w-2 rounded-full bg-primary" />}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={submit}
              disabled={!numAmount || numAmount <= 0 || exceedsBalance || !pmId || mutation.isPending}
              className={cn("w-full h-12 text-sm", accent.grad)}
            >
              {mutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing…</>
              ) : (
                <>{isTopUp ? "Confirm top up" : "Confirm cash out"}{numAmount > 0 ? ` · $${numAmount.toFixed(2)}` : ""}</>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
