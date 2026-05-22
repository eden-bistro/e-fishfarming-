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
  const [form, setForm] = useState({ targetPondId: "pond-a", amountKg: "", requestedBy: "operator" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const queuedCount = useMemo(() => rows.filter((row) => row.status === "queued").length, [rows]);

  async function refreshCommands() {
    const data = await listFeedingCommands(30);
    setRows(data);
  }

  async function addCommand() {
    const amount = Number(form.amountKg);
    if (!form.targetPondId.trim() || !form.requestedBy.trim() || amount <= 0) {
      setMessage("Fill pond, requester and a valid amount.");
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const id = await queueFeedingCommand({
        action: "dispense_feed",
        amountKg: amount,
        targetPondId: form.targetPondId.trim(),
        requestedBy: form.requestedBy.trim(),
      });
      setMessage(`Command queued successfully (${id}).`);
      setForm((current) => ({ ...current, amountKg: "" }));
      await refreshCommands();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to queue command.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const data = await listFeedingCommands(30);
        if (mounted) setRows(data);
      } catch {
        if (mounted) setRows([]);
      }
    };
    void load();
    const timer = setInterval(() => void load(), 7000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

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
            <Button onClick={() => void addCommand()} disabled={loading}>
              {loading ? "Queuing..." : "Queue"}
            </Button>
          </div>
        </CardContent>
      </Card>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}

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
