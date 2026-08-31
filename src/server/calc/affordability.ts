import type { Affordability, Forecast, Household } from "@/domain/types";
import { incomeFor } from "./shares";

/** Section 5.12. Rule of thumb, not advice. LISA-bought homes are capped at £450,000. */
export const LISA_PROPERTY_CAP_PENCE = 45_000_000;

export function computeAffordability(h: Household, forecast: Forecast): Affordability {
  /**
   * Lenders multiply GROSS annual income; take-home is for the leftover maths.
   * When gross salaries aren't set the workbook's approximation (take-home x 12)
   * stands in, clearly labelled in the UI.
   */
  const grossAnnual = h.settings.grossAnnualIncomeUser1Pence + h.settings.grossAnnualIncomeUser2Pence;
  const annualIncome = grossAnnual > 0 ? grossAnnual : 12 * (incomeFor(h, h.users[0].id) + incomeFor(h, h.users[1].id));
  const mortgagePence = h.settings.mortgageMultiple * annualIncome;
  const at = (n: number) => forecast.rows[n] ?? forecast.rows[forecast.rows.length - 1];
  return {
    usesGrossIncome: grossAnnual > 0,
    pots12Pence: at(12).goalsTotalPence,
    pots24Pence: at(24).goalsTotalPence,
    housePot12Pence: at(12).housePotPence,
    housePot24Pence: at(24).housePotPence,
    mortgagePence,
    maxPrice24Pence: at(24).housePotPence + mortgagePence,
  };
}
