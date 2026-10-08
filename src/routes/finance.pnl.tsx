import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { FinanceSection } from "@/components/dashboard/finance-section";

export const Route = createFileRoute("/finance/pnl")({
  head: () => ({ meta: [{ title: "Profit & Loss — AquaSmart" }] }),
  component: () => (
    <DashboardLayout title="Profit & Loss" subtitle="Financial performance across all recorded transactions.">
      <FinanceSection />
    </DashboardLayout>
  ),
});
