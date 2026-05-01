import { useSearchParams } from "react-router-dom";
import AmazonCheckoutPage from "@/pages/AmazonCheckoutPage";
import RentCheckoutPage from "@/pages/RentCheckoutPage";

type TryTab = "amazon" | "rent";

const getTab = (value: string | null): TryTab =>
  value === "rent" ? "rent" : "amazon";

export default function TryIntPayCardsPage() {
  const [params, setParams] = useSearchParams();
  const activeTab = getTab(params.get("tab"));

  const setTab = (tab: TryTab) => {
    const next = new URLSearchParams(params);
    next.set("tab", tab);
    setParams(next, { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl gap-2 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => setTab("amazon")}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === "amazon"
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-card text-foreground hover:bg-muted"
            }`}
          >
            Amazon checkout mock
          </button>
          <button
            type="button"
            onClick={() => setTab("rent")}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === "rent"
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-card text-foreground hover:bg-muted"
            }`}
          >
            Rent checkout mock
          </button>
        </div>
      </div>

      <div>{activeTab === "amazon" ? <AmazonCheckoutPage /> : <RentCheckoutPage />}</div>
    </div>
  );
}
