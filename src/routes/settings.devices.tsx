import { createFileRoute } from "@tanstack/react-router";
import { Activity, AlertCircle, CheckCircle2, Lock, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AccessDenied } from "@/components/access-denied";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { userHasRole } from "@/contexts/rbac";
import {
  DEVICE_STATUS_POLL_MS,
  DEVICE_STATUS_TICK_MS,
  deviceOfflineCountdown,
  formatHeartbeatAge,
  isFreshHeartbeat,
  listDeviceStatuses,
  type DeviceStatus,
} from "@/lib/esp32-firebase";
import { DEFAULT_FARM_ID, DEFAULT_POND_ID, setActiveFarmId, setActivePondId } from "@/lib/tenant";

export const Route = createFileRoute("/settings/devices")({
  head: () => ({ meta: [{ title: "Devices — AquaSmart" }] }),
  component: Page,
});

type SetupStatus = {
  type: "idle" | "success" | "error";
  message: string;
};

function isDeviceOnline(row: DeviceStatus, now: number): boolean {
  return Boolean(row.online) && isFreshHeartbeat(row.updatedAt, now);
}

function deviceStatusText(row: DeviceStatus, now: number): string {
  return isDeviceOnline(row, now) ? "Online" : "Offline";
}

function deviceStatusHelp(row: DeviceStatus, now: number): string {
  if (!row.updatedAt) return "No heartbeat has been received yet.";

  const offlineIn = deviceOfflineCountdown(row.updatedAt, now);
  if (isDeviceOnline(row, now)) {
    return offlineIn
      ? `Connected now. If no new heartbeat arrives, this device will show Offline in ${offlineIn}.`
      : "Connected and sending heartbeat data.";
  }

  return "No recent heartbeat. Check device power, Wi-Fi, token, and firmware.";
}

