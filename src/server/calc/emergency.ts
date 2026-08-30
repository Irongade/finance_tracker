import type { BillsSummary, EmergencyCover, GoalsSummary } from "@/domain/types";
import { totalPersonalBills } from "./bills";

/** Section 5.13. Months of all bills covered by the emergency fund. */
export function computeEmergencyCover(goals: GoalsSummary, bills: BillsSummary): EmergencyCover {
  const fund = goals.goals.find((g) => g.goal.isEmergencyFund) ?? null;
  const monthlyBillsPence = bills.totalJointBillsPence + totalPersonalBills(bills);
  const savedPence = fund?.savedPence ?? 0;
  return {
    goalId: fund?.goal.id ?? null,
    savedPence,
    monthlyBillsPence,
    months: fund && monthlyBillsPence > 0 ? savedPence / monthlyBillsPence : null,
  };
}
