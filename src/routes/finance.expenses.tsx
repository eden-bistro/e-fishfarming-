import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { ExpenseChart } from "@/components/dashboard/expense-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  addExpense,
  deleteExpense,
  listExpenses,
  updateExpense,
  type ExpenseRow,
} from "@/lib/platform-clients";
import { toast } from "sonner";
import {
  currentMonthRange,
  expenseAmount,
  filterExpensesByDate,
  formatCurrency,
  sumExpenses,
  type DateRange,
} from "@/services/modules/finance-analytics.service";

export const Route = createFileRoute("/finance/expenses")({
  head: () => ({ meta: [{ title: "Expenses — AquaSmart" }] }),
  component: Page,
});

function Page() {
  const [rows, setRows] = useState<ExpenseRow[]>([]);
  const [editId, setEditId] = useState<number | null>(null);
  const [range, setRange] = useState<DateRange>(() => currentMonthRange());
  const [form, setForm] = useState<ExpenseRow>({
    date: "",
    category: "",
    description: "",
    amount: 0,
  });

  async function load() {
    try {
      setRows(await listExpenses());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load expense records.");
    }
  }
  useEffect(() => {
    setRange(currentMonthRange());
    void load();
  }, []);

  const filteredRows = useMemo(() => filterExpensesByDate(rows, range), [range, rows]);
  const totalExpenses = useMemo(() => sumExpenses(filteredRows), [filteredRows]);
  const draftAmount = Number(form.amount);

  async function confirmDelete(row: ExpenseRow) {
    if (!row.id) return;
    const ok = window.confirm(
      `Delete ${row.category} expense (${formatCurrency(expenseAmount(row))}) from ${row.date}? This cannot be undone.`,
    );
    if (!ok) return;
    await deleteExpense(row.id);
    toast.success("Expense record deleted.");
    await load();
  }

  async function save() {
    const amount = Number(form.amount);
    if (!form.date || !form.category.trim() || !form.description.trim() || amount <= 0) {
      toast.error("Please provide date, category, description and amount greater than zero.");
      return;
    }

    const payload = {
      ...form,
      category: form.category.trim(),
      description: form.description.trim(),
      amount,
    };
    try {
      if (editId) await updateExpense(editId, payload);
      else await addExpense(payload);
      toast.success(editId ? "Expense updated." : "Expense added.");
      setEditId(null);
      setForm({ date: "", category: "", description: "", amount: 0 });
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save expense record.");
    }
  }

  return (
    <DashboardLayout
      title="Expenses"
      subtitle="Operating costs with typed categories, date filters, and guarded deletes."
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add / Edit Expense</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-5">
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Expense date</p>
            <Input
              type="date"
              aria-label="Expense date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            />
          </div>
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Type any category</p>
            <Input
              placeholder="e.g. Feed, Medicine, Fuel"
              aria-label="Expense category"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            />
          </div>
          <div>
            <p className="mb-1 text-xs text-muted-foreground">What was paid for?</p>
            <Input
              placeholder="e.g. Starter feed bags"
              aria-label="Expense description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Amount paid</p>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g. 12500"
              aria-label="Expense amount"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value) }))}
            />
          </div>
          <Button className="md:self-end" onClick={() => void save()}>
            {editId ? "Update" : "Add"}
          </Button>
          <div className="rounded-md border bg-muted/30 p-3 text-sm md:col-span-5">
            <p className="font-medium">You are recording</p>
            <p className="text-muted-foreground">
              {form.category.trim() || "Category"} expense for{" "}
              {form.description.trim() || "description"}. Total: {formatCurrency(draftAmount || 0)}.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Expense Controls</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3 md:items-end">
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
          <div className="rounded-md border p-3 text-sm">
            <span className="text-muted-foreground">Filtered total: </span>
            <span className="font-semibold">{formatCurrency(totalExpenses)}</span>
          </div>
        </CardContent>
      </Card>

      <ExpenseChart rows={rows} range={range} />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Expense Records</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.map((e) => (
                <TableRow key={`${e.id}-${e.date}`}>
                  <TableCell>{e.date}</TableCell>
                  <TableCell>{e.category}</TableCell>
                  <TableCell>{e.description}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(expenseAmount(e))}
                  </TableCell>
                  <TableCell className="space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditId(e.id ?? null);
                        setForm(e);
                      }}
                    >
                      Edit
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => void confirmDelete(e)}>
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
