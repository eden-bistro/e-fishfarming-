import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addIncome, deleteIncome, listIncome, updateIncome, type IncomeRow } from "@/lib/platform-clients";

export const Route = createFileRoute("/finance/income")({
  head: () => ({ meta: [{ title: "Income — AquaSmart" }] }),
  component: Page,
});

function Page() {
  const [rows, setRows] = useState<IncomeRow[]>([]);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<IncomeRow>({ date: "", buyer: "", quantity_kg: 0, price_per_kg: 0, total: 0 });

  async function load() {
    setRows(await listIncome());
  }
  useEffect(() => { void load(); }, []);

  const total = useMemo(() => rows.reduce((s, r) => s + Number(r.total || 0), 0), [rows]);

  async function save() {
    const payload = { ...form, total: Number(form.quantity_kg) * Number(form.price_per_kg) };
    if (editId) await updateIncome(editId, payload);
    else await addIncome(payload);
    setEditId(null);
    setForm({ date: "", buyer: "", quantity_kg: 0, price_per_kg: 0, total: 0 });
    await load();
  }

  return (
    <DashboardLayout title="Income" subtitle="Sales management with create, update, and delete actions.">
      <Card>
        <CardHeader><CardTitle className="text-base">Add / Edit Income</CardTitle></CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-5">
          <Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
          <Input placeholder="Buyer" value={form.buyer} onChange={(e) => setForm((f) => ({ ...f, buyer: e.target.value }))} />
          <Input type="number" placeholder="Qty kg" value={form.quantity_kg} onChange={(e) => setForm((f) => ({ ...f, quantity_kg: Number(e.target.value) }))} />
          <Input type="number" placeholder="Price/kg" value={form.price_per_kg} onChange={(e) => setForm((f) => ({ ...f, price_per_kg: Number(e.target.value) }))} />
          <Button onClick={() => void save()}>{editId ? "Update" : "Add"}</Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="p-5"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/15 text-success"><TrendingUp className="h-5 w-5" /></div><div><p className="text-xs text-muted-foreground">Total recorded</p><p className="text-xl font-semibold">KSh {total.toLocaleString()}</p></div></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Income Records</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Buyer</TableHead><TableHead>Quantity</TableHead><TableHead>Price/kg</TableHead><TableHead className="text-right">Total</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={`${r.id}-${r.date}`}>
                  <TableCell>{r.date}</TableCell><TableCell>{r.buyer}</TableCell><TableCell>{r.quantity_kg} kg</TableCell><TableCell>KSh {r.price_per_kg}</TableCell><TableCell className="text-right font-medium">KSh {Number(r.total).toLocaleString()}</TableCell>
                  <TableCell className="space-x-2"><Button size="sm" variant="outline" onClick={() => { setEditId(r.id ?? null); setForm(r); }}>Edit</Button><Button size="sm" variant="destructive" onClick={() => r.id && void deleteIncome(r.id).then(load)}>Delete</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
