import { afterEach, describe, expect, it, vi } from "vitest";
import { getCardsByUserGrouped } from "@/api/cardsByUser";
import { getCardDetailsData } from "@/api/cardDetails";
import { createIntent } from "@/api/intentCards";

function okEnvelope<T>(data: T) {
  return {
    success: true,
    message: "ok",
    data,
    meta: { statusCode: 200 },
  };
}

describe("API E2E-style flows", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("cards page flow: calls by-user endpoint and groups cards by perspective", async () => {
    const userId = 7;
    const payload = {
      total: 3,
      limit: 20,
      items: [
        {
          intentId: 1,
          city: "",
          country: "",
          description: "Self groceries",
          requiredInvoiceProve: true,
          mccList: [{ code: "5411", name: "Grocery Stores", group: "Food" }],
          card: {
            id: 101,
            stripeId: "st_1",
            createdAt: "2026-01-01T00:00:00Z",
            status: "active",
            cardNumber: "4242424242424242",
            last4: "4242",
            cvv: "123",
            expiryDate: "12/27",
            expiryMonth: 12,
            expiryYear: 2027,
            cardholderName: "Meryk One",
            amount: 1000,
            remainingAmount: 835,
            useTimes: 10,
            usesLeft: 7,
            creatorId: userId,
            retrieveId: userId,
            type: "self",
          },
        },
        {
          intentId: 2,
          city: "",
          country: "",
          description: "Sent card",
          requiredInvoiceProve: false,
          mccList: [{ code: "5732", name: "Electronics", group: "Shopping" }],
          card: {
            id: 102,
            stripeId: "st_2",
            createdAt: "2026-01-02T00:00:00Z",
            status: "pending",
            cardNumber: "4000000000000002",
            last4: "0002",
            cvv: "123",
            expiryDate: "11/27",
            expiryMonth: 11,
            expiryYear: 2027,
            cardholderName: "Receiver User",
            amount: 500,
            remainingAmount: 500,
            useTimes: 5,
            usesLeft: 5,
            creatorId: userId,
            retrieveId: 88,
            type: "sent",
          },
        },
        {
          intentId: 3,
          city: "",
          country: "",
          description: "Received card",
          requiredInvoiceProve: false,
          mccList: [{ code: "4816", name: "Telecom Services", group: "Services" }],
          card: {
            id: 103,
            stripeId: "st_3",
            createdAt: "2026-01-03T00:00:00Z",
            status: "active",
            cardNumber: "4000000000000003",
            last4: "0003",
            cvv: "123",
            expiryDate: "10/27",
            expiryMonth: 10,
            expiryYear: 2027,
            cardholderName: "Meryk One",
            amount: 300,
            remainingAmount: 250,
            useTimes: 3,
            usesLeft: 2,
            creatorId: 42,
            retrieveId: userId,
            type: "receiver",
            senderName: "Sender User",
          },
        },
      ],
    };

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(okEnvelope(payload)), { status: 200 }),
    );

    const res = await getCardsByUserGrouped(userId);

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/cards/by-user/7",
      expect.objectContaining({ method: "GET" }),
    );
    expect(res.isSucess).toBe(true);
    expect(res.data?.selfCards).toHaveLength(1);
    expect(res.data?.cardsSent).toHaveLength(1);
    expect(res.data?.cardsReceived).toHaveLength(1);
    expect(res.data?.selfCards[0].perspective).toBe("guard");
    expect(res.data?.cardsSent[0].perspective).toBe("sent");
    expect(res.data?.cardsReceived[0].perspective).toBe("received");
  });

  it("card details flow: maps backend to computed status, perspective, and preview data", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify(
          okEnvelope({
            card: {
              intentId: 10,
              city: "Cairo",
              country: "EG",
              description: "Medical support",
              requiredInvoiceProve: true,
              mccList: [{ code: "8011", name: "Doctors", group: "Health" }],
              card: {
                id: 555,
                stripeId: "st_555",
                createdAt: "2026-01-01T00:00:00Z",
                status: "active",
                isManuallyFrozen: true,
                isLockedByPendingInvoice: false,
                isSpendBlocked: false,
                isRequestRefund: false,
                cardNumber: "4000000000000555",
                last4: "0555",
                cvv: "555",
                expiryDate: "12/27",
                expiryMonth: 12,
                expiryYear: 2027,
                cardholderName: "Receiver User",
                amount: 1000,
                remainingAmount: 900,
                useTimes: 10,
                usesLeft: 9,
                creatorId: 7,
                retrieveId: 9,
                type: "sent",
              },
            },
            logs: [{ id: 1, createdAt: "2026-01-05T00:00:00Z", message: "Approved $100.00 at Clinic." }],
          }),
        ),
        { status: 200 },
      ),
    );

    const res = await getCardDetailsData("555", 7);

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/cards/555?profileId=7",
      expect.objectContaining({ method: "GET" }),
    );
    expect(res.isSucess).toBe(true);
    expect(res.data?.perspective).toBe("sent");
    expect(res.data?.status).toBe("frozen");
    expect(res.data?.hideSecrets).toBe(true);
    expect(res.data?.allowedMcc).toEqual([{ code: "8011", name: "Doctors" }]);
    expect(res.data?.allowedMccCodes).toEqual(["8011"]);
    expect(res.data?.events[0].message).toContain("Approved");
  });

  it("send intent flow: posts create request and returns preview payload", async () => {
    const requestBody = {
      creatorId: 7,
      userId: 9,
      amount: 150,
      useTimes: 2,
      mccList: ["5411"],
      requiredInvoiceProve: true,
      description: "Groceries budget",
      country: "EG",
      city: "Cairo",
      expiryDate: "2026-06-01T00:00:00.000Z",
      firstDateToUser: "2026-05-01T00:00:00.000Z",
    };

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify(
          okEnvelope({
            intentId: 99,
            city: "Cairo",
            country: "EG",
            description: "Groceries budget",
            requiredInvoiceProve: true,
            mccList: [{ code: "5411", name: "Grocery Stores", group: "Food" }],
            card: {
              id: 909,
              stripeId: "st_909",
              createdAt: "2026-05-01T00:00:00Z",
              status: "active",
              cardNumber: "4000000000000909",
              last4: "0909",
              cvv: "123",
              expiryDate: "06/26",
              expiryMonth: 6,
              expiryYear: 2026,
              cardholderName: "Receiver User",
              amount: 150,
              remainingAmount: 150,
              useTimes: 2,
              usesLeft: 2,
              creatorId: 7,
              retrieveId: 9,
              type: "sent",
            },
          }),
        ),
        { status: 200 },
      ),
    );

    const res = await createIntent(requestBody);

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/intents/create",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(requestBody),
      }),
    );
    expect(res.isSucess).toBe(true);
    expect(res.data?.intentId).toBe(99);
    expect(res.data?.card.last4).toBe("0909");
  });
});
