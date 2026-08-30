/**
 * Parses the v2 workbook (section 11) into a name-keyed seed. Pure: bytes in,
 * plain data out; the ImportService resolves names to ids and writes rows.
 * Cells are located by their header labels rather than fixed addresses so a
 * row added inside the sheet's borders still imports.
 */
import * as XLSX from "xlsx";
import type { CategoryType, GoalType, ISODate, SplitMethod } from "@/domain/types";

export interface WorkbookData {
  householdName: string;
  memberNames: [string, string];
  settings: {
    splitMethod: SplitMethod;
    customShareUser1: number;
    lisaBonusRate: number;
    lisaAnnualAllowancePence: number;
    mortgageMultiple: number;
  };
  categories: { name: string; type: CategoryType }[];
  incomeSources: { position: 1 | 2; name: string; monthlyPence: number }[];
  bills: {
    name: string;
    category: string;
    monthlyPence: number;
    dueDay: number | null;
    owner: "joint" | 1 | 2;
    notes: string | null;
  }[];
  goals: {
    name: string;
    type: GoalType;
    targetPence: number;
    targetDate: ISODate;
    aer: number;
    pledges: [number, number];
    isEmergencyFund: boolean;
    notes: string | null;
  }[];
  variableBudgets: { category: string; monthlyPence: number }[];
  potSnapshots: { month: ISODate; balances: Record<string, number> }[];
  transactions: {
    date: ISODate;
    description: string;
    category: string;
    amountPence: number;
    paidBy: "joint" | 1 | 2;
    isShared: boolean;
    shareOverride: number | null;
    linkedGoal: string | null;
    notes: string | null;
  }[];
  accounts: { name: string; owner: "joint" | 1 | 2; balancePence: number }[];
  debts: {
    owner: 1 | 2;
    lender: string;
    balancePence: number;
    apr: number;
    minPaymentPence: number;
    extraPaymentPence: number;
  }[];
}

type Cell = string | number | boolean | null;
type Grid = Cell[][];

const EXCEL_EPOCH_UTC = Date.UTC(1899, 11, 30);

export function excelSerialToISO(serial: number): ISODate {
  return new Date(EXCEL_EPOCH_UTC + Math.round(serial) * 86_400_000).toISOString().slice(0, 10);
}

