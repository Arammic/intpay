import { apiGet, type ApiResult } from "./client";
import type { IntentWithCardResponse } from "./intentCards";
import type { CardsPageCardItem, CardsPageData } from "./cards";

export interface PagedCardsResponse {
  total: number;
  limit: number;
  offset?: number;
  items: IntentWithCardResponse[];
}

function tsFrom(iso?: string | null): number {
  if (!iso) return Date.now();
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : Date.now();
}

function normalizeStatus(s: string): CardsPageCardItem["status"] {
  const v = (s || "").toLowerCase();
  if (v === "active") return "active";
  if (v === "pending" || v === "locked") return "pending";
  if (v === "expired") return "expired";
  if (v === "canceled" || v === "cancelled") return "canceled";
  if (v === "destroyed") return "destroyed";
  return "active";
}

/** Backend "type": "self" | "sent" | "receiver" -> UI perspective. */
function perspectiveFor(
  cardType: string,
  creatorId: number,
  retrieveId: number,
  profileId: number,
): CardsPageCardItem["perspective"] {
  const t = (cardType || "").toLowerCase();
  if (t === "self") return "guard";
  if (t === "receiver") return "received";
  if (t === "sent") return "sent";
  // Fallback by ids
  if (creatorId === retrieveId) return "guard";
  return creatorId === profileId ? "sent" : "received";
}

export function mapIntentToCardItem(
  intent: IntentWithCardResponse,
  profileId: number,
): CardsPageCardItem {
  const c = intent.card;
  const usedCount = Math.max(0, (c.useTimes ?? 0) - (c.usesLeft ?? 0));
  const amountSpent = Math.max(0, (c.amount ?? 0) - (c.remainingAmount ?? c.amount ?? 0));
  const perspective = perspectiveFor(c.type, c.creatorId, c.retrieveId, profileId);

  return {
    id: String(c.id),
    perspective,
    status: normalizeStatus(c.status),
    description: intent.description ?? "",
    createdAt: tsFrom(c.createdAt),
    amount: Number(c.amount ?? 0),
    amountSpent,
    usedCount,
    cancelAfterUseCount: Number(c.useTimes ?? 0),
    requireProof: !!intent.requiredInvoiceProve,
    proofName: intent.requiredInvoiceProve ? "Invoice" : undefined,
    proofs: [],
    secure: {
      last4: c.last4 ?? "",
      cardholderName: c.cardholderName ?? "",
      expMonth: c.expiryMonth ?? 0,
      expYear: c.expiryYear ?? 0,
    },
    counterparty:
      perspective === "received" && c.senderName
        ? {
            id: String(c.creatorId),
            name: c.senderName,
            handle: `@${c.senderName.toLowerCase().replace(/\s+/g, ".")}`,
          }
        : perspective === "sent"
          ? {
              id: String(c.retrieveId),
              name: c.cardholderName ?? "Recipient",
              handle: `@${(c.cardholderName ?? "user").toLowerCase().replace(/\s+/g, ".")}`,
            }
          : undefined,
  };
}

export async function getCardsByUser(
  userId: number | string,
): Promise<ApiResult<PagedCardsResponse>> {
  return apiGet<PagedCardsResponse>(`/cards/by-user/${userId}`);
}

export async function getCardsByUserGrouped(
  userId: number,
): Promise<ApiResult<CardsPageData & { items: IntentWithCardResponse[] }>> {
  const res = await getCardsByUser(userId);
  if (!res.isSucess || !res.data) {
    return { data: null, isSucess: res.isSucess, error: res.error };
  }
  const items = res.data.items ?? [];
  const mapped = items.map((i) => ({
    intent: i,
    item: mapIntentToCardItem(i, userId),
  }));
  return {
    data: {
      selfCards: mapped.filter((m) => m.item.perspective === "guard").map((m) => m.item),
      cardsReceived: mapped.filter((m) => m.item.perspective === "received").map((m) => m.item),
      cardsSent: mapped.filter((m) => m.item.perspective === "sent").map((m) => m.item),
      items,
    },
    isSucess: true,
    error: [],
  };
}
