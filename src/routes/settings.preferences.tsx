import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/settings/preferences")({ component: Page });

const PREFS_KEY = "aquasmart_preferences";

type Preferences = {
  dark: boolean;
  largeText: boolean;
  securityAlerts: boolean;
};

function Page() {
  const [prefs, setPrefs] = useState<Preferences>({ dark: false, largeText: false, securityAlerts: true });

  useEffect(() => {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Preferences;
      setPrefs({
        dark: Boolean(parsed.dark),
        largeText: Boolean(parsed.largeText),
        securityAlerts: Boolean(parsed.securityAlerts),
      });
    } catch {
      // ignore malformed preferences
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    document.documentElement.classList.toggle("dark", prefs.dark);
    document.documentElement.classList.toggle("text-lg", prefs.largeText);
  }, [prefs]);

  return (
    <DashboardLayout title="User Settings" subtitle="View, display and security preferences.">
      <Card>
        <CardHeader><CardTitle className="text-base">Preferences</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between"><Label>Dark mode</Label><Switch checked={prefs.dark} onCheckedChange={(v) => setPrefs((p) => ({ ...p, dark: v }))} /></div>
          <div className="flex items-center justify-between"><Label>Large text</Label><Switch checked={prefs.largeText} onCheckedChange={(v) => setPrefs((p) => ({ ...p, largeText: v }))} /></div>
          <div className="flex items-center justify-between"><Label>Security alerts</Label><Switch checked={prefs.securityAlerts} onCheckedChange={(v) => setPrefs((p) => ({ ...p, securityAlerts: v }))} /></div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
