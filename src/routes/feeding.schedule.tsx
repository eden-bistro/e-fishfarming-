import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMemo, useState } from "react";

type FeedScheduleRow = { id: string; time: string; amountKg: number; pond: string };

export const Route = createFileRoute("/feeding/schedule")({
  head: () => ({ meta: [{ title: "Feeding Schedule — AquaSmart" }] }),
  component: Page,
});

function Page() {
  const [rows, setRows] = useState<FeedScheduleRow[]>([]);
  const [form, setForm] = useState({ time: "", pond: "Pond A", amountKg: "" });

  const totalKg = useMemo(() => rows.reduce((sum, row) => sum + row.amountKg, 0), [rows]);

  function addSchedule() {
    const amount = Number(form.amountKg);
    if (!form.time || !form.pond.trim() || amount <= 0) return;

    const next: FeedScheduleRow = {
      id: crypto.randomUUID(),
      time: form.time,
      pond: form.pond.trim(),
      amountKg: amount,
    };

    setRows((current) =>
      [...current, next].sort(
        (a, b) => a.time.localeCompare(b.time) || a.pond.localeCompare(b.pond),
      ),
    );
    setForm((current) => ({ ...current, amountKg: "" }));
  }

  return (
    <DashboardLayout title="Feeding Schedule" subtitle="Plan daily feed windows per cage/pond.">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Schedule</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div className="space-y-1">
            <Label>Time</Label>
            <Input
              type="time"
              value={form.time}
              onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Pond / Cage</Label>
            <Input
              value={form.pond}
              onChange={(e) => setForm((f) => ({ ...f, pond: e.target.value }))}
              placeholder="Pond A"
            />
          </div>
          <div className="space-y-1">
            <Label>Feed (kg)</Label>
            <Input
              value={form.amountKg}
              onChange={(e) => setForm((f) => ({ ...f, amountKg: e.target.value }))}
              placeholder="2.5"
            />
          </div>
          <div className="flex items-end">
            <Button onClick={addSchedule}>Add</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Today's Plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {rows.length === 0 ? (
            <p className="text-muted-foreground">No feeding schedule data available.</p>
          ) : (
            rows.map((r) => (
              <div key={r.id} className="rounded border p-2">
                {r.time} · {r.pond} · {r.amountKg.toFixed(1)} kg
              </div>
            ))
          )}
          <p className="pt-2 text-xs text-muted-foreground">
            Total planned feed: {totalKg.toFixed(1)} kg
          </p>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
