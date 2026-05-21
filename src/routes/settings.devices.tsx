import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { listDeviceStatuses, type DeviceStatus } from "@/lib/esp32-firebase";

export const Route = createFileRoute("/settings/devices")({
  head: () => ({ meta: [{ title: "Devices — AquaSmart" }] }),
  component: Page,
});

function Page() {
  const [rows, setRows] = useState<DeviceStatus[]>([]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const data = await listDeviceStatuses();
      if (mounted) setRows(data);
    }
    void load();
    const timer = setInterval(() => void load(), 10000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  return (
    <DashboardLayout
      title="Devices"
      subtitle="IoT hardware connected to your farm (Firebase realtime)."
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Connected Devices</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {rows.length === 0 ? (
            <p className="text-muted-foreground">No device heartbeat data available.</p>
          ) : (
            rows.map((row) => (
              <div key={row.deviceId} className="rounded border p-3">
                <p className="font-medium">{row.deviceId}</p>
                <p className="text-xs text-muted-foreground">
                  Firmware: {row.firmware} · Online: {row.online ? "Yes" : "No"} · RSSI: {row.rssi}{" "}
                  · Heap: {row.freeHeap} · Updated: {new Date(row.updatedAt).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
