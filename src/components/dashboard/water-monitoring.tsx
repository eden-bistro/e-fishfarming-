import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { getLatestOnlineWaterReading, type WaterReading } from "@/lib/platform-clients";

function SensorCard({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">
        {value}
        {unit ? (
          <span className="ml-1 text-sm font-normal text-muted-foreground">{unit}</span>
        ) : null}
      </p>
    </div>
  );
}

export function WaterMonitoring() {
  const [reading, setReading] = useState<WaterReading | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const latest = await getLatestOnlineWaterReading();
      if (mounted) setReading(latest);
    }
    void load();
    const timer = setInterval(() => void load(), 15000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  const safe = useMemo(() => {
    if (!reading) return false;
    return (
      reading.temperature <= 31 &&
      reading.ph >= 6.5 &&
      reading.ph <= 8.5 &&
      reading.dissolvedOxygen >= 5 &&
      reading.ammonia <= 0.05
    );
  }, [reading]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">Water Quality — Live Monitoring</CardTitle>
      </CardHeader>
      <CardContent>
        {!reading ? (
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            No online device is currently streaming water data. Check power and Wi-Fi, then ask an
            admin to verify device assignment.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <SensorCard label="Temperature" value={reading.temperature.toFixed(1)} unit="°C" />
              <SensorCard label="pH Level" value={reading.ph.toFixed(2)} />
              <SensorCard
                label="Dissolved Oxygen"
                value={reading.dissolvedOxygen.toFixed(1)}
                unit="mg/L"
              />
              <SensorCard label="Ammonia" value={reading.ammonia.toFixed(2)} unit="mg/L" />
              <SensorCard label="Nitrite" value={reading.nitrite.toFixed(2)} unit="mg/L" />
              <SensorCard label="Turbidity" value={reading.turbidity.toFixed(1)} unit="NTU" />
            </div>
            <div className="mt-4 flex items-center border-t pt-3 text-xs">
              {safe ? (
                <span className="inline-flex items-center gap-1.5 text-success">
                  <CheckCircle2 className="h-4 w-4" /> All parameters within safe limits
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-warning">
                  <AlertTriangle className="h-4 w-4" /> Some parameters require attention
                </span>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
