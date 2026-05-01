import { useSearchParams, Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { CardsListApi } from "@/components/CardsListApi";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, Send, ShieldCheck } from "lucide-react";
import { useCardsByUser } from "@/hooks/useCardsByUser";
import { AppLoader } from "@/components/AppLoader";

export default function CardsPage() {
  const [params] = useSearchParams();
  const queryClient = useQueryClient();
  const tabParam = params.get("tab");
  const defaultTab =
    tabParam === "received" || tabParam === "sent" ? tabParam : "guard";
  const { data: cardsResponse, isLoading, isFetching } = useCardsByUser();
  const cardsData = cardsResponse?.data;
  const apiErrors = cardsResponse?.error ?? [];

  return (
    <div>
      <PageHeader
        title="Your intent cards"
        subtitle="My intent (guard), received, and sent"
        right={
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="font-label"
              onClick={() =>
                queryClient.invalidateQueries({ queryKey: ["cards-by-user"] })
              }
              title="Refresh cards"
              disabled={isFetching}
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
            <Button size="sm" variant="ghost" asChild className="font-label">
              <Link to="/intent/new">
                <Plus className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        }
      />

      <div className="pt-4 space-y-4">
        {isLoading && (
          <section className="rounded-xl border border-border bg-card p-3">
            <AppLoader showLabel={false} />
          </section>
        )}

        {apiErrors.length > 0 && (
          <section className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 space-y-1">
            <p className="text-sm font-medium text-destructive">
              Failed to load /cards/by-user
            </p>
            {apiErrors.map((message) => (
              <p key={message} className="text-xs text-muted-foreground">
                {message}
              </p>
            ))}
          </section>
        )}
        {/* 
        <div className="grid grid-cols-2 gap-2">
          <Button
            asChild
            className="bg-gradient-primary text-primary-foreground font-label h-11"
          >
            <Link to="/intent/new">
              <ShieldCheck className="h-4 w-4 mr-1.5" /> Lock Money
            </Link>
          </Button>
          <Button asChild variant="secondary" className="font-label h-11">
            <Link to="/intent/new">
              <Send className="h-4 w-4 mr-1.5" /> Send intent
            </Link>
          </Button>
        </div> */}

        <CardsListApi
          defaultTab={defaultTab}
          cardsGuard={cardsData?.selfCards ?? []}
          cardsReceived={cardsData?.cardsReceived ?? []}
          cardsSent={cardsData?.cardsSent ?? []}
        />
      </div>
    </div>
  );
}
