// Intent Agent — chats with the user to extract a structured "spending intent"
// for a guarded card. Uses Lovable AI Gateway with tool-calling for structured output.
//
// Output intent shape (matches backend payload field names exactly):
// {
//   firstDateToUser: ISO|null,  // optional
//   amount: number,             // required
//   useTimes: int,              // required
//   expiryDate: ISO|null,       // optional
//   country: string|null,       // optional
//   city: string|null,          // optional
//   requiredInvoiceProve: bool, // required
//   description: string,        // required
//   mccList: string[],          // required, non-empty
//   rule_preview: string        // friendly summary
// }

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPPORTED_MCC = [
  { code: "5411", name: "Grocery Stores", group: "Food & Drink" },
  { code: "5812", name: "Restaurants", group: "Food & Drink" },
  { code: "5814", name: "Fast Food", group: "Food & Drink" },
  { code: "5813", name: "Bars & Nightlife", group: "Food & Drink" },
  { code: "5499", name: "Convenience Stores", group: "Food & Drink" },
  { code: "4121", name: "Taxis & Rideshare", group: "Transport" },
  { code: "4111", name: "Public Transit", group: "Transport" },
  { code: "5541", name: "Gas Stations", group: "Transport" },
  { code: "7523", name: "Parking", group: "Transport" },
  { code: "4511", name: "Airlines", group: "Transport" },
  { code: "7011", name: "Hotels", group: "Transport" },
  { code: "5732", name: "Electronics", group: "Shopping" },
  { code: "5651", name: "Clothing", group: "Shopping" },
  { code: "5912", name: "Pharmacies", group: "Shopping" },
  { code: "5942", name: "Bookstores", group: "Shopping" },
  { code: "5311", name: "Department Stores", group: "Shopping" },
  { code: "5945", name: "Hobby & Toy Stores", group: "Shopping" },
  { code: "8011", name: "Doctors", group: "Health" },
  { code: "8021", name: "Dentists", group: "Health" },
  { code: "7298", name: "Spa & Wellness", group: "Health" },
  { code: "7997", name: "Gyms", group: "Health" },
  { code: "4900", name: "Utilities", group: "Services" },
  { code: "4814", name: "Telecom", group: "Services" },
  { code: "5968", name: "Subscriptions", group: "Services" },
  { code: "8299", name: "Education", group: "Services" },
  { code: "7832", name: "Movie Theaters", group: "Entertainment" },
  { code: "7929", name: "Concerts & Live Events", group: "Entertainment" },
  { code: "7994", name: "Video Games", group: "Entertainment" },
];

const ALLOWED_MCC_CODES = SUPPORTED_MCC.map((m) => m.code);

