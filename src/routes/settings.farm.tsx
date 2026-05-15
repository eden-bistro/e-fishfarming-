import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/settings/farm")({
  head: () => ({ meta: [{ title: "Farm Settings — AquaSmart" }] }),
  component: Page,
});

function Page() {
  return (
    <DashboardLayout title="Farm Settings" subtitle="General farm details and preferences.">
      <Card>
        <CardHeader><CardTitle className="text-base">Farm Profile</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2"><Label>Farm Name</Label><Input placeholder="Enter farm name" /></div>
          <div className="space-y-2"><Label>Location</Label><Input placeholder="Enter location" /></div>
          <div className="space-y-2"><Label>Owner</Label><Input placeholder="Owner full name" /></div>
          <div className="space-y-2"><Label>Currency</Label><Input placeholder="Currency" /></div>
          <div className="space-y-2"><Label>Total Ponds</Label><Input type="number"  /></div>
          <div className="space-y-2"><Label>Total Stock (kg)</Label><Input type="number"  /></div>
        </CardContent>
      </Card>
      <div><Button>Save Changes</Button></div>
    </DashboardLayout>
  );
}
