import { useEffect, useMemo, useState } from "react";
import { listExpenses, listIncome, type ExpenseRow, type IncomeRow } from "@/lib/platform-clients";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import {
  buildDailySeries,
  currentMonthRange,
  EMPTY_DATE_RANGE,
  filterExpensesByDate,
  filterIncomeByDate,
  formatCurrency,
  profitMargin,
  sumExpenses,
  sumIncome,
  type DateRange,
} from "@/services/modules/finance-analytics.service";
import { Input } from "@/components/ui/input";

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
            <Area
              type="monotone"
              dataKey="v"
              stroke={color}
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

export function FinanceSection() {
  const [incomeRows, setIncomeRows] = useState<IncomeRow[]>([]);
  const [expenseRows, setExpenseRows] = useState<ExpenseRow[]>([]);
  const [range, setRange] = useState<DateRange>(EMPTY_DATE_RANGE);

  useEffect(() => {
    async function load() {
      const [income, expenses] = await Promise.all([listIncome(), listExpenses()]);
      setIncomeRows(income);
      setExpenseRows(expenses);
      setRange(currentMonthRange());
    }
    void load();
  }, []);

  const filteredIncome = useMemo(() => filterIncomeByDate(incomeRows, range), [incomeRows, range]);
  const filteredExpenses = useMemo(
    () => filterExpensesByDate(expenseRows, range),
    [expenseRows, range],
  );
  const dailySeries = useMemo(
    () => buildDailySeries(filteredIncome, filteredExpenses),
    [filteredIncome, filteredExpenses],
  );
  const incomeSeries = useMemo(
    () => dailySeries.map((point) => ({ v: point.income })),
    [dailySeries],
  );
  const expenseSeries = useMemo(
    () => dailySeries.map((point) => ({ v: point.expenses })),
    [dailySeries],
  );

  const totalIncome = useMemo(() => sumIncome(filteredIncome), [filteredIncome]);
  const totalExpenses = useMemo(() => sumExpenses(filteredExpenses), [filteredExpenses]);
  const totalProfit = totalIncome - totalExpenses;
  const margin = profitMargin(totalIncome, totalProfit);
  const profitSeries = useMemo(
    () => dailySeries.map((point) => ({ v: point.profit })),
    [dailySeries],
  );

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 space-y-0 pb-2 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="text-base">Profit &amp; Loss Overview</CardTitle>
          <p className="text-xs text-muted-foreground">
            Filter by date range for monthly or custom reporting.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            className="h-8 w-auto"
            value={range.startDate}
            onChange={(e) => setRange((current) => ({ ...current, startDate: e.target.value }))}
          />
          <Input
            type="date"
            className="h-8 w-auto"
            value={range.endDate}
            onChange={(e) => setRange((current) => ({ ...current, endDate: e.target.value }))}
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <StatBlock
            id="g-income"
            label="Total Income"
            value={formatCurrency(totalIncome)}
            delta="Range"
            positive
            series={incomeSeries}
            color="var(--success)"
          />
          <StatBlock
            id="g-exp"
            label="Total Expenses"
            value={formatCurrency(totalExpenses)}
            delta="Range"
            positive={false}
            series={expenseSeries}
            color="var(--destructive)"
          />
          <StatBlock
            id="g-profit"
            label="Net Profit"
            value={formatCurrency(totalProfit)}
            delta="Range"
            positive={totalProfit >= 0}
            series={profitSeries}
            color="var(--brand)"
          />
          <StatBlock
            id="g-margin"
            label="Profit Margin"
            value={`${(margin * 100).toFixed(1)}%`}
            delta="Margin"
            positive={margin >= 0}
            series={profitSeries}
            color="var(--warning)"
          />
        </div>
      </CardContent>
    </Card>
  );
}
