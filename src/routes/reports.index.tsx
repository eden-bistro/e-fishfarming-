import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { countRemainingPhases, listRoadmapPhases } from "@/services/modules/phase-roadmap.service";
import { listCommercialReadinessChecks } from "@/services/modules/commercial-readiness.service";

export const Route = createFileRoute("/reports/")({
  component: RouteComponent,
});

function RouteComponent() {
  const phases = listRoadmapPhases();
  const remaining = countRemainingPhases();
  const readiness = listCommercialReadinessChecks();

  return (
    <DashboardLayout
      title="Reports & Delivery Roadmap"
      subtitle="Track enterprise rollout phases without skipping required milestones."
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Program Snapshot</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded border p-3">
            <p className="text-xs text-muted-foreground">Total phases</p>
            <p className="text-2xl font-semibold">{phases.length}</p>
          </div>
          <div className="rounded border p-3">
            <p className="text-xs text-muted-foreground">Completed phases</p>
            <p className="text-2xl font-semibold">
              {phases.filter((p) => p.status === "completed").length}
            </p>
          </div>
          <div className="rounded border p-3">
            <p className="text-xs text-muted-foreground">Remaining phases</p>
            <p className="text-2xl font-semibold">{remaining}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Phase 3.3 Commercial Readiness</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {readiness.map((check) => (
            <div key={check.id} className="rounded border p-3">
              <div className="mb-1 flex items-center justify-between">
                <p className="font-medium">
                  {check.area.toUpperCase()} · {check.title}
                </p>
                <Badge variant={check.status === "pass" ? "default" : "secondary"}>
                  {check.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{check.detail}</p>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sequential Phase Tracker</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {phases.map((phase) => (
            <div key={phase.id} className="rounded border p-3">
              <div className="mb-1 flex items-center justify-between">
                <p className="font-medium">
                  Phase {phase.id} · {phase.title}
                </p>
                <Badge
                  variant={
                    phase.status === "completed"
                      ? "default"
                      : phase.status === "in_progress"
                        ? "secondary"
                        : "outline"
                  }
                >
                  {phase.status.replaceAll("_", " ")}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{phase.summary}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
