import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Send, Sparkles, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApp } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Turn = { role: "user" | "assistant"; content: string };

export default function CoachChatPage() {
  const nav = useNavigate();
  const { currentUser, cardsGuard, cardsSent, cardsReceived } = useApp();
  const [turns, setTurns] = useState<Turn[]>([
    { role: "assistant", content: "Hi! I'm IntPay Assistant. Ask me about your cards, wallet, or how IntPay works." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const context = useMemo(() => ({
    user: { id: currentUser.id, name: currentUser.name, points: currentUser.points },
    cardsGuard: cardsGuard.map((c) => ({ id: c.id, kind: c.kind, description: c.description, amount: c.amount, usedCount: c.usedCount, cancelAfterUseCount: c.cancelAfterUseCount, allowedMccCodes: c.allowedMccCodes, status: c.status })),
    cardsSent: cardsSent.map((c) => ({ id: c.id, kind: c.kind, description: c.description, amount: c.amount, usedCount: c.usedCount, status: c.status, toUserId: c.toUserId })),
    cardsReceived: cardsReceived.map((c) => ({ id: c.id, kind: c.kind, description: c.description, amount: c.amount, usedCount: c.usedCount, status: c.status, fromUserId: c.fromUserId })),
  }), [currentUser, cardsGuard, cardsSent, cardsReceived]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const next: Turn[] = [...turns, { role: "user", content: text }];
    setTurns(next);
    setInput("");
    setLoading(true);
    try {
      const history = next.filter((t) => !(t.role === "assistant" && next.indexOf(t) === 0));
      const { data, error } = await supabase.functions.invoke("intpay-assist", {
        body: { messages: history, context },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      setTurns([...next, { role: "assistant", content: data.reply ?? "" }]);
    } catch (e) {
      setTurns([...next, { role: "assistant", content: e instanceof Error ? e.message : "Something went wrong." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] -mx-4 sm:-mx-6">
      <header className="flex items-center gap-2 px-3 h-14 border-b border-border bg-background/85 backdrop-blur-xl sticky top-0 z-30">
        <button onClick={() => nav(-1)} className="h-10 w-10 grid place-items-center rounded-full hover:bg-foreground/5"><ArrowLeft className="h-5 w-5" /></button>
        <div className="flex items-center gap-2">
          <span className="h-8 w-8 rounded-full bg-primary/10 grid place-items-center text-primary"><Sparkles className="h-4 w-4" /></span>
          <div>
            <p className="text-sm font-semibold leading-tight">IntPay Assistant</p>
            <p className="text-[10px] text-muted-foreground leading-tight">Knows your cards & wallet</p>
          </div>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {turns.map((t, i) => (
          <div
            key={i}
            className={cn(
              "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap leading-relaxed",
              t.role === "user"
                ? "ml-auto bg-primary text-primary-foreground rounded-br-sm"
                : "mr-auto bg-card border border-border rounded-bl-sm",
            )}
          >
            {t.content}
          </div>
        ))}
        {loading && (
          <div className="mr-auto bg-card border border-border rounded-2xl rounded-bl-sm px-3 py-2 text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); send(); }}
        className="flex items-center gap-2 p-3 border-t border-border bg-card"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything, find anything"
          className="h-11 rounded-full text-sm"
          disabled={loading}
        />
        <Button type="submit" size="icon" disabled={loading || !input.trim()} className="h-11 w-11 rounded-full shrink-0">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