const SYSTEM_PROMPT = `You are IntentBot — a friendly, concise assistant inside a money-locking app called Digital Guard.
Your one job is to chat with the user (2–6 short turns) until you have extracted a complete spending intent for a guarded virtual card, then say goodbye.

REQUIRED FIELDS you must collect (use these exact field names in the tool call):
- amount (number, in USD)
- description (1 short sentence, the human purpose of the money)
- mccList (REQUIRED non-empty array of MCC codes from the supported list — pick 1–5 categories that match the user's purpose). Never submit with an empty list.

OPTIONAL fields — these are SUGGESTIONS. Ask AT MOST ONCE in a single combined question, and accept "no" / "skip" / "any" / "leave default" gracefully. Never block the conversation on them. If the user does NOT provide them, send null (do NOT invent defaults like 1 or false — the backend handles nulls):
- useTimes (integer >= 1 OR null; how many tap-to-pays before the card expires). IMPORTANT: if not specified (or user says unlimited/no limit), send null.
- requiredInvoiceProve (boolean OR null; must spender upload an invoice/proof after each pay?). Send null if the user didn't say.
- firstDateToUser (ISO datetime, the card cannot be opened before this time; null = any time)
- expiryDate (ISO datetime, latest allowed use; null = any time)
- city (string; null = anywhere)
- country (string; null = anywhere)

SUPPORTED MCC CODES (you may ONLY use codes from this list):
${SUPPORTED_MCC.map((m) => `${m.code} — ${m.name} (${m.group})`).join("\n")}

CONVERSATION RULES:
1. First message of a NEW conversation: greet warmly with "Hi! 👋 Tell me your intent — what would you like to lock money for?". Do NOT ask for amount yet.
2. Then ask follow-ups one at a time (or 2 closely-related items max per message). Be conversational, not a form.
3. INFER MCC codes from the user's purpose — don't ask them to pick codes. Confirm the inferred categories in plain language ("So I'll allow groceries and pharmacies — sound right?").
4. After collecting required fields, ask ONCE whether the user wants extra conditions ("and..." items): allowed uses, invoice proof, time window, location. If user says no/skip/any, accept and move on; set optional fields to null.
5. Once you have ALL required fields (amount, description, mccList), you MUST call the tool "submit_intent" with the structured payload AND include a final user-facing goodbye message in the same turn. The final message must tell the user to press Next to see card details (example: "All set! 🎉 Press Next to see your card details."). For optional fields the user didn't provide, pass null — never invent values. For useTimes specifically: unspecified or unlimited = null.
6. NEVER ask the user for the recipient account — that is handled outside this chat.
7. Keep every reply under 35 words. Use 1 emoji max per message.
8. The "rule_preview" field in your tool call must be a short, friendly bullet-list summary humans can read at a glance (use \\n line breaks, plain text, no markdown headings).`;

const TOOL_DEFINITION = {
  type: "function",
  function: {
    name: "submit_intent",
    description:
      "Call this ONCE you have collected every required field. This finalizes the intent and shows the user a preview card.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        amount: { type: "number", minimum: 0.01, description: "Amount to lock, in USD." },
        useTimes: { type: ["integer", "null"], description: "Number of allowed tap-to-pays before expiry. Send null if the user didn't specify — do NOT default to 1." },
        description: { type: "string", description: "Short human-readable purpose." },
        requiredInvoiceProve: { type: ["boolean", "null"], description: "True if spender must upload an invoice after each pay. Send null if the user didn't specify — do NOT default to false." },
        mccList: {
          type: "array",
          minItems: 1,
          items: { type: "string", enum: ALLOWED_MCC_CODES },
          description: "MCC codes the card may be used at.",
        },
        firstDateToUser: { type: ["string", "null"], description: "ISO 8601 datetime — card cannot be opened before this; null = any time." },
        expiryDate: { type: ["string", "null"], description: "ISO 8601 datetime — latest allowed use; null = any time." },
        city: { type: ["string", "null"] },
        country: { type: ["string", "null"] },
        rule_preview: {
          type: "string",
          description: "Human-friendly multi-line summary of the rules (use \\n for line breaks).",
        },
      },
      required: [
        "amount",
        "useTimes",
        "description",
        "requiredInvoiceProve",
        "mccList",
        "firstDateToUser",
        "expiryDate",
        "city",
        "country",
        "rule_preview",
      ],
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { messages } = await req.json();
    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages must be an array" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
        tools: [TOOL_DEFINITION],
        tool_choice: "auto",
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI gateway error", resp.status, t);
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit reached. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds to your Lovable workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(JSON.stringify({ error: "AI gateway error", detail: t }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const choice = data.choices?.[0];
    const message = choice?.message ?? {};
    const text: string = message.content ?? "";
    let intent: Record<string, unknown> | null = null;

    const toolCall = message.tool_calls?.[0];
    if (toolCall?.function?.name === "submit_intent") {
      try {
        intent = JSON.parse(toolCall.function.arguments || "{}");
      } catch (e) {
        console.error("Failed to parse tool args", e);
      }
    }

    return new Response(
      JSON.stringify({
        reply: text || (intent ? "All set! 🎉 Press Next to see your card details." : ""),
        intent,
        done: !!intent,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("intent-agent error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
