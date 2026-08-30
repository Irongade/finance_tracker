import type { Affordability, Forecast, Household } from "@/domain/types";
import { incomeFor } from "./shares";

/** Section 5.12. Rule of thumb, not advice. LISA-bought homes are capped at £450,000. */
export const LISA_PROPERTY_CAP_PENCE = 45_000_000;

export function computeAffordability(h: Household, forecast: Forecast): Affordability {
  const income = incomeFor(h, h.users[0].id) + incomeFor(h, h.users[1].id);
  const mortgagePence = h.settings.mortgageMultiple * 12 * income;
  const at = (n: number) => forecast.rows[n] ?? forecast.rows[forecast.rows.length - 1];
  return {
    pots12Pence: at(12).goalsTotalPence,
    pots24Pence: at(24).goalsTotalPence,
    housePot12Pence: at(12).housePotPence,
    housePot24Pence: at(24).housePotPence,
    mortgagePence,
    maxPrice24Pence: at(24).housePotPence + mortgagePence,
  };
}