function Page() {
  const canProvisionDevices = userHasRole(["super_admin"]);
  const [rows, setRows] = useState<DeviceStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [now, setNow] = useState(() => Date.now());
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

  const deviceSummary = useMemo(() => {
    const online = rows.filter((row) => isDeviceOnline(row, now)).length;
    return { online, offline: rows.length - online, total: rows.length };
  }, [now, rows]);

  async function loadDevices() {
    setIsLoading(true);
    const farmId = form.farmId.trim() || DEFAULT_FARM_ID;
    const pondId = form.pondId.trim() || DEFAULT_POND_ID;
    setActiveFarmId(farmId);
    setActivePondId(pondId);
    try {
      const data = await listDeviceStatuses(farmId, pondId);
      setRows(data);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    async function load() {
      const farmId = form.farmId.trim() || DEFAULT_FARM_ID;
      const pondId = form.pondId.trim() || DEFAULT_POND_ID;
      setActiveFarmId(farmId);
      setActivePondId(pondId);
      const data = await listDeviceStatuses(farmId, pondId);
      if (mounted) {
        setRows(data);
        setIsLoading(false);
      }
    }
    void load();
    const timer = setInterval(() => void load(), DEVICE_STATUS_POLL_MS);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [form.farmId, form.pondId]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), DEVICE_STATUS_TICK_MS);
    return () => clearInterval(timer);
  }, []);

  async function setupFarmDevice() {
    const farmId = form.farmId.trim();
    const pondId = form.pondId.trim();
    const deviceId = form.deviceId.trim();
    const setupToken = form.setupToken.trim();

    if (!canProvisionDevices) {
      setSetupStatus({
        type: "error",
        message: "Only a system administrator can add or reconnect farm devices.",
      });
      return;
    }

    if (!farmId || !pondId || !deviceId) {
      setSetupStatus({
        type: "error",
        message: "Farm ID, cage/pond ID and device ID are required.",
      });
      return;
    }
    if (!setupToken) {
      setSetupStatus({ type: "error", message: "Enter the admin setup token first." });
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
        message: `${deviceId} is linked to ${farmId} / ${pondId}. Ask the farmer to power the device and wait for the Online badge.`,
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
      subtitle="Simple device status for farmers, with admin-only setup for ESP32 hardware."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Devices</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{deviceSummary.total}</div>
            <p className="text-xs text-muted-foreground">Devices linked to this farm/cage.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Online</CardTitle>
            <Wifi className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-success">{deviceSummary.online}</div>
            <p className="text-xs text-muted-foreground">
              Heartbeat received in the last 5 minutes.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Offline</CardTitle>
            <WifiOff className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-destructive">{deviceSummary.offline}</div>
            <p className="text-xs text-muted-foreground">
              Needs power, Wi‑Fi, token, or firmware check.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Farm Device Status</CardTitle>
              <p className="text-xs text-muted-foreground">
                Farmers can see connection health here. Device setup is handled by an administrator.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={loadDevices} disabled={isLoading}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {isLoading ? (
              <p className="text-muted-foreground">Loading device heartbeat data…</p>
            ) : rows.length === 0 ? (
              <div className="rounded-lg border border-dashed p-5 text-center">
                <AlertCircle className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                <p className="font-medium">No device is linked yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  You can continue using farm, production, inventory and finance tools. Ask your
                  system administrator to add the ESP32 device before live sensor readings appear.
                </p>
              </div>
            ) : (
              rows.map((row) => {
                const online = isDeviceOnline(row, now);
                return (
                  <div key={row.deviceId} className="rounded-lg border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{row.deviceId}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Last seen {formatHeartbeatAge(row.updatedAt, now)} · Firmware{" "}
                          {row.firmware || "unknown"}
                        </p>
                      </div>
                      <Badge variant={online ? "default" : "destructive"}>
                        {online ? (
                          <Wifi className="mr-1 h-3 w-3" />
                        ) : (
                          <WifiOff className="mr-1 h-3 w-3" />
                        )}
                        {deviceStatusText(row, now)}
                      </Badge>
                    </div>
                    <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                      <span>Signal: {row.rssi || "--"} RSSI</span>
                      <span>Memory: {row.freeHeap || "--"}</span>
                      <span>
                        Updated:{" "}
                        {row.updatedAt ? new Date(row.updatedAt).toLocaleString() : "Never"}
                      </span>
                    </div>
                    <p className="mt-3 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                      {deviceStatusHelp(row, now)}
                    </p>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {canProvisionDevices ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Admin Device Setup</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Safe for farmers</AlertTitle>
                <AlertDescription>
                  This setup links a device to a farm/cage. Farmers do not need to see tokens or
                  device credentials; they only see Online/Offline status and sensor readings.
                </AlertDescription>
              </Alert>

              {setupStatus.type !== "idle" && (
                <Alert variant={setupStatus.type === "error" ? "destructive" : "default"}>
                  <AlertTitle>
                    {setupStatus.type === "error" ? "Setup failed" : "Setup complete"}
                  </AlertTitle>
                  <AlertDescription>{setupStatus.message}</AlertDescription>
                </Alert>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Farm ID</Label>
                  <Input
                    value={form.farmId}
                    onChange={(e) => setForm((prev) => ({ ...prev, farmId: e.target.value }))}
                    placeholder="farmer_001"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cage / Pond ID</Label>
                  <Input
                    value={form.pondId}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        pondId: e.target.value,
                        cageId: prev.cageId || e.target.value,
                      }))
                    }
                    placeholder="cage_001"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Device ID</Label>
                  <Input
                    value={form.deviceId}
                    onChange={(e) => setForm((prev) => ({ ...prev, deviceId: e.target.value }))}
                    placeholder="ESP32_001"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Firmware Version</Label>
                  <Input
                    value={form.firmware}
                    onChange={(e) => setForm((prev) => ({ ...prev, firmware: e.target.value }))}
                    placeholder="v3.1-fixedwifi"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Farm Name</Label>
                  <Input
                    value={form.farmName}
                    onChange={(e) => setForm((prev) => ({ ...prev, farmName: e.target.value }))}
                    placeholder="Main farm"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cage Name</Label>
                  <Input
                    value={form.cageName}
                    onChange={(e) => setForm((prev) => ({ ...prev, cageName: e.target.value }))}
                    placeholder="Cage 001"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Admin Setup Token</Label>
                <Input
                  value={form.setupToken}
                  onChange={(e) => setForm((prev) => ({ ...prev, setupToken: e.target.value }))}
                  type="password"
                  placeholder="Provided by system administrator"
                />
                <p className="text-xs text-muted-foreground">
                  Token is used once for this request and is never stored in the browser.
                </p>
              </div>

              <Button onClick={setupFarmDevice} disabled={isSubmitting} className="w-full">
                {isSubmitting ? "Linking device…" : "Link Device to Farm"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Lock className="h-4 w-4" /> Device setup is admin-only
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p className="text-muted-foreground">
                You can create and manage farm records, finance, production, inventory, feeding and
                water pages. For live device data, a system administrator must add or reconnect your
                ESP32 device.
              </p>
              <div className="rounded-lg border bg-muted/40 p-3">
                <p className="font-medium">What to send your administrator</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
                  <li>Farm ID: {form.farmId || DEFAULT_FARM_ID}</li>
                  <li>Cage/Pond ID: {form.pondId || DEFAULT_POND_ID}</li>
                  <li>Device label printed on the ESP32 box, if available</li>
                </ul>
              </div>
              <AccessDenied message="Only System or Super Admin users can add devices. Farmers can monitor device status after setup." />
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
