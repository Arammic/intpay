import type { ApiResult } from "./client";
import { getProfile, initialsFromName } from "./profileApi";

export interface ScannedUserData {
  id: string;
  name: string;
  email: string;
  handle: string;
  username: string;
  initials: string;
  avatarColor: "purple" | "green" | "orange" | "neutral";
  trustScore: number;
  points: number;
  activityCount: number;
}

/**
 * Resolve a scanned QR id to a real user profile via the backend.
 * Accepts numeric user ids (preferred) or @username (best-effort).
 */
export async function getUserById(id: string): Promise<ApiResult<ScannedUserData>> {
  const numeric = id.replace(/^@/, "");
  if (!/^\d+$/.test(numeric)) {
    return {
      data: null,
      isSucess: false,
      error: [`QR contains "${id}" which isn't a valid user id`],
    };
  }
  const res = await getProfile(numeric);
  if (!res.isSucess || !res.data) {
    return { data: null, isSucess: false, error: res.error.length ? res.error : [`No user found for id "${id}"`] };
  }
  const u = res.data;
  const trustScore = Math.min(100, Math.max(0, u.points ?? 0));
  return {
    data: {
      id: String(u.id),
      name: u.name,
      email: u.email,
      handle: u.username ? `@${u.username}` : `#${u.id}`,
      username: u.username,
      initials: initialsFromName(u.name),
      avatarColor: "purple",
      trustScore,
      points: u.points ?? 0,
      activityCount: u.contacts?.length ?? 0,
    },
    isSucess: true,
    error: [],
  };
}

/** Encode/decode helpers for the IntPay QR payload. */
export const QR_PREFIX = "intpay:user:";

export function encodeUserQr(userId: string | number): string {
  return `${QR_PREFIX}${userId}`;
}

/** Returns user id from any supported QR payload, or null. */
export function decodeUserQr(raw: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed.startsWith(QR_PREFIX)) return trimmed.slice(QR_PREFIX.length);
  // Accept full share URL like https://intentpay.app/u/5 or /profile/5
  const urlMatch = trimmed.match(/\/(?:u|app\/user|profile)\/(\d+|@?[\w.-]+)/i);
  if (urlMatch) return urlMatch[1];
  // Plain numeric id or @handle
  if (/^@?[\w.-]{1,40}$/.test(trimmed)) return trimmed;
  return null;
}
