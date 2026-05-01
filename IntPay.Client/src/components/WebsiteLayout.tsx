import * as React from "react";
import {
  Link,
  Outlet,
  useLocation,
  useNavigate,
  useOutletContext,
} from "react-router-dom";
import { Menu, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BRAND_LOGO_SRC, BRAND_NAME } from "@/lib/brand";

type WebsiteTheme = "light" | "dark";

type WebsiteLayoutContext = {
  theme: WebsiteTheme;
};

const WEBSITE_THEME_KEY = "intent-pay-website-theme";

const getInitialTheme = (): WebsiteTheme => {
  if (typeof window === "undefined") {
    return "light";
  }

  const savedTheme = window.localStorage.getItem(WEBSITE_THEME_KEY);
  if (savedTheme === "light" || savedTheme === "dark") {
    return savedTheme;
  }

  return "light";
};

const WebsiteLayout = () => {
  const [theme, setTheme] = React.useState<WebsiteTheme>(() =>
    getInitialTheme(),
  );
  const location = useLocation();
  const navigate = useNavigate();

  React.useEffect(() => {
    window.localStorage.setItem(WEBSITE_THEME_KEY, theme);
  }, [theme]);

  const isDark = theme === "dark";

  return (
    <div
      className={`min-h-screen transition-colors ${
        isDark ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"
      }`}
    >
      <header
        className={`sticky top-0 z-40 border-b backdrop-blur ${
          isDark
            ? "border-slate-700/70 bg-slate-900/65"
            : "border-slate-200/80 bg-white/70"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link
            className="flex items-center gap-2 text-sm font-semibold"
            to="/"
          >
            <img
              alt={`${BRAND_NAME} logo`}
              className="h-7 w-7"
              src={BRAND_LOGO_SRC}
            />
            <span>{BRAND_NAME}</span>
          </Link>

          <nav className="hidden items-center gap-2 sm:flex">
            <Link
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                location.pathname === "/"
                  ? isDark
                    ? "bg-slate-800 text-slate-100"
                    : "bg-slate-100 text-slate-900"
                  : isDark
                    ? "text-slate-300 hover:bg-slate-800/80"
                    : "text-slate-700 hover:bg-slate-100"
              }`}
              to="/"
            >
              Home
            </Link>
            <div className="flex items-center gap-2">
              <span
                className={`text-sm ${isDark ? "text-slate-300" : "text-slate-700"}`}
              >
                Try:
              </span>
              <Link
                className={`rounded-md border px-3 py-1.5 text-sm font-semibold backdrop-blur-md transition-colors ${
                  isDark
                    ? "border-violet-400/40 bg-violet-500/10 text-violet-200 hover:border-violet-300/60 hover:bg-violet-500/20"
                    : "border-violet-500/35 bg-violet-500/10 text-violet-700 hover:border-violet-500/55 hover:bg-violet-500/20"
                }`}
                to="/login"
              >
                The App
              </Link>
              <Link
                className={`rounded-md border px-3 py-1.5 text-sm font-semibold backdrop-blur-md transition-colors ${
                  isDark
                    ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200 hover:border-emerald-300/60 hover:bg-emerald-500/20"
                    : "border-emerald-500/35 bg-emerald-500/10 text-emerald-700 hover:border-emerald-500/55 hover:bg-emerald-500/20"
                }`}
                to="/try-intPay-cards"
              >
                Try IntPay Cards
              </Link>
            </div>
          </nav>

          <div className="flex items-center gap-2">
            <Button
              aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
              className={`h-9 w-9 rounded-lg border p-0 ${
                isDark
                  ? "border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
              }`}
              onClick={() =>
                setTheme((current) => (current === "dark" ? "light" : "dark"))
              }
              size="icon"
              variant="ghost"
            >
              {isDark ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild className="sm:hidden">
                <Button
                  aria-label="Open menu"
                  className={`h-9 w-9 rounded-lg border p-0 ${
                    isDark
                      ? "border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                  }`}
                  size="icon"
                  variant="ghost"
                >
                  <Menu className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className={`w-56 backdrop-blur-xl ${
                  isDark
                    ? "border-slate-700 bg-slate-900/90 text-slate-100"
                    : "border-slate-200 bg-white/90 text-slate-900"
                }`}
              >
                <DropdownMenuItem onSelect={() => navigate("/")}>
                  Home
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigate("/login")}>
                  Try The App
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigate("/try-intPay-cards")}>
                  Try IntPay Cards
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
        <Outlet context={{ theme }} />
      </main>
    </div>
  );
};

export const useWebsiteTheme = () => useOutletContext<WebsiteLayoutContext>();

export default WebsiteLayout;
