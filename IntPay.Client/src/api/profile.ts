import type { ApiResult } from "./client";

export interface ProfileActivityItem {
  id: string;
  description: string;
  deltaPoints: number;
  ts: number;
}

export interface ProfileSavedContact {
  id: string;
  name: string;
  handle: string;
  initials: string;
  email: string;
  avatarColor: "purple" | "green" | "orange" | "neutral";
  points: number;
  activityCount: number;
}

export interface ProfilePageData {
  trustScore: number;
  points: number;
  activityCount: number;
  shareLink: string;
  shareQrLabel: string;
  activities: ProfileActivityItem[];
  savedContacts: ProfileSavedContact[];
}

export async function getProfilePageData(): Promise<ApiResult<ProfilePageData>> {
  const now = Date.now();

  const mockData: ProfilePageData = {
    trustScore: 82,
    points: 280,
    activityCount: 18,
    shareLink: "https://intentpay.app/u/@reda",
    shareQrLabel: "IntPay@reda",
    activities: [
      { id: "act_1", description: "Proof verified by AI", deltaPoints: 1, ts: now - 1000 * 60 * 15 },
      { id: "act_2", description: "Intent card sent", deltaPoints: 1, ts: now - 1000 * 60 * 50 },
      { id: "act_3", description: "Declined: intent mismatch", deltaPoints: -10, ts: now - 1000 * 60 * 60 * 3 },
      { id: "act_4", description: "Milestone: 5 correct pays", deltaPoints: 50, ts: now - 1000 * 60 * 60 * 20 },
    ],
    savedContacts: [
      { id: "1", name: "Abdalla Ahmed", handle: "@abdalla", initials: "AA", email: "abdalla@intentpay.app", avatarColor: "green", points: 420, activityCount: 31 },
      { id: "3", name: "Mohammed Saif", handle: "@msaif", initials: "MS", email: "msaif@intentpay.app", avatarColor: "purple", points: 210, activityCount: 17 },
      { id: "4", name: "Mery Kassis", handle: "@merykassis", initials: "MK", email: "mery@intentpay.app", avatarColor: "orange", points: 345, activityCount: 24 },
      { id: "5", name: "Arammic Tech", handle: "@arammic", initials: "AT", email: "hello@arammic.tech", avatarColor: "neutral", points: 160, activityCount: 12 },
    ],
  };

  await new Promise((resolve) => setTimeout(resolve, 500));

  return {
    data: mockData,
    isSucess: true,
    error: [],
  };
}
