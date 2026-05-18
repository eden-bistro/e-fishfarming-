import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useMemo, useState } from "react";

type FeedScheduleRow = {
  id: string;
  time: string;
  amountKg: number;
  pond: string;
};

export const Route = createFileRoute("/feeding/schedule")({
  head: () => ({ meta: [{ title: "Feeding Schedule — AquaSmart" }] }),
  component: Page,
});

function Page() {
  const [rows, setRows] = useState<FeedScheduleRow[]>([]);
  const [form, setForm] = useState({ time: "", amountKg: "", pond: "" });

  const totalKg = useMemo(() => rows.reduce((sum, r) => sum + r.amountKg, 0), [rows]);

  function addSchedule() {
    const amount = Number(form.amountKg);
    if (!form.time || !form.pond.trim() || Number.isNaN(amount) || amount <= 0) return;

    setRows((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        time: form.time,
        pond: form.pond.trim(),
        amountKg: amount,
      },
    ]);
    setForm({ time: "", amountKg: "", pond: "" });
  }

  return (
    <DashboardLayout title="Feeding Schedule" subtitle="Create and manage scheduled feeding sessions.">
      <Card>
        <CardHeader><CardTitle className="text-base">Add Schedule</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div className="space-y-1"><Label>Time</Label><Input type="time" value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} /></div>
          <div className="space-y-1"><Label>Pond</Label><Input value={form.pond} placeholder="Pond A" onChange={(e) => setForm((f) => ({ ...f, pond: e.target.value }))} /></div>
          <div className="space-y-1"><Label>Amount (kg)</Label><Input type="number" value={form.amountKg} placeholder="2.5" onChange={(e) => setForm((f) => ({ ...f, amountKg: e.target.value }))} /></div>
          <div className="flex items-end"><Button className="w-full" onClick={addSchedule}>Add</Button></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Today's Plan ({totalKg.toFixed(1)} kg)</CardTitle></CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No feeding schedule data available.</p>
          ) : (
            <ul className="space-y-2">
              {rows.map((r) => (
                <li key={r.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                  <span>{r.time} · {r.pond}</span>
                  <span className="font-medium">{r.amountKg.toFixed(1)} kg</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
