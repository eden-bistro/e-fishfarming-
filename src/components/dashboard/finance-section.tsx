import { useEffect, useMemo, useState } from "react";
import { listExpenses, listIncome } from "@/lib/platform-clients";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";


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
  const [incomeSeries, setIncomeSeries] = useState<{ v: number }[]>([]);
  const [expenseSeries, setExpenseSeries] = useState<{ v: number }[]>([]);

  useEffect(() => {
    async function load() {
      const [incomeRows, expenseRows] = await Promise.all([listIncome(), listExpenses()]);
      const month = new Date().toISOString().slice(0, 7);
      const incomeMonth = incomeRows.filter((r) => r.date.startsWith(month));
      const expenseMonth = expenseRows.filter((r) => r.date.startsWith(month));
      setIncomeSeries(incomeMonth.map((r) => ({ v: Number(r.total || 0) })).slice(0, 12).reverse());
      setExpenseSeries(expenseMonth.map((r) => ({ v: Number(r.amount || 0) })).slice(0, 12).reverse());
    }
    load();
  }, []);

  const totalIncome = useMemo(() => incomeSeries.reduce((s, p) => s + p.v, 0), [incomeSeries]);
  const totalExpenses = useMemo(() => expenseSeries.reduce((s, p) => s + p.v, 0), [expenseSeries]);
  const totalProfit = totalIncome - totalExpenses;
  const profitSeries = useMemo(() => incomeSeries.map((p, i) => ({ v: p.v - (expenseSeries[i]?.v ?? 0) })), [incomeSeries, expenseSeries]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">Profit &amp; Loss Overview</CardTitle>
        <span className="text-xs text-muted-foreground">This month</span>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <StatBlock id="g-income" label="Total Income" value={`KSh ${totalIncome.toLocaleString()}`} delta="Live" positive series={incomeSeries} color="var(--success)" />
          <StatBlock id="g-exp" label="Total Expenses" value={`KSh ${totalExpenses.toLocaleString()}`} delta="Live" positive={false} series={expenseSeries} color="var(--destructive)" />
          <StatBlock id="g-profit" label="Net Profit" value={`KSh ${totalProfit.toLocaleString()}`} delta="Live" positive={totalProfit >= 0} series={profitSeries} color="var(--brand)" />
        </div>
      </CardContent>
    </Card>
  );
}
