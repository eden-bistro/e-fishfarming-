import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Brain, Clock, Fish } from "lucide-react";

export const Route = createFileRoute("/feeding/schedule")({
  head: () => ({ meta: [{ title: "Feeding Schedule — AquaSmart" }] }),
  component: Page,
});

const schedules = [
  { time: "08:00", label: "Morning Feed", kg: 4.0, pond: "Pond A", auto: true },
  { time: "12:00", label: "Afternoon Feed", kg: 4.0, pond: "Pond A", auto: true },
  { time: "15:00", label: "Evening Feed", kg: 4.5, pond: "Pond B", auto: true },
  { time: "18:00", label: "Night Feed", kg: 4.0, pond: "Pond B", auto: false },
];

function Page() {
  return (
    <DashboardLayout
      title="Feeding Schedule"
      subtitle="Automated feeding plan adjusted to water conditions and fish biomass."
      actions={
        <Button size="sm" className="gap-1">
          <Plus className="h-4 w-4" /> New Schedule
        </Button>
      }
    >
      <Card className="border-brand/30 bg-brand/5">
        <CardContent className="flex items-start gap-3 p-4">
          <Brain className="mt-0.5 h-5 w-5 text-brand" />
          <div className="text-sm">
            <p className="font-medium">AI Recommendation</p>
            <p className="text-muted-foreground">
              Dissolved oxygen is optimal. Recommended feed rate today: <b>16.5 kg</b> across 4 sessions.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Today's Plan</CardTitle></CardHeader>
        <CardContent className="divide-y">
          {schedules.map((s) => (
            <div key={s.time} className="flex flex-wrap items-center gap-3 py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/15 text-brand">
                <Clock className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{s.label}</p>
                <p className="text-xs text-muted-foreground">{s.time} · {s.pond}</p>
              </div>
              <Badge variant="secondary"><Fish className="mr-1 h-3 w-3" />{s.kg.toFixed(1)} kg</Badge>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Auto</span>
                <Switch defaultChecked={s.auto} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
