import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Activity as ActivityIcon,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  XCircle,
  Info,
  AlertTriangle,
  MapPin,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AppLoader } from "@/components/AppLoader";
import {
  getUserLatestActivities,
  type UserActivityItem,
} from "@/api/userActivities";

interface Props {
  userId: number | string;
  /** Optional title override */
  title?: string;
  /** Cap how many items to render */
  limit?: number;
  className?: string;
}

function severityStyle(sev: string) {
  switch (sev) {
    case "success":
      return {
        icon: CheckCircle2,
        chip: "bg-secondary/15 text-secondary",
        ring: "ring-secondary/30",
      };
    case "error":
      return {
        icon: XCircle,
        chip: "bg-destructive/15 text-destructive",
        ring: "ring-destructive/30",
      };
    case "warning":
      return {
        icon: AlertTriangle,
        chip: "bg-tertiary/15 text-tertiary",
        ring: "ring-tertiary/30",
      };
    default:
      return {
        icon: Info,
        chip: "bg-primary/15 text-primary",
        ring: "ring-primary/30",
      };
  }
}

function formatRelative(iso: string) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return iso;
  const diff = Date.now() - t;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(t).toLocaleDateString();
}

function ActivityRow({ item }: { item: UserActivityItem }) {
  const style = severityStyle(item.severity);
  const Icon = style.icon;
  const isSender = item.role === "sender";
  const where = [item.city, item.country].filter(Boolean).join(", ");
  return (
    <Link
      to={`/cards/${item.intentId}`}
      className={cn(
        "block rounded-xl border border-border bg-card p-3 shadow-sm transition-base hover:border-primary/30 hover:bg-card/80",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "grid h-10 w-10 shrink-0 place-items-center rounded-full ring-1",
            style.chip,
            style.ring,
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="font-display text-sm font-semibold leading-tight truncate">
              {item.title}
            </p>
            <span
              className={cn(
                "shrink-0 font-mono text-sm font-semibold tabular-nums",
                item.severity === "success"
                  ? "text-secondary"
                  : item.severity === "error"
                    ? "text-destructive"
                    : "text-foreground",
              )}
            >
              {isSender ? "−" : "+"}
              {item.amountLabel.replace(/^[+\-]/, "")}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2">
            {item.subtitle}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              {isSender ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownLeft className="h-3 w-3" />
              )}
              {isSender ? "Sender" : "Receiver"}
            </span>
            <span className="inline-flex items-center gap-1">
              <CreditCard className="h-3 w-3" />
              ••{item.cardLast4}
            </span>
            {where && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {where}
              </span>
            )}
            <span className="ml-auto tabular-nums">
              {formatRelative(item.occurredAt || item.createdAt)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function UserActivity({
  userId,
  title = "Latest Activity",
  limit = 8,
  className,
}: Props) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["user-activities", userId],
    queryFn: () => getUserLatestActivities(userId),
  });

  const payload = data?.data;
  const items = (payload?.items ?? []).slice(0, limit);
  const summary = payload?.summary;
  const apiErrors = data?.error ?? [];

  return (
    <section className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-display text-base font-bold">
          <ActivityIcon className="h-4 w-4 text-primary" />
          {title}
        </h3>
        {summary && (
          <span className="font-label text-[10px] uppercase tracking-wider text-muted-foreground">
            {summary.approvedCount} ok · {summary.declinedCount} declined
          </span>
        )}
      </div>

      {summary && (
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-border bg-card p-2.5">
            <p className="font-label text-[9px] uppercase text-muted-foreground">
              Approved
            </p>
            <p className="mt-0.5 font-display text-sm font-bold tabular-nums text-secondary">
              ${summary.approvedSpendTotal.toFixed(2)}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-2.5">
            <p className="font-label text-[9px] uppercase text-muted-foreground">
              Declined
            </p>
            <p className="mt-0.5 font-display text-sm font-bold tabular-nums text-destructive">
              ${summary.declinedAmountTotal.toFixed(2)}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-2.5">
            <p className="font-label text-[9px] uppercase text-muted-foreground">
              Cards
            </p>
            <p className="mt-0.5 font-display text-sm font-bold tabular-nums">
              {summary.distinctCards}
            </p>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="rounded-xl border border-border bg-card p-3">
          <AppLoader size="sm" label="Loading activity" />
        </div>
      )}

      {!isLoading && apiErrors.length > 0 && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-3">
          <p className="text-xs text-destructive">
            Failed to load activity
          </p>
          {apiErrors.map((m) => (
            <p key={m} className="text-[11px] text-muted-foreground">
              {m}
            </p>
          ))}
        </div>
      )}

      {!isLoading && apiErrors.length === 0 && items.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center">
          <p className="text-sm text-muted-foreground">No activity yet.</p>
        </div>
      )}

      <div className="space-y-2">
        {items.map((it) => (
          <ActivityRow key={it.id} item={it} />
        ))}
      </div>
    </section>
  );
}
