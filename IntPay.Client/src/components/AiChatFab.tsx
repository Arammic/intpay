import { Sparkles } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

/**
 * Floating Action Button to open the IntPay AI Assistant from anywhere.
 * Sits above the BottomNav, bottom-right.
 */
export function AiChatFab() {
  const nav = useNavigate();
  const loc = useLocation();

  // Hide on the chat itself to avoid a self-link.
  if (loc.pathname.startsWith("/coach/chat") || loc.pathname.startsWith("/coach")) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => nav("/coach/chat")}
      aria-label="Open IntPay AI Assistant"
      className={cn(
        "fixed z-50 right-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))]",
        "h-14 w-14 rounded-full grid place-items-center",
        "bg-gradient-primary text-primary-foreground",
        "shadow-glow-primary border border-white/20 backdrop-blur-md",
        "transition-all duration-300 ease-out",
        "hover:-translate-y-0.5 hover:brightness-110 active:scale-95",
        "animate-fade-in",
      )}
    >
      <span className="absolute inset-0 rounded-full bg-primary/40 animate-ping opacity-40" />
      <Sparkles className="h-6 w-6 relative z-10 animate-[pulse_2.4s_ease-in-out_infinite]" />
      <span className="sr-only">Ask IntPay AI</span>
    </button>
  );
}
