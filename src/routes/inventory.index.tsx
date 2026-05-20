import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMemo, useState } from "react";
import {
  APP_ROLES,
  getCurrentUserRole,
  setCurrentUserRole,
  userHasRole,
  type AppRole,
} from "@/contexts/rbac";
import {
  listInventoryItems,
  listStockMovements,
  recordStockMovement,
  upsertInventoryItem,
  type InventoryCategory,
} from "@/services/modules/inventory.service";

export const Route = createFileRoute("/inventory/")({ component: RouteComponent });

function RouteComponent() {
  const [role, setRole] = useState<AppRole>(getCurrentUserRole());
  const [refresh, setRefresh] = useState(0);
  const [form, setForm] = useState({ name: "", category: "feed" as InventoryCategory, unit: "kg", quantity: "0", low: "10" });

  const canWrite = userHasRole(["super_admin", "farmer", "accountant"]);
  const items = useMemo(() => listInventoryItems(), [refresh]);
  const movements = useMemo(() => listStockMovements().slice(0, 8), [refresh]);
  const lowStockCount = items.filter((i) => i.quantity <= i.lowStockThreshold).length;

  return (
    <DashboardLayout title="Inventory" subtitle="Manage feed, medicine, equipment, and consumables.">
      <Card>
        <CardHeader><CardTitle className="text-base">My Role (Demo RBAC Control)</CardTitle></CardHeader>
        <CardContent>
          <select value={role} onChange={(e) => { const next = e.target.value as AppRole; setRole(next); setCurrentUserRole(next); }} className="h-10 w-56 rounded-md border border-input bg-background px-3 text-sm">
            {APP_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <p className="mt-2 text-xs text-muted-foreground">worker role is read-only for inventory operations.</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader><CardTitle className="text-base">Items</CardTitle></CardHeader><CardContent><p className="text-3xl font-semibold">{items.length}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Low-stock alerts</CardTitle></CardHeader><CardContent><p className="text-3xl font-semibold">{lowStockCount}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Movements</CardTitle></CardHeader><CardContent><p className="text-3xl font-semibold">{movements.length}</p></CardContent></Card>
      </div>

      {canWrite && <Card><CardHeader><CardTitle className="text-base">Add inventory item</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-5">
        <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
        <div><Label>Category</Label><select className="h-10 w-full rounded-md border border-input px-3" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as InventoryCategory }))}><option value="feed">feed</option><option value="medicine">medicine</option><option value="equipment">equipment</option><option value="fuel">fuel</option><option value="consumable">consumable</option></select></div>
        <div><Label>Unit</Label><Input value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} /></div>
        <div><Label>Qty</Label><Input value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} /></div>
        <div><Label>Low stock</Label><Input value={form.low} onChange={(e) => setForm((f) => ({ ...f, low: e.target.value }))} /></div>
        <div className="md:col-span-5"><Button onClick={() => { if (!form.name.trim()) return; upsertInventoryItem({ name: form.name, category: form.category, unit: form.unit, quantity: Number(form.quantity), lowStockThreshold: Number(form.low) }); setRefresh((n) => n + 1); }}>Save Item</Button></div>
      </CardContent></Card>}

      <Card><CardHeader><CardTitle className="text-base">Inventory list</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">
        {items.map((i) => (
          <div key={i.id} className="rounded border p-3">
            <p className="font-medium">{i.name} ({i.category})</p>
            <p className="text-xs text-muted-foreground">{i.quantity} {i.unit} · low threshold {i.lowStockThreshold}</p>
            {canWrite && <div className="mt-2 flex gap-2"><Button size="sm" variant="outline" onClick={() => { recordStockMovement({ itemId: i.id, quantity: 10, type: "purchase", note: "Restock" }); setRefresh((n) => n + 1); }}>+ Purchase 10</Button><Button size="sm" variant="outline" onClick={() => { recordStockMovement({ itemId: i.id, quantity: -1, type: "adjustment", note: "Manual adjustment" }); setRefresh((n) => n + 1); }}>Adjust -1</Button></div>}
          </div>
        ))}
      </CardContent></Card>

      <Card><CardHeader><CardTitle className="text-base">Recent stock movements</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">
        {movements.map((m) => <p key={m.id}>{new Date(m.createdAt).toLocaleString()} · {m.type} · {m.quantity}</p>)}
      </CardContent></Card>
    </DashboardLayout>
  );
}
