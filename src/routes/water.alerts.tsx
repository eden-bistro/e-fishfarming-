import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, AlertCircle, Info, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/water/alerts")({
  head: () => ({ meta: [{ title: "Water Alerts — AquaSmart" }] }),
  component: Page,
});

const alerts = [
  { sev: "high", t: "10 min ago", msg: "Dissolved Oxygen dropped to 4.2 mg/L in Pond B", action: "Aerator activated automatically" },
  { sev: "med", t: "2 h ago", msg: "Water temperature rising — 29.1°C in Pond A", action: "Monitor closely" },
  { sev: "info", t: "5 h ago", msg: "pH stabilized at 7.2 across all ponds", action: "No action required" },
  { sev: "ok", t: "Yesterday", msg: "Ammonia returned to safe levels", action: "Alert resolved" },
];

const cfg = {
  high: { i: AlertCircle, c: "text-destructive", bg: "bg-destructive/15", l: "Critical" },
  med: { i: AlertTriangle, c: "text-warning", bg: "bg-warning/15", l: "Warning" },
  info: { i: Info, c: "text-info", bg: "bg-info/15", l: "Info" },
  ok: { i: CheckCircle2, c: "text-success", bg: "bg-success/15", l: "Resolved" },
} as const;

function Page() {
  return (
    <DashboardLayout title="Water Alerts" subtitle="Threshold violations and AI-detected anomalies.">
      <div className="space-y-3">
        {alerts.map((a, i) => {
          const c = cfg[a.sev as keyof typeof cfg];
          const Icon = c.i;
          return (
            <Card key={i}>
              <CardContent className="flex items-start gap-3 p-4">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${c.bg} ${c.c}`}><Icon className="h-5 w-5" /></div>
                <div className="flex-1">
                  <div className="flex items-center gap-2"><Badge variant="secondary" className={`${c.c} ${c.bg} hover:${c.bg}`}>{c.l}</Badge><span className="text-xs text-muted-foreground">{a.t}</span></div>
                  <p className="mt-1 text-sm font-medium">{a.msg}</p>
                  <p className="text-xs text-muted-foreground">{a.action}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </DashboardLayout>
  );
}
