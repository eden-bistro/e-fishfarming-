import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/feeding/inventory")({
  head: () => ({ meta: [{ title: "Feed Inventory — AquaSmart" }] }),
  component: Page,
});

function Page() {
  return (
    <DashboardLayout title="Feed Inventory" subtitle="Track stock levels and reorder points.">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Inventory</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No feed inventory records available.
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
