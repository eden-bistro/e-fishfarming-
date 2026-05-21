import { getSessionUser } from "@/lib/auth";
import { restInsert, restSelect } from "@/services/modules/backend-store";

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

// Backward-compatible alias used by older hatchery implementations
export const createProductionEvent = addProductionEvent;

export async function listProductionEventsRemote() {
  const rows = await restSelect("production_events");
  return (rows as ProductionEvent[] | null) ?? [];
}

export async function addProductionEventRemote(event: Omit<ProductionEvent, "id" | "createdAt">) {
  return restInsert("production_events", {
    id: crypto.randomUUID(),
    cage_id: event.cageId,
    type: event.type,
    fish_count: event.fishCount ?? null,
    weight_kg: event.weightKg ?? null,
    feed_kg: event.feedKg ?? null,
    created_at: new Date().toISOString(),
  });
}
