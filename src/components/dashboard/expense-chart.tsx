import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ExpenseChart() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">Expenses Breakdown</CardTitle>
        <span className="text-xs text-muted-foreground">This month</span>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">No expense breakdown data available.</p>
      </CardContent>
    </Card>
  );
}
