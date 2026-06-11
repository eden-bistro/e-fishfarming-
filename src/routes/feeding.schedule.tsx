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
} from "@/lib/device-firebase";
import { listCages, type Cage } from "@/services/modules/cages.service";
import {
  listProductionEventsRemote,
  type ProductionEvent,
} from "@/services/modules/production.service";

export const Route = createFileRoute("/feeding/schedule")({
  head: () => ({ meta: [{ title: "Feeding Schedule — AquaSmart" }] }),
  component: Page,
});

function getLocalDateTimeValue(date = new Date()) {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function normalizeName(value: string) {
  return value.trim().toLowerCase();
}

function findTargetCage(target: string, cages: Cage[]) {
  const normalizedTarget = normalizeName(target);
  return cages.find(
    (cage) => cage.id === target.trim() || normalizeName(cage.name) === normalizedTarget,
  );
}

function productionFishCount(target: string, cages: Cage[], events: ProductionEvent[]) {
  const cage = findTargetCage(target, cages);
  const acceptedIds = new Set([target.trim(), normalizeName(target)]);
  if (cage) {
    acceptedIds.add(cage.id);
    acceptedIds.add(normalizeName(cage.name));
  }

  return events.reduce((total, event) => {
    const eventCage = normalizeName(event.cageId);
    if (!acceptedIds.has(event.cageId) && !acceptedIds.has(eventCage)) return total;
    const fishCount = Number(event.fishCount ?? 0) || 0;
    if (event.type === "stocking") return total + fishCount;
    if (event.type === "mortality" || event.type === "harvest" || event.type === "sale") {
      return Math.max(0, total - fishCount);
    }
    return total;
  }, 0);
}

function availableFishCount(target: string, cages: Cage[], events: ProductionEvent[]) {
  const cage = findTargetCage(target, cages);
  if (cage && cage.fishPopulation > 0) return cage.fishPopulation;
  return productionFishCount(target, cages, events);
}

function formatCommandTime(command: FeedingCommand) {
  const value = command.scheduledFor || command.requestedAt;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString() : value;
}

function Page() {
  const [rows, setRows] = useState<FeedingCommand[]>([]);
  const [cages, setCages] = useState<Cage[]>([]);
  const [productionEvents, setProductionEvents] = useState<ProductionEvent[]>([]);
  const [form, setForm] = useState({
    targetPondId: "",
    amountKg: "",
    requestedBy: "operator",
    scheduledFor: getLocalDateTimeValue(),
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const queuedCount = useMemo(() => rows.filter((row) => row.status === "queued").length, [rows]);
  const selectedFishCount = useMemo(
    () => availableFishCount(form.targetPondId, cages, productionEvents),
    [cages, form.targetPondId, productionEvents],
  );

  async function refreshCommands() {
    const data = await listFeedingCommands(30);
    setRows(data);
  }

  async function refreshFarmData() {
    setCages(listCages());
    setProductionEvents(await listProductionEventsRemote());
  }

  async function addCommand() {
    const amount = Number(form.amountKg);
    const targetPondId = form.targetPondId.trim();
    const scheduledDate = new Date(form.scheduledFor);
    if (!targetPondId || !form.requestedBy.trim() || amount <= 0) {
      setMessage("Fill cage/pond, requester and a valid amount.");
      return;
    }
    if (!form.scheduledFor || !Number.isFinite(scheduledDate.getTime())) {
      setMessage("Choose a valid feeding time before queueing.");
      return;
    }

    const fishCount = availableFishCount(targetPondId, cages, productionEvents);
    if (fishCount <= 0) {
      setMessage(
        "Add fish stock for this cage in Cage Management or Production before scheduling feeding.",
      );
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const id = await queueFeedingCommand({
        action: "dispense_feed",
        amountKg: amount,
        targetPondId,
        requestedBy: form.requestedBy.trim(),
        scheduledFor: scheduledDate.toISOString(),
      });
      setMessage(
        `Feeding command scheduled successfully (${id}) for ${scheduledDate.toLocaleString()}.`,
      );
      setForm((current) => ({ ...current, amountKg: "", scheduledFor: getLocalDateTimeValue() }));
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
        const [commands] = await Promise.all([listFeedingCommands(30), refreshFarmData()]);
        if (mounted) setRows(commands);
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
      subtitle="Schedule feeding after confirming the selected cage has stocked fish."
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Queue Feeding Command</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-5">
          <div className="space-y-1">
            <Label>Cage / Pond</Label>
            <Input
              value={form.targetPondId}
              onChange={(e) => setForm((f) => ({ ...f, targetPondId: e.target.value }))}
              placeholder="e.g. Cage 001"
              list="feeding-cage-options"
            />
            <datalist id="feeding-cage-options">
              {cages.map((cage) => (
                <option key={cage.id} value={cage.name} />
              ))}
            </datalist>
            {form.targetPondId ? (
              <p className="text-xs text-muted-foreground">
                Fish available for feeding: {selectedFishCount}
              </p>
            ) : null}
          </div>
          <div className="space-y-1">
            <Label>Feed (kg)</Label>
            <Input
              value={form.amountKg}
              onChange={(e) => setForm((f) => ({ ...f, amountKg: e.target.value }))}
              type="number"
              min="0"
              step="0.1"
            />
          </div>
          <div className="space-y-1">
            <Label>Feeding time</Label>
            <Input
              value={form.scheduledFor}
              onChange={(e) => setForm((f) => ({ ...f, scheduledFor: e.target.value }))}
              type="datetime-local"
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
            <Button
              onClick={() => void addCommand()}
              disabled={loading}
              className="min-h-10 w-full"
            >
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
                {formatCommandTime(r)} · {r.targetPondId} · {r.amountKg.toFixed(1)} kg · {r.status}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
