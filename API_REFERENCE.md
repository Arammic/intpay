# API Reference

Base URL prefix: `/api/v1`

All examples reflect the Minimal API mappings in `IntPay.Api/Program.cs` and DTO/service response contracts in `IntPay.Api/supabase` and `IntPay.Api/Services`.

## Profiles

### `GET /api/v1/profiles/{id:int}`
Returns a profile by ID with recalculated `lockMoney` (derived from active intents).

**Request**

| Parameter | In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `id` | Path | `int` | Yes | Profile ID. |

**Response Shape (200 OK)**

```json
{
  "id": "<int>",
  "name": "<string>",
  "username": "<string>",
  "email": "<string>",
  "vaultBalance": "<decimal>",
  "lockMoney": "<decimal>"
}
```

**Response Example (200 OK)**

```json
{
  "id": 12,
  "name": "Omar Khaled",
  "username": "omar.k",
  "email": "omar@example.com",
  "vaultBalance": 1500.75,
  "lockMoney": 320.25
}
```

**Status Codes**
- `200 OK`: Profile is found and returned.
- `404 Not Found`: Any exception in handler (for example, profile not found) returns `{ "message": "..." }`.

---

## Intents

### `POST /api/v1/intents/create`
Creates an intent and a linked virtual card.

**Request**

| Parameter | In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| Body | Body | `CreateIntentRequest` | Yes | Intent creation payload. |

```json
{
  "creatorId": 1,
  "userId": 2,
  "amount": 250.00,
  "useTimes": 3,
  "expiryDate": "2026-12-31T23:59:59Z",
  "country": "SA",
  "city": "Riyadh",
  "description": "Weekly family groceries",
  "mccList": ["5411", "5812"],
  "firstDateToUser": "2026-05-01T09:00:00Z",
  "requiredInvoiceProve": true
}
```

**Response Shape (201 Created)**

```json
{
  "data": {
    "intentId": "<int>",
    "city": "<string>",
    "country": "<string>",
    "description": "<string|null>",
    "mccList": [
      { "code": "<string>", "name": "<string>", "group": "<string>" }
    ],
    "requiredInvoiceProve": "<bool>",
    "card": {
      "id": "<int>",
      "stripeId": "<string>",
      "createdAt": "<datetime-iso8601>",
      "status": "<string>",
      "cardNumber": "<string>",
      "last4": "<string>",
      "cvv": "<string>",
      "expiryDate": "<string>",
      "expiryMonth": "<int>",
      "expiryYear": "<int>",
      "cardholderName": "<string>",
      "amount": "<decimal>",
      "remainingAmount": "<decimal>",
      "useTimes": "<short>",
      "usesLeft": "<short>",
      "unLockedAt": "<datetime-iso8601|null>",
      "minutesToUnlock": "<long>",
      "hoursToUnlock": "<long>",
      "daysToUnlock": "<long>",
      "timeRemainingLeveled": "<string>",
      "daysLocked": "<int>",
      "creatorId": "<int>",
      "retrieveId": "<int>",
      "type": "<string>",
      "senderName": "<string|null>"
    }
  },
  "message": "<string>",
  "status": "<int>"
}
```

**Response Example (201 Created)**

```json
{
  "data": {
    "intentId": 987,
    "city": "Riyadh",
    "country": "SA",
    "description": "Weekly family groceries",
    "mccList": [
      { "code": "5411", "name": "Grocery Stores", "group": "Shopping" },
      { "code": "5812", "name": "Restaurants", "group": "Food & Drink" }
    ],
    "requiredInvoiceProve": true,
    "card": {
      "id": 556,
      "stripeId": "ic_3d20dbe8f9e9439fa1aa",
      "createdAt": "2026-04-29T18:30:00Z",
      "status": "active",
      "cardNumber": "4111123412341234",
      "last4": "1234",
      "cvv": "321",
      "expiryDate": "12/26",
      "expiryMonth": 12,
      "expiryYear": 2026,
      "cardholderName": "Ahmed Ali",
      "amount": 250.00,
      "remainingAmount": 250.00,
      "useTimes": 3,
      "usesLeft": 3,
      "unLockedAt": "2026-05-01T09:00:00Z",
      "minutesToUnlock": 720,
      "hoursToUnlock": 12,
      "daysToUnlock": 0,
      "timeRemainingLeveled": "12h 0m",
      "daysLocked": 1,
      "creatorId": 1,
      "retrieveId": 2,
      "type": "sent",
      "senderName": "Ahmed Ali"
    }
  },
  "message": "Intent and Virtual Card created successfully",
  "status": 201
}
```

