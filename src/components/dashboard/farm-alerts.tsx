import { Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listEnterpriseAlerts } from "@/services/modules/alerts.service";

export function FarmAlerts() {
  const alerts = listEnterpriseAlerts().slice(0, 4);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base">Farm Alerts</CardTitle>
          <CardDescription className="mt-1">Prioritized exceptions requiring attention</CardDescription>
        </div>
        <Badge variant={alerts.length > 0 ? "secondary" : "outline"}>
          {alerts.length} {alerts.length === 1 ? "open item" : "open items"}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.length === 0 ? (
          <div className="flex items-start gap-3 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
            No inventory or production exceptions are currently recorded.
          </div>
        ) : (
          alerts.map((alert) => (
            <div key={alert.id} className="flex items-start gap-3 rounded-lg border p-3">
              <AlertTriangle
                className={`mt-0.5 h-4 w-4 shrink-0 ${alert.severity === "critical" ? "text-destructive" : "text-warning"}`}
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
