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
            </div>
          ))}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
