import { addMonths } from "@/domain/dates";
import type {
  CategoryType,
  DebtsSummary,
  Household,
  ISOMonth,
  Matrix,
  MatrixLens,
  MatrixRow,
  Owner,
  Pence,
} from "@/domain/types";

export const MATRIX_MONTHS = 12;
export const DEBT_REPAYMENT_CATEGORY = "Debt repayment";

function sumRows(rows: MatrixRow[], label: string): MatrixRow {
  const actualsPence = Array.from({ length: MATRIX_MONTHS }, () => 0);
  let budgetPence = 0;
  for (const r of rows) {
    budgetPence += r.budgetPence;
    r.actualsPence.forEach((v, i) => {
      actualsPence[i] += v;
    });
  }
  return { categoryId: label, categoryName: label, budgetPence, actualsPence };
}

function debtBudgetForLens(lens: MatrixLens, debts: DebtsSummary): Pence {
  if (lens === "all") return debts.totalPaymentPence;
  if (lens.kind === "joint") return 0;
  return debts.paymentsByUser[lens.userId] ?? 0;
}

function matchesLens(lens: MatrixLens, owner: Owner): boolean {
  if (lens === "all") return true;
  if (lens.kind === "joint") return owner.kind === "joint";
  return owner.kind === "user" && owner.userId === lens.userId;
}

/**
 * Section 5.9. Fixed budgets are derived from the bills; variable budgets are
 * user-set. A lens narrows both budgets (by owner) and actuals (by who paid).
 */
export function computeMatrix(
  h: Household,
  startMonth: ISOMonth,
  debts: DebtsSummary,
  _types: Map<string, CategoryType>,
  lens: MatrixLens = "all",
): Matrix {
  const months = Array.from({ length: MATRIX_MONTHS }, (_, i) => addMonths(startMonth, i));
  const monthIndex = new Map(months.map((m, i) => [m.slice(0, 7), i]));

  const actuals = new Map<string, Pence[]>();
  for (const t of h.transactions) {
    if (!matchesLens(lens, t.paidBy)) continue;
    const i = monthIndex.get(t.date.slice(0, 7));
    if (i === undefined) continue;
    const row = actuals.get(t.categoryId) ?? Array.from({ length: MATRIX_MONTHS }, () => 0);
    row[i] += t.amountPence;
    actuals.set(t.categoryId, row);
  }

  const billBudget = new Map<string, Pence>();
  for (const b of h.bills) {
    if (b.archived || !matchesLens(lens, b.owner)) continue;
    billBudget.set(b.categoryId, (billBudget.get(b.categoryId) ?? 0) + b.monthlyPence);
  }
  const variableBudget = new Map<string, Pence>();
  for (const v of h.variableBudgets) {
    if (!matchesLens(lens, v.owner)) continue;
    variableBudget.set(v.categoryId, (variableBudget.get(v.categoryId) ?? 0) + v.monthlyPence);
  }

  const categories = [...h.categories].filter((c) => !c.archived).sort((a, b) => a.sort - b.sort);
  const row = (c: (typeof categories)[number], budgetPence: Pence): MatrixRow => ({
    categoryId: c.id,
    categoryName: c.name,
    budgetPence,
    actualsPence: actuals.get(c.id) ?? Array.from({ length: MATRIX_MONTHS }, () => 0),
  });

  const fixed = categories
    .filter((c) => c.type === "fixed")
    .map((c) =>
      row(
        c,
        c.name === DEBT_REPAYMENT_CATEGORY
          ? debtBudgetForLens(lens, debts) + (billBudget.get(c.id) ?? 0)
          : (billBudget.get(c.id) ?? 0),
      ),
    );
  const variable = categories.filter((c) => c.type === "variable").map((c) => row(c, variableBudget.get(c.id) ?? 0));

  const fixedTotals = sumRows(fixed, "TOTAL FIXED");
  const variableTotals = sumRows(variable, "TOTAL VARIABLE");
  const grandTotals = sumRows([fixedTotals, variableTotals], "TOTAL ALL SPENDING");
  return { startMonth, months, fixed, variable, fixedTotals, variableTotals, grandTotals };
}

/** Cell flagged red when actual > budget and actual > 0. */
export function isOverBudget(actualPence: Pence, budgetPence: Pence): boolean {
  return actualPence > 0 && actualPence > budgetPence;
}
