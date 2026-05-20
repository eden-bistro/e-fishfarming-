import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useMemo, useState } from "react";
import { listWaterAlerts, type WaterAlert } from "@/lib/platform-clients";
import { AlertTriangle, CheckCircle2, Siren, TriangleAlert } from "lucide-react";

export const Route = createFileRoute("/water/alerts")({
  head: () => ({ meta: [{ title: "Water Alerts — AquaSmart" }] }),
  component: Page,
});

function Page() {
  const [alerts, setAlerts] = useState<WaterAlert[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const rows = await listWaterAlerts();
      if (mounted) setAlerts(rows);
    };
    void load();
    const timer = setInterval(() => void load(), 10000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  const critical = useMemo(() => alerts.filter((a) => a.severity === "critical").length, [alerts]);
  const warning = useMemo(() => alerts.filter((a) => a.severity === "warning").length, [alerts]);

  return (
    <DashboardLayout title="Water Alerts" subtitle="Real-time threshold alerts for water quality and devices.">
      <div className="mb-4 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-sm">Critical Alerts</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold text-destructive">{critical}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Warning Alerts</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold text-warning">{warning}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Total Active</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{alerts.length}</CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Alerts</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {alerts.length === 0 ? (
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-success" />
              No active alerts.
            </div>
          ) : (
            alerts.map((alert) => {
              const icon =
                alert.severity === "critical" ? (
                  <Siren className="h-4 w-4 text-destructive" />
                ) : alert.severity === "warning" ? (
                  <TriangleAlert className="h-4 w-4 text-warning" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-info" />
                );

              return (
                <div key={alert.id} className="rounded-lg border p-3">
                  <div className="mb-1 flex items-center gap-2 text-sm font-medium">
                    {icon}
                    <span className="uppercase tracking-wide">{alert.type.replaceAll("_", " ")}</span>
                  </div>
                  <p className="text-sm">{alert.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Pond: {alert.pond_id} · {new Date(alert.created_at).toLocaleString()} · Source: {alert.source}
                  </p>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
