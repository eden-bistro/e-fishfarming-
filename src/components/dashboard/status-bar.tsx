import { useEffect, useMemo, useState } from "react";
import { getCurrentUserRecord, loadCurrentUserFarmProfile, type FarmProfile } from "@/lib/auth";
import { listDeviceStatuses, type DeviceStatus } from "@/lib/device-firebase";
import { CheckCircle2, Wifi, Clock, MapPin } from "lucide-react";

function formatUpdatedAt(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "No live data";

  return date.toLocaleTimeString("en-KE", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function newestDeviceUpdate(devices: DeviceStatus[]): string {
  return devices.reduce((latest, device) => {
    if (!device.updatedAt) return latest;
    if (!latest) return device.updatedAt;
    return new Date(device.updatedAt).getTime() > new Date(latest).getTime()
      ? device.updatedAt
      : latest;
  }, "");
}

export function StatusBar() {
  const [farm, setFarm] = useState<FarmProfile | undefined>(getCurrentUserRecord()?.farm);
  const farmName = farm?.name?.trim() || "No farm profile";
  const [devices, setDevices] = useState<DeviceStatus[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadFarm() {
      const actualFarm = await loadCurrentUserFarmProfile();
      if (!cancelled && actualFarm) setFarm(actualFarm);
    }

    async function loadDevices() {
      setLoadingDevices(true);
      const actualDevices = await listDeviceStatuses();
      if (!cancelled) {
        setDevices(actualDevices);
        setLoadingDevices(false);
      }
    }

    void loadFarm();
    void loadDevices();
    const timer = window.setInterval(loadDevices, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const onlineDevices = devices.filter((device) => device.online).length;
  const totalDevices = devices.length;
  const lastUpdated = useMemo(() => formatUpdatedAt(newestDeviceUpdate(devices)), [devices]);
  const systemStatus =
    totalDevices === 0
      ? "No live devices"
      : onlineDevices === totalDevices
        ? "All Good"
        : "Needs Attention";
  const statusClass =
    totalDevices > 0 && onlineDevices === totalDevices ? "text-success" : "text-warning";

  return (
    <div className="rounded-xl border bg-card px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <CheckCircle2 className={`h-4 w-4 ${statusClass}`} />
          System Status: <span className={`font-medium ${statusClass}`}>{systemStatus}</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Wifi className="h-4 w-4 text-info" />
          Devices Online:{" "}
          <span className="font-medium text-foreground">
            {loadingDevices ? "Checking…" : `${onlineDevices}/${totalDevices}`}
          </span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-4 w-4" />
          Last Updated: <span className="font-medium text-foreground">{lastUpdated}</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="h-4 w-4 text-brand" />
          Farm: <span className="font-medium text-foreground">{farmName}</span>
        </span>
        {farm?.location?.trim() && (
          <span className="ml-auto inline-flex items-center gap-1.5">
            Location: <span className="font-medium text-foreground">{farm.location.trim()}</span>
          </span>
        )}
      </div>
    </div>
  );
}
