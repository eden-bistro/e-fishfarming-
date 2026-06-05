import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  buildFinancialStatement,
  exportLedgerCsv,
  type FinancialStatement,
} from "@/services/modules/finance-ledger.service";
import {
  currentMonthRange,
  formatCurrency,
  profitMargin,
  type DateRange,
} from "@/services/modules/finance-analytics.service";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/finance/reports")({
  head: () => ({ meta: [{ title: "General Ledger — AquaSmart" }] }),
  component: Page,
});

function Page() {
  const [statement, setStatement] = useState<FinancialStatement | null>(null);
  const [range, setRange] = useState<DateRange>(() => currentMonthRange());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        setStatement(await buildFinancialStatement(range));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to build financial report.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [range]);

  function downloadLedger() {
    if (!statement) return;

    const csv = exportLedgerCsv(statement.entries);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `ledger-${range.startDate}-to-${range.endDate}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <DashboardLayout
      title="Reports"
      subtitle="Auditable ledgers, operational profitability, and exportable financial statements."
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Report Period</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Start date</p>
            <Input
              type="date"
              value={range.startDate}
              onChange={(e) => setRange((current) => ({ ...current, startDate: e.target.value }))}
            />
          </div>
          <div>
            <p className="mb-1 text-xs text-muted-foreground">End date</p>
            <Input
              type="date"
              value={range.endDate}
              onChange={(e) => setRange((current) => ({ ...current, endDate: e.target.value }))}
            />
          </div>
          <Button onClick={downloadLedger} disabled={!statement || statement.entries.length === 0}>
            Export Ledger CSV
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Income</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatCurrency(Number(statement?.totalIncome ?? 0))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Expenses</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatCurrency(Number(statement?.totalExpense ?? 0))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Net Profit</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatCurrency(Number(statement?.netProfit ?? 0))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profit Margin</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {(
              profitMargin(Number(statement?.totalIncome ?? 0), Number(statement?.netProfit ?? 0)) *
              100
            ).toFixed(1)}
            %
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Expense Category Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {!statement || statement.expenseBreakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground">No categorized expenses in this range.</p>
          ) : (
            <div className="space-y-3">
              {statement.expenseBreakdown.map((item) => (
                <div key={item.category} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{item.category}</span>
                    <span className="text-muted-foreground">
                      {formatCurrency(item.amount)} · {(item.share * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-brand"
                      style={{ width: `${Math.max(item.share * 100, 2)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">General Ledger</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading report...</p>
          ) : !statement || statement.entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No ledger entries yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statement.entries.map((entry) => (
                  <TableRow key={entry.reference}>
                    <TableCell>{entry.date}</TableCell>
                    <TableCell>{entry.reference}</TableCell>
                    <TableCell>{entry.account}</TableCell>
                    <TableCell>{entry.description}</TableCell>
                    <TableCell className="text-right">{formatCurrency(entry.debit)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(entry.credit)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
