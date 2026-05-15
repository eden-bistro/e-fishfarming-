import { createFileRoute, Link } from "@tanstack/react-router";
import { getCurrentUserRecord } from "@/lib/auth";
import { DashboardLayout } from "@/components/dashboard-layout";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { WaterMonitoring } from "@/components/dashboard/water-monitoring";
import { FeedingSchedule } from "@/components/dashboard/feeding-schedule";
import { FinanceSection } from "@/components/dashboard/finance-section";
import { ExpenseChart } from "@/components/dashboard/expense-chart";
import { StatusBar } from "@/components/dashboard/status-bar";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AquaSmart — Smart Fish Farming Dashboard" },
      {
        name: "description",
        content:
          "Real-time water quality monitoring, automated feeding, finance and AI assistance for smart fish farms.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const currentUser = getCurrentUserRecord();
  const hasFarm = Boolean(currentUser?.farm?.name?.trim());

  if (!hasFarm) {
    return (
      <DashboardLayout title="Welcome" subtitle="Set up your farm to start your personalized dashboard.">
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold">No farm configured yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">Each user sees data for their own farm. Add your farm profile first.</p>
          <div className="mt-4">
            <Link to="/settings/farm" className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">Set up my farm</Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <KpiCards />
      <div className="grid grid-cols-1 gap-4 md:gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <WaterMonitoring />
        </div>
        <FeedingSchedule />
      </div>
      <div className="grid grid-cols-1 gap-4 md:gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <FinanceSection />
        </div>
        <ExpenseChart />
      </div>
      <StatusBar />
    </DashboardLayout>
  );
}
