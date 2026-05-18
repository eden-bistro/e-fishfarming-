import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";

export const Route = createFileRoute("/settings/preferences")({ component: Page });

function Page() {
  const [dark, setDark] = useState(false);
  const [largeText, setLargeText] = useState(false);
  const [securityAlerts, setSecurityAlerts] = useState(true);

  return (
    <DashboardLayout title="User Settings" subtitle="View, display and security preferences.">
      <Card>
        <CardHeader><CardTitle className="text-base">Preferences</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between"><Label>Dark mode</Label><Switch checked={dark} onCheckedChange={setDark} /></div>
          <div className="flex items-center justify-between"><Label>Large text</Label><Switch checked={largeText} onCheckedChange={setLargeText} /></div>
          <div className="flex items-center justify-between"><Label>Security alerts</Label><Switch checked={securityAlerts} onCheckedChange={setSecurityAlerts} /></div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
