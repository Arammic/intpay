import { BRAND_LOGO_SRC } from "@/lib/brand";
import { cn } from "@/lib/utils";

interface AppLoaderProps {
  label?: string;
  className?: string;
  /**
   * - "sm": inline loader (40px) for buttons, sections, lists
   * - "md": medium loader (72px) for in-page panels (default)
   * - "fullscreen": centered on the viewport for route transitions
   */
  size?: "sm" | "md" | "fullscreen";
  showLabel?: boolean;
}

const sizeMap = {
  sm: { box: "h-10 w-10", logo: "h-5 w-5", border: "border-[2px]" },
  md: { box: "h-[72px] w-[72px]", logo: "h-9 w-9", border: "border-[3px]" },
  fullscreen: { box: "h-28 w-28", logo: "h-14 w-14", border: "border-[3px]" },
} as const;

export function AppLoader({
  label = "Loading...",
  className,
  size = "md",
  showLabel,
}: AppLoaderProps) {
  const s = sizeMap[size];
  const isFullscreen = size === "fullscreen";
  const shouldShowLabel = showLabel ?? size !== "sm";

  const ring = (
    <div className={cn("relative grid place-items-center", s.box)}>
      {/* Rotating gradient ring */}
      <div
        className={cn(
          "absolute inset-0 rounded-full loader-ring",
          s.border,
        )}
        style={{
          borderColor: "transparent",
          borderTopColor: "hsl(var(--primary))",
          borderRightColor: "hsl(var(--primary) / 0.55)",
        }}
      />
      {/* Soft glow halo */}
      <div className="absolute inset-1 rounded-full bg-primary/10 blur-md loader-halo" />
      {/* Static logo in the center */}
      <img
        src={BRAND_LOGO_SRC}
        alt=""
        aria-hidden
        className={cn("relative object-contain", s.logo)}
      />
    </div>
  );

  if (isFullscreen) {
    return (
      <div
        role="status"
        aria-live="polite"
        className={cn(
          "fixed inset-0 z-[60] grid place-items-center",
          "bg-background/70 backdrop-blur-md animate-fade-in",
          className,
        )}
      >
        <div className="flex flex-col items-center gap-4">
          {ring}
          {shouldShowLabel && (
            <p className="font-label text-xs tracking-widest uppercase text-muted-foreground">
              {label}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center gap-3",
        size === "sm" ? "py-2" : "py-6",
        className,
      )}
    >
      {ring}
      {shouldShowLabel && (
        <p className="font-label text-xs tracking-wide text-muted-foreground">
          {label}
        </p>
      )}
    </div>
  );
}
