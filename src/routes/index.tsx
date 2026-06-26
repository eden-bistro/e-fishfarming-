import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { WaterMonitoring } from "@/components/dashboard/water-monitoring";
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
  return (
    <DashboardLayout>
      <KpiCards />
      <WaterMonitoring />
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
