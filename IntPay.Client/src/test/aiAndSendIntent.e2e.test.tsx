import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

const invokeMock = vi.fn();
const createIntentMock = vi.fn();
const mapToCardDetailsMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => invokeMock(...args),
    },
  },
}));

vi.mock("@/lib/currentUserContext", () => ({
  useCurrentUserContext: () => ({
    userId: 7,
    profile: {
      id: 7,
      name: "Meryk User",
      username: "@meryk",
      email: "meryk@test.dev",
      contacts: [{ id: 9, name: "Receiver User", username: "@receiver", email: "r@test.dev" }],
    },
  }),
}));

vi.mock("@/components/ContactPicker", () => ({
  ContactPicker: ({ onSelect }: { onSelect: (row: unknown) => void }) => (
    <button
      type="button"
      onClick={() =>
        onSelect({
          id: "9",
          name: "Receiver User",
          username: "@receiver",
          email: "r@test.dev",
          initials: "RU",
        })
      }
    >
      Select recipient
    </button>
  ),
}));

vi.mock("@/components/LiveIntentExtractor", () => ({
  LiveIntentExtractor: ({ onChange }: { onChange: (t: string, r: unknown) => void }) => (
    <button
      type="button"
      onClick={() =>
        onChange("groceries", {
          ready: true,
          extracted: [],
          missing_required: [],
          missing_optional: [],
          intent: {
            amount: 200,
            useTimes: 3,
            description: "Groceries weekly",
            requiredInvoiceProve: true,
            mccList: ["5411"],
            firstDateToUser: "2026-05-01T00:00:00.000Z",
            expiryDate: "2026-06-01T00:00:00.000Z",
            city: "Cairo",
            country: "EG",
          },
        })
      }
    >
      Fill AI data
    </button>
  ),
}));

vi.mock("@/components/IntentChat", async () => {
  const actual = await vi.importActual<typeof import("@/components/IntentChat")>("@/components/IntentChat");
  return {
    ...actual,
    IntentChat: ({ onComplete }: { onComplete: (v: unknown) => void }) => (
      <button
        type="button"
        onClick={() =>
          onComplete({
            amount: 120,
            allowed_uses: 2,
            description: "Chat intent",
            require_proof: false,
            proof_type: null,
            allowed_mcc_codes: ["5411"],
            first_use_at: null,
            last_use_at: null,
            city: null,
            country: null,
            rule_preview: "ok",
          })
        }
      >
        Complete chat intent
      </button>
    ),
  };
});

vi.mock("@/components/IssueSuccessDialog", () => ({
  IssueSuccessDialog: () => null,
}));

vi.mock("@/api/intentCards", () => ({
  createIntent: (...args: unknown[]) => createIntentMock(...args),
}));

vi.mock("@/api/cardDetails", () => ({
  mapToCardDetails: (...args: unknown[]) => mapToCardDetailsMock(...args),
}));

vi.mock("@/lib/store", () => ({
  useApp: () => ({
    currentUser: { id: "7", name: "Meryk", points: 0 },
    cardsGuard: [],
    cardsSent: [],
    cardsReceived: [],
  }),
}));

import SendIntentPage from "@/pages/SendIntentPage";
import MoneyCoachPage from "@/pages/MoneyCoachPage";

function renderWithQuery(ui: ReactNode) {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("AI + send-intent E2E-style flows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("send-intent flow issues card from selected recipient to preview payload", async () => {
    createIntentMock.mockResolvedValue({
      isSucess: true,
      error: [],
      data: {
        intentId: 88,
        city: "Cairo",
        country: "EG",
        description: "Groceries weekly",
        mccList: [{ code: "5411", name: "Grocery Stores", group: "Food" }],
        requiredInvoiceProve: true,
        card: { id: 700, last4: "0700" },
      },
    });
    mapToCardDetailsMock.mockReturnValue({ id: "700" });

    renderWithQuery(<SendIntentPage />);

    fireEvent.click(screen.getByRole("button", { name: /Select recipient/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Next/i }));
    fireEvent.click(screen.getByRole("button", { name: /Fill AI data/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Next/i }));
    fireEvent.click(screen.getByRole("button", { name: /Issue Card/i }));

    await waitFor(() => {
      expect(createIntentMock).toHaveBeenCalledTimes(1);
    });
    expect(createIntentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        creatorId: 7,
        userId: 9,
        amount: 200,
        useTimes: 3,
        mccList: ["5411"],
        requiredInvoiceProve: true,
      }),
    );
  });

  it("Ask AI flow calls intpay-assist and renders assistant answer", async () => {
    invokeMock.mockResolvedValue({
      data: { reply: "You have 2 active cards." },
      error: null,
    });

    renderWithQuery(<MoneyCoachPage />);
    fireEvent.change(screen.getByPlaceholderText(/Ask anything about your IntPay/i), {
      target: { value: "How many active cards do I have?" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Ask AI/i }));

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith(
        "intpay-assist",
        expect.objectContaining({
          body: expect.objectContaining({
            messages: [{ role: "user", content: "How many active cards do I have?" }],
          }),
        }),
      );
    });
    expect(screen.getByText(/You have 2 active cards/i)).toBeInTheDocument();
  });
});
