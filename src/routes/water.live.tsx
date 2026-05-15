import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { WaterMonitoring } from "@/components/dashboard/water-monitoring";

export const Route = createFileRoute("/water/live")({
  head: () => ({ meta: [{ title: "Live Water Monitoring — AquaSmart" }] }),
  component: () => (
    <DashboardLayout title="Live Water Monitoring" subtitle="Real-time IoT sensor stream from Lake Victoria pens.">
      <WaterMonitoring />
    </DashboardLayout>
  ),
});
