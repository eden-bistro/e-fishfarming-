import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileBarChart, Download } from "lucide-react";

export const Route = createFileRoute("/finance/reports")({
  head: () => ({ meta: [{ title: "Financial Reports — AquaSmart" }] }),
  component: Page,
});

const reports = [
  { name: "May 2026 — P&L Statement", size: "212 KB" },
  { name: "Q1 2026 — Cashflow Summary", size: "486 KB" },
  { name: "April 2026 — Tax Report", size: "324 KB" },
  { name: "2025 — Annual Report", size: "1.2 MB" },
];

function Page() {
  return (
    <DashboardLayout title="Reports" subtitle="Download financial statements.">
      <div className="grid gap-3 md:grid-cols-2">
        {reports.map((r) => (
          <Card key={r.name}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/15 text-brand"><FileBarChart className="h-5 w-5" /></div>
              <div className="flex-1"><p className="text-sm font-medium">{r.name}</p><p className="text-xs text-muted-foreground">PDF · {r.size}</p></div>
              <Button size="sm" variant="outline" className="gap-1"><Download className="h-4 w-4" />Download</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </DashboardLayout>
  );
}
