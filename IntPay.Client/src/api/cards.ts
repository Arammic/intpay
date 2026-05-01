import type { ApiResult } from "./client";
import { getMockCards } from "./mockCards";

export type CardsPagePerspective = "guard" | "received" | "sent";

export interface CardsPageProof {
  id: string;
  status:
    | "awaiting_upload"
    | "verifying"
    | "verified"
    | "rejected"
    | "expired_missed";
  amount: number;
  merchantName: string;
}

export interface CardsPageCardItem {
  id: string;
  perspective: CardsPagePerspective;
  status: "pending" | "active" | "expired" | "canceled" | "destroyed";
  description: string;
  createdAt: number;
  amount: number;
  amountSpent: number;
  usedCount: number;
  cancelAfterUseCount: number;
  requireProof: boolean;
  proofName?: string;
  proofs: CardsPageProof[];
  secure: {
    last4: string;
    cardholderName: string;
    expMonth: number;
    expYear: number;
  };
  counterparty?: {
    id: string;
    name: string;
    handle: string;
  };
}

export interface CardsPageData {
  selfCards: CardsPageCardItem[];
  cardsReceived: CardsPageCardItem[];
  cardsSent: CardsPageCardItem[];
}

export async function getCardsPageData(): Promise<ApiResult<CardsPageData>> {
  const now = Date.now();
  const cards = getMockCards(now);
  const toCardItem = (c: (typeof cards)[number]): CardsPageCardItem => ({
    id: String(c.id),
    perspective: c.perspective,
    status: c.status,
    description: c.description,
    createdAt: c.createdAt,
    amount: c.amount,
    amountSpent: c.amountSpent,
    usedCount: c.usedCount,
    cancelAfterUseCount: c.cancelAfterUseCount,
    requireProof: c.requireProof,
    proofName: c.proofName,
    proofs: c.proofs.map((p) => ({
      id: String(p.id),
      status: p.status,
      amount: p.amount,
      merchantName: p.merchantName,
    })),
    secure: c.secure,
    counterparty: c.counterparty
      ? {
          id: c.counterparty.id,
          name: c.counterparty.name,
          handle: c.counterparty.handle,
        }
      : undefined,
  });

  const mockData: CardsPageData = {
    selfCards: cards.filter((c) => c.perspective === "guard").map(toCardItem),
    cardsReceived: cards
      .filter((c) => c.perspective === "received")
      .map(toCardItem),
    cardsSent: cards.filter((c) => c.perspective === "sent").map(toCardItem),
  };

  await new Promise((resolve) => setTimeout(resolve, 500));

  return {
    data: mockData,
    isSucess: true,
    error: [],
  };
}
