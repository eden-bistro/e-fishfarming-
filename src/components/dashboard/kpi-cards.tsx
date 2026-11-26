import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getLatestOnlineWaterReading,
  listFeedingEvents,
  PLATFORM_DATA_CHANGED_EVENT,
  listWaterAlerts,
} from "@/lib/platform-clients";
import { UtensilsCrossed, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@tanstack/react-router";
import { listProductionEventsRemote } from "@/services/modules/production.service";
import { buildProductionIntelligence } from "@/services/modules/production-intelligence.service";
import { listEnterpriseAlerts } from "@/services/modules/alerts.service";

function KpiCard({
  icon,
  iconBg,
  iconColor,
  label,
  value,
  sub,
  link,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  link: { href: string; text: string };
}) {
  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconBg} ${iconColor}`}>
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted-foreground">{label}</p>
            <div className="mt-1 text-2xl font-semibold tracking-tight">{value}</div>
            {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
          </div>
        </div>
        <div className="mt-4 border-t pt-3">
          <Link
            to={link.href as never}
            className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
          >
            {link.text}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export function KpiCards() {
  const [waterStatus, setWaterStatus] = useState("Checking…");
  const [todayFeedKg, setTodayFeedKg] = useState<number | null>(null);
  const [activeStock, setActiveStock] = useState<number | null>(null);
  const [openAlerts, setOpenAlerts] = useState(0);
  const [waterHasReading, setWaterHasReading] = useState(false);

  const load = useCallback(async () => {
    const [water, events, production, waterAlerts] = await Promise.all([
      getLatestOnlineWaterReading(),
      listFeedingEvents(),
      listProductionEventsRemote(),
      listWaterAlerts(),
    ]);

    setWaterHasReading(Boolean(water));
    setWaterStatus(() => {
      if (!water) return "No live data";
      const good =
        water.temperature >= 22 &&
        water.temperature <= 32 &&
        water.dissolvedOxygen >= 5 &&
        water.ph >= 6.5 &&
        water.ph <= 8.5 &&
        water.ammonia <= 0.05;
      return good ? "Healthy" : "Attention";
    });

    const today = new Date().toISOString().slice(0, 10);
    const todayEvents = events.filter((event) => event.timestamp.slice(0, 10) === today);
    setTodayFeedKg(todayEvents.reduce((sum, event) => sum + Number(event.amount_kg || 0), 0));

    const intelligence = buildProductionIntelligence(production);
    setActiveStock(
      production.length > 0
        ? Math.max(intelligence.totalStocked - intelligence.totalMortality, 0)
        : null,
    );
    setOpenAlerts(listEnterpriseAlerts().length + waterAlerts.length);
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 30_000);
    window.addEventListener(PLATFORM_DATA_CHANGED_EVENT, load);
    window.addEventListener("focus", load);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener(PLATFORM_DATA_CHANGED_EVENT, load);
      window.removeEventListener("focus", load);
    };
  }, [load]);

  const waterColor = useMemo(
    () =>
      !waterHasReading
        ? "text-muted-foreground"
        : waterStatus === "Healthy"
          ? "text-success"
          : "text-warning",
    [waterHasReading, waterStatus],
  );

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        icon={<img src="/icons/Water.png" alt="" className="h-7 w-7 rounded-md object-contain" />}
        iconBg="bg-info/15"
        iconColor="text-info"
        label="Water Quality"
        value={<span className={waterColor}>{waterStatus}</span>}
        sub={waterHasReading ? "Latest assigned online sensor" : "Waiting for an online sensor"}
        link={{ href: "/water/live", text: "View Details" }}
      />
      <KpiCard
        icon={<UtensilsCrossed className="h-6 w-6" />}
        iconBg="bg-success/15"
        iconColor="text-success"
        label="Today's Feed"
        value={
          todayFeedKg === null ? "Loading…" : (
            <>
              {todayFeedKg.toFixed(1)}{" "}
              <span className="text-base font-medium text-muted-foreground">kg</span>
            </>
          )
        }
        sub="From recorded feeding events"
        link={{ href: "/feeding/history", text: "Feed History" }}
      />
      <KpiCard
        icon={<img src="/icons/Fish logo.png" alt="" className="h-7 w-7 rounded-md object-contain" />}
        iconBg="bg-brand/15"
        iconColor="text-brand"
        label="Active Stock"
        value={activeStock === null ? "Insufficient data" : activeStock.toLocaleString()}
        sub="Stocked fish minus recorded mortality"
        link={{ href: "/production", text: "Production Records" }}
      />
      <KpiCard
        icon={<AlertTriangle className="h-6 w-6" />}
        iconBg="bg-warning/15"
        iconColor="text-warning"
        label="Open Alerts"
        value={openAlerts}
        sub="Inventory and production exceptions"
        link={{ href: "/water/alerts", text: "Review Alerts" }}
      />
    </div>
  );
}
