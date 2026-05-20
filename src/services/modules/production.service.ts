import { getActiveFarmId } from "@/lib/tenant";

export type ProductionEvent = {
  id: string;
  cageName: string;
  eventType: "stocking" | "mortality" | "harvest" | "sale";
  quantity: number;
  weightKg: number;
  date: string;
  notes?: string;
};

const PRODUCTION_KEY = "aquasmart_production_events";

function isBrowser() {
  return typeof window !== "undefined";
}

function keyForFarm() {
  return `${PRODUCTION_KEY}:${getActiveFarmId()}`;
}

export function listProductionEvents(): ProductionEvent[] {
  if (!isBrowser()) return [];
  const raw = window.localStorage.getItem(keyForFarm());
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ProductionEvent[];
  } catch {
    return [];
  }
}

function saveEvents(rows: ProductionEvent[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(keyForFarm(), JSON.stringify(rows));
}

export function createProductionEvent(input: Omit<ProductionEvent, "id">) {
  saveEvents([{ ...input, id: crypto.randomUUID() }, ...listProductionEvents()]);
}
