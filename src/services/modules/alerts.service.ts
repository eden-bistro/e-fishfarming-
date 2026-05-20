import { listInventoryItems } from "@/services/modules/inventory.service";
import { listProductionEvents } from "@/services/modules/production.service";

export type EnterpriseAlertSeverity = "info" | "warning" | "critical";
export type EnterpriseAlertSource = "inventory" | "production" | "iot";

export type EnterpriseAlert = {
  id: string;
  source: EnterpriseAlertSource;
  type: string;
  severity: EnterpriseAlertSeverity;
  message: string;
  createdAt: string;
  scope?: string;
};

export function listEnterpriseAlerts(): EnterpriseAlert[] {
  const now = new Date().toISOString();
  const lowStock = listInventoryItems()
    .filter((i) => i.quantity <= i.lowStockThreshold)
    .map((i) => ({
      id: `inv-low-${i.id}`,
      source: "inventory" as const,
      type: "low_feed_stock",
      severity: i.quantity === 0 ? ("critical" as const) : ("warning" as const),
      message: `${i.name} is low (${i.quantity} ${i.unit})`,
      createdAt: now,
      scope: i.category,
    }));

  const production = listProductionEvents();
  const recentMortality = production
    .filter((e) => e.type === "mortality" && (e.fishCount ?? 0) > 0)
    .slice(0, 5)
    .map((e) => ({
      id: `prd-mort-${e.id}`,
      source: "production" as const,
      type: "mortality_event",
      severity: (e.fishCount ?? 0) >= 100 ? ("critical" as const) : ("warning" as const),
      message: `Mortality recorded in ${e.cageId}: ${e.fishCount} fish`,
      createdAt: e.createdAt,
      scope: e.cageId,
    }));

  return [...lowStock, ...recentMortality].sort(
    (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
  );
}
