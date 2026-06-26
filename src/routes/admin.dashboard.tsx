import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, Database, ShieldCheck, SlidersHorizontal, Users } from "lucide-react";

import { AccessDenied } from "@/components/access-denied";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isAdminUser } from "@/contexts/rbac";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({ meta: [{ title: "Admin Dashboard — AquaSmart" }] }),
  component: Page,
});

const adminCapabilities = [
  {
    title: "Farm Management",
    description: "Cross-farm visibility is granted through Supabase RLS only to admin users.",
    icon: Database,
  },
  {
    title: "Device Management",
    description: "Device setup, assignment, configuration, and lifecycle actions are admin-only.",
    icon: SlidersHorizontal,
  },
  {
    title: "User Overview",
    description: "Review profile roles and keep regular users scoped to their own farm.",
    icon: Users,
  },
  {
    title: "Remote Actions",
    description: "Feeding remains available to farm users; device configuration is separate.",
    icon: Activity,
  },
];

function Page() {
  const isAdmin = isAdminUser();

  return (
    <DashboardLayout
      title="Admin Dashboard"
      subtitle="Admin-only farm, device, user, and remote-management control center."
    >
      {!isAdmin ? (
        <AccessDenied message="Admin access is required. Server APIs and Supabase RLS also enforce this permission." />
      ) : (
        <>
          <Alert className="border-success/40 bg-success/10">
            <ShieldCheck className="h-4 w-4" />
            <AlertTitle>Centralized authorization enabled</AlertTitle>
            <AlertDescription>
              Supabase roles/RLS protect database access, and Firebase-backed IoT device management
              endpoints require an authenticated admin session before using setup tokens.
            </AlertDescription>
          </Alert>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {adminCapabilities.map((item) => (
              <Card key={item.title}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <item.icon className="h-4 w-4 text-brand" />
                    {item.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p>{item.description}</p>
                  <Badge variant="secondary">Admin only</Badge>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Manage Farms</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Use farm settings and RLS-backed farm profile rows to review and update farms.
                </p>
                <Button asChild variant="outline">
                  <Link to="/settings/farm">Open Farm Settings</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Manage Devices</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>Assign devices, update firmware metadata, and control device lifecycle.</p>
                <Button asChild variant="outline">
                  <Link to="/settings/devices">Open Device Management</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Review Users</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>Review admin and farm-user roles. The initial admin is fishhydro1@gmail.com.</p>
                <Button asChild variant="outline">
                  <Link to="/settings/users-and-roles">Open Users</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