**Status Codes**
- `201 Created`: Intent + virtual card created successfully.
- `400 Bad Request`: Any exception is returned via `Results.Problem(detail, statusCode: 400)`.

---

## Home

### `GET /api/v1/home/summary/{user_id:int}`
Returns home summary totals and categorized card sections (`selfCards`, `receivedCards`, `sentCards`).

**Request**

| Parameter | In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `user_id` | Path | `int` | Yes | User/profile ID. |

**Response Shape (200 OK)**

```json
{
  "success": "<bool>",
  "message": "<string>",
  "data": {
    "freeMoney": "<decimal>",
    "lockMoney": "<decimal>",
    "totalActivityCount": "<int>",
    "selfCards": {
      "items": [
        {
          "intentId": "<int>",
          "city": "<string>",
          "country": "<string>",
          "description": "<string|null>",
          "mccList": [
            { "code": "<string>", "name": "<string>", "group": "<string>" }
          ],
          "requiredInvoiceProve": "<bool>",
          "card": {
            "id": "<int>",
            "stripeId": "<string>",
            "createdAt": "<datetime-iso8601>",
            "status": "<string>",
            "cardNumber": "<string>",
            "last4": "<string>",
            "cvv": "<string>",
            "expiryDate": "<string>",
            "expiryMonth": "<int>",
            "expiryYear": "<int>",
            "cardholderName": "<string>",
            "amount": "<decimal>",
            "remainingAmount": "<decimal>",
            "useTimes": "<short>",
            "usesLeft": "<short>",
            "unLockedAt": "<datetime-iso8601|null>",
            "minutesToUnlock": "<long>",
            "hoursToUnlock": "<long>",
            "daysToUnlock": "<long>",
            "timeRemainingLeveled": "<string>",
            "daysLocked": "<int>",
            "creatorId": "<int>",
            "retrieveId": "<int>",
            "type": "<string>",
            "senderName": "<string|null>"
          }
        }
      ],
      "count": "<int>"
    },
    "receivedCards": {
      "items": [],
      "count": "<int>"
    },
    "sentCards": {
      "items": [],
      "count": "<int>"
    }
  },
  "meta": {
    "statusCode": "<int>",
    "version": "<string>",
    "timestamp": "<datetimeoffset-iso8601>"
  }
}
```

**Response Example (200 OK)**

```json
{
  "success": true,
  "message": "Home summary fetched successfully",
  "data": {
    "freeMoney": 1500.75,
    "lockMoney": 320.25,
    "totalActivityCount": 2,
    "selfCards": {
      "items": [],
      "count": 0
    },
    "receivedCards": {
      "items": [
        {
          "intentId": 901,
          "city": "Riyadh",
          "country": "SA",
          "description": "Mithaq Protocol Transaction",
          "mccList": [
            { "code": "5411", "name": "Grocery Stores", "group": "Shopping" }
          ],
          "requiredInvoiceProve": false,
          "card": {
            "id": 501,
            "stripeId": "ic_abc123abc123abc123ab",
            "createdAt": "2026-04-28T11:00:00Z",
            "status": "active",
            "cardNumber": "4111000011110000",
            "last4": "0000",
            "cvv": "123",
            "expiryDate": "08/27",
            "expiryMonth": 8,
            "expiryYear": 2027,
            "cardholderName": "Sara M.",
            "amount": 300.00,
            "remainingAmount": 180.00,
            "useTimes": 3,
            "usesLeft": 2,
            "unLockedAt": "2026-04-28T11:00:00Z",
            "minutesToUnlock": 0,
            "hoursToUnlock": 0,
            "daysToUnlock": 0,
            "timeRemainingLeveled": "Available Now",
            "daysLocked": 0,
            "creatorId": 9,
            "retrieveId": 12,
            "type": "receiver",
            "senderName": "Noura A."
          }
        }
      ],
      "count": 1
    },
    "sentCards": {
      "items": [],
      "count": 0
    }
  },
  "meta": {
    "statusCode": 200,
    "version": "v1",
    "timestamp": "2026-04-29T18:35:10.0000000+00:00"
  }
}
```

**Status Codes**
- `200 OK`: Summary fetched successfully.
- `404 Not Found`: `KeyNotFoundException` branch (for example, profile not found).
- `400 Bad Request`: Any other exception returns `Results.Problem(..., 400)`.

---

## Simulation

### `POST /api/v1/simulate/tap-to-pay`
Simulates a card tap-to-pay authorization and writes an audit log.

**Request**

| Parameter | In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| Body | Body | `TapToPayRequest` | Yes | Tap simulation payload. |

