import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LifeBuoy,
  Sparkles,
  ScanLine,
  Compass,
  ShieldCheck,
  TriangleAlert,
  Snowflake,
  Ban,
  Clock3,
  CircleCheck,
  CircleOff,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScanQrDialog } from "@/components/ScanQrDialog";
import { TourGuide, DEFAULT_TOUR_STEPS } from "@/components/TourGuide";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Single floating "?" helpers button. Opens a small column with:
 *  - Ask IntPay AI
 *  - Scan QR
 *  - Tour guide
 */
export function HelpersDock() {
  const nav = useNavigate();
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);

  // Hide on chat/login routes
  if (loc.pathname.startsWith("/coach") || loc.pathname === "/login") return null;

  const Item = ({
    icon: Icon,
    label,
    onClick,
    tone = "neutral",
  }: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    onClick: () => void;
    tone?: "primary" | "secondary" | "neutral";
  }) => {
    const toneCls =
      tone === "primary"
        ? "bg-gradient-primary text-primary-foreground border-white/20 shadow-glow-primary"
        : tone === "secondary"
          ? "bg-gradient-secondary text-secondary-foreground border-white/20"
          : "bg-card text-foreground border-border";
    return (
      <button
        type="button"
        onClick={() => {
          onClick();
          setOpen(false);
        }}
        className={cn(
          "group flex items-center gap-2 rounded-full border px-3 py-2 backdrop-blur-md shadow-md transition-all",
          "hover:-translate-y-0.5 active:scale-95",
          toneCls,
        )}
      >
        <Icon className="h-4 w-4" />
        <span className="font-label text-xs font-semibold uppercase tracking-wide">
          {label}
        </span>
      </button>
    );
  };

  return (
    <>
      <div
        data-tour="helpers-dock"
        className="fixed z-50 right-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] flex flex-col items-end gap-2"
      >
        {open && (
          <div className="flex flex-col items-end gap-2 animate-in fade-in slide-in-from-bottom-2">
            <Item
              icon={Sparkles}
              label="Ask AI"
              tone="primary"
              onClick={() => nav("/coach")}
            />
            <Item
              icon={ScanLine}
              label="Scan QR"
              onClick={() => setScanOpen(true)}
            />
            <Item
              icon={Compass}
              label="Tour guide"
              tone="secondary"
              onClick={() => setTourOpen(true)}
            />
            <Item
              icon={ShieldCheck}
              label="Card Status Legend"
              onClick={() => setLegendOpen(true)}
            />
          </div>
        )}

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close helpers" : "Open helpers"}
          className={cn(
            "h-11 w-11 rounded-full grid place-items-center",
            "bg-gradient-primary text-primary-foreground",
            "shadow-glow-primary border border-white/20 backdrop-blur-md",
            "transition-all duration-300 ease-out",
            "hover:-translate-y-0.5 hover:brightness-110 active:scale-95",
          )}
        >
          {open ? (
            <X className="h-5 w-5" />
          ) : (
            <LifeBuoy className="h-5 w-5" />
          )}
        </button>
      </div>

      <ScanQrDialog open={scanOpen} onOpenChange={setScanOpen} />
      <TourGuide
        steps={DEFAULT_TOUR_STEPS}
        open={tourOpen}
        onClose={() => setTourOpen(false)}
      />
      <Dialog open={legendOpen} onOpenChange={setLegendOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Card Status Legend</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2 sm:grid-cols-2">
            <LegendItem
              icon={TriangleAlert}
              label="Expired"
              description="Card has reached expiry and can't be used."
            />
            <LegendItem
              icon={Snowflake}
              label="Frozen"
              description="Card is manually paused until unfrozen."
            />
            <LegendItem
              icon={Ban}
              label="Spend blocked"
              description="New charges are blocked by policy/risk checks."
            />
            <LegendItem
              icon={Clock3}
              label="Refund pending"
              description="Refund request is open and under review."
            />
            <LegendItem
              icon={CircleCheck}
              label="Active"
              description="Card is usable under its rules."
            />
            <LegendItem
              icon={CircleOff}
              label="Inactive"
              description="Card exists but is not currently usable."
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function LegendItem({
  icon: Icon,
  label,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-surface/40 px-2.5 py-2">
      <p className="flex items-center gap-1.5 text-xs font-semibold">
        <Icon className="h-3.5 w-3.5 text-primary" />
        {label}
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
        {description}
      </p>
    </div>
  );
}
