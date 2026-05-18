import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/finance/reports")({
  head: () => ({ meta: [{ title: "Financial Reports — AquaSmart" }] }),
  component: Page,
});

function Page() {
  return (
    <DashboardLayout title="Reports" subtitle="Download financial statements.">
      <Card>
        <CardHeader><CardTitle className="text-base">Reports</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">No reports available.</CardContent>
      </Card>
    </DashboardLayout>
  );
}
