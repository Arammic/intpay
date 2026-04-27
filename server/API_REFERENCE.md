# IntPay API Reference

Comprehensive reference for the current FastAPI implementation in `app/main.py` and `app/api/v1/*`.

## Table of Contents
- [Overview](#overview)
- [Authentication Model](#authentication-model)
- [Base URL and Versioning](#base-url-and-versioning)
- [Endpoints](#endpoints)
  - [Define Intent](#define-intent)
  - [Confirm Intent and Issue Card](#confirm-intent-and-issue-card)
  - [List Sent Intentions](#list-sent-intentions)
  - [List Received Intentions](#list-received-intentions)
  - [Add Funds to Vault](#add-funds-to-vault)
  - [Stripe Webhook Authorization](#stripe-webhook-authorization)
- [Rule Engine Details (issuing_authorization.request)](#rule-engine-details-issuing_authorizationrequest)
- [Error Handling Summary](#error-handling-summary)

## Overview
IntPay exposes versioned REST APIs under `/api/v1` for:
- Natural-language intention parsing via Groq.
- Intent confirmation and Stripe Issuing virtual card creation.
- Vault management.
- Stripe webhook-based real-time transaction authorization with rule evaluation.

## Authentication Model
- **Supabase JWT**: Not enforced yet in current router dependencies. Endpoints are currently open at the API layer.
- **Stripe Signature**: Required for webhook endpoint via `Stripe-Signature` header and verified using Stripe webhook secret.

## Base URL and Versioning
- **Version prefix**: `/api/v1`
- **Example local URL**: `http://localhost:8000/api/v1`

---

## Endpoints

## Define Intent
Create an intent from natural language and generate a smart rule draft using Groq.

- **Method & URL**: `POST /api/v1/intents/define`
- **Authentication**: No JWT enforced in current implementation.

### Request Parameters
**Body (JSON)**
- `creator_id` (`uuid`, required): Profile ID of the sender/provider.
- `receiver_id` (`uuid`, required): Profile ID of the receiver.
- `raw_text` (`string`, required, min 4, max 500): Natural language instruction (example: `"100 SAR for coffee only today"`).

### Logic Flow
1. Calls `GroqIntentService.parse_intent(raw_text)` to extract structured rules.
2. Stores a new `intents` row with status `pending`.
3. Stores `smart_rules` row linked to the intent.
4. Returns created IDs and parsed rule object.

### Success Response (201)
```json
{
  "intent_id": "8b61e893-f43f-4d01-9f1c-820f0827a2b8",
  "smart_rule_id": "b5c6e8bb-0f7d-49fb-8d31-8f45cf2ca4ca",
  "parsed_rule": {
    "amount": "100.00",
    "merchant_category": "coffee_shop",
    "expiry_timestamp": "2026-04-27T23:59:59Z",
    "max_amount": "100.00",
    "location_data": {
      "lat": 24.7136,
      "long": 46.6753,
      "radius_km": 10.0
    }
  }
}
```

### Errors
- `422`: Request validation error (invalid UUID, missing fields, invalid text length).
- `502`: Groq integration/parse failure.
- `500`: Unexpected server/database error.

### Example Request
```bash
curl -X POST "http://localhost:8000/api/v1/intents/define" \
  -H "Content-Type: application/json" \
  -d '{
    "creator_id": "11111111-1111-1111-1111-111111111111",
    "receiver_id": "22222222-2222-2222-2222-222222222222",
    "raw_text": "100 SAR for coffee only today"
  }'
```

---

## Confirm Intent and Issue Card
Confirms a pending intent, validates balance and expiry, then issues a Stripe virtual card.

- **Method & URL**: `POST /api/v1/intents/{intent_id}/confirm`
- **Authentication**: No JWT enforced in current implementation.

### Request Parameters
**Path**
- `intent_id` (`uuid`, required): Target intent to confirm.

**Body**
- None.

### Logic Flow
1. Fetches intent by `intent_id`.
2. Ensures intent status is `pending`.
3. Loads associated smart rule and checks `expiry_at`.
4. If expired, marks intent as `expired` and returns conflict.
5. Validates creator vault balance against intent amount.
6. Creates Stripe Issuing virtual card.
7. Stores `virtual_cards` record and updates intent status to `active`.

### Success Response (200)
```json
{
  "intent_id": "8b61e893-f43f-4d01-9f1c-820f0827a2b8",
  "card_id": "6b80623a-c9de-4373-8c93-d2e41ea65f0e",
  "stripe_card_id": "ic_1QabcDEFxyz",
  "status": "active"
}
```

### Errors
- `404`: Intent not found.
- `409`: Intent is not pending or rule already expired.
- `500`: Insufficient balance currently bubbles as server error (should be mapped to 400/409 in future hardening).
- `502`: Stripe issuing integration failure.

### Example Request
```bash
curl -X POST "http://localhost:8000/api/v1/intents/8b61e893-f43f-4d01-9f1c-820f0827a2b8/confirm"
```

---

## List Sent Intentions
Returns intentions created by a specific profile (unified account: sender/provider view).

- **Method & URL**: `GET /api/v1/intents/sent`
- **Authentication**: No JWT enforced in current implementation.

### Request Parameters
**Query**
- `profile_id` (`uuid`, required): Profile whose sent intentions are requested.
- `status` (`pending|active|expired`, optional): Filter by intent status.

### Logic Flow
1. Queries `intents` where `creator_id = profile_id`.
2. Applies optional status filter.
3. Returns list sorted by `created_at` descending.

### Success Response (200)
```json
[
  {
    "id": "8b61e893-f43f-4d01-9f1c-820f0827a2b8",
    "creator_id": "11111111-1111-1111-1111-111111111111",
    "receiver_id": "22222222-2222-2222-2222-222222222222",
    "raw_text": "100 SAR for coffee only today",
    "amount": "100.00",
    "status": "active",
    "created_at": "2026-04-27T20:00:00Z"
  }
]
```

### Errors
- `422`: Invalid/missing query params.
- `500`: Unexpected repository/database failure.

### Example Request
```bash
curl "http://localhost:8000/api/v1/intents/sent?profile_id=11111111-1111-1111-1111-111111111111&status=active"
```

---

## List Received Intentions
Returns intentions assigned to a specific profile (unified account: receiver/beneficiary view).

- **Method & URL**: `GET /api/v1/intents/received`
- **Authentication**: No JWT enforced in current implementation.

### Request Parameters
**Query**
- `profile_id` (`uuid`, required): Profile whose received intentions are requested.
- `status` (`pending|active|expired`, optional): Filter by intent status.

### Logic Flow
1. Queries `intents` where `receiver_id = profile_id`.
2. Applies optional status filter.
3. Returns list sorted by `created_at` descending.

### Success Response (200)
```json
[
  {
    "id": "8b61e893-f43f-4d01-9f1c-820f0827a2b8",
    "creator_id": "11111111-1111-1111-1111-111111111111",
    "receiver_id": "22222222-2222-2222-2222-222222222222",
    "raw_text": "100 SAR for coffee only today",
    "amount": "100.00",
    "status": "active",
    "created_at": "2026-04-27T20:00:00Z"
  }
]
```

### Errors
- `422`: Invalid/missing query params.
- `500`: Unexpected repository/database failure.

### Example Request
```bash
curl "http://localhost:8000/api/v1/intents/received?profile_id=22222222-2222-2222-2222-222222222222"
```

---

## Add Funds to Vault
Increases a profile's vault balance.

- **Method & URL**: `POST /api/v1/vault/add-funds`
- **Authentication**: No JWT enforced in current implementation.

### Request Parameters
**Body (JSON)**
- `profile_id` (`uuid`, required): Profile to credit.
- `amount` (`decimal`, required, > 0): Amount to add.

### Logic Flow
1. Loads profile by ID.
2. Computes `new_balance = current_balance + amount`.
3. Updates `profiles.vault_balance`.
4. Returns updated balance.

### Success Response (200)
```json
{
  "profile_id": "11111111-1111-1111-1111-111111111111",
  "vault_balance": "1500.00"
}
```

### Errors
- `404`: Profile not found.
- `422`: Invalid request body.
- `500`: Unexpected update/database failure.

### Example Request
```bash
curl -X POST "http://localhost:8000/api/v1/vault/add-funds" \
  -H "Content-Type: application/json" \
  -d '{
    "profile_id": "11111111-1111-1111-1111-111111111111",
    "amount": "250.00"
  }'
```

---

## Stripe Webhook Authorization
Handles Stripe issuing authorization events and returns synchronous approval/decline decisions.

- **Method & URL**: `POST /api/v1/webhooks/stripe`
- **Authentication**: Requires `Stripe-Signature` header.

### Request Parameters
**Headers**
- `Stripe-Signature` (`string`, required): Signature used by Stripe webhook verification.

**Body**
- Raw Stripe webhook payload (JSON event).

### Logic Flow
1. Reads raw request body.
2. Verifies webhook payload/signature via Stripe SDK.
3. If event type is not `issuing_authorization.request`, returns `{ "approved": true }`.
4. For authorization request:
   - fetches internal card by Stripe card ID.
   - loads linked intent and smart rules.
   - evaluates transaction through Rule Engine.
   - writes audit log (approved/declined + reason).
   - returns synchronous approval decision to Stripe.

### Success Response (200)
```json
{
  "approved": true,
  "authorization_id": "iauth_123",
  "metadata": {
    "reason": "approved"
  }
}
```

### Decline Example (200)
```json
{
  "approved": false,
  "authorization_id": "iauth_123",
  "metadata": {
    "reason": "merchant_category_mismatch"
  }
}
```

### Errors
- `400/401`: Invalid signature or malformed webhook payload (integration validation failure).
- `404`: Card/intent/rule linkage not found.
- `500`: Unexpected repository/runtime error.

### Example Request
```bash
curl -X POST "http://localhost:8000/api/v1/webhooks/stripe" \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: t=1710000000,v1=generated_signature" \
  -d '{
    "type": "issuing_authorization.request",
    "data": {
      "object": {
        "id": "iauth_123",
        "amount": 1000,
        "card": { "id": "ic_1QabcDEFxyz" },
        "merchant_data": {
          "category": "coffee_shop",
          "location": { "latitude": 24.7136, "longitude": 46.6753 }
        }
      }
    }
  }'
```

---

## Rule Engine Details (issuing_authorization.request)
For each authorization event, the decision engine in `RuleEngine.evaluate(...)` executes:

1. **Merchant category check**
   - Compares normalized smart-rule category with `merchant_data.category`.
   - Fails with `merchant_category_mismatch` when different.

2. **Expiry check**
   - Parses `smart_rules.expiry_at`.
   - Fails with `card_expired` when current UTC time is beyond expiry.

3. **Max amount check**
   - Converts Stripe amount from minor units (halalas) to major units.
   - Fails with `amount_exceeds_rule_limit` when transaction amount exceeds `max_amount`.

4. **Geofence check**
   - If `location_data` and merchant location are present, calculates Haversine distance.
   - Fails with `location_out_of_bounds` if beyond configured radius.

5. **Approval**
   - Returns approved with reason `approved` if all checks pass.

### Expected synchronous response to Stripe
- `approved: true` to authorize transaction.
- `approved: false` to decline transaction.
- Includes `authorization_id` and reason metadata.

---

## Error Handling Summary
- Custom app exceptions are registered globally and returned as `{ "detail": "..." }`.
- Input validation errors are automatically handled by FastAPI/Pydantic as `422`.
- Integration failures (Groq/Stripe) are surfaced from service layer and should map to gateway-style errors.
- Current implementation has some conflict/business errors as `409` and some uncaught business exceptions that may surface as `500`.

