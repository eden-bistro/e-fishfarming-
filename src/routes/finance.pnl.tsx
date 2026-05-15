import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { FinanceSection } from "@/components/dashboard/finance-section";
import { ExpenseChart } from "@/components/dashboard/expense-chart";

export const Route = createFileRoute("/finance/pnl")({
  head: () => ({ meta: [{ title: "Profit & Loss — AquaSmart" }] }),
  component: () => (
    <DashboardLayout title="Profit & Loss" subtitle="Net financial performance this month.">
      <FinanceSection />
      <ExpenseChart />
    </DashboardLayout>
  ),
});
