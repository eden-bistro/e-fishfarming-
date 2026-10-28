import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Hand } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { getActivePondId } from "@/lib/tenant";
import { listFeedingEvents, pushManualFeedingEvent, type FeedingEventRow } from "@/lib/platform-clients";

export const Route = createFileRoute("/feeding/manual")({
  head: () => ({ meta: [{ title: "Record Manual Feeding — AquaSmart" }] }),
  component: Page,
});

function formatEventTime(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString() : value;
}

function Page() {
  const [amount, setAmount] = useState([2.5]);
  const [events, setEvents] = useState<FeedingEventRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const pondId = getActivePondId();

  const refreshEvents = useCallback(async () => {
    setLoadingEvents(true);
    try {
      const rows = await listFeedingEvents();
      setEvents(rows.filter((row) => row.pond_id === pondId).slice(0, 10));
    } finally {
      setLoadingEvents(false);
    }
  }, [pondId]);

  useEffect(() => {
    void refreshEvents();
  }, [refreshEvents]);

  async function recordManualFeeding() {
    if (!pondId) {
      toast.error("Select an active pond before recording a feeding.");
      return;
    }

    setLoading(true);
    try {
      await pushManualFeedingEvent(amount[0]);
      toast.success("Manual feeding event recorded.");
      await refreshEvents();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? `${error.message} Check the recent records before retrying to avoid a duplicate entry.`
          : "Could not confirm the feeding record. Check recent records before retrying.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout
      title="Record Manual Feeding"
      subtitle="Record feed that has already been dispensed manually. This page does not control a feeder device."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Record Completed Manual Feeding</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-md border p-3 text-sm">
              <p className="font-medium">Active pond</p>
              <p className="mt-1 text-muted-foreground">{pondId || "No pond selected"}</p>
            </div>
            <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
              Only submit this form after feed has actually been dispensed by a person. It does not send a command to the ESP32 or feeder.
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Amount actually dispensed</Label>
                <span className="font-mono text-sm">{amount[0].toFixed(1)} kg</span>
              </div>
              <Slider value={amount} onValueChange={setAmount} min={0.1} max={10} step={0.1} />
            </div>
            <Button className="w-full gap-2" disabled={loading || !pondId} onClick={() => void recordManualFeeding()}>
              <Hand className="h-4 w-4" />
              {loading ? "Recording..." : "Record Manual Feeding"}
            </Button>
            <p className="text-xs text-muted-foreground">
              This records the event only. Inventory deduction is not performed here because stock persistence and event recording are not yet a single atomic operation.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Manual Feeding Records</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {loadingEvents ? (
              <p className="text-muted-foreground">Loading saved feeding records...</p>
            ) : events.length === 0 ? (
              <p className="text-muted-foreground">No saved feeding records found for the active pond.</p>
            ) : (
              events.map((event, index) => (
                <div key={event.id ?? `${event.timestamp}-${index}`} className="flex items-center gap-3 rounded-lg border p-3">
                  <Hand className="h-4 w-4 text-brand" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {event.pond_id} · {Number(event.amount_kg).toFixed(1)} kg
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatEventTime(event.timestamp)} · {event.mode || "manual"} · {event.status || "recorded"}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
