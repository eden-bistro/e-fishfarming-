import { getSessionUser } from "@/lib/auth";

export type ProductionEventType = "stocking" | "mortality" | "harvest" | "sale" | "feeding";

export type ProductionEvent = {
  id: string;
  cageId: string;
  type: ProductionEventType;
  fishCount?: number;
  weightKg?: number;
  feedKg?: number;
  createdAt: string;
};

const KEY = "aquasmart_production_events";

function storageKey() {
  const user = getSessionUser();
  return `${KEY}:${user?.tenantId ?? "demo"}`;
}

export function listProductionEvents() {
  if (typeof window === "undefined") return [] as ProductionEvent[];
  const raw = window.localStorage.getItem(storageKey());
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ProductionEvent[];
  } catch {
    return [];
  }
}

export function addProductionEvent(event: Omit<ProductionEvent, "id" | "createdAt">) {
  if (typeof window === "undefined") return null;
  const events = listProductionEvents();
  const next: ProductionEvent = { ...event, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
  window.localStorage.setItem(storageKey(), JSON.stringify([next, ...events]));
  return next;
}
