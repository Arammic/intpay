import { apiPost } from "./client";

export interface SimulateTapBody {
  cardNumber: string;
  amount: number;
  merchantName: string;
  mcc: string;
  city: string;
  country: string;
}

export interface SimulateTapResponse {
  approved: boolean;
  reason: string;
}

export function simulateTapToPay(body: SimulateTapBody) {
  return apiPost<SimulateTapResponse, SimulateTapBody>(
    "/simulate/tap-to-pay",
    body,
  );
}
