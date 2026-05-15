import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/settings/users")({
  head: () => ({ meta: [{ title: "Users & Roles — AquaSmart" }] }),
  component: Page,
});

const users = [
  { n: "John Doe", e: "john@aquasmart.ke", r: "Owner" },
  { n: "Mary Achieng", e: "mary@aquasmart.ke", r: "Manager" },
  { n: "Peter Otieno", e: "peter@aquasmart.ke", r: "Operator" },
  { n: "Grace Wanjiru", e: "grace@aquasmart.ke", r: "Accountant" },
];

function Page() {
  return (
    <DashboardLayout
      title="Users & Roles"
      subtitle="Manage team access to the AquaSmart platform."
      actions={<Button size="sm" className="gap-1"><Plus className="h-4 w-4" />Invite User</Button>}
    >
      <Card>
        <CardHeader><CardTitle className="text-base">Team</CardTitle></CardHeader>
        <CardContent className="divide-y">
          {users.map((u) => (
            <div key={u.e} className="flex items-center gap-3 py-3">
              <Avatar><AvatarFallback className="bg-brand text-brand-foreground text-xs">{u.n.split(" ").map(s => s[0]).join("")}</AvatarFallback></Avatar>
              <div className="flex-1"><p className="text-sm font-medium">{u.n}</p><p className="text-xs text-muted-foreground">{u.e}</p></div>
              <Badge variant="secondary">{u.r}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
