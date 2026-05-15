import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Cpu, Wifi, WifiOff, Battery } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/settings/devices")({
  head: () => ({ meta: [{ title: "Devices — AquaSmart" }] }),
  component: Page,
});

const devices = [
  { name: "Water Sensor — Pond A", id: "WS-A01", online: true, batt: 92 },
  { name: "Water Sensor — Pond B", id: "WS-B01", online: true, batt: 78 },
  { name: "Auto Feeder — Pond A", id: "AF-A01", online: true, batt: 64 },
  { name: "Auto Feeder — Pond B", id: "AF-B01", online: false, batt: 12 },
  { name: "Aerator Controller", id: "AC-01", online: true, batt: 88 },
];

function Page() {
  return (
    <DashboardLayout title="Devices" subtitle="IoT hardware connected to your farm.">
      <div className="grid gap-3 md:grid-cols-2">
        {devices.map((d) => (
          <Card key={d.id}>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand/15 text-brand"><Cpu className="h-5 w-5" /></div>
              <div className="flex-1">
                <p className="text-sm font-medium">{d.name}</p>
                <p className="text-xs text-muted-foreground">ID: {d.id}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                {d.online
                  ? <Badge className="gap-1 bg-success/15 text-success hover:bg-success/20"><Wifi className="h-3 w-3" />Online</Badge>
                  : <Badge className="gap-1 bg-destructive/15 text-destructive hover:bg-destructive/20"><WifiOff className="h-3 w-3" />Offline</Badge>}
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Battery className="h-3 w-3" />{d.batt}%</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </DashboardLayout>
  );
}
