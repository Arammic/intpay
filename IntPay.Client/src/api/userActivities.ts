import { apiGet, type ApiResult } from "./client";

export interface UserActivityItem {
  id: number;
  cardId: number;
  intentId: number;
  action: string;
  decision: string;
  reason: string | null;
  transactionAmount: number;
  merchantName: string;
  mcc: string | null;
  city: string | null;
  country: string | null;
  createdAt: string;
  occurredAt: string;
  creatorId: number;
  receiverId: number;
  role: string; // "sender" | "receiver"
  intentDescription: string | null;
  category: string | null;
  intentAmount: number;
  remainingAmount: number;
  cardLast4: string;
  cardStatus: string;
  isLockedByPendingInvoice: boolean;
  isManuallyFrozen: boolean;
  isSpendBlocked: boolean;
  senderName: string | null;
  activityType: string;
  title: string;
  subtitle: string;
  severity: "success" | "warning" | "info" | "error" | string;
  amountLabel: string;
  entityType: string;
  outcome: string;
}

export interface UserActivitiesSummary {
  approvedCount: number;
  declinedCount: number;
  infoCount: number;
  approvedSpendTotal: number;
  declinedAmountTotal: number;
  distinctCards: number;
  distinctIntents: number;
}

export interface UserActivitiesResponse {
  userId: number;
  total: number;
  limit: number;
  offset: number;
  summary: UserActivitiesSummary;
  items: UserActivityItem[];
}

export function getUserLatestActivities(
  userId: number | string,
): Promise<ApiResult<UserActivitiesResponse>> {
  return apiGet<UserActivitiesResponse>(`/users/${userId}/activities/latest`);
}
