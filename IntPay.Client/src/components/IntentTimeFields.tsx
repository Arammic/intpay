import { useId } from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { IntentTimeConstraints } from "@/lib/store";
import { cn } from "@/lib/utils";

export type IntentTimeFieldState = {
  activeFromMode: "none" | "date";
  activeFromLocal: string;
  activeUntilMode: "none" | "date";
  activeUntilLocal: string;
  afterFirstMode: "none" | "date";
  afterFirstLocal: string;
};

export const defaultIntentTimeState = (): IntentTimeFieldState => ({
  activeFromMode: "none",
  activeFromLocal: "",
  activeUntilMode: "none",
  activeUntilLocal: "",
  afterFirstMode: "none",
  afterFirstLocal: "",
});

/** `datetime-local` value <-> optional epoch ms in local wall time */
export function localDateTimeToTs(value: string): number | undefined {
  if (!value?.trim()) return undefined;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? undefined : t;
}

export function intentTimeStateToPayload(s: IntentTimeFieldState): IntentTimeConstraints {
  return {
    activeNotBeforeTs: s.activeFromMode === "date" ? localDateTimeToTs(s.activeFromLocal) : undefined,
    activeNotAfterTs: s.activeUntilMode === "date" ? localDateTimeToTs(s.activeUntilLocal) : undefined,
    postFirstUseValidUntilTs: s.afterFirstMode === "date" ? localDateTimeToTs(s.afterFirstLocal) : undefined,
  };
}

function Row({
  id,
  title,
  hint,
  mode,
  onMode,
  value,
  onValue,
  disabled,
}: {
  id: string;
  title: string;
  hint: string;
  mode: "none" | "date";
  onMode: (m: "none" | "date") => void;
  value: string;
  onValue: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface/40 p-3 space-y-2">
      <p className="font-label text-[11px] uppercase tracking-wider text-muted-foreground">{title}</p>
      <p className="text-[11px] text-muted-foreground">{hint}</p>
      <RadioGroup
        className="flex flex-wrap gap-3"
        value={mode}
        onValueChange={(v) => onMode(v as "none" | "date")}
        disabled={disabled}
      >
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <RadioGroupItem value="none" id={`${id}-none`} />
          <span>None</span>
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <RadioGroupItem value="date" id={`${id}-date`} />
          <span>Pick date & time</span>
        </label>
      </RadioGroup>
      {mode === "date" && (
        <div className="pt-1">
          <Label htmlFor={`${id}-input`} className="sr-only">{title}</Label>
          <input
            id={`${id}-input`}
            type="datetime-local"
            value={value}
            onChange={(e) => onValue(e.target.value)}
            className={cn(
              "w-full h-10 rounded-md border border-input bg-background px-3 text-sm",
              "font-mono text-foreground"
            )}
          />
        </div>
      )}
    </div>
  );
}

export function IntentTimeFields({
  state,
  onChange,
}: {
  state: IntentTimeFieldState;
  onChange: (u: IntentTimeFieldState) => void;
}) {
  const id = useId();
  return (
    <div className="space-y-3">
      <p className="font-label text-xs uppercase tracking-wider text-muted-foreground">Optional time rules</p>
      <Row
        id={`${id}-from`}
        title="First time to use"
        hint="Card is not active for spending before this time (optional)."
        mode={state.activeFromMode}
        onMode={(m) => onChange({ ...state, activeFromMode: m })}
        value={state.activeFromLocal}
        onValue={(v) => onChange({ ...state, activeFromLocal: v })}
      />
      <Row
        id={`${id}-until`}
        title="Last time to use"
        hint="Card is not active after this time (optional)."
        mode={state.activeUntilMode}
        onMode={(m) => onChange({ ...state, activeUntilMode: m })}
        value={state.activeUntilLocal}
        onValue={(v) => onChange({ ...state, activeUntilLocal: v })}
      />
      <Row
        id={`${id}-after`}
        title="Time after first use"
        hint="After the first successful tap, spending is not allowed after this time (optional)."
        mode={state.afterFirstMode}
        onMode={(m) => onChange({ ...state, afterFirstMode: m })}
        value={state.afterFirstLocal}
        onValue={(v) => onChange({ ...state, afterFirstLocal: v })}
      />
    </div>
  );
}
