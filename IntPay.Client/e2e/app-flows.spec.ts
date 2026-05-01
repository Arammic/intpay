import { expect, test, type Page } from "@playwright/test";

type MockIntentWithCard = {
  intentId: number;
  city: string;
  country: string;
  description: string;
  requiredInvoiceProve: boolean;
  mccList: Array<{ code: string; name: string; group: string }>;
  card: {
    id: number;
    stripeId: string;
    createdAt: string;
    status: string;
    isLockedByPendingInvoice?: boolean;
    isManuallyFrozen?: boolean;
    isSpendBlocked?: boolean;
    isRequestRefund?: boolean;
    cardNumber: string;
    last4: string;
    cvv: string;
    expiryDate: string;
    expiryMonth: number;
    expiryYear: number;
    cardholderName: string;
    amount: number;
    remainingAmount: number;
    useTimes: number;
    usesLeft: number;
    creatorId: number;
    retrieveId: number;
    type: string;
    senderName?: string;
  };
};

const profile7 = {
  id: 7,
  name: "Meryk User",
  username: "meryk",
  email: "meryk@test.dev",
  vaultBalance: 5000,
  lockMoney: 1200,
  link: "meryk",
  points: 25,
  contacts: [
    {
      id: 9,
      name: "Receiver User",
      email: "receiver@test.dev",
      username: "receiver",
      link: "receiver",
    },
  ],
};

const cardsByUserItems: MockIntentWithCard[] = [
  {
    intentId: 1,
    city: "Cairo",
    country: "EG",
    description: "Self groceries",
    requiredInvoiceProve: true,
    mccList: [{ code: "5411", name: "Grocery Stores", group: "Food" }],
    card: {
      id: 101,
      stripeId: "st_101",
      createdAt: "2026-01-01T00:00:00Z",
      status: "active",
      cardNumber: "4000000000000101",
      last4: "0101",
      cvv: "101",
      expiryDate: "12/27",
      expiryMonth: 12,
      expiryYear: 2027,
      cardholderName: "Meryk User",
      amount: 1000,
      remainingAmount: 835,
      useTimes: 10,
      usesLeft: 7,
      creatorId: 7,
      retrieveId: 7,
      type: "self",
    },
  },
  {
    intentId: 2,
    city: "Cairo",
    country: "EG",
    description: "Sent school card",
    requiredInvoiceProve: false,
    mccList: [{ code: "8211", name: "Schools", group: "Services" }],
    card: {
      id: 102,
      stripeId: "st_102",
      createdAt: "2026-01-02T00:00:00Z",
      status: "active",
      cardNumber: "4000000000000102",
      last4: "0102",
      cvv: "102",
      expiryDate: "12/27",
      expiryMonth: 12,
      expiryYear: 2027,
      cardholderName: "Receiver User",
      amount: 500,
      remainingAmount: 450,
      useTimes: 5,
      usesLeft: 4,
      creatorId: 7,
      retrieveId: 9,
      type: "sent",
    },
  },
  {
    intentId: 3,
    city: "Cairo",
    country: "EG",
    description: "Received transport card",
    requiredInvoiceProve: false,
    mccList: [{ code: "4121", name: "Taxis & Rideshare", group: "Transport" }],
    card: {
      id: 103,
      stripeId: "st_103",
      createdAt: "2026-01-03T00:00:00Z",
      status: "active",
      cardNumber: "4000000000000103",
      last4: "0103",
      cvv: "103",
      expiryDate: "12/27",
      expiryMonth: 12,
      expiryYear: 2027,
      cardholderName: "Meryk User",
      amount: 300,
      remainingAmount: 240,
      useTimes: 3,
      usesLeft: 2,
      creatorId: 42,
      retrieveId: 7,
      type: "receiver",
      senderName: "Sender User",
    },
  },
];

function envelope(data: unknown, success = true, statusCode = 200) {
  return {
    success,
    message: success ? "ok" : "error",
    data,
    meta: { statusCode, version: "test", timestamp: new Date().toISOString() },
  };
}

