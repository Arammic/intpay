import { apiGet, apiPost, type ApiResult } from "./client";

export interface ProfileContact {
  id: number;
  name: string;
  email: string;
  username: string;
  link: string;
}

export interface ProfileDto {
  id: number;
  name: string;
  username: string;
  email: string;
  vaultBalance: number;
  lockMoney: number;
  link: string;
  contacts: ProfileContact[];
  points: number;
}

export function getProfile(userId: number | string): Promise<ApiResult<ProfileDto>> {
  return apiGet<ProfileDto>(`/profiles/${userId}`);
}

/** GET /profiles/search?name=... — returns lightweight ProfileContact[]. */
export function searchProfiles(name: string): Promise<ApiResult<ProfileContact[]>> {
  const q = encodeURIComponent(name);
  return apiGet<ProfileContact[]>(`/profiles/search?name=${q}`);
}

/** POST /profiles/{userId}/add-funds — charges and returns updated profile snapshot. */
export interface AddFundsResponse {
  id: number;
  name: string;
  username: string;
  email: string;
  vaultBalance: number;
  lockMoney: number;
}

export function addFunds(
  userId: number | string,
  amount: number,
): Promise<ApiResult<AddFundsResponse>> {
  return apiPost<AddFundsResponse, { amount: number }>(
    `/profiles/${userId}/add-funds`,
    { amount },
  );
}

/** Build initials like "MK" from a full name. */
export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}
