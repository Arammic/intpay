import type { ApiResult } from "./client";

export interface CurrentUserData {
  id: string;
  name: string;
  email: string;
  initials: string;
  balance: number;
}

export async function getCurrentUser(): Promise<ApiResult<CurrentUserData>> {
  const mockData: CurrentUserData = {
    id: "2",
    name: "Reda Easa",
    email: "reda.easa@intentpay.app",
    initials: "RE",
    balance: 2350,
  };

  await new Promise((resolve) => setTimeout(resolve, 300));

  return {
    data: mockData,
    isSucess: true,
    error: [],
  };
}
