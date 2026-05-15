import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

export const Route = createFileRoute("/feeding/history")({
  head: () => ({ meta: [{ title: "Feeding History — AquaSmart" }] }),
  component: Page,
});

const week = [
  { d: "Mon", kg: 14 }, { d: "Tue", kg: 15.5 }, { d: "Wed", kg: 16 },
  { d: "Thu", kg: 13.5 }, { d: "Fri", kg: 17 }, { d: "Sat", kg: 16.5 }, { d: "Sun", kg: 12.5 },
];
const rows = [
  { t: "May 15 18:00", pond: "B", kg: 4.0, mode: "Auto", st: "ok" },
  { t: "May 15 15:00", pond: "B", kg: 4.5, mode: "Auto", st: "ok" },
  { t: "May 15 12:00", pond: "A", kg: 4.0, mode: "Auto", st: "ok" },
  { t: "May 15 08:00", pond: "A", kg: 4.0, mode: "Auto", st: "ok" },
  { t: "May 14 18:00", pond: "B", kg: 4.0, mode: "Manual", st: "ok" },
  { t: "May 14 15:00", pond: "B", kg: 4.5, mode: "Auto", st: "warn" },
];

function Page() {
  return (
    <DashboardLayout title="Feeding History" subtitle="Past feed events across all ponds.">
      <Card>
        <CardHeader><CardTitle className="text-base">Last 7 Days (kg)</CardTitle></CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={week}>
              <XAxis dataKey="d" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Bar dataKey="kg" fill="var(--brand)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Events</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Pond</TableHead><TableHead>Amount</TableHead><TableHead>Mode</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="font-mono text-xs">{r.t}</TableCell>
                  <TableCell>{r.pond}</TableCell>
                  <TableCell>{r.kg} kg</TableCell>
                  <TableCell>{r.mode}</TableCell>
                  <TableCell>
                    {r.st === "ok"
                      ? <Badge className="bg-success/15 text-success hover:bg-success/20">Completed</Badge>
                      : <Badge className="bg-warning/15 text-warning hover:bg-warning/20">Delayed</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
