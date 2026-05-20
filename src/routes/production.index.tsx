import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useMemo, useState } from "react";
import { createProductionEvent, listProductionEvents, type ProductionEvent } from "@/services/modules/production.service";

export const Route = createFileRoute("/production/")({
  component: RouteComponent,
});

function RouteComponent() {
  const [events, setEvents] = useState<ProductionEvent[]>(listProductionEvents());
  const [form, setForm] = useState({
    cageName: "",
    eventType: "mortality" as ProductionEvent["eventType"],
    quantity: "0",
    weightKg: "0",
    date: new Date().toISOString().slice(0, 10),
  });
  const totals = useMemo(() => {
    const stocking = events.filter((e) => e.eventType === "stocking").reduce((a, b) => a + b.quantity, 0);
    const mortality = events.filter((e) => e.eventType === "mortality").reduce((a, b) => a + b.quantity, 0);
    const harvestKg = events.filter((e) => e.eventType === "harvest").reduce((a, b) => a + b.weightKg, 0);
    const survivalRate = stocking > 0 ? ((stocking - mortality) / stocking) * 100 : 0;
    return { stocking, mortality, harvestKg, survivalRate };
  }, [events]);

  return (
    <DashboardLayout title="Fish Production" subtitle="Stocking, mortality, harvest, and sales tracking.">
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader><CardTitle className="text-sm">Stocked Fish</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{totals.stocking}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Mortality</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{totals.mortality}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Harvest (kg)</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{totals.harvestKg.toLocaleString()}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Survival Rate</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{totals.survivalRate.toFixed(1)}%</CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Add Production Event</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-5">
          <div className="space-y-2"><Label>Cage</Label><Input value={form.cageName} onChange={(e)=>setForm((f)=>({...f,cageName:e.target.value}))} /></div>
          <div className="space-y-2"><Label>Event</Label><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.eventType} onChange={(e)=>setForm((f)=>({...f,eventType:e.target.value as ProductionEvent["eventType"]}))}><option value="mortality">mortality</option><option value="harvest">harvest</option><option value="sale">sale</option><option value="stocking">stocking</option></select></div>
          <div className="space-y-2"><Label>Quantity</Label><Input type="number" value={form.quantity} onChange={(e)=>setForm((f)=>({...f,quantity:e.target.value}))} /></div>
          <div className="space-y-2"><Label>Weight (kg)</Label><Input type="number" value={form.weightKg} onChange={(e)=>setForm((f)=>({...f,weightKg:e.target.value}))} /></div>
          <div className="space-y-2"><Label>Date</Label><Input type="date" value={form.date} onChange={(e)=>setForm((f)=>({...f,date:e.target.value}))} /></div>
          <div className="md:col-span-5"><Button onClick={()=>{ if(!form.cageName.trim()) return; createProductionEvent({cageName:form.cageName.trim(),eventType:form.eventType,quantity:Number(form.quantity||"0"),weightKg:Number(form.weightKg||"0"),date:form.date}); setEvents(listProductionEvents()); }}>Save Event</Button></div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
