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
  incomeQuantity,
  incomeType,
  incomeUnit,
  incomeUnitPrice,
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
  const emptyForm = {
    date: "",
    buyer: "",
    income_type: "Fish sale",
    unit: "kg",
    quantity: "",
    unit_price: "",
    quantity_kg: "",
    price_per_kg: "",
    total: "",
  };
  const [form, setForm] = useState(emptyForm);

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
  const draftQuantity = Number(form.quantity_kg);
  const draftPrice = Number(form.price_per_kg);
  const draftTotal =
    Number.isFinite(draftQuantity) && Number.isFinite(draftPrice) ? draftQuantity * draftPrice : 0;

  function exportIncomeCsv() {
    const header = ["Date", "Buyer", "Income type", "Quantity", "Unit", "Unit price", "Total"];
    const body = filteredRows.map((row) => [
      row.date,
      row.buyer.replaceAll('"', '""'),
      incomeType(row).replaceAll('"', '""'),
      String(incomeQuantity(row)),
      incomeUnit(row).replaceAll('"', '""'),
      String(incomeUnitPrice(row)),
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
    const qty = Number(form.quantity);
    const price = Number(form.unit_price);
    if (
      !form.date ||
      !form.buyer.trim() ||
      !form.income_type.trim() ||
      !form.unit.trim() ||
      qty <= 0 ||
      price <= 0
    ) {
      toast.error(
        "Please provide date, buyer, income type, unit, quantity and price greater than zero.",
      );
      return;
    }

    const payload: IncomeRow = {
      date: form.date,
      buyer: form.buyer.trim(),
      income_type: form.income_type.trim(),
      unit: form.unit.trim(),
      quantity: qty,
      unit_price: price,
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
      setForm(emptyForm);
      await load();
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
        <CardContent className="grid gap-3 md:grid-cols-5">
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Sale date</p>
            <Input
              type="date"
              aria-label="Income date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            />
          </div>
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Buyer name</p>
            <Input
              placeholder="e.g. Lakeside Hotel"
              aria-label="Buyer name"
              value={form.buyer}
              onChange={(e) => setForm((f) => ({ ...f, buyer: e.target.value }))}
            />
          </div>
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Quantity sold (kg)</p>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g. 120"
              aria-label="Quantity sold in kilograms"
              value={form.quantity_kg}
              onChange={(e) => {
                const quantity = e.target.value;
                setForm((f) => ({ ...f, quantity, quantity_kg: quantity }));
              }}
            />
          </div>
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Price for each kg</p>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g. 450"
              aria-label="Price per kilogram"
              value={form.price_per_kg}
              onChange={(e) => {
                const unitPrice = e.target.value;
                setForm((f) => ({ ...f, unit_price: unitPrice, price_per_kg: unitPrice }));
              }}
            />
          </div>
          <Button className="md:self-end" onClick={() => void save()}>
            {editId ? "Update" : "Add"}
          </Button>
          <div className="rounded-md border bg-muted/30 p-3 text-sm md:col-span-5">
            <p className="font-medium">You are recording</p>
            <p className="text-muted-foreground">
              {form.buyer.trim() || "Buyer"} will be charged {formatCurrency(draftPrice || 0)} per
              kg for {draftQuantity || 0} kg. Estimated total: {formatCurrency(draftTotal)}.
            </p>
          </div>
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
                <TableHead>Type</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Unit price</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.map((r) => (
                <TableRow key={`${r.id}-${r.date}`}>
                  <TableCell>{r.date}</TableCell>
                  <TableCell>{r.buyer}</TableCell>
                  <TableCell>{incomeType(r)}</TableCell>
                  <TableCell>
                    {incomeQuantity(r)} {incomeUnit(r)}
                  </TableCell>
                  <TableCell>{formatCurrency(incomeUnitPrice(r))}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(incomeAmount(r))}
                  </TableCell>
                  <TableCell className="space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditId(r.id ?? null);
                        const quantity = incomeQuantity(r);
                        const unitPrice = incomeUnitPrice(r);
                        setForm({
                          date: r.date,
                          buyer: r.buyer,
                          income_type: incomeType(r),
                          unit: incomeUnit(r),
                          quantity: String(quantity),
                          unit_price: String(unitPrice),
                          quantity_kg: String(r.quantity_kg ?? quantity),
                          price_per_kg: String(r.price_per_kg ?? unitPrice),
                          total: String(incomeAmount(r)),
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
