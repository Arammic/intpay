# API v1 — gap endpoints (live UI alignment)

Base path: `api/v1`. Successful responses use `{ success, message?, data, meta? }` unless noted.

## Virtual card governance flags (breaking JSON)

- **`is_locked_by_pending_invoice`** — set only by invoice verification when a required proof fails or until it passes.
- **`is_manually_frozen`** — set only by `POST .../lock-state` (sender/recipient manual freeze).
- **`is_spend_blocked`** — derived OR of the two; exposed on rich card DTOs as `isSpendBlocked`.
- Legacy **`cardLocked`** on `POST /verify-invoice` responses remains an alias of `isSpendBlocked` for thin backward compatibility.

Apply migration [`supabase/migrations/20260502120000_lock_split_manual_freeze.sql`](../supabase/migrations/20260502120000_lock_split_manual_freeze.sql) before deploying this API build.

## POST `/cards/{cardId}/lock-state`

- **Purpose:** Toggle **manual freeze** (`virtual_cards.is_manually_frozen`) from card management (creator or receiver). Does **not** change invoice-pending lock.
- **Tables:** `rich_intent_cards` (read authz), `virtual_cards` (update), `audit_logs` (insert).
- **Body (JSON):**

```json
{ "locked": true, "actingUserId": 42 }
```

- **Response `data`:** `{ cardId, isManuallyFrozen, isLockedByPendingInvoice, isSpendBlocked, previousManualFreeze }`.
- **Audit:** Yes — `action` = `card_manual_freeze_set`, `decision` = `info`, `transaction_amount` = `0`, `entity_id` = intent id, `card_id` = card id, `reason` describes the freeze change.

## GET `/users/{userId}/dashboard/metrics`

- **Purpose:** Dashboard aggregates — approved spend vs intent totals for every card/intent where the user is creator or receiver.
- **Tables:** `rich_intent_cards`, `audit_logs`.
- **Response `data` (`DashboardMetricsResponse`):** `userId`, `totalSpentApproved` (sum of `transaction_amount` where `decision` = `approved` on those cards), `totalIntentPrincipal`, `totalRemainingAcrossIntents`, `distinctIntentCount`, `distinctCardCount`.
- **Audit:** No (read-only aggregation).

## GET `/intents/{id}?actingUserId={profileId}`

- **Purpose:** Read intent + virtual card + rich projection for authorized participant.
- **Tables:** `intents`, `virtual_cards`, `profiles` (optional sender name).
- **Query:** `actingUserId` (required, positive) must equal `creator_id` or `receiver_id`.
- **Response `data`:** `{ intentId, intent, card, rich }` where `rich` is `IntentWithCardResponse`.
- **Audit:** No.

## PATCH `/intents/{id}?actingUserId={profileId}`

- **Purpose:** Update whitelisted metadata only (`description`, `city`, `country`, `category`, `mccList`, `requiredInvoiceProve`). Does not change amounts, uses, or status.
- **Tables:** `intents` (update), `virtual_cards` (read for `card_id`), `audit_logs` (insert on actual changes).
- **Body (JSON):** any subset of `PatchIntentRequest` fields; if no fields are sent, returns current detail without DB update or audit.
- **Audit:** On successful patch — `action` = `intent_updated`, `decision` = `info`, `transaction_amount` = `0`, `entity_id` = intent id, `reason` = `Intent metadata updated`.

## GET `/cards/{cardId}/logs`

- **Purpose:** Paged audit log for one card; optional filters for history UI.
- **Tables:** `audit_logs`.
- **Query:** `limit`, `offset`, optional `decision` (exact match, e.g. `approved`, `declined`, `info`), optional `from` / `to` (UTC `DateTime`, ISO-8601 in query) on `created_at`.
- **Response `data`:** `PagedAuditLogsResponse` (unchanged shape; `total` reflects filtered rows returned in the count query).
- **Audit:** No.

## GET `/users/{userId}/transactions`

- **Purpose:** Single feed of audit rows for all cards where the user is creator or receiver, newest first.
- **Tables:** `rich_intent_cards`, `audit_logs`.
- **Query:** `limit`, `offset`.
- **Response `data`:** `UserTransactionsResponse` (`userId`, `total`, `limit`, `offset`, `logs` as `AuditLogDto[]`).
- **Audit:** No.

## POST `/profiles/{userId}/add-funds` (governance addition)

- **Purpose:** Unchanged route; now also writes governance audit when vault is credited.
- **Tables:** `profiles`, `audit_logs`.
- **Audit:** `action` = `wallet_credit`, `decision` = `info`, `entity_id` = profile id, `card_id` = `NULL` (no card row), `transaction_amount` = `0`, `reason` describes the credited amount.

---

**Note:** `actingUserId` on intent routes is the caller’s profile id (same convention as `profileId` on `GET /cards/{cardId}`). Production should replace this with proper auth tokens when available.

---

## Routing layout (.NET)

Minimal API maps are split under `Endpoints/V1/` (`ProfileEndpoints`, `HomeEndpoints`, `IntentEndpoints`, `VerificationEndpoints`, `SimulationEndpoints`, `CardEndpoints`, `UserEndpoints`). `Program.cs` only registers services and calls `Map*` extensions on `api/v1` — **URLs are unchanged**.

## Supabase JIT

See [supabase-jit-rpc-review.md](supabase-jit-rpc-review.md) for the `create_intent_with_card_atomic` review checklist.
