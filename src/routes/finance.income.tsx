import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  addIncome,
  deleteIncome,
  listIncome,
  updateIncome,
  type IncomeRow,
} from "@/lib/platform-clients";
import { toast } from "sonner";
import {
  currentMonthRange,
  filterIncomeByDate,
  formatCurrency,
  incomeAmount,
  sumIncome,
  type DateRange,
} from "@/services/modules/finance-analytics.service";

export const Route = createFileRoute("/finance/income")({
  head: () => ({ meta: [{ title: "Income — AquaSmart" }] }),
  component: Page,
});

function Page() {
  const [rows, setRows] = useState<IncomeRow[]>([]);
  const [editId, setEditId] = useState<number | null>(null);
  const [range, setRange] = useState<DateRange>(() => currentMonthRange());
  const [form, setForm] = useState({
    date: "",
    buyer: "",
    quantity_kg: "",
    price_per_kg: "",
  });

  async function load() {
    try {
      setRows(await listIncome());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load income records.");
    }
  }
  useEffect(() => {
    setRange(currentMonthRange());
    void load();
  }, []);

  const filteredRows = useMemo(() => filterIncomeByDate(rows, range), [range, rows]);
  const total = useMemo(() => sumIncome(filteredRows), [filteredRows]);

  function exportIncomeCsv() {
    const header = ["Date", "Buyer", "Quantity kg", "Price per kg", "Total"];
    const body = filteredRows.map((row) => [
      row.date,
      row.buyer.replaceAll('"', '""'),
      String(row.quantity_kg),
      String(row.price_per_kg),
      incomeAmount(row).toFixed(2),
    ]);
    const csv = [header, ...body]
      .map((cols) => cols.map((value) => `"${value}"`).join(","))
      .join("\n");
    const blob = new Blob([`${csv}\n`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `income-${range.startDate}-to-${range.endDate}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function confirmDelete(row: IncomeRow) {
    if (!row.id) return;
    const ok = window.confirm(
      `Delete income record for ${row.buyer} on ${row.date}? This cannot be undone.`,
    );
    if (!ok) return;
    await deleteIncome(row.id);
    setRows((current) => current.filter((item) => item.id !== row.id));
    toast.success("Income record deleted.");
    void load();
  }

  async function save() {
    const qty = Number(form.quantity_kg);
    const price = Number(form.price_per_kg);
    if (!form.date || !form.buyer.trim() || qty <= 0 || price <= 0) {
      toast.error("Please provide date, buyer, quantity and price greater than zero.");
      return;
    }

    const payload: IncomeRow = {
      date: form.date,
      buyer: form.buyer.trim(),
      quantity_kg: qty,
      price_per_kg: price,
      total: qty * price,
    };
    try {
      const saved = editId ? await updateIncome(editId, payload) : await addIncome(payload);
      setRows((current) =>
        editId ? current.map((row) => (row.id === editId ? saved : row)) : [saved, ...current],
      );
      toast.success(editId ? "Income updated." : "Income added.");
      setEditId(null);
      setForm({ date: "", buyer: "", quantity_kg: "", price_per_kg: "" });
      void load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save income record.");
    }
  }

  return (
    <DashboardLayout
      title="Income"
      subtitle="Sales management with validation, date filters, guarded deletes, and exports."
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add / Edit Income</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-5">
          <Input
            type="date"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
          />
          <Input
            placeholder="Buyer"
            value={form.buyer}
            onChange={(e) => setForm((f) => ({ ...f, buyer: e.target.value }))}
          />
          <Input
            type="number"
            placeholder="Qty kg"
            value={form.quantity_kg}
            onChange={(e) => setForm((f) => ({ ...f, quantity_kg: e.target.value }))}
          />
          <Input
            type="number"
            placeholder="Price/kg"
            value={form.price_per_kg}
            onChange={(e) => setForm((f) => ({ ...f, price_per_kg: e.target.value }))}
          />
          <Button onClick={() => void save()}>{editId ? "Update" : "Add"}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Income Controls</CardTitle>
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
          <Button variant="outline" onClick={exportIncomeCsv} disabled={filteredRows.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/15 text-success">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total recorded</p>
                <p className="text-xl font-semibold">{formatCurrency(total)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Income Records</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Buyer</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Price/kg</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.map((r) => (
                <TableRow key={`${r.id}-${r.date}`}>
                  <TableCell>{r.date}</TableCell>
                  <TableCell>{r.buyer}</TableCell>
                  <TableCell>{r.quantity_kg} kg</TableCell>
                  <TableCell>{formatCurrency(Number(r.price_per_kg))}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(incomeAmount(r))}
                  </TableCell>
                  <TableCell className="space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditId(r.id ?? null);
                        setForm({
                          date: r.date,
                          buyer: r.buyer,
                          quantity_kg: String(r.quantity_kg),
                          price_per_kg: String(r.price_per_kg),
                        });
                      }}
                    >
                      Edit
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => void confirmDelete(r)}>
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
