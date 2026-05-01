import { apiGet, type ApiResult } from "./client";
import type {
  IntentWithCardResponse,
  CardDetailsResponse as BackendCardDetails,
} from "./intentCards";

/* ------------------------------------------------------------------ *
 * Backend response shape: GET /cards/{id}?profileId={uid}
 * { success, data: { card: IntentWithCardResponse, logs: AuditLogDto[] } }
 * ------------------------------------------------------------------ */

export interface AuditLogDto {
  id?: number | string;
  createdAt?: string;
  message?: string;
  action?: string;
  amount?: number | null;
  status?: string;
  // Backend may send arbitrary extra fields — preserve them.
  [key: string]: unknown;
}

export interface CardWithLogsResponse {
  card: IntentWithCardResponse;
  logs: AuditLogDto[];
}

/* ------------------------------------------------------------------ *
 * UI-facing shape (kept stable so CardDetailsApiPage doesn't need
 * a rewrite). All extra/optional fields are derived from the backend.
 * ------------------------------------------------------------------ */

export interface CardDetailsProof {
  id: string;
  status:
    | "awaiting_upload"
    | "verifying"
    | "verified"
    | "rejected"
    | "expired_missed";
  amount: number;
  merchantName: string;
  proofDeadlineAt?: number;
}

export interface CardDetailsEvent {
  id: string;
  ts: number;
  message: string;
}

export interface CardDetailsCounterparty {
  id: string;
  name: string;
  handle: string;
  email: string;
}

/**
 * Computed UI status. The backend `status` field is treated as a coarse
 * "active | inactive" hint only — the real, user-visible state is derived
 * from flags + the expiry date here.
 */
export type CardComputedStatus =
  | "expired"
  | "locked_invoice"
  | "frozen"
  | "spend_blocked"
  | "refund_pending"
  | "active"
  | "inactive";

export interface CardDetailsData {
  id: string;
  perspective: "guard" | "received" | "sent";
  /** Computed, flag-driven status used by the whole UI. */
  status: CardComputedStatus;
  /** True when the user must NOT see the card number / CVC. */
  hideSecrets: boolean;
  /** Reflects backend flags directly. */
  isLockedByPendingInvoice: boolean;
  isManuallyFrozen: boolean;
  isSpendBlocked: boolean;
  isRequestRefund: boolean;
  isExpired: boolean;
  description: string;
  amount: number;
  amountSpent: number;
  usedCount: number;
  cancelAfterUseCount: number;
  allowedMcc: Array<{ code: string; name: string }>;
  allowedMccCodes: string[];
  requireProof: boolean;
  proofName?: string;
  activeNotBeforeTs?: number;
  activeNotAfterTs?: number;
  postFirstUseValidUntilTs?: number;
  expiryWhy?: string;
  secure: {
    last4: string;
    cardholderName: string;
    expMonth: number;
    expYear: number;
    fullNumber?: string;
    cvv?: string;
  };
  counterparty?: CardDetailsCounterparty;
  proofs: CardDetailsProof[];
  events: CardDetailsEvent[];
  /** Raw backend objects, in case the page needs richer fields later. */
  raw?: { card: IntentWithCardResponse; logs: AuditLogDto[] };
}

/* ------------------------------ helpers ------------------------------ */

function tsFrom(iso?: string | null): number {
  if (!iso) return Date.now();
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : Date.now();
}

/** End-of-month for the card's printed expiry date (last second of the month). */
function expiryEndOfMonth(month: number, year: number): number {
  if (!month || !year) return Number.POSITIVE_INFINITY;
  // new Date(year, month, 0) → last day of `month` (1-12)
  const d = new Date(year, month, 0, 23, 59, 59, 999);
  return d.getTime();
}

function isCardExpired(month: number, year: number): boolean {
  return Date.now() > expiryEndOfMonth(month, year);
}

function normalizeUseTimes(value: unknown): number {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.trunc(n));
}

/**
 * Compute the user-visible status from flags + expiry. The backend `status`
 * is treated as a coarse hint only ("active" vs anything else = inactive).
 *
 * Priority (high → low):
 *   1. expired (date)
 *   2. locked_invoice (pending invoice)
 *   3. frozen (manually frozen)
 *   4. spend_blocked
 *   5. refund_pending
 *   6. active / inactive (from backend flag)
 */
function computeStatus(
  c: BackendCardDetails,
  isExpired: boolean,
): CardComputedStatus {
  if (isExpired) return "expired";
  if (c.isLockedByPendingInvoice) return "locked_invoice";
  if (c.isManuallyFrozen) return "frozen";
  if (c.isSpendBlocked) return "spend_blocked";
  if (c.isRequestRefund) return "refund_pending";
  const v = (c.status || "").toLowerCase();
  return v === "active" ? "active" : "inactive";
}

