import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  CalendarClock,
  CheckCircle2,
  Fish,
  Gauge,
  Target,
  TriangleAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardLayout } from "@/components/dashboard-layout";
import { listEnterpriseAlerts } from "@/services/modules/alerts.service";
import { listWaterAlerts, type WaterAlert } from "@/lib/platform-clients";
import {
  listProductionEventsRemote,
  type ProductionEvent,
} from "@/services/modules/production.service";
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

type DisplayAlert = {
  id: string;
  message: string;
  severity: "critical" | "warning" | "info";
  source: string;
  scope?: string;
  createdAt: string;
};

function formatKg(value: number) {
  return `${numberFormatter.format(Math.round(value))} kg`;
}

function MetricCard({
  label,
  value,
  description,
  icon: Icon,
}: {
  label: string;
  value: string;
  description: string;
  icon: typeof Target;
}) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <div className="rounded-lg bg-brand/10 p-2 text-brand">
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function buildRecommendations(
  alerts: DisplayAlert[],
  intelligence: ReturnType<typeof buildProductionIntelligence>,
): Recommendation[] {
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

  if (intelligence.totalStocked > 0 && intelligence.survivalRate < 90) {
    recommendations.push({
      title: "Investigate survival-rate pressure",
      detail: `Recorded survival is ${percentFormatter.format(intelligence.survivalRate)}%. Compare mortality events with water-quality history and feeding changes for the same cages.`,
      priority: "warning",
    });
  }

  if (
    intelligence.totalFeedKg > 0 &&
    intelligence.totalHarvestKg > 0 &&
    intelligence.overallFcr > 1.8
  ) {
    recommendations.push({
      title: "Review feed conversion",
      detail: `Recorded feed conversion is ${percentFormatter.format(intelligence.overallFcr)}. Validate feed inventory usage, ration sizing and feeding windows before changing the feeding plan.`,
      priority: "warning",
    });
  }

  if (warningAlerts.length > 0) {
    recommendations.push({
      title: "Follow up on farm warnings",
      detail: `${warningAlerts.length} warning alert${warningAlerts.length === 1 ? "" : "s"} need follow-up. Prioritize low-stock feed and recent mortality events.`,
      priority: "info",
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      title: "Keep farm records up to date",
      detail:
        "There are no urgent recommendations from the currently recorded production and inventory data. Continue recording stocking, mortality, feeding and harvest events to improve the quality of these indicators.",
      priority: "success",
    });
  }

  return recommendations;
}

