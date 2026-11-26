import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BrainCircuit, Plus } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { WaterMonitoring } from "@/components/dashboard/water-monitoring";
import { FeedingSchedule } from "@/components/dashboard/feeding-schedule";
import { FarmAlerts } from "@/components/dashboard/farm-alerts";
import { ProductionOverview } from "@/components/dashboard/production-overview";
import { StatusBar } from "@/components/dashboard/status-bar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AquaSmart — Farm Dashboard" },
      {
        name: "description",
        content:
          "AquaSmart farm operations dashboard for water quality, feeding, production, alerts and connected devices.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  return (
    <DashboardLayout
      title="Farm Dashboard"
      subtitle="Your farm operations at a glance. Monitor water, feeding, production and exceptions."
      actions={
        <Button asChild className="min-h-10 gap-2">
          <Link to="/feeding/manual">
            <Plus className="h-4 w-4" /> Log feeding
          </Link>
        </Button>
      }
    >
      <KpiCards />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.35fr_0.9fr]">
        <WaterMonitoring />
        <FarmAlerts />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <FeedingSchedule />
        <ProductionOverview />
      </div>

      <Card className="overflow-hidden border-0 bg-gradient-to-br from-sky-950 via-cyan-900 to-teal-800 text-white shadow-md">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-white/15 p-3">
              <BrainCircuit className="h-6 w-6 text-cyan-100" />
            </div>
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100">
                AquaSmart Intelligence
              </p>
              <h2 className="mt-1 text-lg font-semibold">
                Turn farm records into better decisions
              </h2>
              <p className="mt-1 text-sm text-cyan-50/85">
                Review production indicators, feed efficiency, survival records and prioritized
                operating recommendations in AI Insights.
              </p>
            </div>
          </div>
          <Button asChild variant="secondary" className="shrink-0 gap-2">
            <Link to="/ai/insights">
              Explore AI Insights <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <StatusBar />
    </DashboardLayout>
  );
}
