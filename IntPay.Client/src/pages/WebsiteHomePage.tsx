import { Link } from "react-router-dom";
import HowItWorksFlow from "@/components/HowItWorksFlow";
import RealStoriesSection from "@/components/RealStoriesSection";
import { ShinyButton } from "@/components/ShinyButton";
import {
  BRAND_EXPANDED,
  BRAND_LOGO_SRC,
  BRAND_NAME,
  BRAND_SLOGAN,
} from "@/lib/brand";
import { useWebsiteTheme } from "@/components/WebsiteLayout";
import { useIsMobile } from "@/hooks/use-mobile";

const TAP_IMAGE =
  "https://tempfile.aiquickdraw.com/workers/nano/image_1777654338331_mzh00y.png";

const WebsiteHomePage = () => {
  const { theme } = useWebsiteTheme();
  const isDark = theme === "dark";
  const isMobile = useIsMobile();

  return (
    <div className="space-y-14 pb-8">
      <section
        className={`rounded-2xl border p-6 sm:p-8 lg:p-10 ${
          isDark
            ? "border-slate-700 bg-slate-900/70"
            : "border-slate-200 bg-white/90"
        }`}
      >
        <div className="grid items-center gap-8 lg:grid-cols-2">
          <div className="space-y-5">
            <p
              className={`text-sm font-semibold uppercase tracking-[0.2em] ${isDark ? "text-slate-400" : "text-slate-500"}`}
            >
              Intent-first payments
            </p>
            <h1 className="font-display text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              <span className={isDark ? "text-slate-400" : "text-slate-500"}>
                With{" "}
              </span>
              <span style={{ color: "#5B39D4" }}>Int</span>
              <span style={{ color: "#0FB78E" }}>Pay</span>
              <span className={isDark ? "text-slate-400" : "text-slate-500"}>
                , you only{" "}
              </span>
              <span style={{ color: "#0FB78E" }}>pay</span>
              <span className={isDark ? "text-slate-400" : "text-slate-500"}>
                {" "}
                your{" "}
              </span>
              <span style={{ color: "#5B39D4" }}>int</span>
              <span className={isDark ? "text-slate-400" : "text-slate-500"}>
                ent.
              </span>
            </h1>
            <p
              className={`max-w-xl text-base leading-relaxed sm:text-lg ${isDark ? "text-slate-300" : "text-slate-700"}`}
            >
              Control how money is sent, received, and verified with
              intent-aware cards for families, teams, and personal finance.
            </p>
            <div className="flex flex-wrap gap-3">
              <ShinyButton
                className="rounded-lg px-5 py-2.5 text-sm font-semibold"
                href="/login"
              >
                Try The App
              </ShinyButton>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl">
            <div
              className={`overflow-hidden rounded-2xl border shadow-lg ${
                isDark
                  ? "border-slate-700 bg-slate-900/40"
                  : "border-slate-200 bg-white"
              }`}
            >
              <img
                src={TAP_IMAGE}
                alt="IntPay card tap to buy machine"
                className="h-auto w-full object-cover"
                loading={isMobile ? "eager" : "lazy"}
              />
            </div>
          </div>
        </div>
      </section>

      <HowItWorksFlow isDark={isDark} />

      <RealStoriesSection isDark={isDark} />

      <footer
        className={`overflow-hidden rounded-3xl border backdrop-blur-xl ${
          isDark
            ? "border-slate-700/70 bg-slate-900/60 text-slate-300"
            : "border-slate-200/80 bg-white/60 text-slate-700"
        }`}
      >
        <div className="mx-auto max-w-5xl px-6 py-12 text-center sm:px-10 sm:py-16">
          <div className="flex flex-col items-center gap-3">
            <img
              alt={`${BRAND_NAME} logo`}
              className="h-14 w-14"
              src={BRAND_LOGO_SRC}
            />
            <h3 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              {BRAND_EXPANDED}
            </h3>
            <p
              className={`text-xs uppercase tracking-[0.3em] ${isDark ? "text-slate-500" : "text-slate-400"}`}
            >
              {BRAND_SLOGAN}
            </p>
          </div>

          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            <div>
              <p
                className={`mb-3 text-xs font-semibold uppercase tracking-widest ${isDark ? "text-slate-400" : "text-slate-500"}`}
              >
                Sections
              </p>
              <ul className="space-y-2 text-sm">
                <li>
                  <a
                    className={
                      isDark ? "hover:text-white" : "hover:text-slate-900"
                    }
                    href="#how-it-works"
                  >
                    How it works
                  </a>
                </li>
                <li>
                  <a
                    className={
                      isDark ? "hover:text-white" : "hover:text-slate-900"
                    }
                    href="#real-stories"
                  >
                    Real stories
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <p
                className={`mb-3 text-xs font-semibold uppercase tracking-widest ${isDark ? "text-slate-400" : "text-slate-500"}`}
              >
                The App
              </p>
              <div className="flex flex-col items-center gap-2">
                <Link
                  className={`inline-flex min-w-44 items-center justify-center rounded-md border px-3 py-2 text-sm font-semibold backdrop-blur-md transition-colors ${
                    isDark
                      ? "border-violet-400/40 bg-violet-500/10 text-violet-200 hover:border-violet-300/60 hover:bg-violet-500/20"
                      : "border-violet-500/35 bg-violet-500/10 text-violet-700 hover:border-violet-500/55 hover:bg-violet-500/20"
                  }`}
                  to="/login"
                >
                  The App
                </Link>
                <Link
                  className={`inline-flex min-w-44 items-center justify-center rounded-md border px-3 py-2 text-sm font-semibold backdrop-blur-md transition-colors ${
                    isDark
                      ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200 hover:border-emerald-300/60 hover:bg-emerald-500/20"
                      : "border-emerald-500/35 bg-emerald-500/10 text-emerald-700 hover:border-emerald-500/55 hover:bg-emerald-500/20"
                  }`}
                  to="/try-intPay-cards"
                >
                  Try IntPay Cards
                </Link>
              </div>
            </div>

            <div>
              <p
                className={`mb-3 text-xs font-semibold uppercase tracking-widest ${isDark ? "text-slate-400" : "text-slate-500"}`}
              >
                Resources
              </p>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    className={
                      isDark ? "hover:text-white" : "hover:text-slate-900"
                    }
                    to="/app"
                  >
                    Open app
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div
            className={`mt-10 border-t pt-6 text-xs ${isDark ? "border-slate-700/70 text-slate-500" : "border-slate-200/80 text-slate-400"}`}
          >
            © {new Date().getFullYear()} {BRAND_NAME} · Spend with intent.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default WebsiteHomePage;
