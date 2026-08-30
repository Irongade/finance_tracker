import { isSameMonth, monthOf } from "@/domain/dates";
import type { Actuals, BillsSummary, CategoryType, Clock, DebtsSummary, Household } from "@/domain/types";
import { totalPersonalBills } from "./bills";
import { totalVariableBudget } from "./budgets";
import { isSpending, transactionType } from "./classify";

/** Section 5.8, for the calendar month containing clock.today. */
export function computeActuals(
  h: Household,
  clock: Clock,
  types: Map<string, CategoryType>,
  bills: BillsSummary,
  debts: DebtsSummary,
): Actuals {
  const month = monthOf(clock.today);
  let spentPence = 0;
  let transfersPence = 0;
  for (const t of h.transactions) {
    if (!isSameMonth(t.date, month)) continue;
    const type = transactionType(t, types);
    if (isSpending(type)) spentPence += t.amountPence;
    else transfersPence += t.amountPence;
  }
  const derivedFixed = bills.totalJointBillsPence + totalPersonalBills(bills) + debts.totalPaymentPence;
  const budgetTotalPence = derivedFixed + totalVariableBudget(h);
  return {
    month,
    spentPence,
    transfersPence,
    budgetTotalPence,
    leftInBudgetsPence: budgetTotalPence - spentPence,
    overdueCount: bills.overdueCount,
  };
}
