import { useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import type { AppHomeSliderCard } from "@/api/appHome";
import { IntentCard } from "@/components/IntentCard";
import { cn } from "@/lib/utils";

interface Props {
  cards: AppHomeSliderCard[];
  title?: string;
  onSeeAllHref?: string;
}

export function ActiveSmartCardsSlider({
  cards,
  title = "Active Smart Cards",
  onSeeAllHref = "/cards",
}: Props) {
  const nav = useNavigate();
  if (!cards.length) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between px-0.5">
        <h2 className="font-display text-lg font-bold flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-primary" />
          {title}
        </h2>
        <button
          type="button"
          onClick={() => nav(onSeeAllHref)}
          className="text-xs font-label text-primary hover:underline"
        >
          View All
        </button>
      </div>

      <div className="-mx-4 px-4">
        <div className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-apple">
          {cards.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => nav(`/cards/${c.id}`)}
              className={cn(
                "snap-start shrink-0 w-[270px] sm:w-[300px] text-left rounded-[24px]",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
              )}
              aria-label={`Open card ${c.description}`}
            >
              <IntentCard
                size="sm"
                cardNumber={`•••• •••• •••• ${c.last4}`}
                cardholderName={c.cardholderName}
                expiry={`${String(c.expMonth).padStart(2, "0")}/${String(c.expYear).slice(-2)}`}
                intentTitle={c.description}
                statusLabel={prettyStatus(c.status)}
              />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function prettyStatus(s: string) {
  const v = (s || "").toLowerCase();
  if (v.includes("expired") || v.includes("cancel")) return "Closed";
  if (v.includes("pending")) return "Pending";
  return "Active";
}
