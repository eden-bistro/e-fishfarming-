import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMemo, useState } from "react";
import { Pencil, Trash2, X } from "lucide-react";
import {
  deleteBrooder,
  deleteFingerlingBatch,
  listBrooders,
  listFingerlingBatches,
  markFingerlingBatchTransferred,
  upsertBrooder,
  upsertFingerlingBatch,
  type FingerlingBatch,
} from "@/services/modules/hatchery.service";
import { createProductionEvent } from "@/services/modules/production.service";

export const Route = createFileRoute("/hatchery/")({ component: RouteComponent });

const emptyBrooderForm: { name: string; species: string; status: "active" | "paused" } = {
  name: "",
  species: "",
  status: "active",
};
const emptyBatchForm = {
  brooderId: "",
  quantity: "",
  productionDate: new Date().toISOString().slice(0, 10),
  growthStatus: "early" as FingerlingBatch["growthStatus"],
};

function RouteComponent() {
  const [, refreshHatchery] = useState(0);
  const [cageMap, setCageMap] = useState<Record<string, string>>({});
  const [editingBrooderId, setEditingBrooderId] = useState<string | null>(null);
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);

  const [brooderForm, setBrooderForm] = useState(emptyBrooderForm);
  const [batchForm, setBatchForm] = useState(emptyBatchForm);

  const brooders = listBrooders();
  const batches = listFingerlingBatches();

  const totalFingerlings = useMemo(
    () => batches.reduce((acc, row) => acc + row.quantity, 0),
    [batches],
  );

  const resetBrooderForm = () => {
    setEditingBrooderId(null);
    setBrooderForm(emptyBrooderForm);
  };

  const resetBatchForm = () => {
    setEditingBatchId(null);
    setBatchForm(emptyBatchForm);
  };

  return (
    <DashboardLayout
      title="Hatchery Management"
      subtitle="Brooder tracking and fingerling production records."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Brooders</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{brooders.length}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Fingerling Batches</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{batches.length}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total Fingerlings</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {totalFingerlings.toLocaleString()}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{editingBrooderId ? "Edit Brooder" : "Add Brooder"}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={brooderForm.name}
              onChange={(e) => setBrooderForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Species</Label>
            <Input
              value={brooderForm.species}
              onChange={(e) => setBrooderForm((f) => ({ ...f, species: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={brooderForm.status}
              onChange={(e) =>
                setBrooderForm((f) => ({ ...f, status: e.target.value as "active" | "paused" }))
              }
            >
              <option value="active">active</option>
              <option value="paused">paused</option>
            </select>
          </div>
          <div className="flex items-end gap-2">
            <Button
              onClick={() => {
                if (!brooderForm.name.trim()) return;
                upsertBrooder({
                  ...brooderForm,
                  name: brooderForm.name.trim(),
                  id: editingBrooderId ?? undefined,
                });
                refreshHatchery((n) => n + 1);
                resetBrooderForm();
              }}
            >
              {editingBrooderId ? "Update Brooder" : "Save Brooder"}
            </Button>
            {editingBrooderId && (
              <Button variant="outline" onClick={resetBrooderForm}>
                <X className="mr-1 h-4 w-4" /> Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Brooder List</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {brooders.length === 0 ? (
            <p className="text-muted-foreground">No brooders yet.</p>
          ) : (
            brooders.map((brooder) => (
              <div key={brooder.id} className="rounded border p-3">
                <p className="font-medium">{brooder.name}</p>
                <p className="text-xs text-muted-foreground">
                  Species: {brooder.species || "—"} · Status: {brooder.status}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingBrooderId(brooder.id);
                      setBrooderForm({
                        name: brooder.name,
                        species: brooder.species,
                        status: brooder.status,
                      });
                    }}
                  >
                    <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      deleteBrooder(brooder.id);
                      if (editingBrooderId === brooder.id) resetBrooderForm();
                      refreshHatchery((n) => n + 1);
                    }}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {editingBatchId ? "Edit Fingerling Batch" : "Add Fingerling Batch"}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-5">
          <div className="space-y-2">
            <Label>Brooder</Label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={batchForm.brooderId}
              onChange={(e) => setBatchForm((f) => ({ ...f, brooderId: e.target.value }))}
            >
              <option value="">Select brooder</option>
              {brooders.map((brooder) => (
                <option key={brooder.id} value={brooder.id}>
                  {brooder.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Quantity</Label>
            <Input
              value={batchForm.quantity}
              onChange={(e) => setBatchForm((f) => ({ ...f, quantity: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Production date</Label>
            <Input
              type="date"
              value={batchForm.productionDate}
              onChange={(e) => setBatchForm((f) => ({ ...f, productionDate: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Growth status</Label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={batchForm.growthStatus}
              onChange={(e) =>
                setBatchForm((f) => ({
                  ...f,
                  growthStatus: e.target.value as FingerlingBatch["growthStatus"],
                }))
              }
            >
              <option value="early">early</option>
              <option value="mid">mid</option>
              <option value="ready_for_transfer">ready_for_transfer</option>
            </select>
          </div>
          <div className="flex items-end gap-2">
            <Button
              onClick={() => {
                if (!batchForm.brooderId || !batchForm.quantity) return;
                upsertFingerlingBatch({
                  id: editingBatchId ?? undefined,
                  brooderId: batchForm.brooderId,
                  quantity: Number(batchForm.quantity) || 0,
                  productionDate: batchForm.productionDate,
                  growthStatus: batchForm.growthStatus,
                });
                refreshHatchery((n) => n + 1);
                resetBatchForm();
              }}
            >
              {editingBatchId ? "Update Batch" : "Save Batch"}
            </Button>
            {editingBatchId && (
              <Button variant="outline" onClick={resetBatchForm}>
                <X className="mr-1 h-4 w-4" /> Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fingerling Batches</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {batches.length === 0 ? (
            <p className="text-muted-foreground">No fingerling batches yet.</p>
          ) : (
            batches.map((b) => (
              <div key={b.id} className="rounded border p-3">
                <p className="font-medium">
                  {b.id.slice(0, 8)} · batch · {b.quantity} pcs
                </p>
                <p className="text-xs text-muted-foreground">
                  Produced: {b.productionDate} · Status: {b.growthStatus}
                  {b.transferredToCage ? ` · Transferred to ${b.transferredToCage}` : ""}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingBatchId(b.id);
                      setBatchForm({
                        brooderId: b.brooderId,
                        quantity: String(b.quantity),
                        productionDate: b.productionDate,
                        growthStatus: b.growthStatus,
                      });
                    }}
                  >
                    <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      deleteFingerlingBatch(b.id);
                      if (editingBatchId === b.id) resetBatchForm();
                      refreshHatchery((n) => n + 1);
                    }}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                  </Button>
                  {b.growthStatus !== "ready_for_transfer" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        markFingerlingBatchTransferred(b.id, "");
                        refreshHatchery((n) => n + 1);
                      }}
                    >
                      Mark Ready
                    </Button>
                  )}
                  {b.growthStatus === "ready_for_transfer" && (
                    <>
                      <Input
                        className="h-8 w-40"
                        placeholder="Target cage"
                        value={cageMap[b.id] ?? ""}
                        onChange={(e) => setCageMap((p) => ({ ...p, [b.id]: e.target.value }))}
                      />
                      <Button
                        size="sm"
                        onClick={() => {
                          const cage = cageMap[b.id]?.trim();
                          if (!cage) return;
                          markFingerlingBatchTransferred(b.id, cage);
                          createProductionEvent({
                            cageId: cage,
                            type: "stocking",
                            fishCount: b.quantity,
                            weightKg: 0,
                          });
                          refreshHatchery((n) => n + 1);
                        }}
                      >
                        Transfer
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
