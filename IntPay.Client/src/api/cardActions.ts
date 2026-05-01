import { apiPost, type ApiResult } from "./client";

export interface LockStateBody {
  locked: boolean;
  actingUserId: number;
}

export function setCardLockState(
  cardId: string | number,
  body: LockStateBody,
): Promise<ApiResult<unknown>> {
  return apiPost<unknown, LockStateBody>(`/cards/${cardId}/lock-state`, body);
}

export interface RequestRefundBody {
  actingUserId: number;
}

export function requestCardRefund(
  cardId: string | number,
  body: RequestRefundBody,
): Promise<ApiResult<unknown>> {
  return apiPost<unknown, RequestRefundBody>(
    `/cards/${cardId}/request-refund`,
    body,
  );
}
