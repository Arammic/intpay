import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
}

export function ThemeToggle({ className }: Props) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "relative h-10 w-10 rounded-full grid place-items-center border border-border bg-surface text-foreground hover:border-primary/60 transition-base",
        className,
      )}
    >
      <Sun className={cn("h-4 w-4 absolute transition-all", isDark ? "opacity-0 -rotate-90 scale-50" : "opacity-100 rotate-0 scale-100")} />
      <Moon className={cn("h-4 w-4 absolute transition-all", isDark ? "opacity-100 rotate-0 scale-100" : "opacity-0 rotate-90 scale-50")} />
    </button>
  );
}
