import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMemo, useState } from "react";
import {
  createBrooder,
  createFingerlingBatch,
  listBrooders,
  listFingerlingBatches,
  markFingerlingBatchTransferred,
} from "@/services/modules/hatchery.service";
import { createProductionEvent } from "@/services/modules/production.service";

export const Route = createFileRoute("/hatchery/")({ component: RouteComponent });

function RouteComponent() {
  const [, refreshHatchery] = useState(0);
  const [cageMap, setCageMap] = useState<Record<string, string>>({});

  const [brooderForm, setBrooderForm] = useState<{
    name: string;
    species: string;
    status: "active" | "paused";
  }>({
    name: "",
    species: "",
    status: "active",
  });

  const [batchForm, setBatchForm] = useState({
    brooderId: "",
    quantity: "",
    productionDate: new Date().toISOString().slice(0, 10),
    growthStatus: "early" as const,
  });

  const brooders = listBrooders();
  const batches = listFingerlingBatches();

  const readyCount = batches.filter((b) => b.growthStatus === "ready_for_transfer").length;

  const totalFingerlings = useMemo(
    () => batches.reduce((acc, row) => acc + row.quantity, 0),
    [batches],
  );

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

      {/* Add Brooder */}
      <Card>
        <CardHeader>
          <CardTitle>Add Brooder</CardTitle>
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
                setBrooderForm((f) => ({
                  ...f,
                  status: e.target.value as "active" | "paused",
                }))
              }
            >
              <option value="active">active</option>
              <option value="paused">paused</option>
            </select>
          </div>

          <div className="flex items-end">
            <Button
              onClick={() => {
                if (!brooderForm.name.trim()) return;
                createBrooder(brooderForm);
                refreshHatchery((n) => n + 1);
                setBrooderForm({ name: "", species: "", status: "active" });
              }}
            >
              Save Brooder
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Fingerling Batches */}
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
                        onChange={(e) =>
                          setCageMap((p) => ({
                            ...p,
                            [b.id]: e.target.value,
                          }))
                        }
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
