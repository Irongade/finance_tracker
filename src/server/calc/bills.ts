import { daysInMonth, isSameMonth, monthOf, parseISODate, toISODate } from "@/domain/dates";
import type { BillStatus, BillsSummary, BillView, Clock, Household, ISODate, Pence } from "@/domain/types";

/** Section 5.4, for the calendar month containing clock.today. */
export function computeBills(h: Household, clock: Clock): BillsSummary {
  const month = monthOf(clock.today);
  const { y, m } = parseISODate(clock.today);
  const dim = daysInMonth(y, m);
  const categoryName = new Map(h.categories.map((c) => [c.id, c.name]));
  const thisMonth = h.transactions.filter((t) => isSameMonth(t.date, month));

  const bills: BillView[] = [];
  const personalBillsPence: Record<string, Pence> = {};
  for (const u of h.users) personalBillsPence[u.id] = 0;
  let totalJointBillsPence = 0;
  let overdueCount = 0;

  for (const bill of h.bills) {
    if (bill.archived) continue;
    if (bill.owner.kind === "joint") totalJointBillsPence += bill.monthlyPence;
    else personalBillsPence[bill.owner.userId] = (personalBillsPence[bill.owner.userId] ?? 0) + bill.monthlyPence;

    const needle = bill.name.toLowerCase();
    const paidBy =
      thisMonth.find((t) => t.linkedBillId === bill.id) ??
      thisMonth.find((t) => t.linkedBillId === null && t.description.toLowerCase().includes(needle));

    let dueDate: ISODate | null = null;
    let status: BillStatus = "untracked";
    if (bill.dueDay !== null) {
      dueDate = toISODate(y, m, Math.min(bill.dueDay, dim));
      status = paidBy ? "paid" : clock.today > dueDate ? "overdue" : "due";
      if (status === "overdue") overdueCount += 1;
    } else if (paidBy) {
      status = "paid";
    }

    bills.push({
      bill,
      categoryName: categoryName.get(bill.categoryId) ?? "",
      dueDate,
      status,
      paidByTransactionId: paidBy?.id ?? null,
    });
  }

  return { bills, totalJointBillsPence, personalBillsPence, overdueCount };
}

export function totalPersonalBills(summary: BillsSummary): Pence {
  let total = 0;
  for (const v of Object.values(summary.personalBillsPence)) total += v;
  return total;
}