```json
{
  "cardNumber": "4111000011110000",
  "amount": 42.50,
  "merchantName": "Hyper Market",
  "mcc": "5411",
  "city": "Riyadh",
  "country": "SA"
}
```

**Response Shape (200 OK)**

```json
{
  "success": "<bool>",
  "message": "<string>",
  "data": {
    "approved": "<bool>",
    "reason": "<string>"
  },
  "meta": {
    "statusCode": "<int>",
    "version": "<string>",
    "timestamp": "<datetimeoffset-iso8601>"
  }
}
```

**Response Example (200 OK)**

```json
{
  "success": true,
  "message": "Tap-to-pay simulation completed",
  "data": {
    "approved": true,
    "reason": "approved"
  },
  "meta": {
    "statusCode": 200,
    "version": "v1",
    "timestamp": "2026-04-29T18:36:00.0000000+00:00"
  }
}
```

**Status Codes**
- `200 OK`: Simulation completed (approved or declined is reflected in `data.approved`/`data.reason`).
- `400 Bad Request`: Any thrown exception returns `Results.Problem(..., 400)`.

---

## Cards

### `GET /api/v1/cards/{cardId:int}/logs`
Returns paged audit logs for a specific card.

**Request**

| Parameter | In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `cardId` | Path | `int` | Yes | Card ID. |
| `limit` | Query | `int?` | No | Page size. Default handler arg `30`; service clamps range to `1..1000`. |
| `offset` | Query | `int?` | No | Page offset. Default `0`. |

**Response Shape (200 OK)**

```json
{
  "success": "<bool>",
  "message": "<string>",
  "data": {
    "cardId": "<int>",
    "total": "<int>",
    "limit": "<int>",
    "offset": "<int>",
    "logs": [
      {
        "id": "<int>",
        "cardId": "<int>",
        "transactionAmount": "<decimal>",
        "merchantName": "<string|null>",
        "mcc": "<string|null>",
        "decision": "<string>",
        "reason": "<string|null>",
        "createdAt": "<datetime-iso8601>",
        "city": "<string|null>",
        "country": "<string|null>",
        "externalId": "<string|null>"
      }
    ]
  },
  "meta": {
    "statusCode": "<int>",
    "timestamp": "<datetimeoffset-iso8601>"
  }
}
```

**Response Example (200 OK)**

```json
{
  "success": true,
  "message": "Audit logs fetched",
  "data": {
    "cardId": 501,
    "total": 2,
    "limit": 30,
    "offset": 0,
    "logs": [
      {
        "id": 7001,
        "cardId": 501,
        "transactionAmount": 42.50,
        "merchantName": "Hyper Market",
        "mcc": "5411",
        "decision": "approved",
        "reason": null,
        "createdAt": "2026-04-29T16:10:00Z",
        "city": "Riyadh",
        "country": "SA",
        "externalId": null
      }
    ]
  },
  "meta": {
    "statusCode": 200,
    "timestamp": "2026-04-29T18:37:00.0000000+00:00"
  }
}
```

**Status Codes**
- `200 OK`: Logs fetched successfully.
- `404 Not Found`: `KeyNotFoundException` branch.
- `400 Bad Request`: Any other exception returns `Results.Problem(..., 400)`.

---

### `GET /api/v1/cards/{cardId:int}`
Returns a single card plus its audit logs, with optional access check by `profileId`.

**Request**

| Parameter | In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `cardId` | Path | `int` | Yes | Card ID. |
| `profileId` | Query | `int?` | No | If provided, used to validate card access against creator/receiver. |

**Response Shape (200 OK)**

```json
{
  "success": "<bool>",
  "message": "<string>",
  "data": {
    "card": {
      "intentId": "<int>",
      "city": "<string>",
      "country": "<string>",
      "description": "<string|null>",
      "mccList": [
        { "code": "<string>", "name": "<string>", "group": "<string>" }
      ],
      "requiredInvoiceProve": "<bool>",
      "card": {
        "id": "<int>",
        "stripeId": "<string>",
        "createdAt": "<datetime-iso8601>",
        "status": "<string>",
        "cardNumber": "<string>",
        "last4": "<string>",
        "cvv": "<string>",
        "expiryDate": "<string>",
        "expiryMonth": "<int>",
        "expiryYear": "<int>",
        "cardholderName": "<string>",
        "amount": "<decimal>",
        "remainingAmount": "<decimal>",
        "useTimes": "<short>",
        "usesLeft": "<short>",
        "unLockedAt": "<datetime-iso8601|null>",
        "minutesToUnlock": "<long>",
        "hoursToUnlock": "<long>",
        "daysToUnlock": "<long>",
        "timeRemainingLeveled": "<string>",
        "daysLocked": "<int>",
        "creatorId": "<int>",
        "retrieveId": "<int>",
        "type": "<string>",
        "senderName": "<string|null>"
      }
    },
    "logs": [
      {
        "id": "<int>",
        "cardId": "<int>",
        "transactionAmount": "<decimal>",
        "merchantName": "<string|null>",
        "mcc": "<string|null>",
        "decision": "<string>",
        "reason": "<string|null>",
        "createdAt": "<datetime-iso8601>",
        "city": "<string|null>",
        "country": "<string|null>",
        "externalId": "<string|null>"
      }
    ]
  }
}
```

