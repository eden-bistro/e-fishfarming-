import { listExpenses, listIncome, type ExpenseRow, type IncomeRow } from "@/lib/platform-clients";
import {
  type DateRange,
  filterExpensesByDate,
  filterIncomeByDate,
  incomeAmount,
  expenseAmount,
  summarizeExpensesByCategory,
  type ExpenseCategorySummary,
} from "@/services/modules/finance-analytics.service";

export type LedgerEntryType = "income" | "expense";

export type LedgerEntry = {
  reference: string;
  date: string;
  type: LedgerEntryType;
  account: string;
  description: string;
  debit: number;
  credit: number;
  amount: number;
  sourceId: number | null;
};

export type FinancialStatement = {
  entries: LedgerEntry[];
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  expenseBreakdown: ExpenseCategorySummary[];
  range?: DateRange;
};

function incomeToLedger(row: IncomeRow): LedgerEntry {
  const amount = incomeAmount(row);
  return {
    reference: `INC-${row.id ?? "NA"}-${row.date}`,
    date: row.date,
    type: "income",
    account: "Revenue - Fish Sales",
    description: `Sale to ${row.buyer}`,
    debit: 0,
    credit: amount,
    amount,
    sourceId: row.id ?? null,
  };
}

function expenseToLedger(row: ExpenseRow): LedgerEntry {
  const amount = expenseAmount(row);
  return {
    reference: `EXP-${row.id ?? "NA"}-${row.date}`,
    date: row.date,
    type: "expense",
    account: `Expense - ${row.category}`,
    description: row.description,
    debit: amount,
    credit: 0,
    amount,
    sourceId: row.id ?? null,
  };
}

export async function buildFinancialStatement(range?: DateRange): Promise<FinancialStatement> {
  const [allIncomeRows, allExpenseRows] = await Promise.all([listIncome(), listExpenses()]);
  const incomeRows = range ? filterIncomeByDate(allIncomeRows, range) : allIncomeRows;
  const expenseRows = range ? filterExpensesByDate(allExpenseRows, range) : allExpenseRows;

  const incomeEntries = incomeRows.map(incomeToLedger);
  const expenseEntries = expenseRows.map(expenseToLedger);

  const entries = [...incomeEntries, ...expenseEntries].sort((a, b) =>
    a.date === b.date ? a.reference.localeCompare(b.reference) : b.date.localeCompare(a.date),
  );

  const totalIncome = incomeEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const totalExpense = expenseEntries.reduce((sum, entry) => sum + entry.amount, 0);

  return {
    entries,
    totalIncome,
    totalExpense,
    netProfit: totalIncome - totalExpense,
    expenseBreakdown: summarizeExpensesByCategory(expenseRows),
    range,
  };
}

export function exportLedgerCsv(entries: LedgerEntry[]): string {
  const header = [
    "Reference",
    "Date",
    "Type",
    "Account",
    "Description",
    "Debit",
    "Credit",
    "Amount",
  ];

  const rows = entries.map((entry) => [
    entry.reference,
    entry.date,
    entry.type,
    entry.account,
    entry.description.replaceAll('"', '""'),
    entry.debit.toFixed(2),
    entry.credit.toFixed(2),
    entry.amount.toFixed(2),
  ]);

  const csvLines = [header, ...rows].map((cols) => cols.map((value) => `"${value}"`).join(","));
  return `${csvLines.join("\n")}\n`;
}
