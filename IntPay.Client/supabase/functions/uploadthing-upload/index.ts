// Receives a base64 image from the client, uploads it to UploadThing using
// their server SDK, and returns the resulting public URL.
//
// Request: { fileName: string, contentType: string, dataBase64: string }
// Response: { url: string } | { error: string }

import { UTApi } from "npm:uploadthing@7.4.4/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function b64ToUint8Array(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const token = Deno.env.get("UPLOADTHING_TOKEN");
    if (!token) {
      return new Response(
        JSON.stringify({ error: "UPLOADTHING_TOKEN is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json().catch(() => null) as
      | { fileName?: string; contentType?: string; dataBase64?: string }
      | null;

    if (!body?.dataBase64) {
      return new Response(JSON.stringify({ error: "dataBase64 is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fileName = body.fileName || `proof-${Date.now()}.png`;
    const contentType = body.contentType || "image/png";

    const bytes = b64ToUint8Array(body.dataBase64);
    const file = new File([bytes], fileName, { type: contentType });

    const utapi = new UTApi({ token });
    const result = await utapi.uploadFiles(file);

    if (result.error) {
      console.error("UploadThing error:", result.error);
      return new Response(
        JSON.stringify({ error: result.error.message || "Upload failed" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const url = result.data?.ufsUrl || result.data?.url;
    if (!url) {
      return new Response(JSON.stringify({ error: "No URL returned by UploadThing" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("uploadthing-upload error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
