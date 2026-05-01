import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CreditCard,
  Wallet as WalletIcon,
  ShieldCheck,
  Landmark,
  BadgeDollarSign,
  Loader2,
  Plus,
  X,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useCurrentUserContext } from "@/lib/currentUserContext";
import { addFunds, type ProfileDto } from "@/api/profileApi";
import { AppLoader } from "@/components/AppLoader";

const MAX_CHARGE = 5000;

const FUNDING_PREVIEW = [
  {
    id: "visa",
    label: "Visa",
    detail: "Credit & debit cards",
    icon: <CreditCard className="h-4 w-4" />,
    tone: "bg-[#1A1F71]/15 text-[#1A1F71] border-[#1A1F71]/35",
  },
  {
    id: "mastercard",
    label: "Mastercard",
    detail: "Credit & debit cards",
    icon: <CreditCard className="h-4 w-4" />,
    tone: "bg-[#EB001B]/15 text-[#EB001B] border-[#EB001B]/35",
  },
  {
    id: "paypal",
    label: "PayPal",
    detail: "Linked PayPal balance",
    icon: <BadgeDollarSign className="h-4 w-4" />,
    tone: "bg-[#0070BA]/15 text-[#0070BA] border-[#0070BA]/35",
  },
  {
    id: "bank",
    label: "Bank transfer",
    detail: "ACH / SEPA accounts",
    icon: <Landmark className="h-4 w-4" />,
    tone: "bg-[#16A34A]/15 text-[#16A34A] border-[#16A34A]/35",
  },
  {
    id: "debit",
    label: "Debit card",
    detail: "Direct debit",
    icon: <CreditCard className="h-4 w-4" />,
    tone: "bg-primary/15 text-primary border-primary/30",
  },
];

export default function WalletApiPage() {
  const { userId, profile, isLoading } = useCurrentUserContext();
  const qc = useQueryClient();

  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");

  const balance = profile?.vaultBalance ?? 0;
  const lockMoney = profile?.lockMoney ?? 0;

  const mutation = useMutation({
    mutationFn: (amt: number) => addFunds(userId, amt),
    onSuccess: (res) => {
      if (!res.isSucess || !res.data) {
        toast.error(res.error.join(", ") || "Failed to add funds");
        return;
      }
      qc.setQueryData<{
        data: ProfileDto | null;
        isSucess: boolean;
        error: string[];
      }>(["profile", userId], (prev) => {
        if (!prev?.data) return prev;
        return {
          ...prev,
          data: {
            ...prev.data,
            vaultBalance: res.data!.vaultBalance,
            lockMoney: res.data!.lockMoney,
          },
        };
      });
      toast.success(`Wallet charged. New balance $${res.data.vaultBalance.toFixed(2)}`);
      setAmount("");
      setOpen(false);
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const submit = () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    if (amt > MAX_CHARGE) return toast.error(`Max charge is $${MAX_CHARGE}`);
    mutation.mutate(amt);
  };

  if (isLoading && !profile) {
    return (
      <div>
        <PageHeader title="Wallet" subtitle="Manage cash and funding sources" />
        <div className="pt-10">
          <AppLoader size="md" label="Loading wallet" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Wallet" subtitle="Manage cash and funding sources" />

      <div className="pt-4 space-y-4">
        {/* Balance hero — split into two like home dashboard */}
        <div className="rounded-3xl bg-card/90 border border-primary/20 p-5 sm:p-6 shadow-[0_20px_60px_-30px_hsl(var(--primary)/0.55)] relative overflow-hidden backdrop-blur-sm">
          <div className="absolute -top-20 -right-20 h-56 w-56 rounded-full bg-secondary/25 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-16 h-52 w-52 rounded-full bg-primary/20 blur-3xl pointer-events-none" />

          <div className="relative grid grid-cols-2 gap-4">
            <div className="pr-2">
              <p className="font-label text-[10px] uppercase tracking-widest text-muted-foreground">
                Free Money
              </p>
              <p className="font-display text-3xl sm:text-4xl font-bold tracking-tight mt-1 tabular-nums">
                {isLoading
                  ? "—"
                  : `$${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </p>
              <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <WalletIcon className="h-3.5 w-3.5 text-primary" />
                <span>Available to spend</span>
              </div>
            </div>
            <div className="pl-3 border-l border-border/70">
              <p className="font-label text-[10px] uppercase tracking-widest text-muted-foreground">
                Lock Money Amount
              </p>
              <p className="font-display text-3xl sm:text-4xl font-bold tracking-tight mt-1 tabular-nums">
                {isLoading
                  ? "—"
                  : `$${lockMoney.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </p>
              <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                <span>Held by Guard</span>
              </div>
            </div>
          </div>

          {/* Charge button + expanding input */}
          <div className="relative mt-5">
            {!open ? (
              <Button
                onClick={() => setOpen(true)}
                className="w-full h-12 bg-gradient-secondary text-secondary-foreground font-label shadow-[0_10px_30px_-16px_hsl(var(--secondary)/0.9)]"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Charge wallet
              </Button>
            ) : (
              <div className="rounded-2xl border border-border/70 bg-surface/70 p-3 space-y-3 animate-in fade-in slide-in-from-top-1">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Amount (max ${MAX_CHARGE.toLocaleString()})
                  </Label>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      setAmount("");
                    }}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg text-muted-foreground">
                    $
                  </span>
                  <Input
                    autoFocus
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^0-9.]/g, "");
                      const n = parseFloat(v);
                      if (!isNaN(n) && n > MAX_CHARGE) {
                        setAmount(String(MAX_CHARGE));
                      } else {
                        setAmount(v);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") submit();
                    }}
                    placeholder="0.00"
                    className="h-14 pl-7 text-2xl font-display font-semibold tabular-nums rounded-xl"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[50, 100, 250, 500, 1000].map((q) => (
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
                <Button
                  onClick={submit}
                  disabled={mutation.isPending || !amount}
                  className="w-full h-12 bg-gradient-secondary text-secondary-foreground font-label shadow-[0_10px_30px_-16px_hsl(var(--secondary)/0.9)]"
                >
                  {mutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                      Charging…
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-1.5" />
                      Charge{amount ? ` $${parseFloat(amount).toFixed(2)}` : ""}
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Funding sources — preview / coming soon */}
        <section className="rounded-2xl border border-border/70 bg-card/60 p-4">
          <div className="flex items-start gap-2 mb-3">
            <span className="h-8 w-8 rounded-lg bg-primary/10 text-primary grid place-items-center">
              <Sparkles className="h-4 w-4" />
            </span>
            <div className="flex-1">
              <h2 className="font-display text-base font-bold">
                Funding sources
              </h2>
              <p className="text-xs text-muted-foreground">
                Soon you'll be able to fund your wallet with these methods.
              </p>
            </div>
            <span className="text-[10px] font-label uppercase rounded-full border border-border bg-background px-2 py-1 text-muted-foreground">
              Coming soon
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {FUNDING_PREVIEW.map((pm) => (
              <div
                key={pm.id}
                className="flex items-center gap-3 rounded-xl border border-dashed border-border/70 bg-surface/40 p-3 opacity-90"
              >
                <span
                  className={`h-9 w-9 rounded-lg border grid place-items-center ${pm.tone}`}
                >
                  {pm.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{pm.label}</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {pm.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
