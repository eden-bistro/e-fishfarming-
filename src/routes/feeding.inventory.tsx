import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Package, AlertTriangle, Plus } from "lucide-react";

export const Route = createFileRoute("/feeding/inventory")({
  head: () => ({ meta: [{ title: "Feed Inventory — AquaSmart" }] }),
  component: Page,
});

const items = [
  { name: "Tilapia Starter", stock: 120, cap: 500, supplier: "Unga Feeds", price: 95 },
  { name: "Catfish Grower", stock: 45, cap: 300, supplier: "Sigma Feeds", price: 110 },
  { name: "Fingerling Mash", stock: 30, cap: 200, supplier: "Unga Feeds", price: 130 },
  { name: "Finisher Pellet", stock: 280, cap: 400, supplier: "Pembe", price: 105 },
];

function Page() {
  return (
    <DashboardLayout
      title="Feed Inventory"
      subtitle="Track stock levels and reorder points."
      actions={<Button size="sm" className="gap-1"><Plus className="h-4 w-4" />Add Stock</Button>}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {items.map((i) => {
          const pct = Math.round((i.stock / i.cap) * 100);
          const low = pct < 25;
          return (
            <Card key={i.name}>
              <CardContent className="space-y-3 p-5">
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/15 text-info"><Package className="h-5 w-5" /></div>
                  {low && <span className="inline-flex items-center gap-1 rounded-md bg-destructive/15 px-2 py-0.5 text-[11px] font-medium text-destructive"><AlertTriangle className="h-3 w-3" />Low</span>}
                </div>
                <div>
                  <p className="text-sm font-medium">{i.name}</p>
                  <p className="text-xs text-muted-foreground">{i.supplier} · KSh {i.price}/kg</p>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs"><span>{i.stock} kg</span><span className="text-muted-foreground">/ {i.cap} kg</span></div>
                  <Progress value={pct} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </DashboardLayout>
  );
}
