import type { Household, Pence, Shares } from "@/domain/types";

export function incomeFor(h: Household, userId: string): Pence {
  let total = 0;
  for (const s of h.incomeSources) if (s.userId === userId) total += s.monthlyPence;
  return total;
}

/** Section 5.1. share1 is user1's (Ade's) share of joint costs. */
export function computeShares(h: Household): Shares {
  const method = h.settings.splitMethod;
  let share1 = 0.5;
  if (method === "proportional") {
    const i1 = incomeFor(h, h.users[0].id);
    const i2 = incomeFor(h, h.users[1].id);
    share1 = i1 + i2 === 0 ? 0.5 : i1 / (i1 + i2);
  } else if (method === "custom") {
    share1 = Math.min(1, Math.max(0, h.settings.customShareUser1));
  }
  return { method, share1, share2: 1 - share1 };
}

export function shareFor(shares: Shares, h: Household, userId: string): number {
  return userId === h.users[0].id ? shares.share1 : shares.share2;
}
