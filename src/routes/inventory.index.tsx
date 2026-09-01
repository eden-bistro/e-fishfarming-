import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useMemo, useState } from "react";
import { Pencil, Trash2, X } from "lucide-react";
import { getCurrentUserRole, userHasRole } from "@/contexts/rbac";
import {
  listInventoryItems,
  deleteInventoryItemRemote,
  listInventoryItemsRemote,
  listStockMovements,
  listStockMovementsRemote,
  recordStockMovementRemote,
  upsertInventoryItemRemote,
  type InventoryCategory,
} from "@/services/modules/inventory.service";

export const Route = createFileRoute("/inventory/")({ component: RouteComponent });

function RouteComponent() {
  const [refresh, setRefresh] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    category: "feed" as InventoryCategory,
    unit: "kg",
    quantity: "",
    low: "",
  });

  const canWrite = userHasRole(["admin", "farm_user"]);
  const [items, setItems] = useState<Awaited<ReturnType<typeof listInventoryItems>>>([]);
  const [movements, setMovements] = useState<Awaited<ReturnType<typeof listStockMovements>>>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const [itemsRows, movementRows] = await Promise.all([
        listInventoryItemsRemote(),
        listStockMovementsRemote(),
      ]);
      if (!mounted) return;
      setItems(itemsRows);
      setMovements(movementRows.slice(0, 8));
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [refresh]);

  const lowStockCount = useMemo(
    () => items.filter((i) => i.quantity <= i.lowStockThreshold).length,
    [items],
  );

  return (
    <DashboardLayout
      title="Inventory"
      subtitle="Manage feed, medicine, equipment, and consumables."
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Access</CardTitle>
        </CardHeader>
        <CardContent>
          <Badge variant="secondary">{getCurrentUserRole()}</Badge>
          <p className="mt-2 text-xs text-muted-foreground">
            Device administration remains admin-only; farm users can manage farm inventory.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Items</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{items.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Low-stock alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{lowStockCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Movements</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{movements.length}</p>
          </CardContent>
        </Card>
      </div>

      {canWrite && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {editingId ? "Edit inventory item" : "Add inventory item"}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-5">
            <div>
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <Label>Category</Label>
              <select
                className="h-10 w-full rounded-md border border-input px-3"
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({ ...f, category: e.target.value as InventoryCategory }))
                }
              >
                <option value="feed">feed</option>
                <option value="medicine">medicine</option>
                <option value="equipment">equipment</option>
                <option value="fuel">fuel</option>
                <option value="consumable">consumable</option>
              </select>
            </div>
            <div>
              <Label>Unit</Label>
              <Input
                value={form.unit}
                onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
              />
            </div>
            <div>
              <Label>Qty</Label>
              <Input
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
              />
            </div>
            <div>
              <Label>Low stock</Label>
              <Input
                value={form.low}
                onChange={(e) => setForm((f) => ({ ...f, low: e.target.value }))}
              />
            </div>
            <div className="md:col-span-5">
              <Button
                onClick={() => {
                  if (!form.name.trim()) return;
                  void upsertInventoryItemRemote({
                    id: editingId ?? undefined,
                    name: form.name.trim(),
                    category: form.category,
                    unit: form.unit.trim() || "unit",
                    quantity: Number(form.quantity) || 0,
                    lowStockThreshold: Number(form.low) || 0,
                  }).then(() => setRefresh((n) => n + 1));
                  setEditingId(null);
                  setForm({ name: "", category: "feed", unit: "kg", quantity: "", low: "" });
                }}
              >
                {editingId ? "Update Item" : "Save Item"}
              </Button>
              {editingId && (
                <Button
                  className="ml-2"
                  variant="outline"
                  onClick={() => {
                    setEditingId(null);
                    setForm({ name: "", category: "feed", unit: "kg", quantity: "", low: "" });
                  }}
                >
                  <X className="mr-1 h-4 w-4" />
                  Cancel
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Inventory list</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {items.map((i) => (
            <div key={i.id} className="rounded border p-3">
              <p className="font-medium">
                {i.name} ({i.category})
              </p>
              <p className="text-xs text-muted-foreground">
                {i.quantity} {i.unit} · low threshold {i.lowStockThreshold}
              </p>
              {canWrite && (
                <div className="mt-2 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingId(i.id);
                      setForm({
                        name: i.name,
                        category: i.category,
                        unit: i.unit,
                        quantity: String(i.quantity),
                        low: String(i.lowStockThreshold),
                      });
                    }}
                  >
                    <Pencil className="mr-1 h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      void deleteInventoryItemRemote(i.id).then(() => setRefresh((n) => n + 1));
                      if (editingId === i.id) {
                        setEditingId(null);
                        setForm({ name: "", category: "feed", unit: "kg", quantity: "", low: "" });
                      }
                    }}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    Delete
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      void recordStockMovementRemote({
                        itemId: i.id,
                        quantity: 10,
                        type: "purchase",
                        note: "Restock",
                      });
                      setRefresh((n) => n + 1);
                    }}
                  >
                    + Purchase 10
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      void recordStockMovementRemote({
                        itemId: i.id,
                        quantity: -1,
                        type: "adjustment",
                        note: "Manual adjustment",
                      });
                      setRefresh((n) => n + 1);
                    }}
                  >
                    Adjust -1
                  </Button>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent stock movements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {movements.map((m) => (
            <p key={m.id}>
              {new Date(m.createdAt).toLocaleString()} · {m.type} · {m.quantity}
            </p>
          ))}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
