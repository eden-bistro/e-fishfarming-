import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FeedingSchedule } from "@/components/dashboard/feeding-schedule";

export const Route = createFileRoute("/feeding/history")({
  head: () => ({ meta: [{ title: "Feeding History — AquaSmart" }] }),
  component: Page,
});

function Page() {
  return (
    <DashboardLayout title="Feeding History" subtitle="Past feed events across all ponds.">
      <FeedingSchedule />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Events</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No feeding history available.
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
