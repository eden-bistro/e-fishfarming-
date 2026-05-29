import { listExpenses, listIncome, type ExpenseRow, type IncomeRow } from "@/lib/platform-clients";

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
};

function incomeToLedger(row: IncomeRow): LedgerEntry {
  const amount = Number(row.total ?? Number(row.quantity_kg) * Number(row.price_per_kg));
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
  const amount = Number(row.amount);
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

export async function buildFinancialStatement(): Promise<FinancialStatement> {
  const [incomeRows, expenseRows] = await Promise.all([listIncome(), listExpenses()]);

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