export function toPence(v: Cell): number {
  const n = typeof v === "number" ? v : Number.parseFloat(String(v ?? "").replace(/[£,\s]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

const text = (v: Cell | undefined): string => (v === null || v === undefined ? "" : String(v).trim());
const isBlank = (row: Cell[] | undefined) => !row || row.every((c) => text(c) === "");

function grid(wb: XLSX.WorkBook, name: string): Grid {
  const ws = wb.Sheets[name];
  if (!ws) throw new Error(`Sheet "${name}" not found in workbook`);
  return XLSX.utils.sheet_to_json<Cell[]>(ws, { header: 1, raw: true, defval: null });
}

/** Rows after the first row whose first cell equals `header`, until a blank row (or a TOTAL row when stopAtTotals). */
function tableAfter(g: Grid, header: string, stopAtTotals = true): Cell[][] {
  const start = g.findIndex((r) => text(r[0]).toLowerCase() === header.toLowerCase());
  if (start < 0) return [];
  const out: Cell[][] = [];
  for (let i = start + 1; i < g.length; i++) {
    const row = g[i];
    if (isBlank(row)) break;
    if (stopAtTotals && text(row[0]).toUpperCase().startsWith("TOTAL")) break;
    out.push(row);
  }
  return out;
}

function labelled(g: Grid, label: string): Cell {
  const row = g.find((r) => text(r[0]).toLowerCase().startsWith(label.toLowerCase()));
  return row ? (row[1] ?? null) : null;
}

function splitMethod(label: Cell): SplitMethod {
  const l = text(label).toLowerCase();
  if (l.includes("proportional")) return "proportional";
  if (l.includes("custom")) return "custom";
  return "fifty_fifty";
}

function personRef(v: Cell | undefined, names: [string, string]): "joint" | 1 | 2 {
  const t = text(v).toLowerCase();
  if (t === names[0].toLowerCase()) return 1;
  if (t === names[1].toLowerCase()) return 2;
  return "joint";
}

export function parseWorkbook(buffer: ArrayBuffer | Uint8Array): WorkbookData {
  const wb = XLSX.read(buffer, { type: buffer instanceof Uint8Array ? "buffer" : "array" });

  const settingsGrid = grid(wb, "Settings");
  const memberNames: [string, string] = [
    text(labelled(settingsGrid, "Person 1 name")) || "Person 1",
    text(labelled(settingsGrid, "Person 2 name")) || "Person 2",
  ];
  const settings: WorkbookData["settings"] = {
    splitMethod: splitMethod(labelled(settingsGrid, "Split method")),
    customShareUser1: Number(labelled(settingsGrid, "Custom: Person 1 share")) || 0.5,
    lisaBonusRate: Number(labelled(settingsGrid, "Government bonus rate")) || 0.25,
    lisaAnnualAllowancePence: toPence(labelled(settingsGrid, "Annual allowance per person")) || 400_000,
    mortgageMultiple: Number(labelled(settingsGrid, "Mortgage lending multiple")) || 4.5,
  };
  const categories = tableAfter(settingsGrid, "Category")
    .map((r) => ({ name: text(r[0]), type: text(r[1]).toLowerCase() as CategoryType }))
    .filter((c) => c.name && ["fixed", "variable", "transfer"].includes(c.type));
  if (!categories.some((c) => c.name.toLowerCase() === "investment contribution")) {
    categories.push({ name: "Investment contribution", type: "transfer" });
  }

  const sgb = grid(wb, "Shared Goals & Bills");
  const bills: WorkbookData["bills"] = tableAfter(sgb, "Item").map((r) => ({
    name: text(r[0]),
    category: text(r[1]),
    monthlyPence: toPence(r[2]),
    dueDay: typeof r[3] === "number" && r[3] >= 1 && r[3] <= 31 ? Math.round(r[3]) : null,
    owner: "joint",
    notes: text(r[7]) || null,
  }));
  const goals: WorkbookData["goals"] = tableAfter(sgb, "Goal").map((r) => ({
    name: text(r[0]),
    type: text(r[1]).toLowerCase() === "lisa" ? "lisa" : "standard",
    targetPence: toPence(r[2]),
    targetDate: typeof r[3] === "number" ? excelSerialToISO(r[3]) : text(r[3]).slice(0, 10),
    aer: Number(r[9]) || 0,
    pledges: [toPence(r[5]), toPence(r[6])],
    isEmergencyFund:
      text(r[0]).toLowerCase() === "general savings" || text(r[13]).toLowerCase().includes("emergency fund"),
    notes: text(r[13]) || null,
  }));

  const incomeSources: WorkbookData["incomeSources"] = [];
  for (const position of [1, 2] as const) {
    const g = grid(wb, `${memberNames[position - 1]} Tracker`);
    for (const r of tableAfter(g, "Source"))
      incomeSources.push({ position, name: text(r[0]), monthlyPence: toPence(r[1]) });
    for (const r of tableAfter(g, "Item")) {
      bills.push({
        name: text(r[0]),
        category: text(r[1]),
        monthlyPence: toPence(r[2]),
        dueDay: null,
        owner: position,
        notes: text(r[3]) || null,
      });
    }
  }

  const spending = grid(wb, "Monthly Spending");
  const variableStart = spending.findIndex((r) => text(r[0]).toUpperCase().startsWith("VARIABLE SPENDING"));
  const variableBudgets: WorkbookData["variableBudgets"] = tableAfter(
    spending.slice(Math.max(0, variableStart)),
    "Category",
  ).map((r) => ({
    category: text(r[0]),
    monthlyPence: toPence(r[1]),
  }));

  const balances = grid(wb, "Balances");
  const headerRow = balances.find((r) => text(r[0]).toLowerCase() === "month") ?? [];
  const goalColumns = headerRow
    .map((c, i) => ({ name: text(c), i }))
    .filter((c) => c.i > 0 && c.name && c.name.toLowerCase() !== "total");
  const potSnapshots: WorkbookData["potSnapshots"] = balances
    .filter((r) => typeof r[0] === "number" && goalColumns.some((c) => typeof r[c.i] === "number"))
    .map((r) => ({
      month: `${excelSerialToISO(r[0] as number).slice(0, 7)}-01`,
      balances: Object.fromEntries(
        goalColumns.filter((c) => typeof r[c.i] === "number").map((c) => [c.name, toPence(r[c.i])]),
      ),
    }));

  const log = grid(wb, "Transactions Log");
  const transactions: WorkbookData["transactions"] = tableAfter(log, "Date", false)
    .filter((r) => typeof r[0] === "number" && text(r[1]))
    .map((r) => ({
      date: excelSerialToISO(r[0] as number),
      description: text(r[1]),
      category: text(r[2]),
      amountPence: toPence(r[4]),
      paidBy: personRef(r[5], memberNames),
      isShared: text(r[6]).toLowerCase() === "yes",
      shareOverride: typeof r[7] === "number" ? r[7] : null,
      linkedGoal: text(r[8]) || null,
      notes: text(r[9]) || null,
    }));

  const nw = grid(wb, "Net Worth");
  const accounts: WorkbookData["accounts"] = tableAfter(nw, "Account").map((r) => ({
    name: text(r[0]),
    owner: personRef(r[1], memberNames),
    balancePence: toPence(r[2]),
  }));

  const debtsGrid = grid(wb, "Debts");
  const debts: WorkbookData["debts"] = tableAfter(debtsGrid, "Owner")
    .filter((r) => text(r[1]))
    .map((r) => ({
      owner: personRef(r[0], memberNames) === 2 ? 2 : 1,
      lender: text(r[1]),
      balancePence: toPence(r[2]),
      apr: Number(r[3]) || 0,
      minPaymentPence: toPence(r[4]),
      extraPaymentPence: toPence(r[5]),
    }));

  return {
    householdName: `${memberNames[0]} & ${memberNames[1]}`,
    memberNames,
    settings,
    categories,
    incomeSources,
    bills,
    goals,
    variableBudgets,
    potSnapshots,
    transactions,
    accounts,
    debts,
  };
}
