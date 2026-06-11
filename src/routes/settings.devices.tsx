import { createFileRoute } from "@tanstack/react-router";
import { Activity, AlertCircle, CheckCircle2, Lock, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AccessDenied } from "@/components/access-denied";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { userHasRole } from "@/contexts/rbac";
import { listDeviceStatuses, type DeviceStatus } from "@/lib/platform-clients";
import { DEFAULT_FARM_ID, DEFAULT_POND_ID, setActiveFarmId, setActivePondId } from "@/lib/tenant";

export const Route = createFileRoute("/settings/devices")({
  head: () => ({ meta: [{ title: "Devices — AquaSmart" }] }),
  component: Page,
});

type SetupStatus = {
  type: "idle" | "success" | "error";
  message: string;
};

const DEVICE_OFFLINE_AFTER_MS = 5 * 60 * 1000;
const DEVICE_STATUS_POLL_MS = 30 * 1000;

function heartbeatAge(updatedAt: string): string {
  const timestamp = new Date(updatedAt).getTime();
  if (!Number.isFinite(timestamp)) return "unknown";

  const ageMs = Math.max(Date.now() - timestamp, 0);
  const minutes = Math.floor(ageMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  return `${hours} hr${hours === 1 ? "" : "s"} ago`;
}

function isDeviceOnline(row: DeviceStatus): boolean {
  const timestamp = new Date(row.updatedAt).getTime();

  return (
    Boolean(row.online) &&
    Number.isFinite(timestamp) &&
    Date.now() - timestamp <= DEVICE_OFFLINE_AFTER_MS
  );
}

function deviceStatusText(row: DeviceStatus): string {
  return isDeviceOnline(row) ? "Online" : "Offline";
}

function deviceStatusHelp(row: DeviceStatus): string {
  if (isDeviceOnline(row)) return "Connected and sending heartbeat data.";
  if (!row.updatedAt) return "No heartbeat has been received yet.";
  return "No recent heartbeat. Check device power, Wi-Fi, token, and firmware.";
}

function Page() {
  const canProvisionDevices = userHasRole(["super_admin"]);
  const [rows, setRows] = useState<DeviceStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [setupStatus, setSetupStatus] = useState<SetupStatus>({ type: "idle", message: "" });
  const [form, setForm] = useState({
    farmId: DEFAULT_FARM_ID,
    pondId: DEFAULT_POND_ID,
    cageId: DEFAULT_POND_ID,
    deviceId: "DEVICE_001",
    farmName: "Default Farm",
    cageName: "Cage 001",
    firmware: "v3.1-fixedwifi",
    setupToken: "",
  });

  const activeFarmId = form.farmId.trim() || DEFAULT_FARM_ID;
  const activePondId = form.pondId.trim() || DEFAULT_POND_ID;

  const deviceSummary = useMemo(() => {
    const online = rows.filter(isDeviceOnline).length;
    return { online, offline: rows.length - online, total: rows.length };
  }, [rows]);

  const loadDevices = useCallback(
    async (options: { showSpinner?: boolean } = {}) => {
      const { showSpinner = true } = options;

      if (showSpinner) setIsLoading(true);
      setLoadError("");
      setActiveFarmId(activeFarmId);
      setActivePondId(activePondId);

      try {
        const data = await listDeviceStatuses(activeFarmId, activePondId);
        setRows(data);
      } catch (error) {
        setRows([]);
        setLoadError(
          error instanceof Error
            ? error.message
            : "Unable to load device heartbeat data from the backend.",
        );
      } finally {
        if (showSpinner) setIsLoading(false);
      }
    },
    [activeFarmId, activePondId],
  );

  useEffect(() => {
    let mounted = true;

    async function load() {
      setActiveFarmId(activeFarmId);
      setActivePondId(activePondId);

      try {
        const data = await listDeviceStatuses(activeFarmId, activePondId);
        if (!mounted) return;

        setRows(data);
        setLoadError("");
      } catch (error) {
        if (!mounted) return;

        setRows([]);
        setLoadError(
          error instanceof Error
            ? error.message
            : "Unable to load device heartbeat data from the backend.",
        );
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    setIsLoading(true);
    void load();

    const timer = window.setInterval(() => {
      void load();
    }, DEVICE_STATUS_POLL_MS);

    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, [activeFarmId, activePondId]);

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
      subtitle="Simple device status for farmers, with admin-only device setup."
    >
      <Alert className="border-info/40 bg-info/10">
        <CheckCircle2 className="h-4 w-4" />
        <AlertTitle>Quick farmer view</AlertTitle>
        <AlertDescription>
          Green means the device is talking to the platform. Red means the last heartbeat is old;
          first check power, Wi-Fi and the device box before changing farm records.
        </AlertDescription>
      </Alert>

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
              Needs power, Wi-Fi, token, or firmware check.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(340px,440px)]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Farm Device Status</CardTitle>
              <p className="text-xs text-muted-foreground">
                Farmers can see connection health here. Device setup is handled by an administrator.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadDevices()}
              disabled={isLoading}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </CardHeader>

          <CardContent className="space-y-3 text-sm">
            {loadError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Unable to load device status</AlertTitle>
                <AlertDescription>{loadError}</AlertDescription>
              </Alert>
            )}

            {isLoading ? (
              <p className="text-muted-foreground">Loading device heartbeat data…</p>
            ) : rows.length === 0 ? (
              <div className="rounded-lg border border-dashed p-5 text-center">
                <AlertCircle className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                <p className="font-medium">No device is linked yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  You can continue using farm, production, inventory and finance tools. Ask your
                  system administrator to add the device before live sensor readings appear.
                </p>
              </div>
            ) : (
              rows.map((row) => {
                const online = isDeviceOnline(row);

                return (
                  <div key={row.deviceId} className="rounded-lg border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{row.deviceId}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Last seen {heartbeatAge(row.updatedAt)} · Firmware{" "}
                          {row.firmware || "unknown"}
                        </p>
                      </div>

                      <Badge variant={online ? "default" : "destructive"}>
                        {online ? (
                          <Wifi className="mr-1 h-3 w-3" />
                        ) : (
                          <WifiOff className="mr-1 h-3 w-3" />
                        )}
                        {deviceStatusText(row)}
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
                      {deviceStatusHelp(row)}
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
                <AlertTitle>Admin setup checklist</AlertTitle>
                <AlertDescription>
                  1) Match the printed device label. 2) Confirm the farm and cage names. 3) Enter
                  the one-time setup token. Farmers will only see safe Online/Offline status.
                </AlertDescription>
              </Alert>

              <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">Currently selected</p>
                <p className="mt-1">
                  Farm <span className="font-medium text-foreground">{activeFarmId}</span> ·
                  Cage/Pond <span className="font-medium text-foreground">{activePondId}</span>
                </p>
              </div>

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
                    onChange={(event) =>
                      setForm((previous) => ({ ...previous, farmId: event.target.value }))
                    }
                    placeholder="farmer_001"
                    autoComplete="off"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use the farm code assigned by your company or system administrator.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Cage / Pond ID</Label>
                  <Input
                    value={form.pondId}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        pondId: event.target.value,
                        cageId: previous.cageId || event.target.value,
                      }))
                    }
                    placeholder="cage_001"
                    autoComplete="off"
                  />
                  <p className="text-xs text-muted-foreground">
                    This must match the cage/pond where the device sensors are installed.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Device ID</Label>
                  <Input
                    value={form.deviceId}
                    onChange={(event) =>
                      setForm((previous) => ({ ...previous, deviceId: event.target.value }))
                    }
                    placeholder="DEVICE_001"
                    autoComplete="off"
                  />
                  <p className="text-xs text-muted-foreground">
                    Usually printed on the device box or written on the installation label.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Firmware Version</Label>
                  <Input
                    value={form.firmware}
                    onChange={(event) =>
                      setForm((previous) => ({ ...previous, firmware: event.target.value }))
                    }
                    placeholder="v3.1-fixedwifi"
                    autoComplete="off"
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave the default if you are not sure; live heartbeats will still verify status.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Farm Name</Label>
                  <Input
                    value={form.farmName}
                    onChange={(event) =>
                      setForm((previous) => ({ ...previous, farmName: event.target.value }))
                    }
                    placeholder="Main farm"
                    autoComplete="organization"
                  />
                  <p className="text-xs text-muted-foreground">
                    Friendly name shown in records and reports.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Cage Name</Label>
                  <Input
                    value={form.cageName}
                    onChange={(event) =>
                      setForm((previous) => ({ ...previous, cageName: event.target.value }))
                    }
                    placeholder="Cage 001"
                    autoComplete="off"
                  />
                  <p className="text-xs text-muted-foreground">
                    Friendly name farmers recognize on the farm.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Admin Setup Token</Label>
                <Input
                  value={form.setupToken}
                  onChange={(event) =>
                    setForm((previous) => ({ ...previous, setupToken: event.target.value }))
                  }
                  type="password"
                  placeholder="Provided by system administrator"
                  autoComplete="one-time-code"
                />
                <p className="text-xs text-muted-foreground">
                  Token is used once for this request and is never stored in the browser.
                </p>
              </div>

              <Button onClick={setupFarmDevice} disabled={isSubmitting} className="min-h-11 w-full">
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
                device.
              </p>

              <div className="rounded-lg border bg-muted/40 p-3">
                <p className="font-medium">What to send your administrator</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
                  <li>Farm ID: {form.farmId || DEFAULT_FARM_ID}</li>
                  <li>Cage/Pond ID: {form.pondId || DEFAULT_POND_ID}</li>
                  <li>Device label printed on the device box, if available</li>
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
