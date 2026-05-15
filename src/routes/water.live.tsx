import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getLatestWaterReading, type WaterReading } from "@/lib/platform-clients";

export const Route = createFileRoute("/water/live")({
  head: () => ({ meta: [{ title: "Live Water Monitoring — AquaSmart" }] }),
  component: Page,
});

function Page() {
  const [reading, setReading] = useState<WaterReading | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const data = await getLatestWaterReading();
        if (mounted) setReading(data);
      } catch (error) {
        if (mounted) {
          toast.error(error instanceof Error ? error.message : "Failed to load water data");
        }
      }
    };
    void load();
    const timer = setInterval(() => void load(), 5000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  return (
    <DashboardLayout title="Live Water Monitoring" subtitle="Real-time ESP32 sensor stream from Firebase Realtime Database.">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[
          ["Temperature", `${reading?.temperature ?? "--"} °C`],
          ["pH", `${reading?.ph ?? "--"}`],
          ["Dissolved Oxygen", `${reading?.dissolvedOxygen ?? "--"} mg/L`],
          ["Turbidity", `${reading?.turbidity ?? "--"} NTU`],
          ["Ammonia", `${reading?.ammonia ?? "--"} mg/L`],
          ["Nitrite", `${reading?.nitrite ?? "--"} mg/L`],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardHeader>
              <CardTitle className="text-base">{label}</CardTitle>
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
