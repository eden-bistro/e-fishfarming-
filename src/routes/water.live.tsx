import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Wifi } from "lucide-react";

import { DashboardLayout } from "@/components/dashboard-layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getLatestOnlineWaterReading, type WaterReading } from "@/lib/platform-clients";
import { assessWaterQuality } from "@/lib/water-quality";

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

    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 30_000);

    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

  const assessment = useMemo(() => assessWaterQuality(reading), [reading]);
  const verifiedReading = reading && assessment.status !== "unavailable" ? reading : null;

  const metrics = useMemo(
    () => [
      ["Temperature", `${verifiedReading?.temperature ?? "--"} °C`],
      ["pH", `${verifiedReading?.ph ?? "--"}`],
      ["Dissolved Oxygen", `${verifiedReading?.dissolvedOxygen ?? "--"} mg/L`],
      ["Ammonia", `${verifiedReading?.ammonia ?? "--"} mg/L`],
    ],
    [verifiedReading],
  );

  return (
    <DashboardLayout
      title="Live Water Monitoring"
      subtitle="Live water quality is shown only when an assigned IoT Device is online."
    >
      <Alert
        className={assessment.status === "safe" ? "border-success/40 bg-success/10" : "border-warning/40 bg-warning/10"}
      >
        {verifiedReading ? <Wifi className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
        <AlertTitle>{assessment.label}</AlertTitle>
        <AlertDescription>
          {verifiedReading
            ? `${assessment.message} Latest reading${verifiedReading.deviceId ? ` from ${verifiedReading.deviceId}` : ""}${checkedAt ? ` checked at ${checkedAt}` : ""}.`
            : assessment.message}
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {metrics.map(([label, value]) => (
          <Card key={label} className={!verifiedReading ? "opacity-75" : undefined}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">{label}</CardTitle>
              <Badge variant={verifiedReading ? "default" : "secondary"}>
                {verifiedReading ? assessment.status : "Unavailable"}
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
