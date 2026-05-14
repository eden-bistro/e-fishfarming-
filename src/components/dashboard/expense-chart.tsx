import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

const data = [
  { name: "Feed", value: 1200, color: "var(--info)" },
  { name: "Fingerlings", value: 600, color: "var(--success)" },
  { name: "Labor", value: 300, color: "var(--warning)" },
  { name: "Electricity", value: 150, color: "oklch(0.62 0.2 300)" },
  { name: "Others", value: 100, color: "oklch(0.7 0.02 250)" },
];
const total = data.reduce((s, d) => s + d.value, 0);

export function ExpenseChart() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">Expenses Breakdown</CardTitle>
        <span className="text-xs text-muted-foreground">This month</span>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 items-center gap-4 md:grid-cols-2">
          <div className="relative h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  innerRadius={60}
                  outerRadius={88}
                  paddingAngle={2}
                  stroke="none"
                  isAnimationActive={false}
                >
                  {data.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xs text-muted-foreground">Total</span>
              <span className="text-lg font-semibold">KSh {total.toLocaleString()}</span>
            </div>
          </div>
          <ul className="space-y-2">
            {data.map((d) => {
              const pct = ((d.value / total) * 100).toFixed(1);
              return (
                <li key={d.name} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                    {d.name}
                  </span>
                  <span className="text-muted-foreground">
                    KSh {d.value.toLocaleString()}{" "}
                    <span className="text-xs">({pct}%)</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
