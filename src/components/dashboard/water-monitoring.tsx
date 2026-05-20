import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { CheckCircle2, ArrowRight } from "lucide-react";

type Sensor = {
  key: string;
  label: string;
  unit: string;
  color: string;
  base: number;
  jitter: number;
  decimals: number;
  status: "ok" | "warn" | "alert";
};

const sensors: Sensor[] = [
  {
    key: "temp",
    label: "Temperature",
    unit: "°C",
    color: "var(--info)",
    base: 27.4,
    jitter: 0.4,
    decimals: 1,
    status: "ok",
  },
  {
    key: "ph",
    label: "pH Level",
    unit: "",
    color: "var(--success)",
    base: 7.2,
    jitter: 0.15,
    decimals: 2,
    status: "ok",
  },
  {
    key: "do",
    label: "Dissolved Oxygen",
    unit: "mg/L",
    color: "oklch(0.65 0.2 300)",
    base: 6.1,
    jitter: 0.4,
    decimals: 1,
    status: "ok",
  },
  {
    key: "amm",
    label: "Ammonia",
    unit: "mg/L",
    color: "var(--success)",
    base: 0.02,
    jitter: 0.01,
    decimals: 2,
    status: "ok",
  },
];

function makeSeries(base: number, jitter: number, n = 20) {
  // Deterministic series for SSR — randomized only after mount
  const out: { v: number }[] = [];
  for (let i = 0; i < n; i++) {
    out.push({ v: base + Math.sin(i / 2) * jitter * 0.5 });
  }
  return out;
}

function SensorCard({ s }: { s: Sensor }) {
  const [series, setSeries] = useState(() => makeSeries(s.base, s.jitter));
  const value = useMemo(() => series[series.length - 1].v, [series]);

  useEffect(() => {
    const t = setInterval(() => {
      setSeries((prev) => {
        const next = [...prev.slice(1)];
        const last = prev[prev.length - 1].v;
        next.push({ v: last + (Math.random() - 0.5) * s.jitter });
        return next;
      });
    }, 2500);
    return () => clearInterval(t);
  }, [s.jitter]);

  const id = `g-${s.key}`;
  return (
    <div className="rounded-xl border bg-card p-4 transition-shadow hover:shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{s.label}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">
            {value.toFixed(s.decimals)}
            {s.unit && (
              <span className="ml-1 text-sm font-normal text-muted-foreground">{s.unit}</span>
            )}
          </p>
        </div>
      </div>
      <div className="-mx-1 mt-2 h-12">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
            <defs>
              <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={0.45} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="v"
              stroke={s.color}
              strokeWidth={2}
              fill={`url(#${id})`}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function WaterMonitoring() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">Water Quality — Live Monitoring</CardTitle>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
          </span>
          Live
        </span>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {sensors.map((s) => (
            <SensorCard key={s.key} s={s} />
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs">
          <span className="inline-flex items-center gap-1.5 text-success">
            <CheckCircle2 className="h-4 w-4" /> All parameters within safe limits
          </span>
          <a
            className="inline-flex items-center gap-1 font-medium text-brand hover:underline"
            href="#"
          >
            View All Parameters <ArrowRight className="h-3 w-3" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