function perspectiveFor(
  card: BackendCardDetails,
  profileId: number,
): CardDetailsData["perspective"] {
  // Backend hint wins when present.
  const t = (card.type || "").toLowerCase();
  if (t === "self") return "guard";
  if (t === "sent") {
    return card.creatorId === profileId ? "sent" : "received";
  }
  // Fallback purely from ids.
  if (card.creatorId === card.retrieveId) return "guard";
  return card.creatorId === profileId ? "sent" : "received";
}

function logToEvent(log: AuditLogDto, idx: number): CardDetailsEvent {
  const message =
    (typeof log.message === "string" && log.message) ||
    (typeof log.action === "string" && log.action) ||
    "Activity";
  return {
    id: String(log.id ?? `log_${idx}`),
    ts: tsFrom(typeof log.createdAt === "string" ? log.createdAt : null),
    message:
      typeof log.amount === "number"
        ? `${message} $${log.amount.toFixed(2)}`
        : message,
  };
}

export function mapToCardDetails(
  payload: CardWithLogsResponse,
  profileId: number,
): CardDetailsData {
  const intent = payload.card;
  const c = intent.card;
  const perspective = perspectiveFor(c, profileId);
  const totalUseTimes = normalizeUseTimes(c.useTimes);
  const usesLeft = normalizeUseTimes(c.usesLeft);
  const usedCount = Math.max(0, totalUseTimes - usesLeft);
  const amountSpent = Math.max(0, (c.amount ?? 0) - (c.remainingAmount ?? 0));

  const isManuallyFrozen = !!c.isManuallyFrozen;
  const isLockedByPendingInvoice = !!c.isLockedByPendingInvoice;
  const isSpendBlocked = !!c.isSpendBlocked;
  const isRequestRefund = !!c.isRequestRefund;
  const isExpired = isCardExpired(c.expiryMonth ?? 0, c.expiryYear ?? 0);
  const status = computeStatus(c, isExpired);
  // Hide secrets when the card is unusable: expired or frozen.
  const hideSecrets = isExpired || isManuallyFrozen;

  return {
    id: String(c.id),
    perspective,
    status,
    hideSecrets,
    isLockedByPendingInvoice,
    isManuallyFrozen,
    isSpendBlocked,
    isRequestRefund,
    isExpired,
    description: intent.description ?? "",
    amount: Number(c.amount ?? 0),
    amountSpent,
    usedCount,
    cancelAfterUseCount: totalUseTimes,
    allowedMcc: (intent.mccList ?? []).map((m) => ({
      code: m.code,
      name: m.name,
    })),
    allowedMccCodes: (intent.mccList ?? []).map((m) => m.code),
    requireProof: !!intent.requiredInvoiceProve,
    proofName: intent.requiredInvoiceProve ? "Invoice" : undefined,
    activeNotBeforeTs: c.unLockedAt ? tsFrom(c.unLockedAt) : undefined,
    activeNotAfterTs: expiryEndOfMonth(c.expiryMonth ?? 0, c.expiryYear ?? 0),
    postFirstUseValidUntilTs: undefined,
    expiryWhy: isExpired ? "Card is past its printed expiry date." : "",
    secure: {
      last4: c.last4 ?? "",
      cardholderName: c.cardholderName ?? "",
      expMonth: c.expiryMonth ?? 0,
      expYear: c.expiryYear ?? 0,
      fullNumber: c.cardNumber,
      cvv: c.cvv,
    },
    counterparty:
      perspective === "received" && c.senderName
        ? {
            id: String(c.creatorId),
            name: c.senderName,
            handle: `@${c.senderName.toLowerCase().replace(/\s+/g, ".")}`,
            email: "",
          }
        : perspective === "sent"
          ? {
              id: String(c.retrieveId),
              name: c.cardholderName ?? "Recipient",
              handle: `@${(c.cardholderName ?? "user").toLowerCase().replace(/\s+/g, ".")}`,
              email: "",
            }
          : undefined,
    proofs: [],
    events: (payload.logs ?? []).map(logToEvent),
    raw: payload,
  };
}

/* ------------------------------ fetcher ------------------------------ */

export async function getCardDetailsData(
  cardId: string,
  profileId: number,
): Promise<ApiResult<CardDetailsData>> {
  const result = await apiGet<CardWithLogsResponse>(
    `/cards/${cardId}?profileId=${profileId}`,
  );
  if (!result.isSucess || !result.data) {
    return { data: null, isSucess: result.isSucess, error: result.error };
  }
  return {
    data: mapToCardDetails(result.data, profileId),
    isSucess: true,
    error: [],
  };
}