test.beforeEach(async ({ page }) => {
  page.on("pageerror", (err) => {
    console.log("PAGEERROR", err.message);
  });
  page.on("console", (msg) => {
    if (msg.type() === "error") console.log("CONSOLE_ERROR", msg.text());
  });
  const createIntentRequests: unknown[] = [];
  let intentAgentCount = 0;

  await page.route("**/api/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname + (url.search ?? "");
    if (!url.pathname.startsWith("/api/")) {
      await route.continue();
      return;
    }

    if (path.startsWith("/api/profiles/7")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(envelope(profile7)),
      });
      return;
    }

    if (path.startsWith("/api/profiles/search")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(envelope(profile7.contacts)),
      });
      return;
    }

    if (path.startsWith("/api/cards/by-user/7")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          envelope({
            total: cardsByUserItems.length,
            limit: 20,
            items: cardsByUserItems,
          }),
        ),
      });
      return;
    }

    if (path.startsWith("/api/cards/101")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          envelope({
            card: {
              ...cardsByUserItems[0],
              card: {
                ...cardsByUserItems[0].card,
                type: "self",
                isManuallyFrozen: false,
                isSpendBlocked: false,
              },
            },
            logs: [{ id: 1, createdAt: "2026-01-05T00:00:00Z", message: "Approved $165.00 at Grocery." }],
          }),
        ),
      });
      return;
    }

    if (path.startsWith("/api/cards/102")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          envelope({
            card: {
              ...cardsByUserItems[1],
              card: {
                ...cardsByUserItems[1].card,
                type: "sent",
                isManuallyFrozen: false,
                isSpendBlocked: false,
              },
            },
            logs: [{ id: 2, createdAt: "2026-01-06T00:00:00Z", message: "Approved $50.00 at School." }],
          }),
        ),
      });
      return;
    }

    if (path.startsWith("/api/cards/103")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          envelope({
            card: {
              ...cardsByUserItems[2],
              card: {
                ...cardsByUserItems[2].card,
                type: "sent",
                creatorId: 42,
                retrieveId: 7,
                isManuallyFrozen: false,
                isSpendBlocked: false,
              },
            },
            logs: [{ id: 3, createdAt: "2026-01-07T00:00:00Z", message: "Approved $60.00 at Taxi." }],
          }),
        ),
      });
      return;
    }

    if (path.startsWith("/api/intents/create") && req.method() === "POST") {
      const json = req.postDataJSON();
      createIntentRequests.push(json);
      const id = createIntentRequests.length === 1 ? 900 : 901;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          envelope({
            intentId: id,
            city: "Cairo",
            country: "EG",
            description: "Issued from e2e",
            requiredInvoiceProve: !!(json as { requiredInvoiceProve?: boolean }).requiredInvoiceProve,
            mccList: [{ code: "5411", name: "Grocery Stores", group: "Food" }],
            card: {
              id,
              stripeId: `st_${id}`,
              createdAt: "2026-05-01T00:00:00Z",
              status: "active",
              cardNumber: "4000000000000900",
              last4: "0900",
              cvv: "123",
              expiryDate: "06/27",
              expiryMonth: 6,
              expiryYear: 2027,
              cardholderName: "Receiver User",
              amount: Number((json as { amount?: number }).amount ?? 0),
              remainingAmount: Number((json as { amount?: number }).amount ?? 0),
              useTimes: Number((json as { useTimes?: number }).useTimes ?? 1),
              usesLeft: Number((json as { useTimes?: number }).useTimes ?? 1),
              creatorId: 7,
              retrieveId: Number((json as { userId?: number }).userId ?? 7),
              type: "sent",
            },
          }),
        ),
      });
      return;
    }

    await route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify(envelope(null, false, 404)),
    });
  });

  await page.route("**/functions/v1/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/intent-extract")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          intent: {
            amount: 250,
            useTimes: 3,
            description: "Groceries for home",
            requiredInvoiceProve: true,
            mccList: ["5411"],
            firstDateToUser: "2026-05-01T00:00:00.000Z",
            expiryDate: "2026-06-01T00:00:00.000Z",
            city: "Cairo",
            country: "EG",
          },
          extracted: [{ field: "amount", label: "Amount", value: "$250" }],
          missing_required: [],
          missing_optional: [],
          ready: true,
        }),
      });
      return;
    }
    if (url.includes("/intent-agent")) {
      intentAgentCount += 1;
      if (intentAgentCount === 1) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            reply: "Hi! Tell me your intent.",
            done: false,
            intent: null,
          }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          reply: "All set! Press Next to see your card details.",
          done: true,
          intent: {
            amount: 120,
            useTimes: 2,
            description: "Chat groceries",
            requiredInvoiceProve: true,
            mccList: ["5411"],
            firstDateToUser: "2026-05-02T00:00:00.000Z",
            expiryDate: "2026-06-02T00:00:00.000Z",
            city: "Cairo",
            country: "EG",
            rule_preview: "• Amount: $120\n• Allowed uses: 2",
          },
        }),
      });
      return;
    }
    if (url.includes("/intpay-assist")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          reply: "You have 2 active cards.",
        }),
      });
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) });
  });
});

