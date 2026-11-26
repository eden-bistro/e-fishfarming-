import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";
import { getLatestOnlineWaterReading, type WaterReading } from "@/lib/platform-clients";

type TrendPoint = { time: string; dissolvedOxygen: number };

function SensorCard({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">
        {value}
        {unit ? (
          <span className="ml-1 text-sm font-normal text-muted-foreground">{unit}</span>
        ) : null}
      </p>
    </div>
  );
}

export function WaterMonitoring() {
  const [reading, setReading] = useState<WaterReading | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const latest = await getLatestOnlineWaterReading().catch(() => null);
      if (!mounted) return;
      setReading(latest);
      if (!latest) return;
      const point = {
        time: new Date(latest.timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        dissolvedOxygen: latest.dissolvedOxygen,
      };
      setTrend((previous) => {
        if (previous.length && previous[previous.length - 1].time === point.time) {
          return [...previous.slice(0, -1), point];
        }
        return [...previous.slice(-23), point];
      });
    }
    void load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 30_000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

  const safe = useMemo(() => {
    if (!reading) return false;
    return (
      reading.temperature >= 22 &&
      reading.temperature <= 31 &&
      reading.ph >= 6.5 &&
      reading.ph <= 8.5 &&
      reading.dissolvedOxygen >= 5 &&
      reading.ammonia <= 0.05
    );
  }, [reading]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">Water Quality Monitoring</CardTitle>
        <Link
          to="/water/history"
          className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
        >
          History <ArrowRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent>
        {!reading ? (
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            No online device is currently streaming water data. Check power and Wi-Fi, then ask an
            admin to verify device assignment.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <SensorCard label="Temperature" value={reading.temperature.toFixed(1)} unit="°C" />
              <SensorCard label="pH Level" value={reading.ph.toFixed(2)} />
              <SensorCard
                label="Dissolved Oxygen"
                value={reading.dissolvedOxygen.toFixed(1)}
                unit="mg/L"
              />
              <SensorCard label="Ammonia" value={reading.ammonia.toFixed(2)} unit="mg/L" />
              <SensorCard label="Nitrite" value={reading.nitrite.toFixed(2)} unit="mg/L" />
              <SensorCard label="Turbidity" value={reading.turbidity.toFixed(1)} unit="NTU" />
            </div>
            <div className="mt-4 rounded-xl border p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-medium">Dissolved oxygen trend</p>
                <span className="text-xs text-muted-foreground">Recent live samples</span>
              </div>
              <div className="h-32">
                {trend.length < 2 ? (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                    Collecting live samples to display a trend
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trend} margin={{ top: 5, right: 8, bottom: 0, left: -18 }}>
                      <defs>
                        <linearGradient id="dashboard-do-trend" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                      <XAxis
                        dataKey="time"
                        tick={{ fontSize: 10 }}
                        stroke="var(--muted-foreground)"
                      />
                      <YAxis
                        domain={["auto", "auto"]}
                        tick={{ fontSize: 10 }}
                        stroke="var(--muted-foreground)"
                      />
                      <Tooltip
                        contentStyle={{
                          background: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="dissolvedOxygen"
                        name="Dissolved oxygen"
                        stroke="var(--brand)"
                        strokeWidth={2}
                        fill="url(#dashboard-do-trend)"
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
            <div className="mt-4 flex items-center border-t pt-3 text-xs">
              {safe ? (
                <span className="inline-flex items-center gap-1.5 text-success">
                  <CheckCircle2 className="h-4 w-4" />
                  Key water parameters within configured limits
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-warning">
                  <AlertTriangle className="h-4 w-4" /> Some parameters require attention
                </span>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
