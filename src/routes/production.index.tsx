import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listProductionEvents } from "@/services/modules/production.service";
import { useMemo } from "react";

export const Route = createFileRoute("/production/")({ component: RouteComponent });

function RouteComponent() {
  const events = listProductionEvents();
  const stats = useMemo(() => {
    const stocked = events.filter((e) => e.type === "stocking").reduce((s, e) => s + (e.fishCount ?? 0), 0);
    const mortality = events.filter((e) => e.type === "mortality").reduce((s, e) => s + (e.fishCount ?? 0), 0);
    const harvestKg = events.filter((e) => e.type === "harvest").reduce((s, e) => s + (e.weightKg ?? 0), 0);
    const feedKg = events.filter((e) => e.type === "feeding").reduce((s, e) => s + (e.feedKg ?? 0), 0);
    const survival = stocked > 0 ? ((stocked - mortality) / stocked) * 100 : 0;
    const biomassGain = harvestKg || 1;
    const fcr = feedKg / biomassGain;
    return { stocked, mortality, harvestKg, survival, feedKg, fcr };
  }, [events]);

  return (
    <DashboardLayout title="Fish Production" subtitle="Production events, survival and FCR analytics.">
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader><CardTitle className="text-base">Stocked fish</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{stats.stocked}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Mortality</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{stats.mortality}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Harvest kg</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{stats.harvestKg.toFixed(1)}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Survival rate</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{stats.survival.toFixed(1)}%</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Feed used</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{stats.feedKg.toFixed(1)} kg</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">FCR (overall)</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{stats.fcr.toFixed(2)}</CardContent></Card>
      </div>
    </DashboardLayout>
  );
}
