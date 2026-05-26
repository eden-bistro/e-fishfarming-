import { getSessionUser } from "@/lib/auth";
import { backendEnabled, restInsert, restSelect } from "@/services/modules/backend-store";

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
  return `${KEY}:${user?.id ?? "demo"}`;
}

function readLocal(): ProductionEvent[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(storageKey());
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ProductionEvent[];
  } catch {
    return [];
  }
}

function writeLocal(rows: ProductionEvent[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(), JSON.stringify(rows));
}

function fromRemote(row: Record<string, unknown>): ProductionEvent {
  return {
    id: String(row.id ?? crypto.randomUUID()),
    cageId: String(row.cage_id ?? row.cageId ?? "unknown"),
    type: String(row.type ?? "feeding") as ProductionEventType,
    fishCount: row.fish_count == null ? undefined : Number(row.fish_count),
    weightKg: row.weight_kg == null ? undefined : Number(row.weight_kg),
    feedKg: row.feed_kg == null ? undefined : Number(row.feed_kg),
    createdAt: String(row.created_at ?? row.createdAt ?? new Date().toISOString()),
  };
}

export function listProductionEvents() {
  return readLocal();
}

export async function listProductionEventsRemote() {
  if (backendEnabled()) {
    const rows = await restSelect("production_events");
    if (Array.isArray(rows)) {
      const mapped = rows
        .map((row) => fromRemote(row as Record<string, unknown>))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      writeLocal(mapped);
      return mapped;
    }
  }
  return readLocal();
}

export function addProductionEvent(event: Omit<ProductionEvent, "id" | "createdAt">) {
  const events = readLocal();
  const next: ProductionEvent = {
    ...event,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  writeLocal([next, ...events]);
  return next;
}

export async function addProductionEventRemote(event: Omit<ProductionEvent, "id" | "createdAt">) {
  const next = addProductionEvent(event);
  if (backendEnabled()) {
    await restInsert("production_events", {
      id: next.id,
      cage_id: next.cageId,
      type: next.type,
      fish_count: next.fishCount,
      weight_kg: next.weightKg,
      feed_kg: next.feedKg,
      created_at: next.createdAt,
    });
  }
  return next;
}

export const createProductionEvent = addProductionEvent;
