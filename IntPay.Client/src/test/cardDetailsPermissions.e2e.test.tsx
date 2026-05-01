import { describe, expect, it, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";

const useCardDetailsDataMock = vi.fn();

vi.mock("@/hooks/useCardDetailsData", () => ({
  useCardDetailsData: (...args: unknown[]) => useCardDetailsDataMock(...args),
}));

vi.mock("@/lib/currentUserContext", () => ({
  useCurrentUserContext: () => ({ userId: 7 }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useParams: () => ({ cardId: "555" }),
    useNavigate: () => vi.fn(),
  };
});

import CardDetailsApiPage from "@/pages/CardDetailsApiPage";

function renderPage() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <CardDetailsApiPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const baseData = {
  id: "555",
  perspective: "sent" as const,
  status: "active" as const,
  hideSecrets: false,
  isLockedByPendingInvoice: false,
  isManuallyFrozen: false,
  isSpendBlocked: false,
  isRequestRefund: false,
  isExpired: false,
  description: "School fees",
  amount: 1000,
  amountSpent: 100,
  usedCount: 1,
  cancelAfterUseCount: 10,
  allowedMcc: [{ code: "8211", name: "Schools" }],
  allowedMccCodes: ["8211"],
  requireProof: false,
  proofName: undefined,
  secure: {
    last4: "4242",
    cardholderName: "Receiver User",
    expMonth: 12,
    expYear: 2027,
    fullNumber: "4000000000004242",
    cvv: "123",
  },
  counterparty: { id: "9", name: "Receiver User", handle: "@receiver", email: "" },
  proofs: [],
  events: [{ id: "e1", ts: Date.now(), message: "Approved $100.00 at School." }],
  raw: { card: {} as never, logs: [] },
};

describe("Card details perspective gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sent perspective hides holder-only actions", () => {
    useCardDetailsDataMock.mockReturnValue({
      data: { data: baseData, isSucess: true, error: [] },
      isLoading: false,
    });

    renderPage();

    expect(screen.getByText(/The recipient holds this card/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Reveal/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Request refund/i })).not.toBeInTheDocument();
  });

  it("received perspective shows card actions and not sender-only note", () => {
    useCardDetailsDataMock.mockReturnValue({
      data: {
        data: { ...baseData, perspective: "received", counterparty: { id: "2", name: "Sender", handle: "@sender", email: "" } },
        isSucess: true,
        error: [],
      },
      isLoading: false,
    });

    renderPage();

    expect(screen.getByRole("button", { name: /Reveal/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Request refund/i })).toBeInTheDocument();
    expect(screen.queryByText(/The recipient holds this card/i)).not.toBeInTheDocument();
  });
});
