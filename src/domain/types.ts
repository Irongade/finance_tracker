/**
 * Domain types. Section 4 entities plus the section 5 computed shapes.
 * Money is integer pence everywhere it is stored; derived planning figures
 * may carry fractions of a penny until they are rounded for display.
 * "user1" is always users[0] (Ade); user2's share is always 1 - share1.
 */

export type ISODate = string; // "YYYY-MM-DD"
export type ISOMonth = string; // "YYYY-MM-01"
export type Pence = number;

export interface Clock {
  /** Today's date in Europe/London. */
  today: ISODate;
}

// ---------------------------------------------------------------------------
// Entities (section 4)
// ---------------------------------------------------------------------------

export interface User {
  /** household member id (not the auth account id) */
  id: string;
  /** 1 = user1 (Ade), 2 = user2 */
  position: 1 | 2;
  name: string;
  /** null until the member has accepted the invite and signed up */
  email: string | null;
}

export type SplitMethod = "fifty_fifty" | "proportional" | "custom";

export interface Settings {
  splitMethod: SplitMethod;
  /** user1's share when splitMethod = custom, 0..1 */
  customShareUser1: number;
  /** 0.25 */
  lisaBonusRate: number;
  /** 400000 */
  lisaAnnualAllowancePence: Pence;
  /** 4.5 */
  mortgageMultiple: number;
  /** gross annual salaries for the mortgage estimate; 0 = fall back to take-home x 12 */
  grossAnnualIncomeUser1Pence: Pence;
  grossAnnualIncomeUser2Pence: Pence;
}

export type CategoryType = "fixed" | "variable" | "transfer";

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  sort: number;
  archived: boolean;
}

export interface IncomeSource {
  id: string;
  userId: string;
  name: string;
  monthlyPence: Pence;
}

/** Who owns or paid for something: the joint account or one person. */
export type Owner = { kind: "joint" } | { kind: "user"; userId: string };
export type PaidBy = Owner;

export interface Bill {
  id: string;
  name: string;
  categoryId: string;
  monthlyPence: Pence;
  /** 1..31, or null when the due date is not tracked (personal bills in the seed). */
  dueDay: number | null;
  owner: Owner;
  /** manual ordering on the Bills page */
  sort: number;
  notes: string | null;
  archived: boolean;
}

export type GoalType = "lisa" | "standard";

export interface GoalPledge {
  goalId: string;
  userId: string;
  monthlyPence: Pence;
}

export interface Goal {
  id: string;
  name: string;
  type: GoalType;
  targetPence: Pence;
  targetDate: ISODate;
  /** annual interest rate, 0..1 */
  aer: number;
  isEmergencyFund: boolean;
  notes: string | null;
  sort: number;
  archived: boolean;
  pledges: GoalPledge[];
}

export interface Transaction {
  id: string;
  date: ISODate;
  description: string;
  categoryId: string;
  /** negative = refund */
  amountPence: Pence;
  paidBy: PaidBy;
  isShared: boolean;
  /** user1's share of THIS transaction, 0..1; null = use the household split */
  shareOverride: number | null;
  linkedBillId: string | null;
  linkedGoalId: string | null;
  linkedInvestmentId: string | null;
  notes: string | null;
}

export interface Settlement {
  id: string;
  date: ISODate;
  fromUserId: string;
  toUserId: string;
  amountPence: Pence;
  notes: string | null;
}

export interface PotSnapshot {
  id: string;
  goalId: string;
  month: ISOMonth;
  balancePence: Pence;
}

export interface Account {
  id: string;
  name: string;
  owner: Owner;
  balancePence: Pence;
}

export interface NetWorthSnapshot {
  id: string;
  month: ISOMonth;
  valuePence: Pence;
}

export interface Debt {
  id: string;
  ownerUserId: string;
  lender: string;
  balancePence: Pence;
  /** annual rate, 0..1 */
  apr: number;
  minPaymentPence: Pence;
  extraPaymentPence: Pence;
}

export type InvestmentWrapper = "ss_isa" | "pension" | "gia" | "crypto" | "other";

export interface InvestmentAccount {
  id: string;
  name: string;
  provider: string;
  wrapper: InvestmentWrapper;
  owner: Owner;
  monthlyContributionPence: Pence;
  /** expected annual growth, -0.5..0.5 */
  expectedGrowth: number;
  contributedBeforePence: Pence;
  notes: string | null;
  archived: boolean;
}

export interface InvestmentSnapshot {
  id: string;
  accountId: string;
  month: ISOMonth;
  valuePence: Pence;
}

export interface VariableBudget {
  categoryId: string;
  monthlyPence: Pence;
}

/** Everything the calc engine needs, for one household. */
export interface Household {
  id: string;
  name: string;
  users: [User, User];
  settings: Settings;
  categories: Category[];
  incomeSources: IncomeSource[];
  bills: Bill[];
  goals: Goal[];
  transactions: Transaction[];
  settlements: Settlement[];
  potSnapshots: PotSnapshot[];
  accounts: Account[];
  netWorthSnapshots: NetWorthSnapshot[];
  debts: Debt[];
  investmentAccounts: InvestmentAccount[];
  investmentSnapshots: InvestmentSnapshot[];
  variableBudgets: VariableBudget[];
}

// ---------------------------------------------------------------------------
// Computed shapes (section 5)
// ---------------------------------------------------------------------------

export interface Shares {
  method: SplitMethod;
  share1: number;
  share2: number;
}

export type SettleDirection = "user2_owes_user1" | "user1_owes_user2" | "square";

