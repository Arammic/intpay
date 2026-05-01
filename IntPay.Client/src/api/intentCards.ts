import { apiPost, type ApiResult } from "./client";

export interface MccItem {
  code: string;
  name: string;
  group: string;
}

/** Backend card returned inside IntentWithCardResponse. */
export interface CardDetailsResponse {
  id: number;
  stripeId: string;
  createdAt: string;
  status: string;
  isLockedByPendingInvoice?: boolean;
  isManuallyFrozen?: boolean;
  isSpendBlocked?: boolean;
  isRequestRefund?: boolean;
  cardNumber: string;
  last4: string;
  cvv: string;
  expiryDate: string; // "MM/YY"
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
  type: string; // "self" | "sent"
  senderName?: string | null;
}

export interface IntentWithCardResponse {
  intentId: number;
  city: string;
  country: string;
  description?: string | null;
  mccList: MccItem[];
  requiredInvoiceProve?: boolean;
  card: CardDetailsResponse;
}

/**
 * Body for POST /intents/create — mirrors the C# CreateIntentRequest record.
 * Dates must be serialized as ISO 8601 (or null).
 */
export interface CreateIntentRequest {
  creatorId: number;
  /** Receiver. For self-locked cards, pass the same id as creatorId. */
  userId: number;
  amount: number;
  useTimes: number | null;
  expiryDate?: string | null;
  country?: string | null;
  city?: string | null;
  description?: string | null;
  mccList?: string[] | null;
  firstDateToUser?: string | null;
  requiredInvoiceProve?: boolean;
}

export function createIntent(
  body: CreateIntentRequest,
): Promise<ApiResult<IntentWithCardResponse>> {
  return apiPost<IntentWithCardResponse, CreateIntentRequest>(
    "/intents/create",
    body,
  );
}
