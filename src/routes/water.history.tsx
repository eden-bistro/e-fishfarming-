import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/water/history")({
  head: () => ({ meta: [{ title: "Water History — AquaSmart" }] }),
  component: Page,
});

const data = Array.from({ length: 24 }, (_, i) => ({
  h: `${i}:00`,
  temp: 26 + Math.sin(i / 3) * 1.5,
  ph: 7.1 + Math.sin(i / 4) * 0.2,
  do: 6 + Math.cos(i / 5) * 0.6,
}));

function Chart({
  title,
  k,
  color,
  unit,
}: {
  title: string;
  k: string;
  color: string;
  unit: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <span className="text-xs text-muted-foreground">Last 24h ({unit})</span>
      </CardHeader>
      <CardContent className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id={`g-${k}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="h" stroke="var(--muted-foreground)" fontSize={11} />
            <YAxis stroke="var(--muted-foreground)" fontSize={11} domain={["auto", "auto"]} />
            <Tooltip
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 8,
              }}
            />
            <Area
              type="monotone"
              dataKey={k}
              stroke={color}
              fill={`url(#g-${k})`}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function Page() {
  return (
    <DashboardLayout title="Water History" subtitle="Trends over the last 24 hours.">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Chart title="Temperature" k="temp" color="var(--info)" unit="°C" />
        <Chart title="pH Level" k="ph" color="var(--success)" unit="" />
        <Chart title="Dissolved Oxygen" k="do" color="var(--brand)" unit="mg/L" />
      </div>
    </DashboardLayout>
  );
}