**Response Example (200 OK)**

```json
{
  "success": true,
  "message": "Card fetched",
  "data": {
    "card": {
      "intentId": 901,
      "city": "Riyadh",
      "country": "SA",
      "description": "Weekly family groceries",
      "mccList": [
        { "code": "5411", "name": "Grocery Stores", "group": "Shopping" }
      ],
      "requiredInvoiceProve": true,
      "card": {
        "id": 501,
        "stripeId": "ic_abc123abc123abc123ab",
        "createdAt": "2026-04-28T11:00:00Z",
        "status": "active",
        "cardNumber": "4111000011110000",
        "last4": "0000",
        "cvv": "123",
        "expiryDate": "08/27",
        "expiryMonth": 8,
        "expiryYear": 2027,
        "cardholderName": "Sara M.",
        "amount": 300.00,
        "remainingAmount": 180.00,
        "useTimes": 3,
        "usesLeft": 2,
        "unLockedAt": "2026-04-28T11:00:00Z",
        "minutesToUnlock": 0,
        "hoursToUnlock": 0,
        "daysToUnlock": 0,
        "timeRemainingLeveled": "Available Now",
        "daysLocked": 0,
        "creatorId": 9,
        "retrieveId": 12,
        "type": "receiver",
        "senderName": "Noura A."
      }
    },
    "logs": [
      {
        "id": 7001,
        "cardId": 501,
        "transactionAmount": 42.50,
        "merchantName": "Hyper Market",
        "mcc": "5411",
        "decision": "approved",
        "reason": null,
        "createdAt": "2026-04-29T16:10:00Z",
        "city": "Riyadh",
        "country": "SA",
        "externalId": null
      }
    ]
  }
}
```

**Status Codes**
- `200 OK`: Card and logs fetched.
- `200 OK` (implicit): On `KeyNotFoundException` and `UnauthorizedAccessException`, handler returns `Results.Json({ success=false, message })` with no explicit status code (defaults to 200).
- `400 Bad Request`: Any other exception returns `Results.Problem(..., 400)`.

---

### `GET /api/v1/cards/by-user/{userId:int}/latest`
Returns the latest card (by `created_at DESC`) where user is creator or receiver.

**Request**

| Parameter | In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `userId` | Path | `int` | Yes | User ID. |

**Response Shape (200 OK)**

```json
{
  "success": "<bool>",
  "message": "<string>",
  "data": {
    "intentId": "<int>",
    "city": "<string>",
    "country": "<string>",
    "description": "<string|null>",
    "mccList": [
      { "code": "<string>", "name": "<string>", "group": "<string>" }
    ],
    "requiredInvoiceProve": "<bool>",
    "card": {
      "id": "<int>",
      "stripeId": "<string>",
      "createdAt": "<datetime-iso8601>",
      "status": "<string>",
      "cardNumber": "<string>",
      "last4": "<string>",
      "cvv": "<string>",
      "expiryDate": "<string>",
      "expiryMonth": "<int>",
      "expiryYear": "<int>",
      "cardholderName": "<string>",
      "amount": "<decimal>",
      "remainingAmount": "<decimal>",
      "useTimes": "<short>",
      "usesLeft": "<short>",
      "unLockedAt": "<datetime-iso8601|null>",
      "minutesToUnlock": "<long>",
      "hoursToUnlock": "<long>",
      "daysToUnlock": "<long>",
      "timeRemainingLeveled": "<string>",
      "daysLocked": "<int>",
      "creatorId": "<int>",
      "retrieveId": "<int>",
      "type": "<string>",
      "senderName": "<string|null>"
    }
  }
}
```

**Response Example (200 OK)**

