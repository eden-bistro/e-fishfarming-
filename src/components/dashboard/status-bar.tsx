import { getCurrentUserRecord } from "@/lib/auth";
import { CheckCircle2, Wifi, Clock, MapPin, CloudSun } from "lucide-react";

export function StatusBar() {
  const farmName = getCurrentUserRecord()?.farm?.name || "No farm";
  const time = new Date().toLocaleTimeString("en-KE", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  return (
    <div className="rounded-xl border bg-card px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <CheckCircle2 className="h-4 w-4 text-success" />
          System Status: <span className="font-medium text-success">All Good</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Wifi className="h-4 w-4 text-info" />
          Devices Online: <span className="font-medium text-foreground">5/5</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-4 w-4" />
          Last Updated: <span className="font-medium text-foreground">{time}</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="h-4 w-4 text-brand" />
          Farm: <span className="font-medium text-foreground">{farmName}</span>
        </span>
        <span className="ml-auto inline-flex items-center gap-1.5">
          <CloudSun className="h-4 w-4 text-warning" />
          Kisumu, 28°C
        </span>
      </div>
    </div>
  );
}
