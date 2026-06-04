import type { ExpenseRow, IncomeRow } from "@/lib/platform-clients";

export const FINANCE_EXPENSE_CATEGORIES = [
  "Feed",
  "Fingerlings",
  "Medicine",
  "Labor",
  "Fuel",
  "Equipment",
  "Maintenance",
  "Utilities",
  "Transport",
  "Compliance",
  "Other",
] as const;

export type DateRange = {
  startDate: string;
  endDate: string;
};

export type ExpenseCategorySummary = {
  category: string;
  amount: number;
  share: number;
};

export function currentMonthRange(today = new Date()): DateRange {
  const year = today.getFullYear();
  const month = today.getMonth();
  return {
    startDate: new Date(year, month, 1).toISOString().slice(0, 10),
    endDate: new Date(year, month + 1, 0).toISOString().slice(0, 10),
  };
}

export function isWithinDateRange(date: string, range: DateRange): boolean {
  if (range.startDate && date < range.startDate) return false;
  if (range.endDate && date > range.endDate) return false;
  return true;
}

export function filterIncomeByDate(rows: IncomeRow[], range: DateRange): IncomeRow[] {
  return rows.filter((row) => isWithinDateRange(row.date, range));
}

export function filterExpensesByDate(rows: ExpenseRow[], range: DateRange): ExpenseRow[] {
  return rows.filter((row) => isWithinDateRange(row.date, range));
}

export function incomeAmount(row: IncomeRow): number {
  const total = Number(row.total);
  if (Number.isFinite(total) && total > 0) return total;
  return Number(row.quantity_kg) * Number(row.price_per_kg);
}

export function expenseAmount(row: ExpenseRow): number {
  const amount = Number(row.amount);
  return Number.isFinite(amount) ? amount : 0;
}

export function sumIncome(rows: IncomeRow[]): number {
  return rows.reduce((sum, row) => sum + incomeAmount(row), 0);
}

export function sumExpenses(rows: ExpenseRow[]): number {
  return rows.reduce((sum, row) => sum + expenseAmount(row), 0);
}

export function summarizeExpensesByCategory(rows: ExpenseRow[]): ExpenseCategorySummary[] {
  const totals = new Map<string, number>();
  rows.forEach((row) => {
    const category = row.category?.trim() || "Uncategorized";
    totals.set(category, (totals.get(category) ?? 0) + expenseAmount(row));
  });

  const grandTotal = Array.from(totals.values()).reduce((sum, amount) => sum + amount, 0);
  return Array.from(totals.entries())
    .map(([category, amount]) => ({
      category,
      amount,
      share: grandTotal > 0 ? amount / grandTotal : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

export function buildDailySeries(
  incomeRows: IncomeRow[],
  expenseRows: ExpenseRow[],
): Array<{ date: string; income: number; expenses: number; profit: number }> {
  const buckets = new Map<
    string,
    { date: string; income: number; expenses: number; profit: number }
  >();

  function getBucket(date: string) {
    const key = date || "Unscheduled";
    if (!buckets.has(key)) {
      buckets.set(key, { date: key, income: 0, expenses: 0, profit: 0 });
    }
    return buckets.get(key)!;
  }

  incomeRows.forEach((row) => {
    const bucket = getBucket(row.date);
    bucket.income += incomeAmount(row);
  });

  expenseRows.forEach((row) => {
    const bucket = getBucket(row.date);
    bucket.expenses += expenseAmount(row);
  });

  return Array.from(buckets.values())
    .map((bucket) => ({ ...bucket, profit: bucket.income - bucket.expenses }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function formatCurrency(amount: number): string {
  return `KSh ${Math.round(amount).toLocaleString()}`;
}

export function profitMargin(totalIncome: number, netProfit: number): number {
  return totalIncome > 0 ? netProfit / totalIncome : 0;
}
