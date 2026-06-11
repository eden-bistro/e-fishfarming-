import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { DashboardLayout } from "@/components/dashboard-layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getLatestOnlineWaterReading, type WaterReading } from "@/lib/platform-clients";
import { AlertTriangle, Wifi } from "lucide-react";

export const Route = createFileRoute("/water/live")({
  head: () => ({ meta: [{ title: "Live Water Monitoring — AquaSmart" }] }),
  component: Page,
});

function Page() {
  const [reading, setReading] = useState<WaterReading | null>(null);
  const [checkedAt, setCheckedAt] = useState("");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const data = await getLatestOnlineWaterReading();
      if (!mounted) return;
      setReading(data);
      setCheckedAt(new Date().toLocaleTimeString());
    };
    void load();
    const timer = setInterval(() => void load(), 5000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  const metrics = useMemo(
    () => [
      ["Temperature", `${reading?.temperature ?? "--"} °C`],
      ["pH", `${reading?.ph ?? "--"}`],
      ["Dissolved Oxygen", `${reading?.dissolvedOxygen ?? "--"} mg/L`],
      ["Ammonia", `${reading?.ammonia ?? "--"} mg/L`],
    ],
    [reading],
  );

  return (
    <DashboardLayout
      title="Live Water Monitoring"
      subtitle="Live water quality is shown only when an assigned device is online."
    >
      <Alert
        className={reading ? "border-success/40 bg-success/10" : "border-warning/40 bg-warning/10"}
      >
        {reading ? <Wifi className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
        <AlertTitle>{reading ? "Online device stream" : "No online water device"}</AlertTitle>
        <AlertDescription>
          {reading
            ? `Latest live reading${reading.deviceId ? ` from ${reading.deviceId}` : ""}${checkedAt ? ` checked at ${checkedAt}` : ""}.`
            : "Live water values are hidden until a device for this cage/pond is online. Check power and Wi-Fi first, then ask an admin to verify device assignment."}
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {metrics.map(([label, value]) => (
          <Card key={label} className={!reading ? "opacity-75" : undefined}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">{label}</CardTitle>
              <Badge variant={reading ? "default" : "secondary"}>
                {reading ? "Live" : "Waiting"}
              </Badge>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </DashboardLayout>
  );
}
