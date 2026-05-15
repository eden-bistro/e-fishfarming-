import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Hand, Play } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { pushManualFeedingEvent } from "@/lib/platform-clients";

export const Route = createFileRoute("/feeding/manual")({
  head: () => ({ meta: [{ title: "Manual Feeding — AquaSmart" }] }),
  component: Page,
});

function Page() {
  const [amount, setAmount] = useState([2.5]);
  return (
    <DashboardLayout title="Manual Feeding" subtitle="Trigger an immediate feed cycle for any pond.">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Dispense Feed</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Pond</Label>
              <Select defaultValue="a">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="a">Pond A — Tilapia</SelectItem>
                  <SelectItem value="b">Pond B — Catfish</SelectItem>
                  <SelectItem value="c">Pond C — Fingerlings</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between"><Label>Amount</Label><span className="text-sm font-mono">{amount[0].toFixed(1)} kg</span></div>
              <Slider value={amount} onValueChange={setAmount} min={0.5} max={10} step={0.1} />
            </div>
            <Button
              className="w-full gap-2"
              onClick={async () => {
                await pushManualFeedingEvent(amount[0]);
                toast.success(`Dispensed ${amount[0].toFixed(1)}kg`);
              }}
            >
              <Play className="h-4 w-4" /> Start Feeding Now
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Recent Manual Feeds</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              { t: "Today 09:14", kg: 1.5, pond: "Pond A", by: "John" },
              { t: "Yesterday 17:02", kg: 3.0, pond: "Pond B", by: "Mary" },
              { t: "May 13 10:40", kg: 2.0, pond: "Pond A", by: "John" },
            ].map((r, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border p-3">
                <Hand className="h-4 w-4 text-brand" />
                <div className="flex-1"><p className="font-medium">{r.pond} · {r.kg} kg</p><p className="text-xs text-muted-foreground">{r.t} · by {r.by}</p></div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
