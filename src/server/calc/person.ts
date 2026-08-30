import { isSameMonth, monthOf } from "@/domain/dates";
import type {
  BillsSummary,
  CategoryType,
  Clock,
  ContributionRow,
  DebtsSummary,
  GoalsSummary,
  Household,
  InvestmentsSummary,
  PersonSnapshot,
  Shares,
} from "@/domain/types";
import { totalVariableBudget } from "./budgets";
import { isUser, transactionType } from "./classify";
import { incomeFor, shareFor } from "./shares";

export interface PersonInputs {
  shares: Shares;
  bills: BillsSummary;
  goals: GoalsSummary;
  debts: DebtsSummary;
  investments: InvestmentsSummary;
  types: Map<string, CategoryType>;
}

/** Section 5.6, the leftover waterfall for one person. */
export function computePerson(h: Household, userId: string, clock: Clock, inp: PersonInputs): PersonSnapshot {
  const share = shareFor(inp.shares, h, userId);
  const incomePence = incomeFor(h, userId);
  const personalBillsPence = inp.bills.personalBillsPence[userId] ?? 0;
  const shareOfJointBillsPence = share * inp.bills.totalJointBillsPence;
  const shareOfVariableBudgetPence = share * totalVariableBudget(h);
  const shareOfJointPence = shareOfJointBillsPence + shareOfVariableBudgetPence;
  const pledgesPence = inp.goals.pledgesByUser[userId] ?? 0;
  const debtPaymentsPence = inp.debts.paymentsByUser[userId] ?? 0;

  let investPence = 0;
  for (const a of h.investmentAccounts) {
    if (a.archived) continue;
    if (a.owner.kind === "joint") investPence += share * a.monthlyContributionPence;
    else if (a.owner.userId === userId) investPence += a.monthlyContributionPence;
  }

  const leftoverPence =
    incomePence - personalBillsPence - shareOfJointPence - pledgesPence - debtPaymentsPence - investPence;

  const month = monthOf(clock.today);
  let spentMtdPence = 0;
  for (const t of h.transactions) {
    if (!isSameMonth(t.date, month) || t.isShared || !isUser(t.paidBy, userId)) continue;
    if (transactionType(t, inp.types) === "variable") spentMtdPence += t.amountPence;
  }

  const contributions: ContributionRow[] = inp.goals.goals.map((g) => ({
    goalId: g.goal.id,
    goalName: g.goal.name,
    monthlyPence: g.goal.pledges.find((p) => p.userId === userId)?.monthlyPence ?? 0,
  }));

  return {
    userId,
    share,
    incomePence,
    personalBillsPence,
    shareOfJointBillsPence,
    shareOfVariableBudgetPence,
    shareOfJointPence,
    pledgesPence,
    debtPaymentsPence,
    investPence,
    leftoverPence,
    spentMtdPence,
    leftOfLeftoverPence: leftoverPence - spentMtdPence,
    contributions,
  };
}
