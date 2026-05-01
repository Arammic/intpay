export type MockCardPerspective = "guard" | "received" | "sent";
export type MockCardStatus =
  | "pending"
  | "active"
  | "expired"
  | "canceled"
  | "destroyed";
export type MockProofStatus =
  | "awaiting_upload"
  | "verifying"
  | "verified"
  | "rejected"
  | "expired_missed";

export interface MockCardProof {
  id: number;
  status: MockProofStatus;
  amount: number;
  merchantName: string;
  proofDeadlineAt?: number;
}

export interface MockCard {
  id: number;
  perspective: MockCardPerspective;
  status: MockCardStatus;
  description: string;
  createdAt: number;
  amount: number;
  amountSpent: number;
  usedCount: number;
  cancelAfterUseCount: number;
  requireProof: boolean;
  proofName?: string;
  allowedMccCodes: string[];
  secure: {
    last4: string;
    cardholderName: string;
    expMonth: number;
    expYear: number;
  };
  counterparty?: {
    id: string;
    name: string;
    handle: string;
    email: string;
  };
  proofs: MockCardProof[];
  events: { id: string; ts: number; message: string }[];
}

export function getMockCards(now: number = Date.now()): MockCard[] {
  return [
    {
      id: 10,
      perspective: "guard",
      status: "active",
      description: "Weekly groceries and essentials budget",
      createdAt: now - 1000 * 60 * 60 * 5,
      amount: 600,
      amountSpent: 145.5,
      usedCount: 2,
      cancelAfterUseCount: 8,
      requireProof: true,
      proofName: "Grocery receipt",
      allowedMccCodes: ["5411", "5499"],
      secure: {
        last4: "1823",
        cardholderName: "Reda Easa",
        expMonth: 12,
        expYear: 2028,
      },
      proofs: [
        {
          id: 501,
          status: "awaiting_upload",
          amount: 42.8,
          merchantName: "Fresh Market",
          proofDeadlineAt: now + 1000 * 60 * 6,
        },
        {
          id: 502,
          status: "verified",
          amount: 87.7,
          merchantName: "Daily Mart",
          proofDeadlineAt: now - 1000 * 60 * 60,
        },
      ],
      events: [
        {
          id: "evt_10_1",
          ts: now - 1000 * 60 * 8,
          message: "Approved $42.80 at Fresh Market.",
        },
        {
          id: "evt_10_2",
          ts: now - 1000 * 60 * 10,
          message: "Proof requested for Fresh Market transaction.",
        },
        {
          id: "evt_10_3",
          ts: now - 1000 * 60 * 60 * 2,
          message: "Approved $87.70 at Daily Mart.",
        },
      ],
    },
    {
      id: 1002,
      perspective: "guard",
      status: "active",
      description: "Transport and fuel spending",
      createdAt: now - 1000 * 60 * 60 * 28,
      amount: 220,
      amountSpent: 70,
      usedCount: 1,
      cancelAfterUseCount: 5,
      requireProof: false,
      allowedMccCodes: ["5541", "5542"],
      secure: {
        last4: "7742",
        cardholderName: "Reda Easa",
        expMonth: 8,
        expYear: 2028,
      },
      proofs: [],
      events: [
        {
          id: "evt_1002_1",
          ts: now - 1000 * 60 * 40,
          message: "Approved $70.00 at City Fuel.",
        },
      ],
    },
    {
      id: 2001,
      perspective: "received",
      status: "active",
      description: "Transport and commute",
      createdAt: now - 1000 * 60 * 60 * 16,
      amount: 240,
      amountSpent: 96.4,
      usedCount: 2,
      cancelAfterUseCount: 6,
      requireProof: true,
      proofName: "Receipt",
      allowedMccCodes: ["4111", "4121"],
      secure: {
        last4: "1098",
        cardholderName: "Reda Easa",
        expMonth: 7,
        expYear: 2028,
      },
      counterparty: {
        id: "1",
        name: "Abdalla Ahmed",
        handle: "@abdalla",
        email: "abdalla.ahmed@intentpay.app",
      },
      proofs: [
        {
          id: 601,
          status: "awaiting_upload",
          amount: 22.5,
          merchantName: "City Metro",
          proofDeadlineAt: now + 1000 * 60 * 8,
        },
      ],
      events: [
        {
          id: "evt_2001_1",
          ts: now - 1000 * 60 * 3,
          message: "Approved $22.50 at City Metro.",
        },
      ],
    },
    {
      id: 3001,
      perspective: "sent",
      status: "active",
      description: "School lunch budget",
      createdAt: now - 1000 * 60 * 60 * 40,
      amount: 180,
      amountSpent: 0,
      usedCount: 0,
      cancelAfterUseCount: 6,
      requireProof: false,
      allowedMccCodes: ["5812", "5814", "5411"],
      secure: {
        last4: "2002",
        cardholderName: "Mery Kassis",
        expMonth: 1,
        expYear: 2030,
      },
      counterparty: {
        id: "4",
        name: "Mery Kassis",
        handle: "@merykassis",
        email: "merykassis48@gmail.com",
      },
      proofs: [],
      events: [
        {
          id: "evt_3001_1",
          ts: now - 1000 * 60 * 30,
          message: "Card sent to Mery Kassis.",
        },
      ],
    },
    {
      id: 3002,
      perspective: "sent",
      status: "active",
      description: "Pharmacy essentials",
      createdAt: now - 1000 * 60 * 60 * 72,
      amount: 140,
      amountSpent: 30,
      usedCount: 1,
      cancelAfterUseCount: 4,
      requireProof: true,
      proofName: "Receipt",
      allowedMccCodes: ["5912"],
      secure: {
        last4: "4004",
        cardholderName: "Mohammed Saif",
        expMonth: 8,
        expYear: 2029,
      },
      counterparty: {
        id: "3",
        name: "Mohammed Saif",
        handle: "@msaif",
        email: "mohammed.saif@intentpay.app",
      },
      proofs: [],
      events: [
        {
          id: "evt_3002_1",
          ts: now - 1000 * 60 * 60 * 24,
          message: "Approved $30.00 at City Pharmacy.",
        },
      ],
    },
  ];
}
