import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Hand, Play, RefreshCw } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { getLatestOnlineWaterReading, type WaterReading } from "@/lib/platform-clients";
import { getActivePondId } from "@/lib/tenant";
import { getSessionUser } from "@/lib/auth";
import {
  listFeedingCommands,
  queueFeedingCommand,
  type FeedingCommand,
} from "@/lib/device-firebase";

export const Route = createFileRoute("/feeding/manual")({
  head: () => ({ meta: [{ title: "Manual Feeding — AquaSmart" }] }),
  component: Page,
});

function waterQualityStatus(reading: WaterReading | null) {
  if (!reading) {
    return {
      canFeed: false,
      label: "No live water data",
      message:
        "A verified online water reading is required before a feeding command can be queued.",
    };
  }

  const canFeed =
    reading.dissolvedOxygen >= 5 &&
    reading.ph >= 6.5 &&
    reading.ph <= 8.5 &&
    reading.ammonia <= 0.05;

  return {
    canFeed,
    label: canFeed ? "Water quality within feeding limits" : "Water quality requires attention",
    message: canFeed
      ? "The latest online reading meets the current dissolved oxygen, pH, and ammonia checks."
      : "The feeding command is blocked until dissolved oxygen, pH, and ammonia return to the configured ranges.",
  };
}

function commandStatusLabel(status: FeedingCommand["status"]) {
  switch (status) {
    case "queued":
      return "Queued — awaiting device";
    case "ack":
      return "Acknowledged by device";
    case "done":
      return "Reported complete by device";
    case "failed":
      return "Device reported failure";
  }
}

function Page() {
  const [amount, setAmount] = useState([2.5]);
  const [quality, setQuality] = useState({
    canFeed: false,
    label: "Checking water quality…",
    message: "Checking the latest online water sensor before queuing a command.",
  });
  const [commands, setCommands] = useState<FeedingCommand[]>([]);
  const [loadingCommands, setLoadingCommands] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const activePondId = getActivePondId();

  useEffect(() => {
    let mounted = true;
    async function loadQuality() {
      try {
        const status = waterQualityStatus(await getLatestOnlineWaterReading());
        if (mounted) setQuality(status);
      } catch {
        if (mounted) {
          setQuality({
            canFeed: false,
            label: "Water quality unavailable",
            message: "Could not verify the latest online water reading. Feeding remains blocked.",
          });
        }
      }
    }
    void loadQuality();
    const timer = window.setInterval(() => void loadQuality(), 30_000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    async function loadCommands() {
      try {
        const latest = await listFeedingCommands(20);
        if (mounted) setCommands(latest);
      } finally {
        if (mounted) setLoadingCommands(false);
      }
    }
    void loadCommands();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void loadCommands();
    }, 30_000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <DashboardLayout
      title="Manual Feeding"
      subtitle="Queue a feeding command for the active pond and track device-reported status."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Queue Feed Command</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-1">
              <Label>Active pond ID</Label>
              <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm font-mono">
                {activePondId || "No pond selected"}
              </p>
              <p className="text-xs text-muted-foreground">
                The command targets the active pond configured in AquaSmart. The pond selector must
                be changed in farm/device settings.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Feed amount</Label>
                <span className="font-mono text-sm">{amount[0].toFixed(1)} kg</span>
              </div>
              <Slider value={amount} onValueChange={setAmount} min={0.5} max={10} step={0.1} />
            </div>
            <div
              className={`rounded-md border p-3 text-sm ${quality.canFeed ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}
            >
              <p className="font-medium">{quality.label}</p>
              <p className="mt-1 text-xs">{quality.message}</p>
            </div>
            <Button
              className="w-full gap-2"
              disabled={!quality.canFeed || !activePondId || submitting}
              onClick={async () => {
                if (!quality.canFeed || !activePondId) {
                  toast.error(
                    "Cannot queue feeding: verify the active pond and live water quality first.",
                  );
                  return;
                }
                setSubmitting(true);
                try {
                  const user = getSessionUser();
                  await queueFeedingCommand({
                    action: "dispense_feed",
                    amountKg: amount[0],
                    targetPondId: activePondId,
                    requestedBy: user?.email ?? "",
                  });
                  const latest = await listFeedingCommands(20);
                  setCommands(latest);
                  toast.success(
                    "Feeding command queued. AquaSmart will show device status when the device responds; feed dispensing is not yet confirmed.",
                  );
                } catch (error) {
                  toast.error(
                    error instanceof Error ? error.message : "Could not queue the feeding command.",
                  );
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              <Play className="h-4 w-4" />
              {submitting ? "Queuing command…" : "Queue Feeding Command"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Queuing a command does not mean feed was dispensed. Inventory and production records
              are not updated here; those should only be reconciled against confirmed execution.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Recent Feeding Commands</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              disabled={loadingCommands}
              onClick={async () => {
                setLoadingCommands(true);
                try {
                  setCommands(await listFeedingCommands(20));
                } finally {
                  setLoadingCommands(false);
                }
              }}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {loadingCommands && commands.length === 0 ? (
              <p className="text-muted-foreground">Loading command history…</p>
            ) : commands.length === 0 ? (
              <p className="text-muted-foreground">
                No feeding commands are available for this farm and pond.
              </p>
            ) : (
              commands.map((command) => (
                <div key={command.id} className="flex items-start gap-3 rounded-lg border p-3">
                  <Hand className="mt-0.5 h-4 w-4 text-brand" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {command.amountKg.toFixed(1)} kg · {command.targetPondId}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {commandStatusLabel(command.status)}
                    </p>
                    <p className="break-all text-xs text-muted-foreground">ID: {command.id}</p>
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
