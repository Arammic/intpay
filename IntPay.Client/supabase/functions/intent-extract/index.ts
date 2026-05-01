// Live Intent Extractor — runs on every debounced keystroke.
// Returns structured intent + a 3-bucket checklist (extracted / missing-required / missing-optional).
// Uses Lovable AI Gateway with tool-calling for guaranteed JSON output.
//
// Output intent shape (matches backend payload):
// {
//   firstDateToUser: ISO|null,  // optional
//   amount: number,             // required
//   useTimes: int,              // required
//   expiryDate: ISO|null,       // optional
//   country: string|null,       // optional
//   city: string|null,          // optional
//   requiredInvoiceProve: bool, // required
//   description: string,        // required (AI-generated)
//   mccList: string[]           // required, non-empty, codes from supported list
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

const SYSTEM_PROMPT = `You are IntentExtractor — a real-time AI inside the IntPay Digital Guard app.
The user is typing a free-form description of their spending intent. After every pause you receive the LATEST text and re-extract.
Your job: extract a structured spending intent AND build a checklist of what is captured vs still missing.

INTENT SHAPE (target — matches backend payload field names exactly):
- amount (number, USD) — REQUIRED
- description (1 short polished sentence summarising the intent) — REQUIRED (you generate it)
- mccList (NON-EMPTY array of >=1 MCC code, infer from purpose, ONLY codes in supported list) — REQUIRED. Never leave empty. If purpose is unclear, list it in missing_required and DO NOT mark ready.
- useTimes (integer >= 1, how many tap-to-pays allowed) — OPTIONAL. If the user did NOT mention it, or says unlimited/no limit, send null (do NOT invent a default like 1). The backend treats null as unlimited/unspecified.
- requiredInvoiceProve (boolean — must spender upload an invoice/proof after each pay?) — OPTIONAL. If the user did NOT mention it, send null (do NOT default to false). The backend treats null as not required.
- firstDateToUser (ISO datetime, the card cannot be opened/used before this time; null = any time) — OPTIONAL
- expiryDate (ISO datetime, latest allowed use / expiry; null = any time) — OPTIONAL
- country (string; null = anywhere) — OPTIONAL
- city (string; null = anywhere) — OPTIONAL

SUPPORTED MCC CODES (use ONLY these):
${SUPPORTED_MCC.map((m) => `${m.code} — ${m.name} (${m.group})`).join("\n")}

INSTRUCTIONS:
1. Re-read the LATEST text fully every call. The text may have changed since last call — never reference prior turns.
2. Extract whatever is unambiguously stated or strongly implied. Don't hallucinate amounts/dates.
3. Always generate a polished one-sentence "description" from whatever the user wrote, even if minimal.
4. Always infer mccList from the purpose if you can guess the category — pick 1-5 codes.
5. For each captured field, write a short human-readable confirmation (e.g. "Amount: $120", "Allowed at: groceries, pharmacies").
6. For each REQUIRED field NOT yet captured (only: amount, description, mccList), list it in missing_required with a friendly hint.
7. For each OPTIONAL field NOT yet captured (useTimes, requiredInvoiceProve, firstDateToUser, expiryDate, country, city), list it in missing_optional with a friendly hint. These are SUGGESTIONS — never block readiness on them.
8. "ready" is TRUE when ALL of these are present: amount, description, mccList (non-empty). Optional fields (including useTimes and requiredInvoiceProve) do NOT affect readiness.
9. When mccList is empty, ALWAYS add it to missing_required with hint "Which merchant categories should be allowed? (e.g. groceries, restaurants, gas)".
10. Call the tool "extract_intent" exactly once per call. Never reply with text outside the tool call.`;

const TOOL = {
  type: "function",
  function: {
    name: "extract_intent",
    description: "Return the structured intent extracted so far plus a 3-bucket checklist.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        intent: {
          type: "object",
          additionalProperties: false,
          properties: {
            amount: { type: ["number", "null"] },
            useTimes: { type: ["integer", "null"] },
            description: { type: ["string", "null"] },
            requiredInvoiceProve: { type: ["boolean", "null"] },
            mccList: { type: "array", items: { type: "string", enum: ALLOWED_MCC_CODES } },
            firstDateToUser: { type: ["string", "null"] },
            expiryDate: { type: ["string", "null"] },
            country: { type: ["string", "null"] },
            city: { type: ["string", "null"] },
          },
          required: [
            "amount", "useTimes", "description", "requiredInvoiceProve",
            "mccList", "firstDateToUser", "expiryDate", "country", "city",
          ],
        },
        extracted: {
          type: "array",
          description: "Captured fields with human-readable confirmation strings.",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              field: { type: "string" },
              label: { type: "string", description: "User-friendly label, e.g. 'Amount'" },
              value: { type: "string", description: "Human-readable confirmation, e.g. '$120 USD'" },
              source: { type: "string", description: "Brief reason / quoted phrase showing where it was inferred." },
            },
            required: ["field", "label", "value", "source"],
          },
        },
        missing_required: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              field: { type: "string" },
              label: { type: "string" },
              hint: { type: "string", description: "Friendly nudge for what to add." },
            },
            required: ["field", "label", "hint"],
          },
        },
        missing_optional: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              field: { type: "string" },
              label: { type: "string" },
              hint: { type: "string" },
            },
            required: ["field", "label", "hint"],
          },
        },
        ready: {
          type: "boolean",
          description: "True iff every REQUIRED field is captured.",
        },
      },
      required: ["intent", "extracted", "missing_required", "missing_optional", "ready"],
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { text } = await req.json();
    const trimmed = (text ?? "").toString().trim();
    if (!trimmed) {
      return new Response(
        JSON.stringify({
          intent: {},
          extracted: [],
          missing_required: [
            { field: "amount", label: "Amount", hint: "How much money should be locked?" },
            { field: "description", label: "Purpose", hint: "What is this money for?" },
            { field: "mccList", label: "Allowed merchants", hint: "Which categories (e.g. groceries, gas, restaurants)?" },
          ],
          missing_optional: [
            { field: "useTimes", label: "Allowed uses", hint: "How many tap-to-pays before expiry? (optional — leave blank for unlimited)" },
            { field: "requiredInvoiceProve", label: "Invoice proof", hint: "Should the spender upload an invoice after each pay? (optional — leave blank for not required)" },
          ],
          ready: false,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const userTurn = `LATEST INTENT TEXT (this is the FULL current draft, re-read it from scratch):\n"""\n${trimmed}\n"""`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userTurn },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "extract_intent" } },
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI gateway error", resp.status, t);
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit reached. Please wait a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI gateway error", detail: t }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ error: "Model returned no structured output" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed: unknown;
    try { parsed = JSON.parse(toolCall.function.arguments); }
    catch (e) {
      console.error("parse error", e);
      return new Response(JSON.stringify({ error: "Could not parse extracted intent" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("intent-extract error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
