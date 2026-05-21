import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useMemo, useState } from "react";
import {
  listFeedingCommands,
  queueFeedingCommand,
  type FeedingCommand,
} from "@/lib/esp32-firebase";

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
    <DashboardLayout
      title="Feeding Commands"
      subtitle="Firebase realtime command queue for ESP32 feeders."
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Queue Feeding Command</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div className="space-y-1">
            <Label>Pond ID</Label>
            <Input
              value={form.targetPondId}
              onChange={(e) => setForm((f) => ({ ...f, targetPondId: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Feed (kg)</Label>
            <Input
              value={form.amountKg}
              onChange={(e) => setForm((f) => ({ ...f, amountKg: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Requested by</Label>
            <Input
              value={form.requestedBy}
              onChange={(e) => setForm((f) => ({ ...f, requestedBy: e.target.value }))}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={() => void addCommand()}>Queue</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Command Status (Queued: {queuedCount})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {rows.length === 0 ? (
            <p className="text-muted-foreground">No command data available.</p>
          ) : (
            rows.map((r) => (
              <div key={r.id} className="rounded border p-2">
                {r.requestedAt} · {r.targetPondId} · {r.amountKg.toFixed(1)} kg · {r.status}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
