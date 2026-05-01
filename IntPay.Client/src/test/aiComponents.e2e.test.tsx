import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const invokeMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => invokeMock(...args),
    },
  },
}));

import { IntentChat } from "@/components/IntentChat";
import { LiveIntentExtractor } from "@/components/LiveIntentExtractor";

function renderWithQuery(ui: ReactNode) {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe("AI endpoint components", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(HTMLElement.prototype, "scrollTo", {
      value: vi.fn(),
      writable: true,
    });
  });

  it("intent-chat maps intent-agent response to extracted intent shape", async () => {
    const onComplete = vi.fn();
    invokeMock.mockResolvedValue({
      data: {
        reply: "All set",
        done: true,
        intent: {
          amount: 123,
          useTimes: 4,
          description: "Medical visit",
          requiredInvoiceProve: true,
          mccList: ["8011"],
          firstDateToUser: "2026-05-10T00:00:00.000Z",
          expiryDate: "2026-06-10T00:00:00.000Z",
          city: "Cairo",
          country: "EG",
          rule_preview: "preview",
        },
      },
      error: null,
    });

    renderWithQuery(<IntentChat onComplete={onComplete} />);

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith(
        "intent-agent",
        expect.objectContaining({
          body: expect.objectContaining({ messages: [{ role: "user", content: "__start__" }] }),
        }),
      );
      expect(onComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 123,
          allowed_uses: 4,
          require_proof: true,
          allowed_mcc_codes: ["8011"],
          first_use_at: "2026-05-10T00:00:00.000Z",
          last_use_at: "2026-06-10T00:00:00.000Z",
        }),
      );
    }, { timeout: 3000 });
  });

  it("live extractor calls intent-extract and emits extraction result", async () => {
    const onChange = vi.fn();
    invokeMock.mockResolvedValue({
      data: {
        ready: true,
        extracted: [],
        missing_required: [],
        missing_optional: [],
        intent: {
          amount: 80,
          useTimes: 2,
          description: "Transport",
          requiredInvoiceProve: false,
          mccList: ["4121"],
          firstDateToUser: null,
          expiryDate: null,
          city: null,
          country: null,
        },
      },
      error: null,
    });

    renderWithQuery(<LiveIntentExtractor onChange={onChange} />);

    fireEvent.change(
      screen.getByPlaceholderText(/e\.g\./i),
      { target: { value: "80 for rides this week" } },
    );

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith(
        "intent-extract",
        expect.objectContaining({
          body: { text: "80 for rides this week" },
        }),
      );
    }, { timeout: 3000 });
    expect(onChange).toHaveBeenCalledWith(
      "80 for rides this week",
      expect.objectContaining({ ready: true }),
    );
  });
});
