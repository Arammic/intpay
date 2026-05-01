import { NavLink, useLocation } from "react-router-dom";
import { Home, CreditCard, Wallet, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/app", label: "Home", icon: Home, match: (p: string) => p === "/app" || p.startsWith("/app/") },
  { to: "/cards", label: "Cards", icon: CreditCard, match: (p: string) => p.startsWith("/cards") },
  { to: "/wallet", label: "Wallet", icon: Wallet, match: (p: string) => p.startsWith("/wallet") },
];

interface Props {
  onMoreClick: () => void;
}

export function BottomNav({ onMoreClick }: Props) {
  const loc = useLocation();
  const moreActive = ["/more", "/profile", "/security"].some((p) =>
    loc.pathname.startsWith(p),
  );

  return (
    <nav
      data-tour="bottom-nav"
      className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/90 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]"
      aria-label="Primary"
    >
      <ul className="grid grid-cols-4 max-w-2xl mx-auto">
        {items.map(({ to, label, icon: Icon, match }) => {
          const isActive = match(loc.pathname);
          return (
            <li key={to}>
              <NavLink
                to={to}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-3 transition-base relative",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {isActive && (
                  <span className="absolute top-0 h-0.5 w-10 rounded-full bg-gradient-primary" />
                )}
                <Icon className="h-5 w-5" />
                <span className="font-label text-[10px] uppercase tracking-wider">
                  {label}
                </span>
              </NavLink>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            onClick={onMoreClick}
            className={cn(
              "w-full flex flex-col items-center justify-center gap-1 py-3 transition-base relative",
              moreActive
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="font-label text-[10px] uppercase tracking-wider">
              More
            </span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
