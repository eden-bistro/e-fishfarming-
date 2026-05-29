import { createFileRoute } from "@tanstack/react-router";
import {
  Bot,
  BrainCircuit,
  CalendarClock,
  CheckCircle2,
  Target,
  TriangleAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardLayout } from "@/components/dashboard-layout";
import { listEnterpriseAlerts } from "@/services/modules/alerts.service";
import { buildProductionIntelligence } from "@/services/modules/production-intelligence.service";

export const Route = createFileRoute("/ai/insights")({
  head: () => ({ meta: [{ title: "AI Insights — AquaSmart" }] }),
  component: RouteComponent,
});

type Recommendation = {
  title: string;
  detail: string;
  priority: "critical" | "warning" | "info" | "success";
};

const priorityVariant = {
  critical: "destructive",
  warning: "secondary",
  info: "outline",
  success: "default",
} as const;

const numberFormatter = new Intl.NumberFormat();
const percentFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });

function formatKg(value: number) {
  return `${numberFormatter.format(Math.round(value))} kg`;
}

function buildRecommendations(): Recommendation[] {
  const intelligence = buildProductionIntelligence();
  const alerts = listEnterpriseAlerts();
  const criticalAlerts = alerts.filter((alert) => alert.severity === "critical");
  const warningAlerts = alerts.filter((alert) => alert.severity === "warning");
  const recommendations: Recommendation[] = [];

  if (criticalAlerts.length > 0) {
    recommendations.push({
      title: "Resolve critical farm exceptions first",
      detail: `${criticalAlerts.length} critical alert${criticalAlerts.length === 1 ? "" : "s"} detected. Review mortality and inventory exceptions before scheduling new stocking or harvest activity.`,
      priority: "critical",
    });
  }

  if (intelligence.survivalRate > 0 && intelligence.survivalRate < 90) {
    recommendations.push({
      title: "Investigate survival-rate pressure",
      detail: `Current survival is ${percentFormatter.format(intelligence.survivalRate)}%. Compare mortality events with water-quality history and feeding changes for the same cages.`,
      priority: "warning",
    });
  }

  if (intelligence.overallFcr > 0 && intelligence.overallFcr > 1.8) {
    recommendations.push({
      title: "Optimize feed conversion",
      detail: `Estimated FCR is ${percentFormatter.format(intelligence.overallFcr)}. Validate feed inventory usage, ration sizing, and feeding windows to reduce wasted feed.`,
      priority: "warning",
    });
  }

  if (warningAlerts.length > 0) {
    recommendations.push({
      title: "Prevent warnings from becoming outages",
      detail: `${warningAlerts.length} warning alert${warningAlerts.length === 1 ? "" : "s"} need follow-up. Prioritize low-stock feed and recent mortality events.`,
      priority: "info",
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      title: "Farm telemetry is stable",
      detail:
        "No urgent AI recommendations are available right now. Keep recording production events, feed usage, and inventory movement to improve predictions.",
      priority: "success",
    });
  }

  return recommendations;
}

function RouteComponent() {
  const intelligence = buildProductionIntelligence();
  const alerts = listEnterpriseAlerts();
  const recommendations = buildRecommendations();
  const criticalAlerts = alerts.filter((alert) => alert.severity === "critical").length;
  const warningAlerts = alerts.filter((alert) => alert.severity === "warning").length;

  return (
    <DashboardLayout
      title="AI Insights"
      subtitle="Predictive farm intelligence powered by production, inventory, and alert signals."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Survival Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {percentFormatter.format(intelligence.survivalRate)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {numberFormatter.format(intelligence.totalStocked)} stocked ·{" "}
              {numberFormatter.format(intelligence.totalMortality)} mortality
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Biomass</CardTitle>
            <BrainCircuit className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatKg(intelligence.currentBiomassKg)}</div>
            <p className="text-xs text-muted-foreground">
              30-day projection: {formatKg(intelligence.projectedHarvestKg30d)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Feed Efficiency</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {percentFormatter.format(intelligence.overallFcr)} FCR
            </div>
            <p className="text-xs text-muted-foreground">
              {formatKg(intelligence.totalFeedKg)} feed · {formatKg(intelligence.totalHarvestKg)}{" "}
              harvest
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projected Harvest</CardTitle>
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {intelligence.projectedHarvestDate ?? "Insufficient data"}
            </div>
            <p className="text-xs text-muted-foreground">
              Based on average daily growth and a 1,200 kg target.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BrainCircuit className="h-5 w-5 text-brand" />
              Recommended Actions
            </CardTitle>
            <CardDescription>
              AI-prioritized operating guidance generated from farm production and alert data.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recommendations.map((recommendation) => (
              <div key={recommendation.title} className="rounded-lg border p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{recommendation.title}</p>
                  <Badge variant={priorityVariant[recommendation.priority]}>
                    {recommendation.priority}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{recommendation.detail}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TriangleAlert className="h-5 w-5 text-brand" />
              Alert Summary
            </CardTitle>
            <CardDescription>
              Exceptions considered by the AI recommendation engine.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Critical</p>
                <p className="text-2xl font-semibold">{criticalAlerts}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Warnings</p>
                <p className="text-2xl font-semibold">{warningAlerts}</p>
              </div>
            </div>

            {alerts.length === 0 ? (
              <div className="flex items-start gap-3 rounded-lg border p-3 text-sm text-muted-foreground">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-brand" />
                No active enterprise alerts. Add inventory and production records to unlock richer
                AI analysis.
              </div>
            ) : (
              <div className="space-y-2">
                {alerts.slice(0, 4).map((alert) => (
                  <div key={alert.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{alert.message}</p>
                      <Badge variant={alert.severity === "critical" ? "destructive" : "secondary"}>
                        {alert.severity}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {alert.source} · {alert.scope ?? "farm-wide"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
