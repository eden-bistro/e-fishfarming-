import { getActiveFarmId } from "@/lib/tenant";

export type Cage = {
  id: string;
  name: string;
  location: string;
  fishPopulation: number;
  biomassKg: number;
  status: "active" | "maintenance";
  createdAt: string;
};

const CAGES_KEY = "aquasmart_cages";

function isBrowser() {
  return typeof window !== "undefined";
}

function keyForFarm(farmId: string) {
  return `${CAGES_KEY}:${farmId}`;
}

export function listCages(): Cage[] {
  if (!isBrowser()) return [];
  const raw = window.localStorage.getItem(keyForFarm(getActiveFarmId()));
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Cage[];
  } catch {
    return [];
  }
}

function saveCages(rows: Cage[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(keyForFarm(getActiveFarmId()), JSON.stringify(rows));
}

export function createCage(input: Omit<Cage, "id" | "createdAt">) {
  const next: Cage = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  const rows = listCages();
  saveCages([next, ...rows]);
}

export function updateCage(id: string, input: Omit<Cage, "id" | "createdAt">) {
  const rows = listCages().map((cage) => (cage.id === id ? { ...cage, ...input } : cage));
  saveCages(rows);
}

export function deleteCage(id: string) {
  saveCages(listCages().filter((cage) => cage.id !== id));
}
