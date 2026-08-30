import type { CategoryType, Household, SettleUp, Shares } from "@/domain/types";
import { transactionType } from "./classify";

/**
 * Section 5.3. Positive net = user2 owes user1. Joint-paid rows are already
 * fair; transfers are never shared costs. Settlements net the balance off.
 */
export function computeSettleUp(h: Household, shares: Shares, types: Map<string, CategoryType>): SettleUp {
  const [user1, user2] = h.users;
  let paid1 = 0;
  let fair1 = 0;
  for (const t of h.transactions) {
    if (!t.isShared || t.paidBy.kind !== "user") continue;
    if (transactionType(t, types) === "transfer") continue;
    fair1 += t.amountPence * (t.shareOverride ?? shares.share1);
    if (t.paidBy.userId === user1.id) paid1 += t.amountPence;
  }
  let net = paid1 - fair1;
  for (const s of h.settlements) {
    if (s.fromUserId === user2.id && s.toUserId === user1.id) net -= s.amountPence;
    else if (s.fromUserId === user1.id && s.toUserId === user2.id) net += s.amountPence;
  }
  const netPence = Math.round(net);
  const direction = Math.abs(netPence) < 1 ? "square" : netPence > 0 ? "user2_owes_user1" : "user1_owes_user2";
  const history = [...h.settlements].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return { netPence, direction, history };
}
