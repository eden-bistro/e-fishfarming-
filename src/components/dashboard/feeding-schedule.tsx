import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, CircleDashed } from "lucide-react";
import { listFeedingEvents, type FeedingEventRow } from "@/lib/platform-clients";

type Status = "completed" | "upcoming" | "pending";

function statusFromTimestamp(timestamp: string): Status {
  const when = new Date(timestamp).getTime();
  const now = Date.now();
  if (when <= now) return "completed";
  const within6h = when - now <= 6 * 60 * 60 * 1000;
  return within6h ? "upcoming" : "pending";
}

function StatusBadge({ status }: { status: Status }) {
  if (status === "completed")
    return (
      <Badge className="gap-1 bg-success/15 text-success">
        <CheckCircle2 className="h-3 w-3" /> Completed
      </Badge>
    );
  if (status === "upcoming")
    return (
      <Badge className="gap-1 bg-info/15 text-info">
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
  const [rows, setRows] = useState<FeedingEventRow[]>([]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const events = await listFeedingEvents();
      if (mounted) setRows(events.slice(0, 8));
    }
    void load();
    const timer = setInterval(() => void load(), 15000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  const normalized = useMemo(
    () =>
      rows.map((row) => ({
        id: String(row.id ?? row.timestamp),
        time: new Date(row.timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        label: `${row.mode} feed (${row.pond_id})`,
        kg: Number(row.amount_kg),
        status: statusFromTimestamp(row.timestamp),
      })),
    [rows],
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">Feeding Schedule (Live)</CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        {normalized.length === 0 ? (
          <p className="text-sm text-muted-foreground">No live feeding events available.</p>
        ) : (
          <ul className="divide-y">
            {normalized.map((r) => (
              <li key={r.id} className="flex items-center gap-3 py-3">
                <span className="w-20 font-mono text-xs text-muted-foreground">{r.time}</span>
                <span className="flex-1 text-sm font-medium">{r.label}</span>
                <span className="text-sm text-muted-foreground">{r.kg.toFixed(1)} kg</span>
                <StatusBadge status={r.status} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