async function loginAsStoredUser(page: Page) {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("intpay.activeUserId", "7");
  });
}

test("cards page shows current user cards in correct tabs", async ({ page }) => {
  await loginAsStoredUser(page);
  await page.goto("/cards");

  await expect(page.getByText("Your intent cards")).toBeVisible();
  await expect(page.getByRole("tab", { name: /My intent \(1\)/i })).toBeVisible();
  await expect(page.getByText("Self groceries").first()).toBeVisible();

  await page.getByRole("tab", { name: /Received \(1\)/i }).click();
  await expect(page.getByText("Sender User")).toBeVisible();

  await page.getByRole("tab", { name: /Sent \(1\)/i }).click();
  await expect(page.getByText("Receiver User").first()).toBeVisible();
});

test("card details enforces actions by perspective", async ({ page }) => {
  await loginAsStoredUser(page);
  await page.goto("/cards/102");
  await expect(page.getByText("Sent intent")).toBeVisible();
  await expect(page.getByText("The recipient holds this card")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Reveal$/i })).toHaveCount(0);

  await page.goto("/cards/103");
  await expect(page.getByText("Received intent")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Reveal$/i })).toBeVisible();

  await page.goto("/cards/101");
  await expect(page.getByText("My self-locked card")).toBeVisible();
  await expect(page.getByRole("button", { name: /Request refund/i })).toBeVisible();
});

test.fail("send intent flow works in live extractor", async ({ page }) => {
  await loginAsStoredUser(page);
  await page.goto("/intent/new");

  await page.getByRole("button", { name: /Receiver User/i }).click();
  await page.getByRole("button", { name: /^Next/i }).click();

  // Live extractor path
  const liveTextarea = page.getByPlaceholder(/e\.g\./i);
  await liveTextarea.fill("250 for groceries in cairo with invoice proof");
  await expect(page.getByText("All required fields captured")).toBeVisible();
  await page.waitForTimeout(1400);
  await page.locator("button.bg-gradient-primary", { hasText: "Next" }).last().click({ force: true });
  await expect(page.getByText("Intent card preview")).toBeVisible();
});

test("send intent flow issues successfully in chat mode", async ({ page }) => {
  await loginAsStoredUser(page);
  await page.goto("/intent/new");

  await page.getByRole("button", { name: /Receiver User/i }).click();
  await page.getByRole("button", { name: /^Next/i }).click();
  await page.getByRole("button", { name: /Chat with IntentBot/i }).click();
  await page.getByPlaceholder(/Type your reply/i).fill("120 groceries in cairo");
  await page.keyboard.press("Enter");
  await expect(page.getByText(/Press Next to see your card details/i)).toBeVisible();
  await page.waitForTimeout(900);
  await page.getByRole("button", { name: /^Next/i }).last().click();
  await expect(page.getByText("Intent card preview")).toBeVisible();
  await page.getByRole("button", { name: /Issue Card/i }).click();
  await expect(page.getByText("Intent card preview")).toBeVisible();
});

test("Ask AI and coach chat both respond", async ({ page }) => {
  await loginAsStoredUser(page);
  await page.goto("/coach");
  await page.getByPlaceholder(/Ask anything about your IntPay/i).fill("How many active cards do I have?");
  await page.getByRole("button", { name: /Ask AI/i }).click();
  await expect(page.getByText("You have 2 active cards.")).toBeVisible();

  await page.getByRole("button", { name: /Open IntPay Assistant chat/i }).click();
  await expect(page.getByText("IntPay Assistant", { exact: true }).first()).toBeVisible();
  await page.getByPlaceholder(/Ask anything, find anything/i).fill("Wallet summary");
  await page.keyboard.press("Enter");
  await expect(page.getByText("You have 2 active cards.")).toBeVisible();
});
