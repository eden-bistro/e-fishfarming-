import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/feeding/schedule")({
  head: () => ({ meta: [{ title: "Feeding Schedule — AquaSmart" }] }),
  component: Page,
});

function Page() {
  return (
    <DashboardLayout title="Feeding Schedule" subtitle="No scheduled feed sessions yet.">
      <Card>
        <CardHeader><CardTitle className="text-base">Today's Plan</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">No feeding schedule data available.</CardContent>
      </Card>
    </DashboardLayout>
  );
}
