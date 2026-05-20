import { getSessionUser } from "@/lib/auth";

export type InventoryCategory = "feed" | "medicine" | "equipment" | "fuel" | "consumable";
export type StockMovementType = "purchase" | "usage" | "adjustment";

export type InventoryItem = {
  id: string;
  name: string;
  category: InventoryCategory;
  unit: string;
  quantity: number;
  lowStockThreshold: number;
  createdAt: string;
};

export type StockMovement = {
  id: string;
  itemId: string;
  type: StockMovementType;
  quantity: number;
  note?: string;
  createdAt: string;
};

type InventoryStore = { items: InventoryItem[]; movements: StockMovement[] };

const KEY = "aquasmart_inventory";

function storageKey() {
  const user = getSessionUser();
  return `${KEY}:${user?.tenantId ?? "demo"}`;
}

function readStore(): InventoryStore {
  if (typeof window === "undefined") return { items: [], movements: [] };
  const raw = window.localStorage.getItem(storageKey());
  if (!raw) return { items: [], movements: [] };
  try {
    return JSON.parse(raw) as InventoryStore;
  } catch {
    return { items: [], movements: [] };
  }
}

function writeStore(store: InventoryStore) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(), JSON.stringify(store));
}

export function listInventoryItems() {
  return readStore().items;
}

export function listStockMovements() {
  return readStore().movements;
}

export function upsertInventoryItem(
  item: Omit<InventoryItem, "id" | "createdAt"> & { id?: string },
) {
  const store = readStore();
  const next: InventoryItem = {
    ...item,
    id: item.id ?? crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  const items = item.id
    ? store.items.map((i) => (i.id === item.id ? { ...i, ...next } : i))
    : [...store.items, next];
  writeStore({ ...store, items });
  return next;
}

export function recordStockMovement(input: Omit<StockMovement, "id" | "createdAt">) {
  const store = readStore();
  const movement: StockMovement = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  const items = store.items.map((i) => {
    if (i.id !== input.itemId) return i;
    const delta = input.type === "usage" ? -Math.abs(input.quantity) : input.quantity;
    return { ...i, quantity: Math.max(0, i.quantity + delta) };
  });
  writeStore({ items, movements: [movement, ...store.movements] });
  return movement;
}

export function consumeFeedInventory(quantityKg: number, note?: string) {
  const feed = listInventoryItems().find((i) => i.category === "feed");
  if (!feed) return null;
  return recordStockMovement({ itemId: feed.id, quantity: quantityKg, type: "usage", note });
}
