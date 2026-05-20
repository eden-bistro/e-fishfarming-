import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useMemo, useState } from "react";
import { listWaterAlerts, type WaterAlert } from "@/lib/platform-clients";
import { listEnterpriseAlerts, type EnterpriseAlert } from "@/services/modules/alerts.service";
import { AlertTriangle, CheckCircle2, Siren, TriangleAlert } from "lucide-react";

export const Route = createFileRoute("/water/alerts")({
  head: () => ({ meta: [{ title: "Alerts Center — AquaSmart" }] }),
  component: Page,
});

function Page() {
  const [waterAlerts, setWaterAlerts] = useState<WaterAlert[]>([]);
  const [enterpriseAlerts, setEnterpriseAlerts] = useState<EnterpriseAlert[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const rows = await listWaterAlerts();
      if (!mounted) return;
      setWaterAlerts(rows);
      setEnterpriseAlerts(listEnterpriseAlerts());
    };
    void load();
    const timer = setInterval(() => void load(), 10000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  const merged = useMemo(() => {
    const iot = waterAlerts.map((a) => ({
      id: `iot-${a.id}`,
      severity: a.severity,
      message: a.message,
      type: a.type,
      source: "iot",
      createdAt: a.created_at,
      scope: a.pond_id,
    }));
    return [...iot, ...enterpriseAlerts].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }, [waterAlerts, enterpriseAlerts]);

  const critical = useMemo(() => merged.filter((a) => a.severity === "critical").length, [merged]);
  const warning = useMemo(() => merged.filter((a) => a.severity === "warning").length, [merged]);

  return (
    <DashboardLayout title="Alerts Center" subtitle="IoT + enterprise alerts (water quality, inventory, production).">
      <div className="mb-4 grid gap-4 md:grid-cols-4">
        <Card><CardHeader><CardTitle className="text-sm">Critical Alerts</CardTitle></CardHeader><CardContent className="text-2xl font-semibold text-destructive">{critical}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Warning Alerts</CardTitle></CardHeader><CardContent className="text-2xl font-semibold text-warning">{warning}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">IoT Alerts</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{waterAlerts.length}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Enterprise Alerts</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{enterpriseAlerts.length}</CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Active Alerts</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {merged.length === 0 ? (
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-success" />No active alerts.</div>
          ) : merged.map((alert) => {
            const icon = alert.severity === "critical" ? <Siren className="h-4 w-4 text-destructive" /> : alert.severity === "warning" ? <TriangleAlert className="h-4 w-4 text-warning" /> : <AlertTriangle className="h-4 w-4 text-info" />;
            return (
              <div key={alert.id} className="rounded-lg border p-3">
                <div className="mb-1 flex items-center gap-2 text-sm font-medium">{icon}<span className="uppercase tracking-wide">{alert.type.replaceAll("_", " ")}</span></div>
                <p className="text-sm">{alert.message}</p>
                <p className="mt-1 text-xs text-muted-foreground">Scope: {alert.scope ?? "global"} · {new Date(alert.createdAt).toLocaleString()} · Source: {alert.source}</p>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
