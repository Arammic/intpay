# IntPay System Docs

## 1) Architecture Summary

IntPay uses integer (`serial`) identifiers across all core entities and applies programmable transaction controls through the `intents` table.

The tap-to-pay engine evaluates requests in ordered stages:
1. Detect online context from input signals.
2. Validate financial counters (`remaining_amount`, `uses_left`).
3. Validate category-to-MCC compatibility.
4. Apply website and geo constraints.
5. Write `audit_logs` for every attempt.
6. On approval, settle by decrementing `remaining_amount`, `uses_left`, and creator `lock_money`.

Money fields are handled as `numeric(12,2)` in database operations.

## 2) Category-to-MCC Mapping Reference

| Category | MCC List | Business Meaning |
|---|---|---|
| Food | `5812`, `5814`, `5411`, `5499` | Restaurants, fast food, grocery-like merchants |
| Travel | `4112`, `4511`, `4722`, `7512`, `7011` | Transport, airlines, travel agencies, car rental, hotels |
| Tech | `5732`, `5734`, `4816`, `7372` | Electronics, software, digital/cloud services |
| Entertainment | `7832`, `7922`, `7997` | Cinemas, theaters/events, leisure/club activity |

Validation rule:
- If `intents.category` is set, the input transaction `mcc` must exist in that category list.
- If not matched, transaction is declined and logged with reason:
  - `MCC [code] not allowed for category [category]`

## 3) Sequence Diagram (Tap-to-Pay Flow)

```mermaid
sequenceDiagram
    participant Client as TapClient
    participant API as SimulateAPI
    participant Engine as RuleEngine
    participant DB as Database

    Client->>API: POST /api/simulate/tap-to-pay
    API->>DB: Resolve cardNumber -> virtual_cards -> intents
    DB-->>API: card + intent policy
    API->>Engine: detectOnline(city, merchantName, mcc)
    Engine-->>API: onlineFlag
    API->>Engine: validateBalanceUsage(remaining_amount, uses_left, amount)
    Engine-->>API: pass/fail
    API->>Engine: validateCategoryMcc(intent.category, mcc)
    Engine-->>API: pass/fail
    API->>Engine: validateLocationAndWebsite(country, city, lock_for_websites, only_websites)
    Engine-->>API: pass/fail + reason
    API->>DB: insert audit_logs(merchant_name, mcc, city, decision, reason)
    alt Approved
        API->>DB: decrement intents.remaining_amount and intents.uses_left
        API->>DB: decrement profiles.lock_money
        API-->>Client: approved=true
    else Declined
        API-->>Client: approved=false + reason
    end
```

## 4) ER Diagram (Integer IDs + category)

```mermaid
erDiagram
    profiles {
        int id PK
        numeric vault_balance
        numeric lock_money
    }
    contacts {
        int user_id PK, FK
        int contact_id PK, FK
    }
    intents {
        int id PK
        int creator_id FK
        int receiver_id FK
        numeric amount
        numeric remaining_amount
        int use_times
        int uses_left
        text category
        text country
        text city
        boolean lock_for_websites
        jsonb only_websites
    }
    virtual_cards {
        int id PK
        text stripe_card_id
        int intent_id FK
        text card_number
        text last4
    }
    audit_logs {
        int id PK
        int card_id FK
        numeric transaction_amount
        text merchant_name
        text mcc
        text city
        text reason
    }

    profiles ||--o{ contacts : owns
    profiles ||--o{ contacts : listedAs
    profiles ||--o{ intents : creates
    profiles ||--o{ intents : receives
    intents ||--|| virtual_cards : binds
    virtual_cards ||--o{ audit_logs : logs
```

## 5) Atomic Create-Intent Transaction Note

`POST /api/intents/create` is executed through a Postgres RPC function to guarantee all-or-nothing behavior:
- Check `vault_balance >= amount + 0.05`
- Deduct `amount + 0.05` from `vault_balance`
- Add `amount` to `lock_money`
- Insert `intents` record (including `category`)
- Insert linked `virtual_cards` record

If any step fails, the transaction is rolled back by PostgreSQL.