```json
{
  "success": true,
  "message": "Latest card fetched",
  "data": {
    "intentId": 901,
    "city": "Riyadh",
    "country": "SA",
    "description": "Weekly family groceries",
    "mccList": [
      { "code": "5411", "name": "Grocery Stores", "group": "Shopping" }
    ],
    "requiredInvoiceProve": true,
    "card": {
      "id": 501,
      "stripeId": "ic_abc123abc123abc123ab",
      "createdAt": "2026-04-28T11:00:00Z",
      "status": "active",
      "cardNumber": "4111000011110000",
      "last4": "0000",
      "cvv": "123",
      "expiryDate": "08/27",
      "expiryMonth": 8,
      "expiryYear": 2027,
      "cardholderName": "Sara M.",
      "amount": 300.00,
      "remainingAmount": 180.00,
      "useTimes": 3,
      "usesLeft": 2,
      "unLockedAt": "2026-04-28T11:00:00Z",
      "minutesToUnlock": 0,
      "hoursToUnlock": 0,
      "daysToUnlock": 0,
      "timeRemainingLeveled": "Available Now",
      "daysLocked": 0,
      "creatorId": 9,
      "retrieveId": 12,
      "type": "receiver",
      "senderName": "Noura A."
    }
  }
}
```

**Status Codes**
- `200 OK`: Latest card found and returned.
- `200 OK` (implicit): No cards found branch returns `Results.Json({ success=false, message=\"No cards found\" })` with no explicit status code.
- `400 Bad Request`: Any exception returns `Results.Problem(..., 400)`.

---

### `GET /api/v1/cards/by-user/{userId:int}`
Returns paged cards for a user (where user is creator or receiver).

**Request**

| Parameter | In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `userId` | Path | `int` | Yes | User ID. |
| `limit` | Query | `int?` | No | Requested page size; service clamps to `1..1000`. |
| `offset` | Query | `int?` | No | Page offset; service enforces minimum `0`. |

**Response Shape (200 OK)**

```json
{
  "success": "<bool>",
  "message": "<string>",
  "data": {
    "total": "<int>",
    "limit": "<int>",
    "offset": "<int>",
    "items": [
      {
        "intentId": "<int>",
        "city": "<string>",
        "country": "<string>",
        "description": "<string|null>",
        "mccList": [
          { "code": "<string>", "name": "<string>", "group": "<string>" }
        ],
        "requiredInvoiceProve": "<bool>",
        "card": {
          "id": "<int>",
          "stripeId": "<string>",
          "createdAt": "<datetime-iso8601>",
          "status": "<string>",
          "cardNumber": "<string>",
          "last4": "<string>",
          "cvv": "<string>",
          "expiryDate": "<string>",
          "expiryMonth": "<int>",
          "expiryYear": "<int>",
          "cardholderName": "<string>",
          "amount": "<decimal>",
          "remainingAmount": "<decimal>",
          "useTimes": "<short>",
          "usesLeft": "<short>",
          "unLockedAt": "<datetime-iso8601|null>",
          "minutesToUnlock": "<long>",
          "hoursToUnlock": "<long>",
          "daysToUnlock": "<long>",
          "timeRemainingLeveled": "<string>",
          "daysLocked": "<int>",
          "creatorId": "<int>",
          "retrieveId": "<int>",
          "type": "<string>",
          "senderName": "<string|null>"
        }
      }
    ]
  }
}
```

**Response Example (200 OK)**

```json
{
  "success": true,
  "message": "Cards fetched",
  "data": {
    "total": 24,
    "limit": 50,
    "offset": 0,
    "items": [
      {
        "intentId": 901,
        "city": "Riyadh",
        "country": "SA",
        "description": "Weekly family groceries",
        "mccList": [
          { "code": "5411", "name": "Grocery Stores", "group": "Shopping" }
        ],
        "requiredInvoiceProve": true,
        "card": {
          "id": 501,
          "stripeId": "ic_abc123abc123abc123ab",
          "createdAt": "2026-04-28T11:00:00Z",
          "status": "active",
          "cardNumber": "4111000011110000",
          "last4": "0000",
          "cvv": "123",
          "expiryDate": "08/27",
          "expiryMonth": 8,
          "expiryYear": 2027,
          "cardholderName": "Sara M.",
          "amount": 300.00,
          "remainingAmount": 180.00,
          "useTimes": 3,
          "usesLeft": 2,
          "unLockedAt": "2026-04-28T11:00:00Z",
          "minutesToUnlock": 0,
          "hoursToUnlock": 0,
          "daysToUnlock": 0,
          "timeRemainingLeveled": "Available Now",
          "daysLocked": 0,
          "creatorId": 9,
          "retrieveId": 12,
          "type": "receiver",
          "senderName": "Noura A."
        }
      }
    ]
  }
}
```

**Status Codes**
- `200 OK`: Cards page returned (`Results.Json` without explicit code defaults to 200).
- `400 Bad Request`: Any exception returns `Results.Problem(..., 400)`.
