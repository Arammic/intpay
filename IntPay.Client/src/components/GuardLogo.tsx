import guardImg from "@/assets/intent-bot.webp";
import { cn } from "@/lib/utils";

interface Props {
  size?: number;
  className?: string;
  /** Show inside a glowing circular badge */
  badge?: boolean;
  alt?: string;
}

export function GuardLogo({ size = 40, className, badge = false, alt = "Intent Pay Guard" }: Props) {
  if (badge) {
    return (
      <div
        className={cn(
          "rounded-2xl bg-gradient-primary shadow-glow-primary grid place-items-center p-1.5 ring-1 ring-white/15",
          className,
        )}
        style={{ width: size, height: size }}
      >
        <img
          src={guardImg}
          alt={alt}
          width={size}
          height={size}
          loading="lazy"
          className="h-full w-full object-contain drop-shadow"
        />
      </div>
    );
  }
  return (
    <img
      src={guardImg}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      className={cn("object-contain", className)}
      style={{ width: size, height: size }}
    />
  );
}
