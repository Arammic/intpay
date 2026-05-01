import type { ApiResult } from "./client";

export interface WalletPaymentMethod {
  id: string;
  type: "bank" | "paypal" | "card";
  label: string;
  detail: string;
  brand?: string;
}

export interface WalletTransaction {
  id: string;
  ts: number;
  kind: "topup" | "lock" | "refund" | "spend" | "fee" | "cashout";
  amount: number;
  description: string;
}

export interface WalletPageData {
  walletFrozen: boolean;
  lockedAmount: number;
  pendingProofsCount: number;
  paymentMethods: WalletPaymentMethod[];
  walletTxns: WalletTransaction[];
}

export async function getWalletPageData(): Promise<ApiResult<WalletPageData>> {
  const now = Date.now();

  const mockData: WalletPageData = {
    walletFrozen: false,
    lockedAmount: 890.2,
    pendingProofsCount: 2,
    paymentMethods: [
      { id: "pm_visa_1", type: "card", label: "Visa •• 4421", detail: "Personal card", brand: "visa" },
      { id: "pm_bank_1", type: "bank", label: "Chase Checking", detail: "Main bank account", brand: "chase" },
      { id: "pm_pp_1", type: "paypal", label: "PayPal", detail: "mery@paypal.com", brand: "paypal" },
    ],
    walletTxns: [
      { id: "tx_1", ts: now - 1000 * 60 * 18, kind: "topup", amount: 100, description: "Top up from Visa •• 4421" },
      { id: "tx_2", ts: now - 1000 * 60 * 55, kind: "lock", amount: -70, description: "Locked for intent card" },
      { id: "tx_3", ts: now - 1000 * 60 * 60 * 3, kind: "refund", amount: 25, description: "Refund from expired card" },
      { id: "tx_4", ts: now - 1000 * 60 * 60 * 8, kind: "cashout", amount: -40, description: "Cash out to Chase Checking" },
      { id: "tx_5", ts: now - 1000 * 60 * 60 * 8, kind: "fee", amount: -1.5, description: "Cash out processing fee" },
    ],
  };

  await new Promise((resolve) => setTimeout(resolve, 500));

  return {
    data: mockData,
    isSucess: true,
    error: [],
  };
}

export interface WalletMutationResult {
  txnId: string;
  newBalance: number;
  amount: number;
  fee?: number;
  paymentMethodId: string;
  ts: number;
}

/** Mock: simulates a top-up to the wallet from a funding source. */
export async function postWalletTopUp(input: {
  amount: number;
  paymentMethodId: string;
}): Promise<ApiResult<WalletMutationResult>> {
  await new Promise((r) => setTimeout(r, 900));
  if (!input.amount || input.amount <= 0) {
    return { data: null as unknown as WalletMutationResult, isSucess: false, error: ["Amount must be greater than 0"] };
  }
  return {
    data: {
      txnId: `tx_topup_${Date.now()}`,
      newBalance: 0, // store will recompute optimistically
      amount: input.amount,
      paymentMethodId: input.paymentMethodId,
      ts: Date.now(),
    },
    isSucess: true,
    error: [],
  };
}

/** Mock: simulates a cash-out from the wallet to a funding source. Charges a small fee. */
export async function postWalletCashOut(input: {
  amount: number;
  paymentMethodId: string;
}): Promise<ApiResult<WalletMutationResult>> {
  await new Promise((r) => setTimeout(r, 900));
  if (!input.amount || input.amount <= 0) {
    return { data: null as unknown as WalletMutationResult, isSucess: false, error: ["Amount must be greater than 0"] };
  }
  const fee = Math.max(0.5, +(input.amount * 0.015).toFixed(2));
  return {
    data: {
      txnId: `tx_cashout_${Date.now()}`,
      newBalance: 0,
      amount: input.amount,
      fee,
      paymentMethodId: input.paymentMethodId,
      ts: Date.now(),
    },
    isSucess: true,
    error: [],
  };
}

