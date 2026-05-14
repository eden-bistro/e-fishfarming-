import { createFileRoute } from "@tanstack/react-router";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { TopNavbar } from "@/components/top-navbar";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { WaterMonitoring } from "@/components/dashboard/water-monitoring";
import { FeedingSchedule } from "@/components/dashboard/feeding-schedule";
import { FinanceSection } from "@/components/dashboard/finance-section";
import { ExpenseChart } from "@/components/dashboard/expense-chart";
import { StatusBar } from "@/components/dashboard/status-bar";
import { ChatWidget } from "@/components/ai/chat-widget";

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
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <TopNavbar />
        <main className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
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
        </main>
        <ChatWidget />
      </SidebarInset>
    </SidebarProvider>
  );
}
