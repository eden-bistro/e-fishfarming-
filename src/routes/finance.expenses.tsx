import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { ExpenseChart } from "@/components/dashboard/expense-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/finance/expenses")({
  head: () => ({ meta: [{ title: "Expenses — AquaSmart" }] }),
  component: Page,
});

const exp = [
  { d: "May 14", cat: "Feed", desc: "Tilapia starter 200kg", amt: 19000 },
  { d: "May 12", cat: "Labor", desc: "Pond cleaning crew", amt: 4500 },
  { d: "May 10", cat: "Electricity", desc: "Aerators monthly", amt: 8200 },
  { d: "May 08", cat: "Fingerlings", desc: "5,000 pcs Pond C", amt: 25000 },
];

function Page() {
  return (
    <DashboardLayout title="Expenses" subtitle="Operating costs by category.">
      <ExpenseChart />
      <Card>
        <CardHeader><CardTitle className="text-base">Recent Expenses</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Category</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
            <TableBody>
              {exp.map((e, i) => (
                <TableRow key={i}><TableCell>{e.d}</TableCell><TableCell>{e.cat}</TableCell><TableCell>{e.desc}</TableCell><TableCell className="text-right font-medium">KSh {e.amt.toLocaleString()}</TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
