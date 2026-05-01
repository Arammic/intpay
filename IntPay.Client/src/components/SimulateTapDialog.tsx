import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApp } from "@/lib/store";
import { MCC_CATEGORIES, mccByCode } from "@/lib/mcc";
import type { IntentCard } from "@/lib/types";
import { Loader2, Wifi, CheckCircle2, XCircle, ShieldAlert, Upload } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  card: IntentCard | null;
}

export function SimulateTapDialog({ open, onOpenChange, card }: Props) {
  const { simulateAuthorization, state } = useApp();
  const nav = useNavigate();
  const [merchant, setMerchant] = useState("Whole Foods Market");
  const [amount, setAmount] = useState("12.50");
  const [mcc, setMcc] = useState<string>(card?.allowedMccCodes[0] ?? MCC_CATEGORIES[0].code);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ approved: boolean; reason?: string; proofRequired?: boolean; proofId?: string } | null>(null);
  const autoNavForProof = useRef(false);

  const liveCard = card ? (state.cards.find((c) => c.id === card.id) ?? card) : null;

  useEffect(() => {
    if (!card || !liveCard) return;
    if (!result?.approved || !result.proofRequired || !result.proofId || autoNavForProof.current) return;
    autoNavForProof.current = true;
    onOpenChange(false);
    nav(`/proof/${liveCard.id}/${result.proofId}`);
    setResult(null);
  }, [card, liveCard, result, onOpenChange, nav]);

  if (!card || !liveCard) return null;

  const tap = async () => {
    setPending(true); setResult(null);
    autoNavForProof.current = false;
    const r = await simulateAuthorization(card.id, {
      amount: parseFloat(amount) || 0,
      mccCode: mcc,
      merchantName: merchant || "Unknown merchant",
    });
    setPending(false);
    setResult({ approved: r.approved, reason: r.reason, proofRequired: r.proofRequired, proofId: r.proofId });
  };

  const openUpload = () => {
    if (!result?.proofId) return;
    onOpenChange(false);
    setResult(null);
    nav(`/proof/${liveCard.id}/${result.proofId}`);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setResult(null); }}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-xl flex items-center gap-2">
              <Wifi className="h-5 w-5 text-primary rotate-90" /> Simulate card tap
            </DialogTitle>
            <DialogDescription>
              Mock tap: intent rules apply for MCC, amount, and use limits. Proof upload opens on a full page.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label className="font-label text-xs uppercase text-muted-foreground">Merchant</Label>
              <Input value={merchant} onChange={(e) => setMerchant(e.target.value)} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="font-label text-xs uppercase text-muted-foreground">Amount</Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className="pl-7" />
                </div>
              </div>
              <div>
                <Label className="font-label text-xs uppercase text-muted-foreground">Category (MCC)</Label>
                <Select value={mcc} onValueChange={setMcc}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-72 bg-popover">
                    {MCC_CATEGORIES.map((m) => (
                      <SelectItem key={m.code} value={m.code}>
                        {m.emoji} {m.name} ({m.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="text-xs text-muted-foreground rounded-lg bg-muted/40 border border-border p-2">
              Allowed: {liveCard.allowedMccCodes.map((c) => mccByCode(c)?.emoji).join(" ")} • Remaining: ${(liveCard.amount - liveCard.amountSpent).toFixed(2)} • Uses left: {liveCard.cancelAfterUseCount - liveCard.usedCount}
            </div>

            {liveCard.requireProof && (
              <div className="text-xs rounded-lg border border-tertiary/40 bg-tertiary/10 text-tertiary p-2 flex items-start gap-2">
                <ShieldAlert className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>This card requires <strong>{liveCard.proofName ?? "proof"}</strong> after each pay. You have a short window to upload.</span>
              </div>
            )}

            {result && (
              <div className={`rounded-xl p-3 border animate-scale-in space-y-2 ${result.approved ? "bg-secondary/10 border-secondary/40 text-secondary" : "bg-destructive/10 border-destructive/40 text-destructive"}`}>
                <div className="flex items-start gap-2">
                  {result.approved ? <CheckCircle2 className="h-5 w-5 mt-0.5" /> : <XCircle className="h-5 w-5 mt-0.5" />}
                  <div>
                    <p className="font-display font-semibold text-sm">{result.approved ? "Approved" : "Declined"}</p>
                    <p className="text-xs opacity-90">{result.approved ? "Authorization approved by intent rules." : result.reason}</p>
                  </div>
                </div>
                {result.approved && result.proofRequired && (
                  <Button onClick={openUpload} size="sm" className="w-full bg-tertiary text-tertiary-foreground font-label hover:bg-tertiary/90">
                    <Upload className="h-4 w-4 mr-1.5" /> Upload {liveCard.proofName ?? "proof"} now
                  </Button>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
            <Button onClick={tap} disabled={pending} className="bg-gradient-primary text-primary-foreground font-label">
              {pending ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Awaiting webhook…</> : <><Wifi className="h-4 w-4 mr-1.5 rotate-90" /> Tap to pay</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
