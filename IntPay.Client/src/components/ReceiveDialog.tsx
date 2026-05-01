import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { MockQrCode } from "./MockQrCode";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  account: {
    id: string;
    name: string;
    email: string;
    initials: string;
  };
}

export function ReceiveDialog({ open, onOpenChange, account }: Props) {
  const [copied, setCopied] = useState(false);
  const link = `https://intentpay.app/u/${account.id}`;
  const qrPayload = JSON.stringify({
    id: account.id,
    email: account.email,
    name: account.name,
    type: "receive_account",
  });

  const copy = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Link copied");
    setTimeout(() => setCopied(false), 1400);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Receive money</DialogTitle>
          <DialogDescription>Share your handle so others can send you intent-locked funds.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-3 py-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border bg-surface text-lg font-semibold">
            {account.initials}
          </div>
          <p className="font-display font-semibold text-lg">{account.name}</p>
          <p className="font-mono text-sm text-primary">{account.email}</p>
          <MockQrCode label={qrPayload} size={280} className="w-full max-w-[320px]" />

          <div className="w-full mt-2 flex items-center gap-2 rounded-xl border border-border bg-surface p-2">
            <span className="px-2 text-sm font-mono truncate flex-1">{link}</span>
            <Button size="sm" variant="secondary" onClick={copy}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center">When someone sends you money, they choose the merchant categories. You'll see a virtual card here ready to activate.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