export interface SettleUp {
  /** positive = user2 owes user1 */
  netPence: Pence;
  direction: SettleDirection;
  history: Settlement[];
}

export type BillStatus = "paid" | "due" | "overdue" | "untracked";

export interface BillView {
  bill: Bill;
  categoryName: string;
  dueDate: ISODate | null;
  status: BillStatus;
  paidByTransactionId: string | null;
}

export interface BillsSummary {
  bills: BillView[];
  totalJointBillsPence: Pence;
  personalBillsPence: Record<string, Pence>; // by userId
  overdueCount: number;
}

export type GoalStatus = { kind: "on_track"; deltaPence: Pence } | { kind: "behind"; deltaPence: Pence };

export interface GoalView {
  goal: Goal;
  savedPence: Pence;
  savedMonth: ISOMonth | null;
  pledgeTotalPence: Pence;
  lisaBonusPence: Pence;
  monthsLeft: number;
  requiredPence: Pence;
  status: GoalStatus;
  /** userIds whose pledge breaches the LISA allowance */
  lisaWarnings: string[];
  /** saved / target, 0..1 (may exceed 1) */
  progress: number;
}

export interface GoalsSummary {
  goals: GoalView[];
  pledgesByUser: Record<string, Pence>;
  totalPledgesPence: Pence;
  totalLisaBonusPence: Pence;
  latestPotsTotalPence: Pence;
}

export interface ContributionRow {
  goalId: string;
  goalName: string;
  monthlyPence: Pence;
}

export interface PersonSnapshot {
  userId: string;
  share: number;
  incomePence: Pence;
  personalBillsPence: Pence;
  shareOfJointBillsPence: Pence;
  shareOfVariableBudgetPence: Pence;
  shareOfJointPence: Pence;
  pledgesPence: Pence;
  debtPaymentsPence: Pence;
  investPence: Pence;
  leftoverPence: Pence;
  spentMtdPence: Pence;
  leftOfLeftoverPence: Pence;
  contributions: ContributionRow[];
}

export interface HouseholdBudget {
  incomePence: Pence;
  fixedPence: Pence;
  variablePence: Pence;
  contributionsPence: Pence;
  debtPence: Pence;
  investingPence: Pence;
  leftoverPence: Pence;
  bonusOnTopPence: Pence;
}

export interface Actuals {
  month: ISOMonth;
  spentPence: Pence;
  transfersPence: Pence;
  budgetTotalPence: Pence;
  leftInBudgetsPence: Pence;
  overdueCount: number;
}

export interface MatrixRow {
  categoryId: string;
  categoryName: string;
  budgetPence: Pence;
  /** one entry per month column */
  actualsPence: Pence[];
}

export interface Matrix {
  startMonth: ISOMonth;
  months: ISOMonth[];
  fixed: MatrixRow[];
  variable: MatrixRow[];
  fixedTotals: MatrixRow;
  variableTotals: MatrixRow;
  grandTotals: MatrixRow;
}

export interface DebtView {
  debt: Debt;
  paymentPence: Pence;
  /** null when the payment cannot clear the balance */
  monthsToClear: number | null;
  payoffDate: ISODate | null;
  avalancheRank: number;
  snowballRank: number;
}

export interface DebtsSummary {
  debts: DebtView[];
  totalBalancePence: Pence;
  totalPaymentPence: Pence;
  paymentsByUser: Record<string, Pence>;
}

export interface ForecastRow {
  /** 0 = now (latest snapshot month), 1..24 */
  index: number;
  month: ISOMonth;
  goals: Record<string, Pence>;
  goalsTotalPence: Pence;
  housePotPence: Pence;
  investments: Record<string, Pence>;
  investmentsTotalPence: Pence;
  combinedTotalPence: Pence;
}

export interface Forecast {
  rows: ForecastRow[];
}

export interface Affordability {
  /** true when the mortgage estimate used gross salaries; false = take-home x 12 fallback */
  usesGrossIncome: boolean;
  pots12Pence: Pence;
  pots24Pence: Pence;
  housePot12Pence: Pence;
  housePot24Pence: Pence;
  mortgagePence: Pence;
  maxPrice24Pence: Pence;
}

export interface EmergencyCover {
  goalId: string | null;
  savedPence: Pence;
  monthlyBillsPence: Pence;
  /** null when there is no emergency goal or no bills */
  months: number | null;
}

export interface NetWorth {
  accountsPence: Pence;
  potsPence: Pence;
  investmentsPence: Pence;
  debtsPence: Pence;
  totalPence: Pence;
}

export interface InvestmentView {
  account: InvestmentAccount;
  valuePence: Pence;
  valueMonth: ISOMonth | null;
  contributedPence: Pence;
  gainPence: Pence;
  /** null when nothing has been contributed */
  gainPct: number | null;
  /** 25 values, index 0 = now */
  projectionPence: Pence[];
}

export interface InvestmentsSummary {
  accounts: InvestmentView[];
  totalValuePence: Pence;
  totalContributedPence: Pence;
  totalGainPence: Pence;
  totalGainPct: number | null;
  totalMonthlyContributionPence: Pence;
}

/** Everything the dashboard shows, computed in one pass. */
export interface HouseholdView {
  clock: Clock;
  shares: Shares;
  settleUp: SettleUp;
  bills: BillsSummary;
  goals: GoalsSummary;
  persons: [PersonSnapshot, PersonSnapshot];
  budget: HouseholdBudget;
  actuals: Actuals;
  debts: DebtsSummary;
  forecast: Forecast;
  affordability: Affordability;
  emergency: EmergencyCover;
  netWorth: NetWorth;
  investments: InvestmentsSummary;
}
