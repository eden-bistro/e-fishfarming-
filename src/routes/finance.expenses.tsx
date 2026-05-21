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
import { useEffect, useState } from "react";
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

export const Route = createFileRoute("/finance/expenses")({
  head: () => ({ meta: [{ title: "Expenses — AquaSmart" }] }),
  component: Page,
});

function Page() {
  const [rows, setRows] = useState<ExpenseRow[]>([]);
  const [editId, setEditId] = useState<number | null>(null);
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
    void load();
  }, []);

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
    <DashboardLayout title="Expenses" subtitle="Operating costs with full CRUD actions.">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add / Edit Expense</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-5">
          <Input
            type="date"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
          />
          <Input
            placeholder="Category"
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          />
          <Input
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
          <Input
            type="number"
            placeholder="Amount"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value) }))}
          />
          <Button onClick={() => void save()}>{editId ? "Update" : "Add"}</Button>
        </CardContent>
      </Card>

      <ExpenseChart />
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
              {rows.map((e) => (
                <TableRow key={`${e.id}-${e.date}`}>
                  <TableCell>{e.date}</TableCell>
                  <TableCell>{e.category}</TableCell>
                  <TableCell>{e.description}</TableCell>
                  <TableCell className="text-right font-medium">
                    KSh {Number(e.amount).toLocaleString()}
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
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => e.id && void deleteExpense(e.id).then(load)}
                    >
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
