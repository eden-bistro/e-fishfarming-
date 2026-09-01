import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  deleteProductionEventRemote,
  upsertProductionEventRemote,
  listProductionEventsRemote,
  type ProductionEventType,
} from "@/services/modules/production.service";
import { useEffect, useMemo, useState } from "react";
import { buildProductionIntelligence } from "@/services/modules/production-intelligence.service";

export const Route = createFileRoute("/production/")({ component: RouteComponent });

function RouteComponent() {
  const [refresh, setRefresh] = useState(0);
  const [events, setEvents] = useState<Awaited<ReturnType<typeof listProductionEventsRemote>>>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    cageId: "Pond A",
    type: "stocking" as ProductionEventType,
    fishCount: "",
    weightKg: "",
    feedKg: "",
  });

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const rows = await listProductionEventsRemote();
      if (!mounted) return;
      setEvents(rows);
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [refresh]);

  const stats = useMemo(() => {
    const stocked = events
      .filter((e) => e.type === "stocking")
      .reduce((s, e) => s + (e.fishCount ?? 0), 0);

    const mortality = events
      .filter((e) => e.type === "mortality")
      .reduce((s, e) => s + (e.fishCount ?? 0), 0);

    const harvestKg = events
      .filter((e) => e.type === "harvest")
      .reduce((s, e) => s + (e.weightKg ?? 0), 0);

    const feedKg = events
      .filter((e) => e.type === "feeding")
      .reduce((s, e) => s + (e.feedKg ?? 0), 0);

    const survival = stocked > 0 ? ((stocked - mortality) / stocked) * 100 : 0;

    const biomassGain = Math.max(harvestKg, 1);
    const fcr = feedKg / biomassGain;

    const byCage = Object.values(
      events.reduce<Record<string, { cageId: string; feedKg: number; harvestKg: number }>>(
        (acc, e) => {
          const item = acc[e.cageId] ?? {
            cageId: e.cageId,
            feedKg: 0,
            harvestKg: 0,
          };

          if (e.type === "feeding") item.feedKg += e.feedKg ?? 0;
          if (e.type === "harvest") item.harvestKg += e.weightKg ?? 0;

          acc[e.cageId] = item;
          return acc;
        },
        {},
      ),
    ).map((c) => ({
      ...c,
      fcr: c.feedKg / Math.max(c.harvestKg, 1),
    }));

    return { stocked, mortality, harvestKg, survival, feedKg, fcr, byCage };
  }, [events]);

  const intelligence = useMemo(() => buildProductionIntelligence(events), [events]);
  return (
    <DashboardLayout
      title="Fish Production"
      subtitle="Production events, survival and FCR analytics."
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {editingId ? "Edit production event" : "Add production event"}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-6">
          <div>
            <Label>Cage</Label>
            <Input
              value={form.cageId}
              onChange={(e) => setForm((f) => ({ ...f, cageId: e.target.value }))}
            />
          </div>
          <div>
            <Label>Type</Label>
            <select
              className="h-10 w-full rounded-md border border-input px-3"
              value={form.type}
              onChange={(e) =>
                setForm((f) => ({ ...f, type: e.target.value as ProductionEventType }))
              }
            >
              <option value="stocking">stocking</option>
              <option value="mortality">mortality</option>
              <option value="harvest">harvest</option>
              <option value="sale">sale</option>
              <option value="feeding">feeding</option>
            </select>
          </div>
          <div>
            <Label>Fish count</Label>
            <Input
              value={form.fishCount}
              onChange={(e) => setForm((f) => ({ ...f, fishCount: e.target.value }))}
            />
          </div>
          <div>
            <Label>Weight kg</Label>
            <Input
              value={form.weightKg}
              onChange={(e) => setForm((f) => ({ ...f, weightKg: e.target.value }))}
            />
          </div>
          <div>
            <Label>Feed kg</Label>
            <Input
              value={form.feedKg}
              onChange={(e) => setForm((f) => ({ ...f, feedKg: e.target.value }))}
            />
          </div>
          <div className="flex items-end">
            <Button
              onClick={() => {
                if (!form.cageId.trim()) return;
                void upsertProductionEventRemote({
                  id: editingId ?? undefined,
                  cageId: form.cageId.trim(),
                  type: form.type,
                  fishCount: form.fishCount ? Number(form.fishCount) : undefined,
                  weightKg: form.weightKg ? Number(form.weightKg) : undefined,
                  feedKg: form.feedKg ? Number(form.feedKg) : undefined,
                }).then(() => setRefresh((n) => n + 1));
                setEditingId(null);
                setForm({
                  cageId: "Pond A",
                  type: "stocking",
                  fishCount: "",
                  weightKg: "",
                  feedKg: "",
                });
              }}
            >
              {editingId ? "Update Event" : "Save Event"}
            </Button>
            {editingId && (
              <Button
                className="ml-2"
                variant="outline"
                onClick={() => {
                  setEditingId(null);
                  setForm({
                    cageId: "Pond A",
                    type: "stocking",
                    fishCount: "",
                    weightKg: "",
                    feedKg: "",
                  });
                }}
              >
                <X className="mr-1 h-4 w-4" />
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Stocked fish</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{stats.stocked}</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mortality</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{stats.mortality}</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Harvest kg</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{stats.harvestKg.toFixed(1)}</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Survival rate</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{stats.survival.toFixed(1)}%</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Feed used</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{stats.feedKg.toFixed(1)} kg</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">FCR (overall)</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{stats.fcr.toFixed(2)}</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Current biomass (est.)</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {intelligence.currentBiomassKg.toFixed(1)} kg
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Projected harvest (30d)</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {intelligence.projectedHarvestKg30d.toFixed(1)} kg
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Projected target date</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {intelligence.projectedHarvestDate ?? "Not enough data"}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Production events</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {events.length === 0 ? (
            <p className="text-muted-foreground">No production events yet.</p>
          ) : (
            events.map((event) => (
              <div key={event.id} className="rounded border p-3">
                <p className="font-medium">
                  {event.cageId} · {event.type}
                </p>
                <p className="text-xs text-muted-foreground">
                  Fish: {event.fishCount ?? "—"} · Weight: {event.weightKg ?? "—"} kg · Feed:{" "}
                  {event.feedKg ?? "—"} kg
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingId(event.id);
                      setForm({
                        cageId: event.cageId,
                        type: event.type,
                        fishCount: event.fishCount == null ? "" : String(event.fishCount),
                        weightKg: event.weightKg == null ? "" : String(event.weightKg),
                        feedKg: event.feedKg == null ? "" : String(event.feedKg),
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
                      void deleteProductionEventRemote(event.id).then(() =>
                        setRefresh((n) => n + 1),
                      );
                      if (editingId === event.id) {
                        setEditingId(null);
                        setForm({
                          cageId: "Pond A",
                          type: "stocking",
                          fishCount: "",
                          weightKg: "",
                          feedKg: "",
                        });
                      }
                    }}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
