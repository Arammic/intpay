import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Circle, Loader2, Sparkles, AlertCircle, ShieldCheck } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

/**
 * Shape of the structured intent we extract live.
 * Field names mirror the backend `CreateIntentRequest` payload exactly so we can
 * forward them with no renaming.
 */
export interface LiveIntent {
  amount: number | null;
  useTimes: number | null;
  description: string | null;
  requiredInvoiceProve: boolean | null;
  /** Non-empty list of MCC codes from the supported set. */
  mccList: string[];
  /** ISO datetime — earliest time the receiver can use the card. */
  firstDateToUser: string | null;
  /** ISO datetime — latest time the card can be used. */
  expiryDate: string | null;
  country: string | null;
  city: string | null;
}

export interface ChecklistItem { field: string; label: string; value?: string; source?: string; hint?: string }

export interface ExtractionResult {
  intent: LiveIntent;
  extracted: ChecklistItem[];
  missing_required: ChecklistItem[];
  missing_optional: ChecklistItem[];
  ready: boolean;
}

interface Props {
  initialText?: string;
  initialResult?: ExtractionResult | null;
  onChange: (text: string, result: ExtractionResult | null) => void;
}

const DEBOUNCE_MS = 700;

export function LiveIntentExtractor({ initialText = "", initialResult = null, onChange }: Props) {
  const [text, setText] = useState(initialText);
  const [result, setResult] = useState<ExtractionResult | null>(initialResult);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastSent = useRef<string>(initialText);
  const abortRef = useRef<AbortController | null>(null);

  // Debounced extraction whenever text changes (and is genuinely different)
  useEffect(() => {
    const trimmed = text.trim();
    if (trimmed === lastSent.current.trim()) return;
    const t = setTimeout(() => { void runExtract(trimmed); }, DEBOUNCE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  async function runExtract(trimmed: string) {
    lastSent.current = trimmed;
    setError(null);
    if (!trimmed) {
      setResult(null);
      onChange(trimmed, null);
      return;
    }
    setLoading(true);
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("intent-extract", {
        body: { text: trimmed },
      });
      if (ctrl.signal.aborted) return;
      if (fnErr) throw new Error(fnErr.message);
      if (data?.error) throw new Error(data.error);
      const r = data as ExtractionResult;
      setResult(r);
      onChange(trimmed, r);
    } catch (e) {
      if (ctrl.signal.aborted) return;
      setError(e instanceof Error ? e.message : "Extraction failed");
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="font-label text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Sparkles className="h-3 w-3 text-primary" /> Define intent · live AI
        </label>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Just describe what this money is for — the AI keeps re-reading and pulls out every detail.
        </p>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. $120 for groceries this week, max 4 trips, only in Berlin, require receipt photo"
          className="mt-2 min-h-[110px] text-sm rounded-xl bg-card border-border"
        />
        <div className="mt-1 h-4 flex items-center text-[11px]">
          {loading && <span className="text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Extracting…</span>}
          {!loading && result && (
            <span className={cn("font-label", result.ready ? "text-secondary" : "text-tertiary")}>
              {result.ready ? "All required fields captured ✓" : `${result.missing_required.length} required field(s) left`}
            </span>
          )}
          {error && <span className="text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {error}</span>}
        </div>
      </div>

      {/* Bucket 1 — captured */}
      <Section title="Captured" tone="ok">
        {result && result.extracted.length > 0
          ? result.extracted.map((it) => (
              <Row key={it.field} icon="check">
                <p className="text-xs">
                  <span className="font-medium text-foreground">{it.label}: </span>
                  <span className="text-foreground/90">{it.value}</span>
                </p>
                {it.source && <p className="text-[10px] text-muted-foreground italic mt-0.5">“{it.source}”</p>}
              </Row>
            ))
          : <Empty>Nothing extracted yet.</Empty>}
      </Section>

      {/* Bucket 2 — required missing */}
      <Section title="Still required" tone="warn">
        {result && result.missing_required.length > 0
          ? result.missing_required.map((it) => (
              <Row key={it.field} icon="circle">
                <p className="text-xs"><span className="font-medium text-foreground">{it.label}</span></p>
                {it.hint && <p className="text-[10px] text-muted-foreground mt-0.5">{it.hint}</p>}
              </Row>
            ))
          : <Empty>All required fields captured.</Empty>}
      </Section>

      {/* Bucket 3 — optional missing */}
      <Section title="Optional (skip is fine)" tone="muted">
        {result && result.missing_optional.length > 0
          ? result.missing_optional.map((it) => (
              <Row key={it.field} icon="circle">
                <p className="text-xs"><span className="font-medium text-foreground/80">{it.label}</span></p>
                {it.hint && <p className="text-[10px] text-muted-foreground mt-0.5">{it.hint}</p>}
              </Row>
            ))
          : <Empty>No optional fields suggested.</Empty>}
      </Section>

      <p className="inline-flex w-full items-center justify-center gap-1.5 pt-1 text-center text-[10px] text-muted-foreground">
        <ShieldCheck className="h-3 w-3 text-primary" />
        Protected by IntPay smart contract policy data
      </p>
    </div>
  );
}

function Section({ title, tone, children }: { title: string; tone: "ok" | "warn" | "muted"; children: React.ReactNode }) {
  const ring = tone === "ok" ? "border-secondary/30 bg-secondary/5"
    : tone === "warn" ? "border-tertiary/30 bg-tertiary/5"
    : "border-border bg-card/40";
  const dot = tone === "ok" ? "bg-secondary" : tone === "warn" ? "bg-tertiary" : "bg-muted-foreground";
  return (
    <div className={cn("rounded-xl border p-3", ring)}>
      <div className="flex items-center gap-2 mb-2">
        <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />
        <p className="font-label text-[10px] uppercase tracking-wider text-muted-foreground">{title}</p>
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Row({ icon, children }: { icon: "check" | "circle"; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      {icon === "check"
        ? <CheckCircle2 className="h-3.5 w-3.5 text-secondary mt-0.5 shrink-0" />
        : <Circle className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] text-muted-foreground italic px-1">{children}</p>;
}
