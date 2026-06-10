import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { listDeviceStatuses, type DeviceStatus } from "@/lib/esp32-firebase";
import { DEFAULT_FARM_ID, DEFAULT_POND_ID, setActiveFarmId, setActivePondId } from "@/lib/tenant";

export const Route = createFileRoute("/settings/devices")({
  head: () => ({ meta: [{ title: "Devices — AquaSmart" }] }),
  component: Page,
});

type SetupStatus = {
  type: "idle" | "success" | "error";
  message: string;
};

function Page() {
  const [rows, setRows] = useState<DeviceStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [setupStatus, setSetupStatus] = useState<SetupStatus>({ type: "idle", message: "" });
  const [form, setForm] = useState({
    farmId: DEFAULT_FARM_ID,
    pondId: DEFAULT_POND_ID,
    cageId: DEFAULT_POND_ID,
    deviceId: "ESP32_001",
    farmName: "Default Farm",
    cageName: "Cage 001",
    firmware: "v3.1-fixedwifi",
    setupToken: "",
  });

  async function loadDevices() {
    setIsLoading(true);
    const farmId = form.farmId.trim();
    const pondId = form.pondId.trim();
    setActiveFarmId(farmId);
    setActivePondId(pondId);
    const data = await listDeviceStatuses();
    setRows(data);
    setIsLoading(false);
  }

  useEffect(() => {
    let mounted = true;
    async function load() {
      const farmId = form.farmId.trim();
      const pondId = form.pondId.trim();
      setActiveFarmId(farmId);
      setActivePondId(pondId);
      const data = await listDeviceStatuses();
      if (mounted) {
        setRows(data);
        setIsLoading(false);
      }
    }
    void load();
    const timer = setInterval(() => void load(), 10000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [form.farmId, form.pondId]);

  async function setupFarmDevice() {
    const farmId = form.farmId.trim();
    const pondId = form.pondId.trim();
    const deviceId = form.deviceId.trim();
    const setupToken = form.setupToken.trim();

    if (!farmId || !pondId || !deviceId) {
      setSetupStatus({
        type: "error",
        message: "Farm ID, cage/pond ID and device ID are required.",
      });
      return;
    }
    if (!setupToken) {
      setSetupStatus({ type: "error", message: "Enter your IoT setup token first." });
      return;
    }

    setActiveFarmId(farmId);
    setActivePondId(pondId);

    setIsSubmitting(true);
    setSetupStatus({ type: "idle", message: "" });

    const payload = {
      farmId,
      pondId,
      cageId: form.cageId.trim() || pondId,
      deviceId,
      farmName: form.farmName.trim() || "Default Farm",
      cageName: form.cageName.trim() || pondId,
      firmware: form.firmware.trim() || "unknown",
    };

    try {
      const response = await fetch("/api/iot/setup", {
        method: "POST",
        headers: {
          authorization: `Bearer ${setupToken}`,
          "content-type": "application/json; charset=utf-8",
        },
        body: JSON.stringify(payload),
      });
      const result = (await response.json().catch(() => null)) as {
        ok?: boolean;
        message?: string;
        detail?: string;
      } | null;

      if (!response.ok || !result?.ok) {
        const message = result?.message || `Setup failed with HTTP ${response.status}.`;
        setSetupStatus({
          type: "error",
          message: result?.detail ? `${message} ${result.detail}` : message,
        });
        return;
      }

      setSetupStatus({
        type: "success",
        message: `Created/updated ${farmId} / ${pondId} and linked ${deviceId}.`,
      });
      await loadDevices();
    } catch (error) {
      setSetupStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Setup request failed.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <DashboardLayout
      title="Devices"
      subtitle="IoT hardware connected to your farm (Firebase realtime)."
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Connected Devices</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {isLoading ? (
              <p className="text-muted-foreground">Loading device heartbeat data…</p>
            ) : rows.length === 0 ? (
              <p className="text-muted-foreground">No device heartbeat data available.</p>
            ) : (
              rows.map((row) => (
                <div key={row.deviceId} className="rounded border p-3">
                  <p className="font-medium">{row.deviceId}</p>
                  <p className="text-xs text-muted-foreground">
                    Firmware: {row.firmware} · Online: {row.online ? "Yes" : "No"} · RSSI:{" "}
                    {row.rssi} · Heap: {row.freeHeap} · Updated:{" "}
                    {new Date(row.updatedAt).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Create Farm & Cage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              Create or refresh the Firebase metadata that links your farm, cage and ESP32 device.
              The setup token is sent only with this request and is not stored in the browser.
            </p>

            {setupStatus.type !== "idle" ? (
              <Alert variant={setupStatus.type === "error" ? "destructive" : "default"}>
                <AlertTitle>
                  {setupStatus.type === "error" ? "Setup failed" : "Setup complete"}
                </AlertTitle>
                <AlertDescription>{setupStatus.message}</AlertDescription>
              </Alert>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="farm-id">Farm ID</Label>
                <Input
                  id="farm-id"
                  value={form.farmId}
                  onChange={(event) => setForm((prev) => ({ ...prev, farmId: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pond-id">Cage / Pond ID</Label>
                <Input
                  id="pond-id"
                  value={form.pondId}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      pondId: event.target.value,
                      cageId: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="device-id">Device ID</Label>
                <Input
                  id="device-id"
                  value={form.deviceId}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, deviceId: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="firmware">Firmware</Label>
                <Input
                  id="firmware"
                  value={form.firmware}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, firmware: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="farm-name">Farm Name</Label>
                <Input
                  id="farm-name"
                  value={form.farmName}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, farmName: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cage-name">Cage Name</Label>
                <Input
                  id="cage-name"
                  value={form.cageName}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, cageName: event.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="setup-token">IoT Setup Token</Label>
              <Input
                id="setup-token"
                type="password"
                autoComplete="off"
                value={form.setupToken}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, setupToken: event.target.value }))
                }
                placeholder="Paste IOT_SETUP_TOKEN or IOT_INGEST_TOKEN"
              />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button onClick={() => void setupFarmDevice()} disabled={isSubmitting}>
                {isSubmitting ? "Creating…" : "Create / Link Device"}
              </Button>
              <Button variant="outline" onClick={() => void loadDevices()} disabled={isSubmitting}>
                Refresh devices
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
