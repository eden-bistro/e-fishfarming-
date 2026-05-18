import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/water/alerts")({
  head: () => ({ meta: [{ title: "Water Alerts — AquaSmart" }] }),
  component: Page,
});

function Page() {
  return (
    <DashboardLayout title="Water Alerts" subtitle="Threshold violations and AI-detected anomalies.">
      <Card>
        <CardHeader><CardTitle className="text-base">Alerts</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">No alerts available.</CardContent>
      </Card>
    </DashboardLayout>
  );
}
