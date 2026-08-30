import { formatPence } from "./money";
import type { SettleUp, User } from "./types";

/** "P owes Ade £27.50" / "Ade owes P £27.50" / "All square" (section 5.3). */
export function settleUpSentence(settleUp: SettleUp, users: [User, User]): string {
  if (settleUp.direction === "square") return "All square";
  const amount = formatPence(Math.abs(settleUp.netPence));
  return settleUp.direction === "user2_owes_user1"
    ? `${users[1].name} owes ${users[0].name} ${amount}`
    : `${users[0].name} owes ${users[1].name} ${amount}`;
}

/** "0.7 months" with one decimal (section 5.13). */
export function monthsOfCover(months: number | null): string {
  if (months === null) return "—";
  return `${months.toFixed(1)} ${months.toFixed(1) === "1.0" ? "month" : "months"}`;
}

import type { SplitMethod } from "./types";

/** The workbook's dropdown labels. */
export function splitMethodLabel(method: SplitMethod): string {
  return method === "fifty_fifty" ? "50 / 50" : method === "proportional" ? "Proportional to income" : "Custom";
}
