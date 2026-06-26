import { getActiveFarmId } from "@/lib/tenant";

export type Brooder = {
  id: string;
  name: string;
  species: string;
  status: "active" | "paused";
  createdAt: string;
};

export type FingerlingBatch = {
  id: string;
  brooderId: string;
  quantity: number;
  productionDate: string;
  growthStatus: "early" | "mid" | "ready_for_transfer";
  transferredToCage?: string;
};

const BROODERS_KEY = "aquasmart_brooders";
const FINGERLINGS_KEY = "aquasmart_fingerlings";

function isBrowser() {
  return typeof window !== "undefined";
}

function farmKey(prefix: string) {
  return `${prefix}:${getActiveFarmId()}`;
}

function readJson<T>(key: string): T[] {
  if (!isBrowser()) return [];
  const raw = window.localStorage.getItem(key);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
}

function writeJson<T>(key: string, rows: T[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(key, JSON.stringify(rows));
}

export function listBrooders() {
  return readJson<Brooder>(farmKey(BROODERS_KEY));
}

export function upsertBrooder(
  input: Omit<Brooder, "id" | "createdAt"> & { id?: string; createdAt?: string },
) {
  const rows = listBrooders();
  const next = {
    ...input,
    id: input.id ?? crypto.randomUUID(),
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
  writeJson(
    farmKey(BROODERS_KEY),
    input.id ? rows.map((row) => (row.id === input.id ? next : row)) : [next, ...rows],
  );
}

export function createBrooder(input: Omit<Brooder, "id" | "createdAt">) {
  upsertBrooder(input);
}

export function deleteBrooder(id: string) {
  writeJson(
    farmKey(BROODERS_KEY),
    listBrooders().filter((row) => row.id !== id),
  );
}

export function listFingerlingBatches() {
  return readJson<FingerlingBatch>(farmKey(FINGERLINGS_KEY));
}

export function createFingerlingBatch(input: Omit<FingerlingBatch, "id">) {
  const rows = listFingerlingBatches();
  writeJson(farmKey(FINGERLINGS_KEY), [{ ...input, id: crypto.randomUUID() }, ...rows]);
}

export function markFingerlingBatchTransferred(batchId: string, cageName: string) {
  const rows = listFingerlingBatches().map((row) =>
    row.id === batchId
      ? { ...row, transferredToCage: cageName, growthStatus: "ready_for_transfer" }
      : row,
  );
  writeJson(farmKey(FINGERLINGS_KEY), rows);
}

export function upsertFingerlingBatch(input: Omit<FingerlingBatch, "id"> & { id?: string }) {
  const rows = listFingerlingBatches();
  const next = { ...input, id: input.id ?? crypto.randomUUID() };
  writeJson(
    farmKey(FINGERLINGS_KEY),
    input.id ? rows.map((row) => (row.id === input.id ? next : row)) : [next, ...rows],
  );
}

export function deleteFingerlingBatch(id: string) {
  writeJson(
    farmKey(FINGERLINGS_KEY),
    listFingerlingBatches().filter((row) => row.id !== id),
  );
}
