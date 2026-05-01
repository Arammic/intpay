import { apiPost, type ApiResult } from "./client";

export interface VerifyInvoiceRequest {
  intentId: number;
  imageUrl: string;
  actingUserId: number;
  description?: string;
  merchantName?: string;
}

export interface VerifyInvoiceData {
  isMatch: boolean;
  reason: string;
  isLockedByPendingInvoice: boolean;
  isManuallyFrozen: boolean;
  isSpendBlocked: boolean;
  cardLocked: boolean;
  provider: string;
  invoiceCity: string | null;
  invoiceCountry: string | null;
  hasGps: boolean;
  gpsLatitude: number | null;
  gpsLongitude: number | null;
  metadataCity: string | null;
  metadataCountry: string | null;
}

export function verifyInvoice(
  body: VerifyInvoiceRequest,
): Promise<ApiResult<VerifyInvoiceData>> {
  return apiPost<VerifyInvoiceData, VerifyInvoiceRequest>(
    "/verify-invoice",
    body,
  );
}

/**
 * Uploads a single image (data URL) to UploadThing via our edge function and
 * returns the public URL.
 */
export async function uploadProofImage(dataUrl: string): Promise<string> {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) throw new Error("Invalid image data");
  const contentType = match[1];
  const dataBase64 = match[2];
  const ext = contentType.split("/")[1] || "png";
  const fileName = `proof-${Date.now()}.${ext}`;

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID as string;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
  const url = `https://${projectId}.supabase.co/functions/v1/uploadthing-upload`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify({ fileName, contentType, dataBase64 }),
  });

  const json = (await res.json().catch(() => ({}))) as {
    url?: string;
    error?: string;
  };
  if (!res.ok || !json.url) {
    throw new Error(json.error || `Upload failed (${res.status})`);
  }
  return json.url;
}
