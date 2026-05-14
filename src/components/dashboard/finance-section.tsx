import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

const incomeSeries = Array.from({ length: 12 }, (_, i) => ({
  v: 30 + Math.sin(i / 1.5) * 8 + i * 1.2 + Math.random() * 4,
}));
const expenseSeries = Array.from({ length: 12 }, (_, i) => ({
  v: 20 + Math.cos(i / 2) * 5 + i * 0.6 + Math.random() * 3,
}));
const profitSeries = Array.from({ length: 12 }, (_, i) => ({
  v: 10 + Math.sin(i / 1.2) * 4 + i * 0.9 + Math.random() * 3,
}));

function StatBlock({
  label,
  value,
  delta,
  positive,
  series,
  color,
  id,
}: {
  label: string;
  value: string;
  delta: string;
  positive: boolean;
  series: { v: number }[];
  color: string;
  id: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 text-xl font-semibold tracking-tight">{value}</p>
        </div>
        <span
          className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-medium ${
            positive ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
          }`}
        >
          {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {delta}
        </span>
      </div>
      <div className="-mx-1 mt-2 h-14">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
            <defs>
              <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill={`url(#${id})`} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function FinanceSection() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">Profit &amp; Loss Overview</CardTitle>
        <span className="text-xs text-muted-foreground">This month</span>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <StatBlock
            id="g-income"
            label="Total Income"
            value="KSh 425,000"
            delta="+18.5%"
            positive
            series={incomeSeries}
            color="var(--success)"
          />
          <StatBlock
            id="g-exp"
            label="Total Expenses"
            value="KSh 235,000"
            delta="+8.3%"
            positive={false}
            series={expenseSeries}
            color="var(--destructive)"
          />
          <StatBlock
            id="g-profit"
            label="Net Profit"
            value="KSh 190,000"
            delta="+26.8%"
            positive
            series={profitSeries}
            color="var(--brand)"
          />
        </div>
      </CardContent>
    </Card>
  );
}