function RouteComponent() {
  const [waterAlerts, setWaterAlerts] = useState<WaterAlert[]>([]);
  const [productionEvents, setProductionEvents] = useState<ProductionEvent[]>([]);
  const intelligence = buildProductionIntelligence(productionEvents);

  useEffect(() => {
    let active = true;
    async function loadInsightsData() {
      const [waterRows, productionRows] = await Promise.all([
        listWaterAlerts().catch(() => []),
        listProductionEventsRemote().catch(() => []),
      ]);
      if (active) {
        setWaterAlerts(waterRows);
        setProductionEvents(productionRows);
      }
    }
    void loadInsightsData();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void loadInsightsData();
    }, 30_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  const alerts: DisplayAlert[] = [
    ...listEnterpriseAlerts().map((alert) => ({
      id: alert.id,
      message: alert.message,
      severity: alert.severity,
      source: alert.source,
      scope: alert.scope,
      createdAt: alert.createdAt,
    })),
    ...waterAlerts.map((alert) => ({
      id: alert.id,
      message: alert.message,
      severity: alert.severity,
      source: "water quality",
      scope: alert.pond_id,
      createdAt: alert.created_at,
    })),
  ];
  const uniqueAlerts = [...new Map(alerts.map((alert) => [alert.id, alert])).values()];
  uniqueAlerts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const recommendations = buildRecommendations(uniqueAlerts, intelligence);
  const criticalAlerts = uniqueAlerts.filter((alert) => alert.severity === "critical").length;
  const warningAlerts = uniqueAlerts.filter((alert) => alert.severity === "warning").length;
  const hasStockingData = intelligence.totalStocked > 0;
  const hasFeedAndHarvestData = intelligence.totalFeedKg > 0 && intelligence.totalHarvestKg > 0;

  return (
    <DashboardLayout
      title="AI Insights"
      subtitle="Farm decision support based on recorded production, inventory and alert signals."
    >
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-sky-950 via-cyan-900 to-teal-800 text-white shadow-md">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-white/15 p-3">
              <BrainCircuit className="h-6 w-6 text-cyan-100" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100">
                AquaSmart Intelligence
              </p>
              <h2 className="mt-1 text-lg font-semibold">
                Understand the signals behind farm performance
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-cyan-50/85">
                Review production indicators and prioritized operating actions. Recommendations are
                derived from the records currently available in the platform.
              </p>
            </div>
          </div>
          <Badge className="w-fit border border-white/20 bg-white/10 text-white hover:bg-white/10">
            Operational decision support
          </Badge>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Survival Rate"
          value={
            hasStockingData
              ? `${percentFormatter.format(intelligence.survivalRate)}%`
              : "Insufficient data"
          }
          description={
            hasStockingData
              ? `${numberFormatter.format(intelligence.totalStocked)} stocked · ${numberFormatter.format(intelligence.totalMortality)} mortality`
              : "Record stocking and mortality events"
          }
          icon={Target}
        />
        <MetricCard
          label="Harvest Biomass Recorded"
          value={formatKg(intelligence.totalHarvestKg)}
          description="Total weight from recorded harvest events"
          icon={Fish}
        />
        <MetricCard
          label="Feed Conversion"
          value={
            hasFeedAndHarvestData
              ? percentFormatter.format(intelligence.overallFcr)
              : "Insufficient data"
          }
          description={
            hasFeedAndHarvestData
              ? `${formatKg(intelligence.totalFeedKg)} feed · ${formatKg(intelligence.totalHarvestKg)} harvest`
              : "Requires both feeding and harvest weights"
          }
          icon={Gauge}
        />
        <MetricCard
          label="Harvest Projection"
          value={intelligence.projectedHarvestDate ?? "Insufficient data"}
          description="Estimate uses recorded history and the current 1,200 kg target"
          icon={CalendarClock}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BrainCircuit className="h-5 w-5 text-brand" />
              Recommended Actions
            </CardTitle>
            <CardDescription>
              Rule-based operating guidance prioritized using production and inventory signals.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recommendations.map((recommendation) => (
              <div key={recommendation.title} className="rounded-xl border bg-card p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{recommendation.title}</p>
                  <Badge variant={priorityVariant[recommendation.priority]}>
                    {recommendation.priority}
                  </Badge>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {recommendation.detail}
                </p>
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
              Exceptions included in the current decision-support view.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border p-3">
                <p className="text-xs text-muted-foreground">Critical</p>
                <p className="mt-1 text-2xl font-semibold">{criticalAlerts}</p>
              </div>
              <div className="rounded-xl border p-3">
                <p className="text-xs text-muted-foreground">Warnings</p>
                <p className="mt-1 text-2xl font-semibold">{warningAlerts}</p>
              </div>
            </div>

            {uniqueAlerts.length === 0 ? (
              <div className="flex items-start gap-3 rounded-xl border border-dashed p-3 text-sm text-muted-foreground">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                No inventory or production alerts are currently recorded.
              </div>
            ) : (
              <div className="space-y-2">
                {uniqueAlerts.slice(0, 5).map((alert) => (
                  <div key={alert.id} className="rounded-xl border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{alert.message}</p>
                      <Badge variant={alert.severity === "critical" ? "destructive" : "secondary"}>
                        {alert.severity}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {alert.source} · {alert.scope ?? "Farm-wide"}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <Link
              to="/water/alerts"
              className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
            >
              Review farm alerts <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-5 w-5 text-brand" />
            Improve the quality of your insights
          </CardTitle>
          <CardDescription>
            Recommendations become more useful when farm records are complete and consistently
            updated.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <Link
            to="/production"
            className="rounded-xl border p-3 transition-colors hover:bg-muted/50"
          >
            <p className="text-sm font-medium">Production records</p>
            <p className="mt-1 text-xs text-muted-foreground">Stocking, mortality and harvest</p>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand">
              Open records <ArrowRight className="h-3 w-3" />
            </span>
          </Link>
          <Link
            to="/feeding/history"
            className="rounded-xl border p-3 transition-colors hover:bg-muted/50"
          >
            <p className="text-sm font-medium">Feeding history</p>
            <p className="mt-1 text-xs text-muted-foreground">Recorded feed quantities and dates</p>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand">
              Open history <ArrowRight className="h-3 w-3" />
            </span>
          </Link>
          <Link
            to="/inventory"
            className="rounded-xl border p-3 transition-colors hover:bg-muted/50"
          >
            <p className="text-sm font-medium">Feed inventory</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Stock levels and reorder thresholds
            </p>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand">
              Open inventory <ArrowRight className="h-3 w-3" />
            </span>
          </Link>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
