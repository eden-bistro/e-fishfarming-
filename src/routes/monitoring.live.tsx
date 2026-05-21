import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { WaterMonitoring } from "@/components/dashboard/water-monitoring";

export const Route = createFileRoute("/monitoring/live")({
  component: Page,
});

function Page() {
  return (
    <DashboardLayout
      title="Realtime IoT Monitoring"
      subtitle="Live water sensor telemetry from Firebase"
    >
      <WaterMonitoring />
    </DashboardLayout>
  );
}
