import type { ApiResult } from "./client";
import { getMockCards } from "./mockCards";

export interface AppHomeSliderCard {
  id: string;
  cardNumber: string;
  last4: string;
  cardholderName: string;
  expMonth: number;
  expYear: number;
  description: string;
  status: string;
}

export interface AppHomeData {
  freeMoneyAmount: number;
  lockMoneyAmount: number; //
  selfCardsCount: number;
  cardsReceivedCount: number;
  cardsSentCount: number;
  sliderCards: AppHomeSliderCard[];
  activityCount: number;
}

////
export interface AppHomeProofItem {
  id: string;
  cardId: string;
  cardProofName?: string;
  amount: number;
  merchantName: string;
  deadlineAt: number;
}

export interface AppHomeSliderCard {
  id: string;
  last4: string;
  cardholderName: string;
  expMonth: number;
  expYear: number;
  description: string;
  status: string;
}

export interface AppHomeData {
  lockMoneyAmount: number;
  selfCardsCount: number;
  cardsReceivedCount: number;
  cardsSentCount: number;
  proofsAwaitingUploadInWindow: AppHomeProofItem[];
  sliderCards: AppHomeSliderCard[];
  points: number;
  activityCount: number;
}

export async function getAppHomeData(): Promise<ApiResult<AppHomeData>> {
  const now = Date.now();
  const cards = getMockCards(now);
  const cardsGuard = cards.filter((c) => c.perspective === "guard");
  const cardsReceived = cards.filter((c) => c.perspective === "received");
  const cardsSent = cards.filter((c) => c.perspective === "sent");

  const mockData: AppHomeData = {
    freeMoneyAmount: 2350,
    lockMoneyAmount: 1245,
    selfCardsCount: cardsGuard.length,
    cardsReceivedCount: cardsReceived.length,
    cardsSentCount: cardsSent.length,
    proofsAwaitingUploadInWindow: cards
      .flatMap((c) =>
        c.proofs
          .filter((p) => p.status === "awaiting_upload")
          .map((p) => ({
            id: String(p.id),
            cardId: String(c.id),
            cardProofName: c.proofName,
            amount: p.amount,
            merchantName: p.merchantName,
            deadlineAt: p.proofDeadlineAt ?? now + 1000 * 60 * 5,
          })),
      )
      .slice(0, 3),
    sliderCards: cards.slice(0, 5).map((c) => ({
      id: String(c.id),
      cardNumber:
        c.id === 10
          ? "8763 9485 2873 1823"
          : `•••• •••• •••• ${c.secure.last4}`,
      last4: c.secure.last4,
      cardholderName: c.secure.cardholderName,
      expMonth: c.secure.expMonth,
      expYear: c.secure.expYear,
      description: c.description,
      status: c.status,
    })),
    points: 280,
    activityCount: 18,
  };

  // Keep a short delay so the loader is visible while API wiring is mocked.
  await new Promise((resolve) => setTimeout(resolve, 500));

  return {
    data: mockData,
    isSucess: true,
    error: [],
  };
}
