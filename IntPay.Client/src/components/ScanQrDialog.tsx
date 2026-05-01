import { useEffect, useRef, useState } from "react";
import { Loader2, Camera, Keyboard, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { decodeUserQr, getUserById, type ScannedUserData } from "@/api/userLookup";
import { ScannedUserDialog } from "@/components/ScannedUserDialog";

interface BarcodeDetectorLike {
  detect: (source: CanvasImageSource) => Promise<Array<{ rawValue: string }>>;
}

declare global {
  interface Window {
    BarcodeDetector?: new (opts?: { formats?: string[] }) => BarcodeDetectorLike;
  }
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function ScanQrDialog({ open, onOpenChange }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const [supported, setSupported] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [manualId, setManualId] = useState("");
  const [resolving, setResolving] = useState(false);
  const [scanned, setScanned] = useState<ScannedUserData | null>(null);
  const [resultOpen, setResultOpen] = useState(false);

  const stop = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const handleRaw = async (raw: string) => {
    const id = decodeUserQr(raw);
    if (!id) {
      toast.error("Unrecognized QR payload");
      return;
    }
    stop();
    setResolving(true);
    const res = await getUserById(id);
    setResolving(false);
    if (!res.isSucess || !res.data) {
      toast.error(res.error[0] ?? "Lookup failed");
      return;
    }
    setScanned(res.data);
    setResultOpen(true);
    onOpenChange(false);
  };

  useEffect(() => {
    if (!open) {
      stop();
      return;
    }
    const Detector = window.BarcodeDetector;
    if (!Detector) {
      setSupported(false);
      return;
    }
    setSupported(true);
    setError(null);
    const detector = new Detector({ formats: ["qr_code"] });
    let cancelled = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();

        const tick = async () => {
          if (cancelled || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes && codes.length > 0) {
              await handleRaw(codes[0].rawValue);
              return;
            }
          } catch {
            /* ignore single-frame errors */
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Camera access denied");
      }
    })();

    return () => {
      cancelled = true;
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submitManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualId.trim()) return;
    await handleRaw(manualId.trim());
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display text-xl">
              <Camera className="h-5 w-5 text-primary" /> Scan QR Code
            </DialogTitle>
            <DialogDescription>
              Point at an IntPay QR to look up an account.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {supported && !error && (
              <div className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-black">
                <video
                  ref={videoRef}
                  className="h-full w-full object-cover"
                  playsInline
                  muted
                />
                <div className="pointer-events-none absolute inset-6 rounded-xl border-2 border-primary/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
                {resolving && (
                  <div className="absolute inset-0 grid place-items-center bg-background/60 backdrop-blur-sm">
                    <div className="flex items-center gap-2 text-sm">
                      <Loader2 className="h-4 w-4 animate-spin" /> Looking up…
                    </div>
                  </div>
                )}
              </div>
            )}

            {(!supported || error) && (
              <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4 text-center text-xs text-muted-foreground">
                {error
                  ? `Camera unavailable: ${error}`
                  : "Live scanning isn't supported in this browser. Enter the IntPay ID below."}
              </div>
            )}

            <form onSubmit={submitManual} className="space-y-2">
              <label className="flex items-center gap-1.5 font-label text-[11px] uppercase text-muted-foreground">
                <Keyboard className="h-3 w-3" /> Or enter ID / handle
              </label>
              <div className="flex gap-2">
                <Input
                  value={manualId}
                  onChange={(e) => setManualId(e.target.value)}
                  placeholder="e.g. 1 or @abdalla"
                  className="h-10"
                />
                <Button type="submit" disabled={resolving || !manualId.trim()} className="font-label">
                  {resolving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Lookup"}
                </Button>
              </div>
            </form>

            <Button variant="ghost" className="w-full font-label" onClick={() => onOpenChange(false)}>
              <X className="mr-1.5 h-4 w-4" /> Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ScannedUserDialog
        user={scanned}
        open={resultOpen}
        onOpenChange={(v) => {
          setResultOpen(v);
          if (!v) setScanned(null);
        }}
      />
    </>
  );
}
