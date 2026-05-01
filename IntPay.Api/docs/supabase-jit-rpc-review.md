# Supabase JIT / RPC review checklist (`create_intent_with_card_atomic`)

The C# host calls `create_intent_with_card_atomic` via Supabase RPC. The function body is **not** in this repository. After deploying schema changes (`is_locked_by_pending_invoice`, `is_manually_frozen`), verify in Supabase SQL Editor:

1. **Vault / balance integrity**
   - Confirms creator has sufficient `profiles.vault_balance` (and fees if applicable) before committing.
   - Updates `vault_balance` and `lock_money` consistently with how `ActiveIntentCommitmentQuery` sums `intents.remaining_amount` for active rows.

2. **Intent + card creation**
   - Inserts `intents` and `virtual_cards` in one transaction; rolls back on any failure.
   - Initializes `virtual_cards.is_locked_by_pending_invoice` and `is_manually_frozen` to `false` unless product rules say otherwise for new cards.
   - Sets `virtual_cards.status` to **`active`** or **`inactive`** only (matches DB CHECK); default new cards to **`active`** unless product rules say otherwise.

3. **Rounding**
   - Uses a fixed scale (e.g. 2 decimal places) when comparing or moving money, aligned with the API `Money` helper.

4. **Concurrency**
   - Handles concurrent RPC calls for the same profile (row locking or `SELECT … FOR UPDATE` on `profiles`).

5. **Regression after column rename**
   - Any SQL referencing `virtual_cards.is_locked` must be updated to `is_locked_by_pending_invoice` / `is_manually_frozen` as appropriate.

Document the reviewed function version and date in your runbook when complete.
