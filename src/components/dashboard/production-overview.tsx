import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Fish, Scale, Sprout } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  listProductionEventsRemote,
  type ProductionEvent,
} from "@/services/modules/production.service";
import { buildProductionIntelligence } from "@/services/modules/production-intelligence.service";

export function ProductionOverview() {
  const [events, setEvents] = useState<ProductionEvent[]>([]);

  useEffect(() => {
    let active = true;
    void listProductionEventsRemote().then((rows) => {
      if (active) setEvents(rows);
    }).catch(() => {
      if (active) setEvents([]);
    });
    return () => {
      active = false;
    };
  }, []);

  const summary = buildProductionIntelligence(events);
  const hasRecords = events.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Production Overview</CardTitle>
        <CardDescription>Recorded stocking, mortality and harvest activity</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border bg-card p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Fish className="h-4 w-4 text-brand" /> Active stock
            </div>
            <p className="mt-2 text-xl font-semibold">
              {hasRecords
                ? Math.max(summary.totalStocked - summary.totalMortality, 0).toLocaleString()
                : "—"}
            </p>
            <p className="text-xs text-muted-foreground">Fish on recorded balance</p>
          </div>
          <div className="rounded-xl border bg-card p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Sprout className="h-4 w-4 text-success" /> Stocked
            </div>
            <p className="mt-2 text-xl font-semibold">
              {hasRecords ? summary.totalStocked.toLocaleString() : "—"}
            </p>
            <p className="text-xs text-muted-foreground">Cumulative stocking records</p>
          </div>
          <div className="rounded-xl border bg-card p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Scale className="h-4 w-4 text-info" /> Harvest weight
            </div>
            <p className="mt-2 text-xl font-semibold">
              {hasRecords ? `${summary.totalHarvestKg.toLocaleString()} kg` : "—"}
            </p>
            <p className="text-xs text-muted-foreground">Recorded harvest events</p>
          </div>
        </div>
        <Link
          to="/production"
          className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
        >
          Open production records <ArrowRight className="h-3 w-3" />
        </Link>
      </CardContent>
    </Card>
  );
}
