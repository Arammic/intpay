import { useState } from "react";
import { Menu } from "lucide-react";
import { useWebsiteTheme } from "@/components/WebsiteLayout";

const DocsPage = () => {
  const { theme } = useWebsiteTheme();
  const isDark = theme === "dark";
  const [activeTab, setActiveTab] = useState<"getting-started" | "developer-integration">("getting-started");

  return (
    <div className={`overflow-hidden rounded-2xl border ${isDark ? "border-slate-800" : "border-slate-200"}`}>
      <div className="grid min-h-[72vh] grid-cols-1 md:grid-cols-[260px_1fr]">
        <aside
          className={`hidden border-r p-5 md:block ${
            isDark
              ? "border-slate-800 bg-slate-950 text-slate-200"
              : "border-slate-200 bg-slate-100 text-slate-700"
          }`}
        >
          <p className="mb-4 text-xs font-semibold uppercase tracking-wide opacity-70">Docs sections</p>
          <nav className="space-y-2 text-sm">
            <button
              className={`w-full rounded-md px-3 py-2 text-left transition-colors ${
                activeTab === "getting-started"
                  ? isDark
                    ? "bg-slate-800 text-slate-100"
                    : "bg-white text-slate-900"
                  : isDark
                    ? "text-slate-300 hover:bg-slate-800/80"
                    : "text-slate-700 hover:bg-white"
              }`}
              onClick={() => setActiveTab("getting-started")}
              type="button"
            >
              Getting started
            </button>
            <button
              className={`w-full rounded-md px-3 py-2 text-left transition-colors ${
                activeTab === "developer-integration"
                  ? isDark
                    ? "bg-slate-800 text-slate-100"
                    : "bg-white text-slate-900"
                  : isDark
                    ? "text-slate-300 hover:bg-slate-800/80"
                    : "text-slate-700 hover:bg-white"
              }`}
              onClick={() => setActiveTab("developer-integration")}
              type="button"
            >
              Developer integration
            </button>
          </nav>
        </aside>

        <section className={isDark ? "bg-slate-900 text-slate-100" : "bg-white text-slate-900"}>
          <div
            className={`flex items-center gap-2 border-b px-4 py-3 text-sm md:hidden ${
              isDark ? "border-slate-800 text-slate-200" : "border-slate-200 text-slate-700"
            }`}
          >
            <Menu className="h-4 w-4" />
            <span>Docs</span>
          </div>

          <div className="mx-auto max-w-3xl space-y-8 px-5 py-7 sm:px-8 sm:py-10">
            <div className="md:hidden">
              <div className="grid grid-cols-2 gap-2">
                <button
                  className={`rounded-md border px-3 py-2 text-sm ${
                    activeTab === "getting-started"
                      ? isDark
                        ? "border-slate-600 bg-slate-800 text-slate-100"
                        : "border-slate-300 bg-slate-100 text-slate-900"
                      : isDark
                        ? "border-slate-700 bg-slate-900 text-slate-300"
                        : "border-slate-200 bg-white text-slate-700"
                  }`}
                  onClick={() => setActiveTab("getting-started")}
                  type="button"
                >
                  Getting started
                </button>
                <button
                  className={`rounded-md border px-3 py-2 text-sm ${
                    activeTab === "developer-integration"
                      ? isDark
                        ? "border-slate-600 bg-slate-800 text-slate-100"
                        : "border-slate-300 bg-slate-100 text-slate-900"
                      : isDark
                        ? "border-slate-700 bg-slate-900 text-slate-300"
                        : "border-slate-200 bg-white text-slate-700"
                  }`}
                  onClick={() => setActiveTab("developer-integration")}
                  type="button"
                >
                  Developer integration
                </button>
              </div>
            </div>

            {activeTab === "getting-started" ? (
              <div className="space-y-5">
                <header className="space-y-2">
                  <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Getting started</h1>
                  <p className={`text-base sm:text-lg ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                    IntPay helps you lock money with intent, control spending, and stay safe.
                  </p>
                </header>
                <div
                  className={`rounded-lg border p-5 ${
                    isDark ? "border-slate-700 bg-slate-800 text-slate-300" : "border-slate-200 bg-slate-50 text-slate-700"
                  }`}
                >
                  <ol className="list-decimal space-y-2 pl-6 text-base">
                    <li>Create your account.</li>
                    <li>Cash your wallet.</li>
                    <li>Create an intent card and lock your money.</li>
                    <li>Manage your money with intent.</li>
                  </ol>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <header className="space-y-2">
                  <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Developer integration</h1>
                  <p className={`text-base sm:text-lg ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                    Minimal API and webhook reference for integration.
                  </p>
                </header>
                <div
                  className={`rounded-lg border p-5 ${
                    isDark ? "border-slate-700 bg-slate-800 text-slate-300" : "border-slate-200 bg-slate-50 text-slate-700"
                  }`}
                >
                  <p className="mb-2 text-sm font-medium">API (mock)</p>
                  <pre className={`overflow-x-auto text-sm ${isDark ? "text-slate-200" : "text-slate-800"}`}>
{`POST /api/v1/intents
GET  /api/v1/intents/{intent_id}
POST /api/v1/intents/{intent_id}/confirm`}
                  </pre>
                </div>
                <div
                  className={`rounded-lg border p-5 ${
                    isDark ? "border-slate-700 bg-slate-800 text-slate-300" : "border-slate-200 bg-slate-50 text-slate-700"
                  }`}
                >
                  <p className="mb-2 text-sm font-medium">Webhook (mock)</p>
                  <pre className={`overflow-x-auto text-sm ${isDark ? "text-slate-200" : "text-slate-800"}`}>
{`POST /api/v1/webhooks
{
  "type": "intent.succeeded",
  "data": { "intent_id": "ip_intent_01" }
}`}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default DocsPage;
