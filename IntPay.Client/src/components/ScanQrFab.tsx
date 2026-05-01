import { useState } from "react";
import { ScanLine } from "lucide-react";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ScanQrDialog } from "@/components/ScanQrDialog";

/**
 * Floating QR scanner button — sits beside the AI Chat FAB.
 */
export function ScanQrFab() {
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  if (loc.pathname.startsWith("/coach")) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Scan QR code"
        className={cn(
          "fixed z-50 right-4 bottom-[calc(11rem+env(safe-area-inset-bottom))]",
          "h-12 w-12 rounded-full grid place-items-center",
          "bg-card text-foreground border border-border",
          "shadow-lg backdrop-blur-md",
          "transition-all duration-300 ease-out",
          "hover:-translate-y-0.5 hover:border-primary/60 hover:text-primary active:scale-95",
          "animate-fade-in",
        )}
      >
        <ScanLine className="h-5 w-5" />
        <span className="sr-only">Scan QR code</span>
      </button>
      <ScanQrDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
