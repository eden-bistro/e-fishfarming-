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
import { useEffect, useState } from "react";
import { getLatestOnlineWaterReading } from "@/lib/platform-clients";

export const Route = createFileRoute("/water/history")({
  head: () => ({ meta: [{ title: "Water History — AquaSmart" }] }),
  component: Page,
});

type Row = { h: string; temp: number; ph: number; do: number };

function Chart({
  title,
  k,
  color,
  unit,
}: {
  title: string;
  k: keyof Row;
  color: string;
  unit: string;
}) {
  const [data, setData] = useState<Row[]>([]);

  useEffect(() => {
    let mounted = true;
    async function tick() {
      const latest = await getLatestOnlineWaterReading();
      if (!mounted || !latest) return;
      const row: Row = {
        h: new Date(latest.timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        temp: latest.temperature,
        ph: latest.ph,
        do: latest.dissolvedOxygen,
      };
      setData((prev) => [...prev.slice(-23), row]);
    }
    void tick();
    const timer = setInterval(() => void tick(), 10000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <span className="text-xs text-muted-foreground">Realtime ({unit})</span>
      </CardHeader>
      <CardContent className="h-56">
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No online device is currently streaming realtime data.
          </p>
        ) : (
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
        )}
      </CardContent>
    </Card>
  );
}

function Page() {
  return (
    <DashboardLayout title="Water History" subtitle="Realtime Firebase trend snapshots.">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Chart title="Temperature" k="temp" color="var(--info)" unit="°C" />
        <Chart title="pH Level" k="ph" color="var(--success)" unit="" />
        <Chart title="Dissolved Oxygen" k="do" color="var(--brand)" unit="mg/L" />
      </div>
    </DashboardLayout>
  );
}
