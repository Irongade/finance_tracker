import { addMonths, monthOf } from "@/domain/dates";
import type { Clock, DebtsSummary, DebtView, Household, Pence } from "@/domain/types";

/** Section 5.10. Returns null when the payment can never clear the balance. */
export function monthsToClear(balancePence: Pence, apr: number, paymentPence: Pence): number | null {
  if (balancePence <= 0) return 0;
  if (paymentPence <= 0) return null;
  const rate = apr / 12;
  if (rate === 0) return Math.ceil(balancePence / paymentPence);
  if (paymentPence <= balancePence * rate) return null;
  return Math.ceil(-Math.log(1 - (balancePence * rate) / paymentPence) / Math.log(1 + rate));
}

export function computeDebts(h: Household, clock: Clock): DebtsSummary {
  const paymentsByUser: Record<string, Pence> = {};
  for (const u of h.users) paymentsByUser[u.id] = 0;
  const byApr = [...h.debts].sort((a, b) => b.apr - a.apr || b.balancePence - a.balancePence);
  const byBalance = [...h.debts].sort((a, b) => a.balancePence - b.balancePence || b.apr - a.apr);
  const avalanche = new Map(byApr.map((d, i) => [d.id, i + 1]));
  const snowball = new Map(byBalance.map((d, i) => [d.id, i + 1]));
  const thisMonth = monthOf(clock.today);

  let totalBalancePence = 0;
  let totalPaymentPence = 0;
  const debts: DebtView[] = h.debts.map((debt) => {
    const paymentPence = debt.minPaymentPence + debt.extraPaymentPence;
    const months = monthsToClear(debt.balancePence, debt.apr, paymentPence);
    totalBalancePence += debt.balancePence;
    totalPaymentPence += paymentPence;
    paymentsByUser[debt.ownerUserId] = (paymentsByUser[debt.ownerUserId] ?? 0) + paymentPence;
    return {
      debt,
      paymentPence,
      monthsToClear: months,
      payoffDate: months === null ? null : addMonths(thisMonth, months),
      avalancheRank: avalanche.get(debt.id) ?? 0,
      snowballRank: snowball.get(debt.id) ?? 0,
    };
  });

  return { debts, totalBalancePence, totalPaymentPence, paymentsByUser };
}
