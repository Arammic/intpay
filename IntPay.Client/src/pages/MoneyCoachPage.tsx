import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Sparkles, MessageCircle, Loader2, ArrowUpRight, FileText, ThumbsUp, ThumbsDown, Copy } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApp } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type Turn = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "How many active cards do I have?",
  "What is my wallet balance?",
  "Why should I lock money for groceries?",
  "How does proof requirement work?",
];

export default function MoneyCoachPage() {
  const nav = useNavigate();
  const { currentUser, cardsGuard, cardsSent, cardsReceived } = useApp();
  const [query, setQuery] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [loading, setLoading] = useState(false);
  const [followup, setFollowup] = useState("");

  const context = useMemo(() => ({
    user: { id: currentUser.id, name: currentUser.name, points: currentUser.points },
    cardsGuard: cardsGuard.map((c) => ({ id: c.id, kind: c.kind, description: c.description, amount: c.amount, usedCount: c.usedCount, cancelAfterUseCount: c.cancelAfterUseCount, allowedMccCodes: c.allowedMccCodes, status: c.status })),
    cardsSent: cardsSent.map((c) => ({ id: c.id, kind: c.kind, description: c.description, amount: c.amount, usedCount: c.usedCount, status: c.status, toUserId: c.toUserId })),
    cardsReceived: cardsReceived.map((c) => ({ id: c.id, kind: c.kind, description: c.description, amount: c.amount, usedCount: c.usedCount, status: c.status, fromUserId: c.fromUserId })),
  }), [currentUser, cardsGuard, cardsSent, cardsReceived]);

  const ask = async (text: string, history: Turn[] = []) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const next: Turn[] = [...history, { role: "user", content: trimmed }];
    setTurns(next);
    setQuery(trimmed);
    setFollowup("");
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("intpay-assist", {
        body: { messages: next, context },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      setTurns([...next, { role: "assistant", content: data.reply ?? "" }]);
    } catch (e) {
      toast({ title: "Could not get answer", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied" });
  };

  return (
    <div className="pb-10">
      <PageHeader title="Ask IntPay" subtitle="Search your data + product help" fallback="/app" />

      <div className="pt-4 space-y-4">
        {/* Search bar */}
        <form
          onSubmit={(e) => { e.preventDefault(); ask(query); }}
          className="flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2 shadow-sm"
        >
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask anything about your IntPay…"
            className="border-0 shadow-none focus-visible:ring-0 h-9 px-1 text-sm"
          />
          <Button type="submit" size="sm" disabled={loading || !query.trim()} className="h-8 rounded-full gap-1.5">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Ask AI
          </Button>
        </form>

        {/* Standalone chat CTA */}
        <button
          onClick={() => nav("/coach/chat")}
          className="w-full flex items-center justify-between gap-3 rounded-2xl border border-border bg-gradient-to-br from-primary/5 to-transparent p-3.5 hover:border-primary/40 transition-base text-left"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="h-9 w-9 rounded-xl bg-primary/10 grid place-items-center text-primary shrink-0">
              <MessageCircle className="h-4.5 w-4.5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight">Open IntPay Assistant chat</p>
              <p className="text-[11px] text-muted-foreground leading-tight">Full-screen conversation with your data</p>
            </div>
          </div>
          <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
        </button>

        {/* Empty state — suggestions */}
        {turns.length === 0 && !loading && (
          <div className="space-y-2">
            <p className="font-label text-[10px] uppercase tracking-wider text-muted-foreground px-1">Try</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => ask(s)}
                  className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-foreground/80 hover:border-primary/40 hover:text-foreground transition-base"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* AI answer card */}
        {turns.length > 0 && (
          <div className="rounded-2xl border border-primary/20 bg-card overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-primary/[0.04]">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <p className="text-[11px] text-muted-foreground">
                AI-generated answer for: <span className="text-foreground italic">"{turns[0].content}"</span>
              </p>
            </div>

            <div className="p-4 space-y-4">
              {turns.map((t, i) => (
                t.role === "user" && i > 0 ? (
                  <div key={i} className="rounded-xl bg-muted/60 px-3 py-2 text-sm">
                    <p className="text-[10px] uppercase font-label text-muted-foreground mb-0.5">Follow-up</p>
                    {t.content}
                  </div>
                ) : t.role === "assistant" ? (
                  <div key={i} className="grid sm:grid-cols-[1fr,180px] gap-4">
                    <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                      {t.content}
                    </div>
                    {i === 1 && (
                      <aside className="rounded-xl border border-border bg-surface/40 p-3 h-fit">
                        <p className="text-[10px] uppercase font-label text-muted-foreground mb-2">Sources</p>
                        <div className="space-y-2">
                          <div className="flex items-start gap-2 text-xs">
                            <span className="h-5 w-5 rounded-full bg-primary/10 text-primary grid place-items-center text-[10px] font-semibold shrink-0">1</span>
                            <div className="min-w-0">
                              <p className="font-medium text-foreground truncate">Your IntPay data</p>
                              <p className="text-muted-foreground text-[10px]">{cardsGuard.length + cardsSent.length + cardsReceived.length} cards · wallet</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2 text-xs">
                            <span className="h-5 w-5 rounded-full bg-primary/10 text-primary grid place-items-center text-[10px] font-semibold shrink-0">2</span>
                            <div className="min-w-0">
                              <p className="font-medium text-foreground truncate flex items-center gap-1"><FileText className="h-3 w-3" /> IntPay knowledge</p>
                              <p className="text-muted-foreground text-[10px]">Product reference</p>
                            </div>
                          </div>
                        </div>
                      </aside>
                    )}
                  </div>
                ) : null
              ))}

              {loading && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
                </div>
              )}

              {!loading && turns[turns.length - 1]?.role === "assistant" && (
                <>
                  <div className="flex items-center gap-1 pt-1">
                    <button className="h-7 w-7 grid place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-base"><ThumbsUp className="h-3.5 w-3.5" /></button>
                    <button className="h-7 w-7 grid place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-base"><ThumbsDown className="h-3.5 w-3.5" /></button>
                    <button onClick={() => copy(turns[turns.length - 1].content)} className="h-7 w-7 grid place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-base"><Copy className="h-3.5 w-3.5" /></button>
                  </div>

                  {/* Follow-up */}
                  <form
                    onSubmit={(e) => { e.preventDefault(); ask(followup, turns); }}
                    className="flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1.5 mt-2"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                    <Input
                      value={followup}
                      onChange={(e) => setFollowup(e.target.value)}
                      placeholder="Ask a follow-up question"
                      className="border-0 shadow-none focus-visible:ring-0 h-7 px-1 text-xs"
                    />
                    <Button type="submit" size="sm" variant="ghost" disabled={loading || !followup.trim()} className="h-7 px-2 text-xs">Send</Button>
                  </form>
                </>
              )}
            </div>

            <p className="text-center text-[10px] text-muted-foreground py-2 border-t border-border">
              AI-generated answer. Please verify critical facts.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
