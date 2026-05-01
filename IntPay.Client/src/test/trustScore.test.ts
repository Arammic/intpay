import { describe, it, expect } from "vitest";
import { trustScorePercent } from "@/lib/trustScore";
import { searchUsers } from "@/lib/userDirectory";
import type { User } from "@/lib/types";

const u = (
  over: Partial<User> & { id: string; name: string; username: string },
): User => ({
  id: over.id,
  name: over.name,
  username: over.username,
  email: "x@test.com",
  avatarColor: "neutral",
  initials: "T",
  balance: 0,
  points: over.points ?? 0,
  activityCount: over.activityCount ?? 0,
  correctPayCount: 0,
  savedContactIds: [],
  paymentMethods: [],
  ...over,
});

describe("trustScorePercent", () => {
  it("is within 0..100", () => {
    expect(trustScorePercent(0, 0)).toBeGreaterThanOrEqual(0);
    expect(trustScorePercent(10000, 10000)).toBeLessThanOrEqual(100);
  });
  it("increases with points and activities", () => {
    const a = trustScorePercent(100, 5);
    const b = trustScorePercent(200, 10);
    expect(b).toBeGreaterThanOrEqual(a);
  });
});

describe("searchUsers", () => {
  const users: User[] = [
    u({
      id: "1",
      name: "Alex Test",
      username: "@alex",
      phoneDisplay: "+1 (555) 111-2222",
    }),
    u({ id: "2", name: "Other", username: "@other" }),
  ];
  it("finds by handle", () => {
    expect(searchUsers("ale", users).map((x) => x.id)).toContain("1");
  });
  it("finds by phone digits", () => {
    expect(searchUsers("1112222", users).map((x) => x.id)).toContain("1");
  });
});
