import { useEffect, useRef, useState } from "react";
import { Loader2, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { GuardLogo } from "@/components/GuardLogo";

export interface ExtractedIntent {
  amount: number;
  allowed_uses: number | null;
  description: string;
  require_proof: boolean;
  proof_type: "image-of-invoice" | "image-of-product" | "both" | null;
  allowed_mcc_codes: string[];
  first_use_at: string | null;
  last_use_at: string | null;
  city: string | null;
  country: string | null;
  rule_preview: string;
}

type ChatMessage = { role: "user" | "assistant"; content: string };
type BackendChatIntent = {
  amount?: unknown;
  useTimes?: unknown;
  description?: unknown;
  requiredInvoiceProve?: unknown;
  mccList?: unknown;
  firstDateToUser?: unknown;
  expiryDate?: unknown;
  city?: unknown;
  country?: unknown;
  rule_preview?: unknown;
};

function asFiniteNumber(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function asTrimmedString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function asNullableString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function asMccCodes(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
}

function mapBackendIntentToExtracted(raw: BackendChatIntent): ExtractedIntent {
  const rawUses = raw.useTimes;
  const allowedUses =
    rawUses == null ? null : Math.max(1, Math.trunc(asFiniteNumber(rawUses, 1)));
  return {
    amount: Math.max(0, asFiniteNumber(raw.amount, 0)),
    allowed_uses: allowedUses,
    description: asTrimmedString(raw.description),
    require_proof: raw.requiredInvoiceProve === true,
    proof_type: raw.requiredInvoiceProve === true ? "image-of-invoice" : null,
    allowed_mcc_codes: asMccCodes(raw.mccList),
    first_use_at: asNullableString(raw.firstDateToUser),
    last_use_at: asNullableString(raw.expiryDate),
    city: asNullableString(raw.city),
    country: asNullableString(raw.country),
    rule_preview: asTrimmedString(raw.rule_preview),
  };
}

interface Props {
  onComplete: (intent: ExtractedIntent) => void;
  /** Reset signal — bump to start a fresh conversation. */
  resetKey?: number;
}

export function IntentChat({ onComplete, resetKey = 0 }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const greetedRef = useRef(false);

  // Auto-greet on mount / reset
  useEffect(() => {
    greetedRef.current = false;
    setMessages([]);
    setError(null);
    setInput("");
    void sendTurn([], { kickoff: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function sendTurn(history: ChatMessage[], opts?: { kickoff?: boolean }) {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      // Kickoff: send a single hidden user "start" message so the model produces the greeting.
      const payload = opts?.kickoff
        ? [{ role: "user", content: "__start__" }]
        : history;

      const { data, error: fnError } = await supabase.functions.invoke("intent-agent", {
        body: { messages: payload },
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      const reply: string = data?.reply ?? "";
      if (reply) {
        setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      }
      if (data?.done && data.intent) {
        // Allow the goodbye to render before transitioning.
        const mappedIntent = mapBackendIntentToExtracted(
          data.intent as BackendChatIntent,
        );
        setTimeout(() => onComplete(mappedIntent), 350);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const handleSend = () => {
    const text = input.trim();
    if (!text || loading) return;
    const next: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    void sendTurn(next);
  };

  return (
    <div className="flex flex-col h-[60vh] min-h-[420px] rounded-2xl border border-border bg-surface/50 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-card/60">
        <GuardLogo size={28} />
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight flex items-center gap-1">
            IntentBot <Sparkles className="h-3 w-3 text-primary" />
          </p>
          <p className="text-[10px] text-muted-foreground leading-tight">AI agent · extracts your intent</p>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              "max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap leading-relaxed",
              m.role === "user"
                ? "ml-auto bg-gradient-primary text-primary-foreground rounded-br-sm"
                : "mr-auto bg-card border border-border rounded-bl-sm",
            )}
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="mr-auto bg-card border border-border rounded-2xl rounded-bl-sm px-3 py-2 text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
          </div>
        )}
        {error && (
          <div className="mx-auto text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">
            {error}
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); handleSend(); }}
        className="flex items-center gap-2 p-2 border-t border-border bg-card/60"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your reply…"
          className="h-10 text-sm"
          disabled={loading}
        />
        <Button type="submit" size="icon" disabled={loading || !input.trim()} className="bg-gradient-primary text-primary-foreground h-10 w-10 shrink-0">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
