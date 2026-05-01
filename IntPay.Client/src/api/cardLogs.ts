import { apiGet } from "./client";
import type { CardDetailsEvent } from "./cardDetails";

export interface CardLogDto {
  id: number | string;
  cardId: number;
  transactionAmount?: number | null;
  merchantName?: string | null;
  mcc?: string | null;
  decision?: string | null; // "approved" | "declined" | etc.
  reason?: string | null;
  createdAt: string;
  city?: string | null;
  country?: string | null;
  externalId?: string | null;
}

export interface CardLogsResponse {
  cardId: number;
  total: number;
  limit: number;
  offset: number;
  logs: CardLogDto[];
}

function tsFrom(iso?: string | null): number {
  if (!iso) return Date.now();
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : Date.now();
}

export function logToEvent(log: CardLogDto, idx: number): CardDetailsEvent {
  const decision = (log.decision ?? "").toLowerCase();
  const merchant = log.merchantName?.trim() || "Unknown merchant";
  const amount = typeof log.transactionAmount === "number" ? log.transactionAmount : null;
  const where = [log.city, log.country].filter(Boolean).join(", ");

  let message: string;
  if (decision === "approved") {
    message = amount != null
      ? `Approved $${amount.toFixed(2)} at ${merchant}${where ? ` (${where})` : ""}`
      : `Approved at ${merchant}`;
  } else if (decision === "declined" || decision === "blocked" || decision === "rejected") {
    message = `Declined at ${merchant}${log.reason ? ` — ${log.reason}` : ""}`;
  } else {
    message = amount != null
      ? `${decision || "Activity"} $${amount.toFixed(2)} at ${merchant}`
      : decision || "Activity";
  }

  return {
    id: String(log.id ?? `log_${idx}`),
    ts: tsFrom(log.createdAt),
    message,
  };
}

export async function getCardLogs(cardId: string | number, actingUserId: number | string) {
  return apiGet<CardLogsResponse>(`/cards/${cardId}/logs?actingUserId=${actingUserId}`);
}
