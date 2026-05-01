import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Share2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { encodeUserQr } from "@/api/userLookup";
import { BRAND_LOGO_SRC } from "@/lib/brand";
import { toast } from "sonner";
import { useCurrentUserContext } from "@/lib/currentUserContext";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function MyQrDialog({ open, onOpenChange }: Props) {
  const { userId, profile } = useCurrentUserContext();
  const [copied, setCopied] = useState(false);

  const payload = encodeUserQr(String(userId));
  const username = profile?.username ?? "";
  const name = profile?.name ?? `User ${userId}`;
  const shareLink =
    profile?.link || `https://intentpay.app/u/${userId}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      toast.success("QR payload copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Copy failed");
    }
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "My IntPay QR", text: payload, url: shareLink });
      } catch { /* user cancelled */ }
    } else {
      copy();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">My QR Code</DialogTitle>
          <DialogDescription>Have someone scan this to pay you.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-3 py-2">
          <div className="rounded-2xl border border-border bg-white p-4">
            <QRCodeSVG
              value={payload}
              size={220}
              bgColor="#ffffff"
              fgColor="#111827"
              level="H"
              includeMargin
              imageSettings={{
                src: BRAND_LOGO_SRC,
                height: 44,
                width: 44,
                excavate: true,
              }}
            />
          </div>
          <div className="text-center">
            <p className="font-display text-base font-bold">{name}</p>
            {username && (
              <p className="text-xs text-muted-foreground">@{username}</p>
            )}
          </div>
          <code className="block w-full break-all rounded-md bg-muted/50 p-2 text-center text-[11px]">
            {payload}
          </code>
          <div className="flex w-full gap-2">
            <Button variant="outline" className="flex-1 font-label" onClick={copy}>
              <Copy className="mr-1.5 h-4 w-4" /> {copied ? "Copied" : "Copy"}
            </Button>
            <Button className="flex-1 bg-gradient-primary text-primary-foreground font-label" onClick={share}>
              <Share2 className="mr-1.5 h-4 w-4" /> Share
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
