import { apiGet, type ApiResult } from "./client";

export interface HomeMcc {
  code: string;
  name: string;
  group: string;
}

export interface HomeCard {
  id: number;
  stripeId: string;
  createdAt: string;
  status: string;
  cardNumber: string;
  last4: string;
  cvv: string;
  expiryDate: string;
  expiryMonth: number;
  expiryYear: number;
  cardholderName: string;
  amount: number;
  remainingAmount: number;
  useTimes: number;
  usesLeft: number;
  unLockedAt?: string | null;
  minutesToUnlock?: number;
  hoursToUnlock?: number;
  daysToUnlock?: number;
  timeRemainingLeveled?: string;
  daysLocked?: number;
  creatorId: number;
  retrieveId: number;
  type: string;
  senderName?: string | null;
}

export interface HomeIntentItem {
  intentId: number;
  city: string;
  country: string;
  description: string | null;
  mccList: HomeMcc[];
  requiredInvoiceProve?: boolean;
  card: HomeCard;
}

export interface HomeCardsBucket {
  items: HomeIntentItem[];
  count?: number;
}

export interface HomeSummaryDto {
  freeMoney: number;
  lockMoney?: number;
  totalActivityCount: number;
  selfCards: HomeCardsBucket;
  receivedCards: HomeCardsBucket;
  sentCards: HomeCardsBucket;
}

export function getHomeSummary(
  userId: number | string,
): Promise<ApiResult<HomeSummaryDto>> {
  return apiGet<HomeSummaryDto>(`/home/summary/${userId}`);
}
