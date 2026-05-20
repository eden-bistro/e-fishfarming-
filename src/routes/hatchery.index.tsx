import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMemo, useState } from "react";
import {
  createFingerlingBatch,
  listFingerlingBatches,
  markBatchReadyForTransfer,
  transferFingerlingsToCage,
} from "@/services/modules/hatchery.service";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useMemo, useState } from "react";
import { createBrooder, createFingerlingBatch, listBrooders, listFingerlingBatches, markFingerlingBatchTransferred } from "@/services/modules/hatchery.service";
import { createProductionEvent } from "@/services/modules/production.service";

export const Route = createFileRoute("/hatchery/")({ component: RouteComponent });

function RouteComponent() {
  const [refresh, setRefresh] = useState(0);
  const [form, setForm] = useState({ code: "", species: "Tilapia", quantity: "", producedAt: "" });
  const [cageMap, setCageMap] = useState<Record<string, string>>({});

  const batches = useMemo(() => listFingerlingBatches(), [refresh]);
  const readyCount = batches.filter((b) => b.status === "ready_for_transfer").length;

  return (
    <DashboardLayout title="Hatchery" subtitle="Manage fingerling production and transfer to production cages.">
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader><CardTitle className="text-base">Total batches</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{batches.length}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Ready for transfer</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{readyCount}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Transferred</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{batches.filter((b) => b.status === "transferred").length}</CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Create Fingerling Batch</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-5">
          <div><Label>Batch Code</Label><Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} /></div>
          <div><Label>Species</Label><Input value={form.species} onChange={(e) => setForm((f) => ({ ...f, species: e.target.value }))} /></div>
          <div><Label>Quantity</Label><Input value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} /></div>
          <div><Label>Produced Date</Label><Input type="date" value={form.producedAt} onChange={(e) => setForm((f) => ({ ...f, producedAt: e.target.value }))} /></div>
          <div className="flex items-end"><Button onClick={() => {
            if (!form.code.trim() || !form.species.trim() || !form.quantity || !form.producedAt) return;
            createFingerlingBatch({ code: form.code.trim(), species: form.species.trim(), quantity: Number(form.quantity), producedAt: form.producedAt });
            setForm({ code: "", species: "Tilapia", quantity: "", producedAt: "" });
            setRefresh((n) => n + 1);
          }}>Save Batch</Button></div>
  const [brooders, setBrooders] = useState(listBrooders());
  const [batches, setBatches] = useState(listFingerlingBatches());
  const [brooderForm, setBrooderForm] = useState({ name: "", species: "", status: "active" as const });
  const [batchForm, setBatchForm] = useState({
    brooderId: "",
    quantity: "0",
    productionDate: new Date().toISOString().slice(0, 10),
    growthStatus: "early" as const,
  });

  const totalFingerlings = useMemo(() => batches.reduce((acc, row) => acc + row.quantity, 0), [batches]);

  return (
    <DashboardLayout title="Hatchery Management" subtitle="Brooder tracking and fingerling production records.">
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader><CardTitle className="text-sm">Brooders</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{brooders.length}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Fingerling Batches</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{batches.length}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Total Fingerlings</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{totalFingerlings.toLocaleString()}</CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Add Brooder</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div className="space-y-2"><Label>Name</Label><Input value={brooderForm.name} onChange={(e)=>setBrooderForm((f)=>({...f,name:e.target.value}))} /></div>
          <div className="space-y-2"><Label>Species</Label><Input value={brooderForm.species} onChange={(e)=>setBrooderForm((f)=>({...f,species:e.target.value}))} /></div>
          <div className="space-y-2"><Label>Status</Label><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={brooderForm.status} onChange={(e)=>setBrooderForm((f)=>({...f,status:e.target.value as "active" | "paused"}))}><option value="active">active</option><option value="paused">paused</option></select></div>
          <div className="flex items-end"><Button onClick={()=>{ if(!brooderForm.name.trim()) return; createBrooder(brooderForm); setBrooders(listBrooders()); setBrooderForm({name:"",species:"",status:"active"}); }}>Save Brooder</Button></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Fingerling Batches</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          {batches.length === 0 ? <p className="text-muted-foreground">No fingerling batches yet.</p> : batches.map((b) => (
            <div key={b.id} className="rounded border p-3">
              <p className="font-medium">{b.code} · {b.species} · {b.quantity} pcs</p>
              <p className="text-xs text-muted-foreground">Produced: {b.producedAt} · Status: {b.status}{b.transferredToCage ? ` · Transferred to ${b.transferredToCage}` : ""}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {b.status === "growing" && <Button size="sm" variant="outline" onClick={() => { markBatchReadyForTransfer(b.id); setRefresh((n) => n + 1); }}>Mark Ready</Button>}
                {b.status === "ready_for_transfer" && (
                  <>
                    <Input className="h-8 w-40" placeholder="Target cage e.g. Cage-1" value={cageMap[b.id] ?? ""} onChange={(e) => setCageMap((prev) => ({ ...prev, [b.id]: e.target.value }))} />
                    <Button size="sm" onClick={() => { const cage = cageMap[b.id]?.trim(); if (!cage) return; transferFingerlingsToCage(b.id, cage); setRefresh((n) => n + 1); }}>Transfer to Cage</Button>
                  </>
                )}
              </div>
        <CardHeader><CardTitle>Record Fingerling Production</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-5">
          <div className="space-y-2"><Label>Brooder</Label><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={batchForm.brooderId} onChange={(e)=>setBatchForm((f)=>({...f,brooderId:e.target.value}))}><option value="">Select</option>{brooders.map((b)=><option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
          <div className="space-y-2"><Label>Quantity</Label><Input type="number" value={batchForm.quantity} onChange={(e)=>setBatchForm((f)=>({...f,quantity:e.target.value}))} /></div>
          <div className="space-y-2"><Label>Production Date</Label><Input type="date" value={batchForm.productionDate} onChange={(e)=>setBatchForm((f)=>({...f,productionDate:e.target.value}))} /></div>
          <div className="space-y-2"><Label>Growth Status</Label><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={batchForm.growthStatus} onChange={(e)=>setBatchForm((f)=>({...f,growthStatus:e.target.value as "early" | "mid" | "ready_for_transfer"}))}><option value="early">early</option><option value="mid">mid</option><option value="ready_for_transfer">ready_for_transfer</option></select></div>
          <div className="flex items-end"><Button onClick={()=>{ if(!batchForm.brooderId) return; createFingerlingBatch({...batchForm, quantity:Number(batchForm.quantity || "0")}); setBatches(listFingerlingBatches()); }}>Save Batch</Button></div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Ready Transfers to Production</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {batches.filter((b) => b.growthStatus === "ready_for_transfer" && !b.transferredToCage).map((batch) => (
            <div key={batch.id} className="flex flex-wrap items-center gap-3 rounded-md border p-3">
              <p className="text-sm">Batch {batch.id.slice(0, 8)} • Qty {batch.quantity}</p>
              <Input placeholder="Target cage name" className="max-w-56" onBlur={(e) => {
                const cageName = e.target.value.trim();
                if (!cageName) return;
                markFingerlingBatchTransferred(batch.id, cageName);
                createProductionEvent({
                  cageName,
                  eventType: "stocking",
                  quantity: batch.quantity,
                  weightKg: 0,
                  date: new Date().toISOString().slice(0, 10),
                  notes: `Transferred from hatchery batch ${batch.id}`,
                });
                setBatches(listFingerlingBatches());
                e.target.value = "";
              }} />
              <p className="text-xs text-muted-foreground">Enter cage name and blur input to transfer.</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
