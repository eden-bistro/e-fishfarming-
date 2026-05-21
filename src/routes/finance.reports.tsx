import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  buildFinancialStatement,
  exportLedgerCsv,
  type FinancialStatement,
} from "@/services/modules/finance-ledger.service";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/finance/reports")({
  head: () => ({ meta: [{ title: "Financial Reports — AquaSmart" }] }),
  component: Page,
});

function Page() {
  const [statement, setStatement] = useState<FinancialStatement | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      setStatement(await buildFinancialStatement());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to build financial report.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function downloadLedger() {
    if (!statement) return;

    const csv = exportLedgerCsv(statement.entries);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <DashboardLayout
      title="Reports"
      subtitle="Auditable ledgers and exportable financial statements."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Income</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            KSh {Number(statement?.totalIncome ?? 0).toLocaleString()}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Expenses</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            KSh {Number(statement?.totalExpense ?? 0).toLocaleString()}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Net Profit</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            KSh {Number(statement?.netProfit ?? 0).toLocaleString()}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">General Ledger</CardTitle>
          <Button onClick={downloadLedger} disabled={!statement || statement.entries.length === 0}>
            Export CSV
          </Button>
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
                    <TableCell className="text-right">{entry.debit.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{entry.credit.toLocaleString()}</TableCell>
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
