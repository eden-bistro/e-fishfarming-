import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addProductionEvent, listProductionEvents, type ProductionEventType } from "@/services/modules/production.service";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/production/")({ component: RouteComponent });

function RouteComponent() {
  const [refresh, setRefresh] = useState(0);
  const [form, setForm] = useState({ cageId: "Pond A", type: "stocking" as ProductionEventType, fishCount: "", weightKg: "", feedKg: "" });
  const events = useMemo(() => listProductionEvents(), [refresh]);

  const stats = useMemo(() => {
    const stocked = events.filter((e) => e.type === "stocking").reduce((s, e) => s + (e.fishCount ?? 0), 0);
    const mortality = events.filter((e) => e.type === "mortality").reduce((s, e) => s + (e.fishCount ?? 0), 0);
    const harvestKg = events.filter((e) => e.type === "harvest").reduce((s, e) => s + (e.weightKg ?? 0), 0);
    const feedKg = events.filter((e) => e.type === "feeding").reduce((s, e) => s + (e.feedKg ?? 0), 0);
    const survival = stocked > 0 ? ((stocked - mortality) / stocked) * 100 : 0;
    const biomassGain = Math.max(harvestKg, 1);
    const fcr = feedKg / biomassGain;

    const byCage = Object.values(events.reduce<Record<string, { cageId: string; feedKg: number; harvestKg: number }>>((acc, e) => {
      const item = acc[e.cageId] ?? { cageId: e.cageId, feedKg: 0, harvestKg: 0 };
      if (e.type === "feeding") item.feedKg += e.feedKg ?? 0;
      if (e.type === "harvest") item.harvestKg += e.weightKg ?? 0;
      acc[e.cageId] = item;
      return acc;
    }, {})).map((c) => ({ ...c, fcr: c.feedKg / Math.max(c.harvestKg, 1) }));

    return { stocked, mortality, harvestKg, survival, feedKg, fcr, byCage };
  }, [events]);

  return (
    <DashboardLayout title="Fish Production" subtitle="Production events, survival and FCR analytics.">
      <Card>
        <CardHeader><CardTitle className="text-base">Record Production Event</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-5">
          <div><Label>Cage/Pond</Label><Input value={form.cageId} onChange={(e) => setForm((f) => ({ ...f, cageId: e.target.value }))} /></div>
          <div><Label>Type</Label><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as ProductionEventType }))}><option value="stocking">stocking</option><option value="mortality">mortality</option><option value="harvest">harvest</option><option value="sale">sale</option><option value="feeding">feeding</option></select></div>
          <div><Label>Fish Count</Label><Input value={form.fishCount} onChange={(e) => setForm((f) => ({ ...f, fishCount: e.target.value }))} /></div>
          <div><Label>Weight (kg)</Label><Input value={form.weightKg} onChange={(e) => setForm((f) => ({ ...f, weightKg: e.target.value }))} /></div>
          <div><Label>Feed (kg)</Label><Input value={form.feedKg} onChange={(e) => setForm((f) => ({ ...f, feedKg: e.target.value }))} /></div>
          <div className="md:col-span-5"><Button onClick={() => { addProductionEvent({ cageId: form.cageId.trim() || "Unassigned", type: form.type, fishCount: form.fishCount ? Number(form.fishCount) : undefined, weightKg: form.weightKg ? Number(form.weightKg) : undefined, feedKg: form.feedKg ? Number(form.feedKg) : undefined }); setRefresh((n) => n + 1); }}>Save Event</Button></div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader><CardTitle className="text-base">Stocked fish</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{stats.stocked}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Mortality</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{stats.mortality}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Harvest kg</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{stats.harvestKg.toFixed(1)}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Survival rate</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{stats.survival.toFixed(1)}%</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Feed used</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{stats.feedKg.toFixed(1)} kg</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">FCR (overall)</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{stats.fcr.toFixed(2)}</CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Per-cage FCR</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {stats.byCage.length === 0 ? <p className="text-muted-foreground">No cage analytics yet.</p> : stats.byCage.map((c) => <p key={c.cageId}>{c.cageId}: feed {c.feedKg.toFixed(1)} kg / harvest {c.harvestKg.toFixed(1)} kg = FCR {c.fcr.toFixed(2)}</p>)}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
