import { PageHeader } from "@/components/PageHeader";
import { CardsListApi } from "@/components/CardsListApi";
import { useCardsByUser } from "@/hooks/useCardsByUser";
import { AppLoader } from "@/components/AppLoader";

export default function SentCardsPage() {
  const { data: cardsResponse, isLoading } = useCardsByUser();
  const cardsData = cardsResponse?.data;
  const apiErrors = cardsResponse?.error ?? [];

  return (
    <div>
      <PageHeader
        title="Sent cards"
        subtitle="Cards you sent previously"
        fallback="/"
      />
      <div className="pt-4 space-y-4">
        {isLoading && (
          <section className="rounded-xl border border-border bg-card p-3">
            <AppLoader label="Syncing sent cards..." />
          </section>
        )}

        {apiErrors.length > 0 && (
          <section className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 space-y-1">
            <p className="text-sm font-medium text-destructive">
              Failed to load /app/cards from localhost:8000
            </p>
            {apiErrors.map((message) => (
              <p key={message} className="text-xs text-muted-foreground">
                {message}
              </p>
            ))}
          </section>
        )}

        <CardsListApi
          defaultTab="sent"
          cardsGuard={cardsData?.selfCards ?? []}
          cardsReceived={cardsData?.cardsReceived ?? []}
          cardsSent={cardsData?.cardsSent ?? []}
        />
      </div>
    </div>
  );
}
