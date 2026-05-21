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
  const [rows, setRows] = useState<FeedingCommand[]>([]);
  const [form, setForm] = useState({
    amountKg: "",
    targetPondId: "pond-a",
    requestedBy: "operator",
  });

  async function load() {
    setRows(await listFeedingCommands());
  }

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 10000);
    return () => clearInterval(timer);
  }, []);

  const queuedCount = useMemo(() => rows.filter((r) => r.status === "queued").length, [rows]);

  async function addCommand() {
    const amount = Number(form.amountKg);
    if (amount <= 0) return;
    await queueFeedingCommand({
      action: "dispense_feed",
      amountKg: amount,
      targetPondId: form.targetPondId,
      requestedBy: form.requestedBy,
    });
    setForm((current) => ({ ...current, amountKg: "" }));
    await load();
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
