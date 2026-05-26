import { getSessionUser } from "@/lib/auth";
import { backendEnabled, restInsert, restSelect } from "@/services/modules/backend-store";

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

function asInventoryItem(row: Record<string, unknown>): InventoryItem {
  return {
    id: String(row.id ?? crypto.randomUUID()),
    name: String(row.name ?? ""),
    category: String(row.category ?? "consumable") as InventoryCategory,
    unit: String(row.unit ?? "unit"),
    quantity: Number(row.quantity ?? 0),
    lowStockThreshold: Number(row.low_stock_threshold ?? row.lowStockThreshold ?? 0),
    createdAt: String(row.created_at ?? row.createdAt ?? new Date().toISOString()),
  };
}

function asStockMovement(row: Record<string, unknown>): StockMovement {
  return {
    id: String(row.id ?? crypto.randomUUID()),
    itemId: String(row.item_id ?? row.itemId ?? ""),
    type: String(row.type ?? "adjustment") as StockMovementType,
    quantity: Number(row.quantity ?? 0),
    note: row.note ? String(row.note) : undefined,
    createdAt: String(row.created_at ?? row.createdAt ?? new Date().toISOString()),
  };
}

export function listInventoryItems() {
  return readStore().items;
}

export async function listInventoryItemsRemote() {
  if (backendEnabled()) {
    const rows = await restSelect("inventory_items");
    if (Array.isArray(rows)) {
      const mapped = rows.map((r) => asInventoryItem(r as Record<string, unknown>));
      writeStore({ ...readStore(), items: mapped });
      return mapped;
    }
  }
  return readStore().items;
}

export function listStockMovements() {
  return readStore().movements;
}

export async function listStockMovementsRemote() {
  if (backendEnabled()) {
    const rows = await restSelect("inventory_movements");
    if (Array.isArray(rows)) {
      const mapped = rows
        .map((r) => asStockMovement(r as Record<string, unknown>))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      writeStore({ ...readStore(), movements: mapped });
      return mapped;
    }
  }
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

export async function upsertInventoryItemRemote(
  item: Omit<InventoryItem, "id" | "createdAt"> & { id?: string },
) {
  const next = upsertInventoryItem(item);
  if (backendEnabled()) {
    await restInsert("inventory_items", {
      id: next.id,
      name: next.name,
      category: next.category,
      unit: next.unit,
      quantity: next.quantity,
      low_stock_threshold: next.lowStockThreshold,
      created_at: next.createdAt,
    });
  }
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

export async function recordStockMovementRemote(input: Omit<StockMovement, "id" | "createdAt">) {
  const movement = recordStockMovement(input);
  if (backendEnabled()) {
    await restInsert("inventory_movements", {
      id: movement.id,
      item_id: movement.itemId,
      type: movement.type,
      quantity: movement.quantity,
      note: movement.note,
      created_at: movement.createdAt,
    });
  }
  return movement;
}

export function consumeFeedInventory(quantityKg: number, note?: string) {
  const feed = listInventoryItems().find((i) => i.category === "feed");
  if (!feed) return null;
  return recordStockMovement({ itemId: feed.id, quantity: quantityKg, type: "usage", note });
}
