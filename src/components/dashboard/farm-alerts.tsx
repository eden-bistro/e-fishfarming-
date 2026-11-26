import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listEnterpriseAlerts } from "@/services/modules/alerts.service";
import { listWaterAlerts } from "@/lib/platform-clients";

type DisplayAlert = {
  id: string;
  message: string;
  severity: "critical" | "warning" | "info";
  source: string;
  scope?: string;
  createdAt: string;
};

export function FarmAlerts() {
  const [alerts, setAlerts] = useState<DisplayAlert[]>([]);

  useEffect(() => {
    let active = true;
    async function load() {
      const [waterAlerts] = await Promise.all([listWaterAlerts().catch(() => [])]);
      const enterpriseAlerts = listEnterpriseAlerts();
      const combined: DisplayAlert[] = [
        ...enterpriseAlerts.map((alert) => ({
          id: alert.id,
          message: alert.message,
          severity: alert.severity,
          source: alert.source,
          scope: alert.scope,
          createdAt: alert.createdAt,
        })),
        ...waterAlerts.map((alert) => ({
          id: `water:${alert.pond_id}:${alert.type}`,
          message: alert.message,
          severity: alert.severity,
          source: "water quality",
          scope: alert.pond_id,
          createdAt: alert.created_at,
        })),
      ];
      const unique = [...new Map(combined.map((alert) => [alert.id, alert])).values()];
      unique.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      if (active) setAlerts(unique.slice(0, 4));
    }
    void load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 30_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base">Recent Farm Alerts</CardTitle>
          <CardDescription className="mt-1">
            Prioritized exceptions requiring attention
          </CardDescription>
        </div>
        <Badge variant={alerts.length > 0 ? "secondary" : "outline"}>
          {alerts.length} {alerts.length === 1 ? "recent item" : "recent items"}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.length === 0 ? (
          <div className="flex items-start gap-3 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
            No water-quality, inventory or production exceptions are currently recorded.
          </div>
        ) : (
          alerts.map((alert) => (
            <div key={alert.id} className="flex items-start gap-3 rounded-lg border p-3">
              <AlertTriangle
                className={`mt-0.5 h-4 w-4 shrink-0 ${alert.severity === "critical" ? "text-destructive" : alert.severity === "warning" ? "text-warning" : "text-muted-foreground"}`}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{alert.message}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {alert.source} · {alert.scope ?? "Farm-wide"}
                </p>
              </div>
              <Badge variant={alert.severity === "critical" ? "destructive" : "secondary"}>
                {alert.severity}
              </Badge>
            </div>
          ))
        )}
        <Link
          to="/water/alerts"
          className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
        >
          View all alerts <ArrowRight className="h-3 w-3" />
        </Link>
      </CardContent>
    </Card>
  );
}
