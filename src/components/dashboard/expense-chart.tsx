import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listExpenses, type ExpenseRow } from "@/lib/platform-clients";
import {
  currentMonthRange,
  EMPTY_DATE_RANGE,
  filterExpensesByDate,
  formatCurrency,
  summarizeExpensesByCategory,
  type DateRange,
} from "@/services/modules/finance-analytics.service";

type ExpenseChartProps = {
  rows?: ExpenseRow[];
  range?: DateRange;
  title?: string;
};

export function ExpenseChart({ rows, range, title = "Expenses Breakdown" }: ExpenseChartProps) {
  const [loadedRows, setLoadedRows] = useState<ExpenseRow[]>([]);
  const [fallbackRange, setFallbackRange] = useState<DateRange>(EMPTY_DATE_RANGE);
  const effectiveRange = range ?? fallbackRange;

  useEffect(() => {
    if (range) return;
    setFallbackRange(currentMonthRange());
  }, [range]);

  useEffect(() => {
    if (rows) return;

    async function load() {
      setLoadedRows(await listExpenses());
    }

    void load();
  }, [rows]);

  const filteredRows = useMemo(
    () => filterExpensesByDate(rows ?? loadedRows, effectiveRange),
    [effectiveRange, loadedRows, rows],
  );
  const summary = useMemo(() => summarizeExpensesByCategory(filteredRows), [filteredRows]);
  const total = summary.reduce((sum, item) => sum + item.amount, 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <span className="text-xs text-muted-foreground">
          {effectiveRange.startDate} → {effectiveRange.endDate}
        </span>
      </CardHeader>
      <CardContent>
        {summary.length === 0 ? (
          <p className="text-sm text-muted-foreground">No expense breakdown data available.</p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total expenses</span>
              <span className="font-semibold">{formatCurrency(total)}</span>
            </div>
            {summary.map((item) => (
              <div key={item.category} className="space-y-1">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium">{item.category}</span>
                  <span className="text-muted-foreground">
                    {formatCurrency(item.amount)} · {(item.share * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-brand"
                    style={{ width: `${Math.max(item.share * 100, 2)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
