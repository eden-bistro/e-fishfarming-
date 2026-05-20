import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/settings/devices")({
  head: () => ({ meta: [{ title: "Devices — AquaSmart" }] }),
  component: Page,
});

function Page() {
  return (
    <DashboardLayout title="Devices" subtitle="IoT hardware connected to your farm.">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Connected Devices</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">No devices registered.</CardContent>
      </Card>
    </DashboardLayout>
  );
}
