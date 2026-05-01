// IntPay Assist — answers questions grounded in the user's IntPay data
// (cards, wallet, intents) plus general IntPay product knowledge.
// Supports multi-turn follow-up via `messages` history.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PRODUCT_KB = `
IntPay is a smart-card platform where money is locked behind a "spending intent".
Card kinds:
- Guard card: a personal card for yourself that only authorises spend matching your intent (amount cap, use count, allowed MCCs, optional proof, optional time window).
- Send card: an intent-locked card you send to another person (e.g. family). It can only be used per the rules you set.
Key concepts:
- MCC: merchant category code restricting where the card works (e.g. 5411 grocery, 5812 restaurants).
- Proof: optionally require an invoice/receipt photo within a 2-minute window after a charge.
- Trust score & points: rewards correct intent-aligned pays; penalties for off-intent or missed proofs.
- Wallet top-up funds your IntPay balance from a bank/card; cash-out returns it.
- IntPay can be used at any merchant (in-store tap or online checkout) — controls run on the card itself.
`;

interface CardSummary {
  id: string;
  kind: string;
  description?: string;
  amount?: number;
  usedCount?: number;
  cancelAfterUseCount?: number;
  allowedMccCodes?: string[];
  status?: string;
  fromUserId?: string;
  toUserId?: string;
}

interface AssistContext {
  user?: { id?: string; name?: string; points?: number; trustScore?: number };
  cardsGuard?: CardSummary[];
  cardsSent?: CardSummary[];
  cardsReceived?: CardSummary[];
  walletBalance?: number;
}

function renderContext(ctx: AssistContext): string {
  const lines: string[] = [];
  lines.push("=== USER PROFILE ===");
  lines.push(JSON.stringify(ctx.user ?? {}, null, 2));
  lines.push(`Wallet balance: ${ctx.walletBalance ?? 0}`);
  lines.push("");
  lines.push("=== GUARD CARDS (your own intent-locked cards) ===");
  lines.push(JSON.stringify(ctx.cardsGuard ?? [], null, 2));
  lines.push("");
  lines.push("=== SENT CARDS (you sent to others) ===");
  lines.push(JSON.stringify(ctx.cardsSent ?? [], null, 2));
  lines.push("");
  lines.push("=== RECEIVED CARDS (others sent to you) ===");
  lines.push(JSON.stringify(ctx.cardsReceived ?? [], null, 2));
  return lines.join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { messages, context } = await req.json() as {
      messages: { role: "user" | "assistant"; content: string }[];
      context?: AssistContext;
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const system = `You are IntPay Assist — an in-app helper that answers user questions using ONLY:
1) The IntPay product knowledge below.
2) The user's own data snapshot below (their cards, wallet, intents).

Style: concise, helpful, plain language. Use short paragraphs and bullet points when useful. If asked about specific cards, reference them by description and amount. If the answer cannot be derived from the data or product knowledge, say so briefly.

--- PRODUCT KNOWLEDGE ---
${PRODUCT_KB}

--- USER DATA SNAPSHOT ---
${renderContext(context ?? {})}
`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: system }, ...messages],
      }),
    });

    if (resp.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit, try again shortly." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (resp.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds in workspace settings." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!resp.ok) {
      const t = await resp.text();
      console.error("gateway err", resp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const reply = data?.choices?.[0]?.message?.content ?? "";
    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
