import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp } from "lucide-react";

export const Route = createFileRoute("/finance/income")({
  head: () => ({ meta: [{ title: "Income — AquaSmart" }] }),
  component: Page,
});

const sales = [
  { d: "May 14", buyer: "Kisumu Market", kg: 240, price: 350, total: 84000 },
  { d: "May 12", buyer: "Hotel Imperial", kg: 80, price: 420, total: 33600 },
  { d: "May 09", buyer: "Local Vendor", kg: 150, price: 320, total: 48000 },
  { d: "May 05", buyer: "Nairobi Wholesaler", kg: 500, price: 310, total: 155000 },
];

function Page() {
  const total = sales.reduce((s, r) => s + r.total, 0);
  return (
    <DashboardLayout title="Income" subtitle="Sales of fish and by-products.">
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="p-5"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/15 text-success"><TrendingUp className="h-5 w-5" /></div><div><p className="text-xs text-muted-foreground">Total this month</p><p className="text-xl font-semibold">KSh {total.toLocaleString()}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Avg price/kg</p><p className="mt-1 text-xl font-semibold">KSh 350</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Volume sold</p><p className="mt-1 text-xl font-semibold">970 kg</p></CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Recent Sales</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Buyer</TableHead><TableHead>Quantity</TableHead><TableHead>Price/kg</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
            <TableBody>
              {sales.map((s, i) => (
                <TableRow key={i}>
                  <TableCell>{s.d}</TableCell><TableCell>{s.buyer}</TableCell><TableCell>{s.kg} kg</TableCell><TableCell>KSh {s.price}</TableCell><TableCell className="text-right font-medium">KSh {s.total.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
