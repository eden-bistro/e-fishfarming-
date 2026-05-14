import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, CircleDashed } from "lucide-react";

type Status = "completed" | "upcoming" | "pending";
type Row = { time: string; label: string; kg: number; status: Status };

const rows: Row[] = [
  { time: "08:00 AM", label: "Morning Feed", kg: 4.0, status: "completed" },
  { time: "12:00 PM", label: "Afternoon Feed", kg: 4.0, status: "completed" },
  { time: "03:00 PM", label: "Evening Feed", kg: 4.5, status: "upcoming" },
  { time: "06:00 PM", label: "Night Feed", kg: 4.0, status: "pending" },
];

function StatusBadge({ status }: { status: Status }) {
  if (status === "completed")
    return (
      <Badge className="gap-1 bg-success/15 text-success hover:bg-success/20">
        <CheckCircle2 className="h-3 w-3" /> Completed
      </Badge>
    );
  if (status === "upcoming")
    return (
      <Badge className="gap-1 bg-info/15 text-info hover:bg-info/20">
        <Clock className="h-3 w-3" /> Upcoming
      </Badge>
    );
  return (
    <Badge variant="secondary" className="gap-1">
      <CircleDashed className="h-3 w-3" /> Pending
    </Badge>
  );
}

export function FeedingSchedule() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">Feeding Schedule (Today)</CardTitle>
        <a href="#" className="text-xs font-medium text-brand hover:underline">
          View All
        </a>
      </CardHeader>
      <CardContent className="pt-2">
        <ul className="divide-y">
          {rows.map((r, i) => {
            const dot =
              r.status === "completed"
                ? "bg-success"
                : r.status === "upcoming"
                  ? "bg-info"
                  : "bg-muted-foreground/40";
            return (
              <li key={i} className="flex items-center gap-3 py-3">
                <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
                <span className="w-20 font-mono text-xs text-muted-foreground">{r.time}</span>
                <span className="flex-1 text-sm font-medium">{r.label}</span>
                <span className="text-sm text-muted-foreground">{r.kg.toFixed(1)} kg</span>
                <StatusBadge status={r.status} />
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
